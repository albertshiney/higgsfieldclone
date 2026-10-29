import { createHmac, randomUUID } from "node:crypto"

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  balanceOf,
  clearDatabase,
  createUser,
  installFakeHiggsfield,
  setupEnv,
  startDatabase,
  stopDatabase,
  type FakeHiggsfield,
} from "./support/harness"

setupEnv()
Object.assign(process.env, {
  STRIPE_SECRET_KEY: "sk_test_fake",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_PLUS_MONTHLY: "price_plus_month",
  STRIPE_PRICE_PLUS_ANNUAL: "price_plus_year",
})

// Route handlers run `after()` work post-response; run it inline in tests.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>()
  return { ...actual, after: (work: () => Promise<unknown>) => void work() }
})

// Stripe API calls made by handlers (the webhook payload itself is local).
const stripeApi = {
  subscriptions: { retrieve: vi.fn() },
  checkout: { sessions: { list: vi.fn() } },
}
vi.mock("@/lib/billing/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/stripe")>()
  return { ...actual, stripe: () => stripeApi }
})

const { handleStripeEvent } = await import("@/lib/billing/stripe-events")
const { submitGeneration } = await import("@/lib/generations/submit")
const { generationStatuses } = await import("@/lib/generations/library")
const { webhookToken } = await import("@/lib/higgsfield/webhook")
const { collections } = await import("@/lib/db/collections")
const { POST: higgsfieldWebhook } =
  await import("@/app/api/webhooks/higgsfield/route")
const { ObjectId } = await import("mongodb")
type StripeEvent = Parameters<typeof handleStripeEvent>[0]

let fake: FakeHiggsfield
beforeAll(startDatabase, 120_000)
afterAll(stopDatabase)
beforeEach(async () => {
  await clearDatabase()
  fake = await installFakeHiggsfield()
  vi.stubGlobal("fetch", fake.fetch)
})

const event = (
  type: string,
  object: Record<string, unknown>,
  id = `evt_${randomUUID()}`
) => ({ id, type, data: { object } }) as unknown as StripeEvent

describe("Stripe webhooks", () => {
  it("credits a paid top-up once, even when the event is delivered twice", async () => {
    const user = await createUser()
    const session = {
      id: "cs_test_topup",
      mode: "payment",
      payment_status: "paid",
      client_reference_id: user.id,
      customer: "cus_123",
      amount_total: 2000,
      currency: "usd",
      metadata: {
        userId: user.id,
        kind: "topup",
        pack: "medium",
        credits: "2420",
      },
    }
    const first = event("checkout.session.completed", session, "evt_same")
    expect(await handleStripeEvent(first)).toBe("processed")
    expect(await handleStripeEvent(first)).toBe("duplicate")
    // A distinct event for the same session (e.g. async success) is also a no-op.
    await handleStripeEvent(
      event("checkout.session.async_payment_succeeded", session)
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 2420,
    })
    const { users } = await collections()
    expect(
      (await users.findOne({ _id: user.objectId }))!.stripeCustomerId
    ).toBe("cus_123")
  })

  it("resets the subscription bucket on each paid invoice and records the plan", async () => {
    const user = await createUser({ subscription: 40, topup: 10 }, "free")
    const { users } = await collections()
    await users.updateOne(
      { _id: user.objectId },
      { $set: { stripeCustomerId: "cus_sub" } }
    )
    stripeApi.subscriptions.retrieve.mockResolvedValue({
      id: "sub_1",
      metadata: { userId: user.id },
      items: {
        data: [
          {
            price: { id: "price_plus_month" },
            current_period_end: 1_900_000_000,
          },
        ],
      },
    })
    const invoice = (id: string, reason: string) =>
      event("invoice.paid", {
        id,
        billing_reason: reason,
        customer: "cus_sub",
        period_end: 1_900_000_000,
        parent: { subscription_details: { subscription: "sub_1" } },
      })
    await handleStripeEvent(invoice("in_1", "subscription_create"))
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 3500,
      topup: 10,
    })
    await users.updateOne(
      { _id: user.objectId },
      { $set: { "credits.subscription": 12 } }
    )
    await handleStripeEvent(invoice("in_2", "subscription_cycle"))
    await handleStripeEvent(invoice("in_2", "subscription_cycle"))
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 3500,
      topup: 10,
    })
    const account = await users.findOne({ _id: user.objectId })
    expect(account!.plan).toBe("plus")
    expect(account!.planInterval).toBe("month")
  })

  it("ends a canceled subscription: back to Free, plan credits lapse", async () => {
    const user = await createUser({ subscription: 900, topup: 50 }, "plus")
    const { users } = await collections()
    await users.updateOne(
      { _id: user.objectId },
      { $set: { stripeCustomerId: "cus_end", stripeSubscriptionId: "sub_end" } }
    )
    await handleStripeEvent(
      event("customer.subscription.deleted", {
        id: "sub_end",
        customer: "cus_end",
        metadata: { userId: user.id },
        items: { data: [] },
      })
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 50,
    })
    expect((await users.findOne({ _id: user.objectId }))!.plan).toBe("free")
  })

  it("claws back refunded top-up credits without going below zero and flags the account", async () => {
    const user = await createUser({ topup: 300 })
    stripeApi.checkout.sessions.list.mockResolvedValue({
      data: [
        {
          id: "cs_refund",
          client_reference_id: user.id,
          metadata: { kind: "topup", credits: "500" },
        },
      ],
    })
    await handleStripeEvent(
      event("charge.refunded", {
        id: "ch_1",
        amount: 500,
        amount_refunded: 500,
        payment_intent: "pi_1",
        customer: "cus_x",
      })
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 0,
    })
    const { users } = await collections()
    expect(
      (await users.findOne({ _id: user.objectId }))!.billingFlag?.reason
    ).toMatch(/already spent/)
  })
})

