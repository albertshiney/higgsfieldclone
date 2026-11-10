import { randomUUID } from "node:crypto"
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest"
import {
  setupEnv,
  startDatabase,
  stopDatabase,
  clearDatabase,
  createUser,
  balanceOf,
  tinyMp4,
} from "./support/harness"
setupEnv()
process.env.MUAPI_API_KEY = "fixture-only"
process.env.GENERATION_MAX_USD = "0.5"
const { resetEnvForTests } = await import("@/lib/env")
const { quoteGeneration, submitGeneration } =
  await import("@/lib/generations/submit")
const { finalizeGeneration } = await import("@/lib/generations/finalize")
const { cancelGeneration } = await import("@/lib/generations/cancel")
const { reconcile } = await import("@/lib/generations/reconcile")
const { collections } = await import("@/lib/db/collections")
const { ObjectId, Collection } = await import("mongodb")
let cost = 0.163
let outcome = "processing"
let ambiguous = false
let estimateFails = false
let failDatabaseConfirmation = false
let submissions: string[] = []
let polls: string[] = []
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  })
beforeAll(startDatabase, 120_000)
afterAll(stopDatabase)
beforeEach(async () => {
  vi.restoreAllMocks()
  resetEnvForTests()
  await clearDatabase()
  cost = 0.163
  outcome = "processing"
  ambiguous = false
  estimateFails = false
  failDatabaseConfirmation = false
  submissions = []
  polls = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/estimate-cost"))
        return estimateFails ? json({}, 503) : json({ cost, currency: "USD" })
      if (
        url ===
          "https://api.muapi.ai/api/v1/minimax-h3-max-turbo-text-to-video" &&
        init?.method === "POST"
      ) {
        submissions.push(url)
        if (ambiguous) throw new TypeError("connection lost")
        if (failDatabaseConfirmation)
          vi.spyOn(
            Collection.prototype,
            "findOneAndUpdate"
          ).mockRejectedValueOnce(
            new Error("database confirmation interrupted")
          )
        return json({
          request_id: "mu-fixture",
          status: "processing",
          cost: { amount_usd: cost },
        })
      }
      if (url === "https://api.muapi.ai/api/v1/predictions/mu-fixture/result") {
        polls.push(url)
        return json({
          status: outcome,
          outputs:
            outcome === "completed"
              ? ["https://cdn.fixture.test/video.mp4"]
              : [],
          cost: { amount_usd: cost, refunded: outcome === "failed" },
        })
      }
      if (url === "https://cdn.fixture.test/video.mp4")
        return new Response(tinyMp4(5), {
          headers: { "content-type": "video/mp4" },
        })
      throw new Error("Unexpected fixture request: " + url)
    })
  )
})
const input = () => ({
  submitKey: randomUUID(),
  modelId: "muapi-h3-max-turbo",
  prompt: "A cinematic scene at sunset",
  settings: {},
  media: [],
})
async function approved(
  user: Awaited<ReturnType<typeof createUser>>,
  request = input()
) {
  const quote = await quoteGeneration(user, request)
  return { ...request, approval: quote.approval }
}
it("quotes without debit, requires approval, then submits once and persists routing", async () => {
  const user = await createUser({ topup: 100 })
  const request = input()
  const quote = await quoteGeneration(user, request)
  expect(quote).toMatchObject({ usd: 0.163, credits: 33, maxUsd: 0.5 })
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 100 })
  expect(submissions).toHaveLength(0)
  await expect(submitGeneration(user, request)).rejects.toMatchObject({
    code: "APPROVAL_REQUIRED",
  })
  expect(submissions).toHaveLength(0)
  const signed = { ...request, approval: quote.approval }
  const first = await submitGeneration(user, signed)
  const duplicate = await submitGeneration(user, signed)
  expect(duplicate.id).toBe(first.id)
  expect(first.canCancel).toBe(false)
  expect(submissions).toHaveLength(1)
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 67 })
  const { generations, ledger } = await collections()
  expect(
    await generations.findOne({ _id: new ObjectId(first.id) })
  ).toMatchObject({
    provider: "muapi",
    hfRequestId: "mu-fixture",
    providerCostUsd: 0.163,
  })
  expect(await ledger.countDocuments({ refId: first.id })).toBe(1)
})
it("rejects increased price, changed prompt and cross-user approval before debit", async () => {
  const user = await createUser({ topup: 100 })
  const other = await createUser({ topup: 100 })
  const signed = await approved(user)
  cost = 0.2
  await expect(submitGeneration(user, signed)).rejects.toMatchObject({
    code: "APPROVAL_REQUIRED",
  })
  cost = 0.163
  await expect(
    submitGeneration(user, { ...signed, prompt: "changed" })
  ).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" })
  await expect(submitGeneration(other, signed)).rejects.toMatchObject({
    code: "APPROVAL_REQUIRED",
  })
  expect(submissions).toHaveLength(0)
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 100 })
})
it("fails closed above the spending cap or on unavailable estimates", async () => {
  const user = await createUser({ topup: 100 })
  cost = 0.51
  await expect(quoteGeneration(user, input())).rejects.toThrow()
  estimateFails = true
  await expect(submitGeneration(user, input())).rejects.toThrow()
  expect(submissions).toHaveLength(0)
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 100 })
})
it("polls MuAPI and copies a completed video into owned storage", async () => {
  const user = await createUser({ topup: 100 })
  const view = await submitGeneration(user, await approved(user))
  outcome = "completed"
  expect(await finalizeGeneration(new ObjectId(view.id))).toBe("completed")
  const { generations } = await collections()
  const done = await generations.findOne({ _id: new ObjectId(view.id) })
  expect(done?.outputs[0]?.storage).not.toBe("platform")
  expect(done?.outputs[0]?.url).toContain("/api/media/")
  expect(done?.providerCostUsd).toBe(0.163)
  expect(polls).toHaveLength(1)
  expect(await finalizeGeneration(new ObjectId(view.id))).toBe(
    "already_terminal"
  )
})
it("refunds a confirmed failure only once and records the provider refund separately", async () => {
  const user = await createUser({ topup: 100 })
  const view = await submitGeneration(user, await approved(user))
  outcome = "failed"
  await finalizeGeneration(new ObjectId(view.id))
  await finalizeGeneration(new ObjectId(view.id))
  const { generations, ledger } = await collections()
  expect(
    await generations.findOne({ _id: new ObjectId(view.id) })
  ).toMatchObject({ status: "failed", refunded: 33, providerRefunded: true })
  expect(
    await ledger.countDocuments({ refId: view.id, reason: "generation_refund" })
  ).toBe(1)
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 100 })
})
it("refuses unsupported cancellation and keeps slow provider requests funded", async () => {
  const user = await createUser({ topup: 100 })
  const view = await submitGeneration(user, await approved(user))
  await expect(
    cancelGeneration(user.objectId, new ObjectId(view.id))
  ).rejects.toMatchObject({ code: "NOT_CANCELABLE" })
  const { generations } = await collections()
  const old = new Date(Date.now() - 2 * 60 * 60_000)
  await generations.updateOne(
    { _id: new ObjectId(view.id) },
    { $set: { createdAt: old, updatedAt: old } }
  )
  await reconcile({ staleSeconds: 0 })
  expect(
    await generations.findOne({ _id: new ObjectId(view.id) })
  ).toMatchObject({ status: "in_progress", refunded: 0 })
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 67 })
  expect(submissions).toHaveLength(1)
})
it("never retries or refunds an uncertain submission without provider confirmation", async () => {
  const user = await createUser({ topup: 100 })
  ambiguous = true
  const view = await submitGeneration(user, await approved(user))
  expect(view.status).toBe("pending_submit")
  const { generations } = await collections()
  await generations.updateOne(
    { _id: new ObjectId(view.id) },
    { $set: { createdAt: new Date(0) } }
  )
  await reconcile({ pendingSeconds: 0 })
  expect(
    await generations.findOne({ _id: new ObjectId(view.id) })
  ).toMatchObject({ status: "pending_submit", refunded: 0 })
  expect(submissions).toHaveLength(1)
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 67 })
})

it("holds credits when the provider accepts but the database confirmation fails", async () => {
  const user = await createUser({ topup: 100 })
  const request = await approved(user)
  failDatabaseConfirmation = true
  const view = await submitGeneration(user, request)
  expect(view.status).toBe("pending_submit")
  await reconcile({ pendingSeconds: 0, now: new Date(Date.now() + 300000) })
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 67 })
  expect(submissions).toHaveLength(1)
  expect((await submitGeneration(user, request)).id).toBe(view.id)
  expect(submissions).toHaveLength(1)
})
