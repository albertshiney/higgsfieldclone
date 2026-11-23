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
process.env.SUME_API_KEY = "fixture-only"
process.env.GENERATION_MAX_USD = "0.5"
const { resetEnvForTests } = await import("@/lib/env")
const { quoteGeneration, submitGeneration } =
  await import("@/lib/generations/submit")
const { finalizeGeneration } = await import("@/lib/generations/finalize")
const { cancelGeneration } = await import("@/lib/generations/cancel")
const { reconcile } = await import("@/lib/generations/reconcile")
const { collections } = await import("@/lib/db/collections")
const { ObjectId, Collection } = await import("mongodb")
let cost = 0.2
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
  cost = 0.2
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
      if (url.endsWith("/v1/open/estimate"))
        return estimateFails
          ? json({}, 503)
          : json({
              data: {
                model: "seedance-2-mini",
                usd: cost.toFixed(4),
                usd_micros: Math.round(cost * 1e6),
                currency: "USD",
                billing: { duration_seconds: 5, resolution: "480p" },
              },
            })
      if (
        url === "https://api.sume.com/v1/video-router/generate" &&
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
          data: {
            request_id: "sume-fixture",
            job: { status: "processing", model: "seedance-2-mini" },
          },
        })
      }
      if (url === "https://api.sume.com/v1/jobs/sume-fixture/status") {
        polls.push(url)
        return json({ data: { sume_status: outcome } })
      }
      if (url === "https://api.sume.com/v1/jobs/sume-fixture/result")
        return json({
          data: {
            result: {
              artifacts: [
                { type: "video", url: "https://cdn.fixture.test/video.mp4" },
              ],
            },
          },
        })
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
  modelId: "sume-seedance-2-mini",
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
  expect(quote).toMatchObject({ usd: 0.2, credits: 40, maxUsd: 0.5 })
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
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 60 })
  const { generations, ledger } = await collections()
  expect(
    await generations.findOne({ _id: new ObjectId(first.id) })
  ).toMatchObject({
    provider: "sume",
    hfRequestId: "sume-fixture",
  })
  expect(await ledger.countDocuments({ refId: first.id })).toBe(1)
})
it("rejects increased price, changed prompt and cross-user approval before debit", async () => {
  const user = await createUser({ topup: 100 })
  const other = await createUser({ topup: 100 })
  const signed = await approved(user)
  cost = 0.21
  await expect(submitGeneration(user, signed)).rejects.toMatchObject({
    code: "APPROVAL_REQUIRED",
  })
  cost = 0.2
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
it("polls Sume and copies a completed video into owned storage", async () => {
  const user = await createUser({ topup: 100 })
  const view = await submitGeneration(user, await approved(user))
  outcome = "completed"
  expect(await finalizeGeneration(new ObjectId(view.id))).toBe("completed")
  const { generations } = await collections()
  const done = await generations.findOne({ _id: new ObjectId(view.id) })
  expect(done?.outputs[0]?.storage).not.toBe("platform")
  expect(done?.outputs[0]?.url).toContain("/api/media/")
  expect(polls).toHaveLength(1)
  expect(await finalizeGeneration(new ObjectId(view.id))).toBe(
    "already_terminal"
  )
})
it("detects a completed Sume job on the next production reconciliation", async () => {
  const user = await createUser({ topup: 100 })
  const view = await submitGeneration(user, await approved(user))
  const { generations } = await collections()
  await generations.updateOne(
    { _id: new ObjectId(view.id) },
    { $set: { updatedAt: new Date(Date.now() - 60_000) } }
  )
  await reconcile()
  expect(polls).toHaveLength(1)
  expect(
    (await generations.findOne({ _id: new ObjectId(view.id) }))?.status
  ).toBe("in_progress")

  outcome = "completed"
  await reconcile({ now: new Date(Date.now() + 60_000) })

  const done = await generations.findOne({ _id: new ObjectId(view.id) })
  expect(done?.status).toBe("completed")
  expect(done?.outputs[0]?.storage).not.toBe("platform")
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
  ).toMatchObject({ status: "failed", refunded: 40 })
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
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 60 })
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
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 60 })
})

it("holds credits when the provider accepts but the database confirmation fails", async () => {
  const user = await createUser({ topup: 100 })
  const request = await approved(user)
  failDatabaseConfirmation = true
  const view = await submitGeneration(user, request)
  expect(view.status).toBe("pending_submit")
  await reconcile({ pendingSeconds: 0, now: new Date(Date.now() + 300000) })
  expect(await balanceOf(user.objectId)).toMatchObject({ topup: 60 })
  expect(submissions).toHaveLength(1)
  expect((await submitGeneration(user, request)).id).toBe(view.id)
  expect(submissions).toHaveLength(1)
})

it("blocks legacy new requests and missing Sume credentials instead of falling back", async () => {
  const { invalidatePricing } = await import("@/lib/billing/pricing")
  const user = await createUser({ topup: 100 })
  process.env.HF_API_BASE_URL = "https://api.higgsfield.ai"
  resetEnvForTests()
  invalidatePricing()
  try {
    await expect(
      quoteGeneration(user, { ...input(), modelId: "muapi-h3-max-turbo" })
    ).rejects.toMatchObject({ code: "MODEL_DISABLED" })
    delete process.env.SUME_API_KEY
    resetEnvForTests()
    invalidatePricing()
    await expect(quoteGeneration(user, input())).rejects.toMatchObject({
      code: "MODEL_DISABLED",
    })
    expect(submissions).toHaveLength(0)
    expect(await balanceOf(user.objectId)).toMatchObject({ topup: 100 })
  } finally {
    process.env.HF_API_BASE_URL = "https://hf.test"
    process.env.SUME_API_KEY = "fixture-only"
    resetEnvForTests()
    invalidatePricing()
  }
})
