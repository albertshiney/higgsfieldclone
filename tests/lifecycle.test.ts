import { randomUUID } from "node:crypto"

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

const { submitGeneration } = await import("@/lib/generations/submit")
const { finalizeGeneration } = await import("@/lib/generations/finalize")
const { cancelGeneration } = await import("@/lib/generations/cancel")
const { reconcile } = await import("@/lib/generations/reconcile")
const { generationStatuses, deleteGenerations, setPublished } =
  await import("@/lib/generations/library")
const { refundGeneration, grantCredits } = await import("@/lib/billing/ledger")
const { collections } = await import("@/lib/db/collections")
const { ObjectId } = await import("mongodb")

let fake: FakeHiggsfield

beforeAll(startDatabase, 120_000)
afterAll(stopDatabase)
beforeEach(async () => {
  await clearDatabase()
  fake = await installFakeHiggsfield()
  vi.stubGlobal("fetch", fake.fetch)
})

const image = (overrides: Record<string, unknown> = {}) => ({
  submitKey: randomUUID(),
  modelId: "soul-2",
  prompt: "Editorial portrait in soft daylight",
  settings: { batchSize: "1", resolution: "720p" },
  media: [],
  ...overrides,
})

async function ledgerRows(generationId: string) {
  const { ledger } = await collections()
  return ledger.find({ refId: generationId }).toArray()
}

describe("submit", () => {
  it("prices on the server, debits once and submits the catalog path", async () => {
    const user = await createUser({ subscription: 100, topup: 100 })
    const view = await submitGeneration(user, image())
    expect(view.status).toBe("queued")
    expect(view.cost).toBe(18) // $0.09 × 2 / $0.01
    expect(fake.submits[0]!.path).toBe("higgsfield-ai/soul/v2/standard")
    expect(fake.submits[0]!.body).toMatchObject({
      prompt: "Editorial portrait in soft daylight",
      batch_size: 1,
    })
    expect(fake.submits[0]!.webhook).toContain("/api/webhooks/higgsfield?gid=")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 82,
      topup: 100,
    })
    expect(await ledgerRows(view.id)).toHaveLength(1)
  })

  it("ignores a client price and client-supplied paths", async () => {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, {
      ...image(),
      cost: 1,
      path: "some/other/model",
    } as never)
    expect(view.cost).toBe(18)
    expect(fake.submits[0]!.path).toBe("higgsfield-ai/soul/v2/standard")
  })

  it("rejects unknown models and invalid settings before charging", async () => {
    const user = await createUser({ topup: 100 })
    await expect(
      submitGeneration(user, image({ modelId: "flux-2" }))
    ).rejects.toThrow(/Unknown model/)
    await expect(
      submitGeneration(user, image({ settings: { batchSize: "7" } }))
    ).rejects.toThrow(/Invalid batchSize/)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 100,
    })
    expect(fake.submits).toHaveLength(0)
  })

  it("fails with INSUFFICIENT_CREDITS and charges nothing", async () => {
    const user = await createUser({ topup: 5 })
    await expect(submitGeneration(user, image())).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
    })
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 5,
    })
  })

  it("collapses a double submit with the same key into one generation", async () => {
    const user = await createUser({ topup: 100 })
    const input = image()
    const [a, b] = await Promise.all([
      submitGeneration(user, input),
      submitGeneration(user, input),
    ])
    expect(a.id).toBe(b.id)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 82,
    })
  })

  it("lets exactly one of two simultaneous submits through when credits cover one", async () => {
    const user = await createUser({ topup: 20 })
    const results = await Promise.allSettled([
      submitGeneration(user, image()),
      submitGeneration(user, image()),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 2,
    })
  })

  it("enforces the plan's parallel-generation limit", async () => {
    const user = await createUser({ topup: 1000 }, "free")
    await submitGeneration(user, image())
    await expect(submitGeneration(user, image())).rejects.toMatchObject({
      code: "CONCURRENCY",
    })
  })

  it("refunds a definite platform rejection and marks it failed", async () => {
    const user = await createUser({ topup: 100 })
    fake.nextSubmit = 422
    const view = await submitGeneration(user, image())
    expect(view.status).toBe("failed")
    expect(view.error).toMatch(/Credits refunded/)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 100,
    })
  })

  it("leaves an ambiguous submit pending for the reconciler", async () => {
    const user = await createUser({ topup: 100 })
    fake.nextSubmit = "network"
    const view = await submitGeneration(user, image())
    expect(view.status).toBe("pending_submit")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 82,
    })
    const summary = await reconcile({ pendingSeconds: 0 })
    expect(summary.unconfirmed).toBe(1)
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("failed")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 100,
    })
  })
})