describe("Higgsfield webhook route", () => {
  async function submitted() {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, {
      submitKey: randomUUID(),
      modelId: "soul-2",
      prompt: "A lighthouse at dusk",
      settings: {},
      media: [],
    })
    const { generations } = await collections()
    const doc = (await generations.findOne({ _id: new ObjectId(view.id) }))!
    return { user, view, doc }
  }

  const call = (
    gid: string,
    token: string,
    body: unknown,
    options: { signedAt?: number; tamperSignature?: boolean } = {}
  ) => {
    const rawBody = JSON.stringify(body)
    const eventId = `msg_${randomUUID()}`
    const timestamp = String(options.signedAt ?? Math.floor(Date.now() / 1000))
    const signature = createHmac("sha256", "higgsfield-test-signing-key")
      .update(`${eventId}.${timestamp}.${rawBody}`)
      .digest("base64")
    return higgsfieldWebhook(
      new Request(
        `https://vireo.test/api/webhooks/higgsfield?gid=${gid}&t=${token}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "webhook-id": eventId,
            "webhook-timestamp": timestamp,
            "webhook-signature": `v1,${options.tamperSignature ? "A".repeat(44) : signature}`,
          },
          body: rawBody,
        }
      )
    )
  }

  it("rejects a bad token with 401 (not retried by the platform)", async () => {
    const { doc } = await submitted()
    const response = await call(doc._id.toHexString(), "0".repeat(64), {
      request_id: doc.hfRequestId,
      status: "completed",
    })
    expect(response.status).toBe(401)
  })

  it("rejects tampered and stale signed deliveries", async () => {
    const { doc } = await submitted()
    const gid = doc._id.toHexString()
    const token = webhookToken(gid, "webhook-secret")
    const body = { request_id: doc.hfRequestId, status: "completed" }
    expect((await call(gid, token, body, { tamperSignature: true })).status).toBe(401)
    expect(
      (await call(gid, token, body, { signedAt: Math.floor(Date.now() / 1000) - 301 })).status
    ).toBe(401)
  })

  it("never trusts the payload: re-fetches status before finalizing", async () => {
    const { user, doc, view } = await submitted()
    const gid = doc._id.toHexString()
    // Payload claims success, but the platform says it failed.
    fake.requests.get(doc.hfRequestId!)!.status = "failed"
    const response = await call(gid, webhookToken(gid, "webhook-secret"), {
      request_id: doc.hfRequestId,
      status: "completed",
      payload: { images: [{ url: "https://evil.example/fake.png" }] },
    })
    expect(response.status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("failed")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 100,
    })
  })

  it("finalizes once when the same delivery arrives twice", async () => {
    const { user, doc, view } = await submitted()
    const gid = doc._id.toHexString()
    fake.complete(doc.hfRequestId!, "image")
    const body = { request_id: doc.hfRequestId, status: "completed" }
    const token = webhookToken(gid, "webhook-secret")
    expect((await call(gid, token, body)).status).toBe(200)
    expect((await call(gid, token, body)).status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("completed")
    expect(after!.outputs).toHaveLength(1)
  })

  it("rejects malformed envelopes with 400", async () => {
    const { doc } = await submitted()
    const gid = doc._id.toHexString()
    const response = await call(gid, webhookToken(gid, "webhook-secret"), {
      status: "completed",
    })
    expect(response.status).toBe(400)
  })
})