describe("finalize", () => {
  it("copies outputs to our storage, records dimensions and completes", async () => {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, image())
    const { generations } = await collections()
    const doc = await generations.findOne({ _id: new ObjectId(view.id) })
    fake.complete(doc!.hfRequestId!, "image", 1)
    expect(await finalizeGeneration(doc!._id)).toBe("completed")
    const [done] = await generationStatuses(user.objectId, [view.id])
    expect(done!.status).toBe("completed")
    expect(done!.outputs[0]!.url).toMatch(
      /^http:\/\/localhost:3000\/api\/media\/u\//
    )
    expect(done!.outputs[0]!.width).toBe(16)
    expect(done!.aspect).toBeCloseTo(16 / 9)
    // Idempotent: a second finalize (duplicate webhook) changes nothing.
    expect(await finalizeGeneration(doc!._id)).toBe("already_terminal")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 82,
    })
  })

  it("refunds failed and nsfw runs exactly once", async () => {
    const user = await createUser({ topup: 100 })
    for (const status of ["failed", "nsfw"]) {
      const view = await submitGeneration(user, image())
      const { generations } = await collections()
      const doc = await generations.findOne({ _id: new ObjectId(view.id) })
      const request = fake.requests.get(doc!.hfRequestId!)!
      request.status = status
      request.error = status === "failed" ? "Generation failed" : undefined
      await Promise.all([
        finalizeGeneration(doc!._id),
        finalizeGeneration(doc!._id),
      ])
      await finalizeGeneration(doc!._id)
      await refundGeneration(doc!._id, "generation_refund")
      const [after] = await generationStatuses(user.objectId, [view.id])
      expect(after!.status).toBe(status)
      expect(after!.refunded).toBe(after!.cost)
      if (status === "nsfw")
        expect(after!.error).toBe(
          "Blocked by content filter. Credits refunded."
        )
      const refunds = (await ledgerRows(view.id)).filter(
        (row) => row.reason === "generation_refund"
      )
      expect(refunds).toHaveLength(1)
    }
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 100,
    })
  })

  it("does nothing while the platform is still working", async () => {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, image())
    const { generations } = await collections()
    const doc = await generations.findOne({ _id: new ObjectId(view.id) })
    fake.requests.get(doc!.hfRequestId!)!.status = "in_progress"
    expect(await finalizeGeneration(doc!._id)).toBe("in_flight")
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("in_progress")
  })

  it("the reconciler finishes a run when no webhook arrives", async () => {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, image())
    const { generations } = await collections()
    const doc = await generations.findOne({ _id: new ObjectId(view.id) })
    fake.complete(doc!.hfRequestId!, "image")
    const summary = await reconcile({ staleSeconds: 0 })
    expect(summary.finalized).toBe(1)
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("completed")
  })

  it("trues up a source-length charge once the real duration is known", async () => {
    const user = await createUser({ topup: 5000 })
    const { uploads } = await collections()
    const upload = {
      _id: new ObjectId(),
      userId: user.objectId,
      kind: "video" as const,
      url: "https://cdn.hf.test/uploads/clip.mp4",
      platformUrl: "https://cdn.hf.test/uploads/clip.mp4",
      contentType: "video/mp4",
      bytes: 100,
      name: "clip.mp4",
      createdAt: new Date(),
    }
    await uploads.insertOne(upload)
    const view = await submitGeneration(user, {
      submitKey: randomUUID(),
      modelId: "seedance-2.5-edit",
      prompt: "Make it snow",
      settings: {},
      media: [{ role: "source", url: upload.url }],
    })
    // Provisional: (30 s input + 30 s output) × 0.6 at $0.46224/s × 2 / $0.01.
    expect(view.cost).toBe(3329)
    const { generations } = await collections()
    const doc = await generations.findOne({ _id: new ObjectId(view.id) })
    fake.complete(doc!.hfRequestId!, "video") // 6-second output
    await finalizeGeneration(doc!._id)
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.outputs[0]!.durationSec).toBe(6)
    // Trued up to the real 6 s: (6 + 6) × 0.6 units.
    expect(after!.cost - after!.refunded).toBe(666)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 5000 - 666,
    })
  })
})

describe("cancel", () => {
  it("cancels a queued run on the platform and refunds", async () => {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, image())
    await cancelGeneration(user.objectId, new ObjectId(view.id))
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("canceled")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 100,
    })
  })

  it("refuses to cancel a run that already started", async () => {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, image())
    const { generations } = await collections()
    const doc = await generations.findOne({ _id: new ObjectId(view.id) })
    fake.requests.get(doc!.hfRequestId!)!.status = "in_progress"
    await expect(cancelGeneration(user.objectId, doc!._id)).rejects.toThrow(
      /already started/
    )
  })
})

describe("ownership", () => {
  it("never lets user B see, cancel, publish or delete user A's generation", async () => {
    const a = await createUser({ topup: 100 })
    const b = await createUser({ topup: 100 })
    const view = await submitGeneration(a, image())
    expect(await generationStatuses(b.objectId, [view.id])).toEqual([])
    await expect(
      cancelGeneration(b.objectId, new ObjectId(view.id))
    ).rejects.toThrow(/not found/i)
    await expect(setPublished(b.objectId, view.id, true)).rejects.toThrow(
      /not found/i
    )
    await expect(deleteGenerations(b.objectId, [view.id])).rejects.toThrow(
      /not found/i
    )
  })

  it("refuses media the user doesn't own", async () => {
    const a = await createUser({ topup: 100 })
    const b = await createUser({ topup: 100 })
    const { uploads } = await collections()
    await uploads.insertOne({
      _id: new ObjectId(),
      userId: a.objectId,
      kind: "image",
      url: "https://cdn.hf.test/a.png",
      platformUrl: "https://cdn.hf.test/a.png",
      contentType: "image/png",
      bytes: 1,
      name: "a.png",
      createdAt: new Date(),
    })
    await expect(
      submitGeneration(
        b,
        image({
          modelId: "grok-image-2",
          settings: {},
          media: [{ role: "reference", url: "https://cdn.hf.test/a.png" }],
        })
      )
    ).rejects.toThrow(/no longer available/)
    expect(await balanceOf(b.objectId)).toEqual({ subscription: 0, topup: 100 })
  })
})

describe("ledger idempotency", () => {
  it("applies a grant once per reference", async () => {
    const user = await createUser()
    const grant = () =>
      grantCredits({
        userId: user.objectId,
        bucket: "topup",
        amount: 500,
        reason: "topup_purchase",
        refType: "checkout",
        refId: "cs_test_123",
      })
    const results = await Promise.allSettled([grant(), grant(), grant()])
    expect(
      results.some((r) => r.status === "fulfilled" && r.value.applied)
    ).toBe(true)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 500,
    })
  })

  it("resets the subscription bucket instead of adding to it", async () => {
    const user = await createUser({ subscription: 120, topup: 30 })
    await grantCredits({
      userId: user.objectId,
      bucket: "subscription",
      amount: 1000,
      mode: "reset",
      reason: "subscription_reset",
      refType: "invoice",
      refId: "in_1",
    })
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 1000,
      topup: 30,
    })
  })
})

describe("pricing on the live platform", () => {
  it("does not sell unverified (placeholder) prices until an admin sets one", async () => {
    const { pricingContext } = await import("@/lib/billing/pricing")
    const { resetEnvForTests } = await import("@/lib/env")
    const before = process.env.HF_API_BASE_URL
    try {
      process.env.HF_API_BASE_URL = "https://api.higgsfield.ai"
      resetEnvForTests()
      const live = await pricingContext(true)
      expect([...live.disabled]).toEqual(
        expect.arrayContaining([
          "seedance-2.5",
          "seedance-2.5-edit",
          "seedance-2.5-extend",
        ])
      )
      const user = await createUser({ subscription: 1000, topup: 0 })
      await expect(
        submitGeneration(user, image({ modelId: "seedance-2.5" }))
      ).rejects.toMatchObject({ code: "MODEL_DISABLED" })
      expect(fake.submits).toHaveLength(0)
      expect(await balanceOf(user.objectId)).toEqual({
        subscription: 1000,
        topup: 0,
      })
      expect(live.credits["kling-video/motion-control/std"]).toBeUndefined()
      expect(live.placeholderPaths).toContain("kling-video/motion-control/std")
      expect(live.credits["bytedance/seedance-2.5/text-to-video"]).toBeDefined()

      const { modelPricing } = await collections()
      await modelPricing.insertOne({
        _id: new ObjectId(),
        modelId: "kling-2.6-motion-std",
        enabled: true,
        rules: {
          "kling-video/motion-control/std": {
            usd: 0.1,
            per: "second",
            defaultUnits: 30,
            sourceLength: true,
            source: "admin",
          },
        },
        updatedAt: new Date(),
      })
      const priced = await pricingContext(true)
      expect(priced.credits["kling-video/motion-control/std"]).toBeDefined()
    } finally {
      process.env.HF_API_BASE_URL = before
      resetEnvForTests()
      await pricingContext(true)
    }
  })
})
