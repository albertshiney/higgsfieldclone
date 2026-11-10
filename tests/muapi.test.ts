import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetEnvForTests } from "@/lib/env"
import {
  enforceSpendCap,
  requestFingerprint,
  signApproval,
  verifyApproval,
} from "@/lib/generations/approval"
import { createMuapiClient } from "@/lib/muapi/client"
import { AmbiguousSubmitError } from "@/lib/higgsfield/client"
beforeEach(() => {
  process.env.AUTH_SECRET = "fixture-auth-secret-never-a-real-key"
  process.env.GENERATION_MAX_USD = "0.5"
  resetEnvForTests()
})
const claims = () => ({
  user: "owner",
  submitKey: "request-a",
  fingerprint: requestFingerprint("muapi", "model", { prompt: "sunset" }),
  usd: 0.163,
  credits: 33,
})
describe("paid approval boundary", () => {
  it("accepts an unchanged or cheaper request", () => {
    const value = claims()
    const token = signApproval(value, 1000)
    expect(() => verifyApproval(token, value, 1100)).not.toThrow()
    expect(() =>
      verifyApproval(token, { ...value, usd: 0.1, credits: 20 }, 1100)
    ).not.toThrow()
  })
  for (const patch of [
    { user: "other" },
    { submitKey: "request-b" },
    { fingerprint: "changed" },
    { usd: 0.164 },
    { credits: 34 },
  ])
    it("rejects a changed approval boundary " + JSON.stringify(patch), () => {
      const value = claims()
      expect(() =>
        verifyApproval(signApproval(value, 1000), { ...value, ...patch }, 1100)
      ).toThrow()
    })
  it("rejects missing, forged, malformed and expired approvals", () => {
    const value = claims()
    const token = signApproval(value, 1000)
    for (const invalid of [
      undefined,
      "bad",
      token + ".extra",
      token.slice(0, -6) + "AAAAAA",
    ])
      expect(() => verifyApproval(invalid, value, 1100)).toThrow()
    expect(() => verifyApproval(token, value, 121000)).toThrow()
  })
  it("enforces the cap independently of a valid approval", () => {
    const value = { ...claims(), usd: 0.6 }
    expect(() => verifyApproval(signApproval(value), value)).toThrow(
      "generation limit"
    )
    for (const usd of [NaN, Infinity, -1])
      expect(() => enforceSpendCap(usd)).toThrow()
    expect(() => enforceSpendCap(0.5)).not.toThrow()
  })
})
describe("MuAPI protocol adapter", () => {
  it("estimates without credentials, generation, or credential transmission", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ cost: 0.163, currency: "USD" }))
    const client = createMuapiClient({
      credentials: "fixture-key",
      baseUrl: "https://api.muapi.ai/api/v1",
      fetch,
    })
    expect(
      await client.estimate("minimax-h3-max-turbo-text-to-video", {
        duration: 5,
      })
    ).toEqual({ usd: 0.163, credits: 0 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.muapi.ai/api/v1/models/minimax-h3-max-turbo-text-to-video/estimate-cost"
    )
    expect(fetch.mock.calls[0][1]?.headers).not.toHaveProperty("x-api-key")
  })
  it("refuses an estimate with missing currency or invalid cost", async () => {
    for (const payload of [
      { cost: 0.1 },
      { cost: -1, currency: "USD" },
      { cost: "0.1", currency: "USD" },
      { cost: 0.1, currency: "EUR" },
    ]) {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(payload))
      await expect(
        createMuapiClient({
          baseUrl: "https://api.muapi.ai/api/v1",
          fetch,
        }).estimate("model", {})
      ).rejects.toThrow()
    }
  })
  it("submits once with server authentication and records actual cost", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        Response.json({ request_id: "job-1", cost: { amount_usd: 0.163 } })
      )
    const result = await createMuapiClient({
      credentials: "fixture-key",
      baseUrl: "https://api.muapi.ai/api/v1",
      fetch,
    }).submit("model", { prompt: "sunset" })
    expect(result).toMatchObject({ requestId: "job-1", costUsd: 0.163 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1]?.headers).toHaveProperty(
      "x-api-key",
      "fixture-key"
    )
    expect(fetch.mock.calls[0][1]?.redirect).toBe("error")
  })
  it("never retries an ambiguous submission", async () => {
    for (const response of [
      Response.json({}, { status: 503 }),
      Response.json({ status: "processing" }),
    ]) {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response)
      await expect(
        createMuapiClient({
          credentials: "fixture",
          baseUrl: "https://api.muapi.ai/api/v1",
          fetch,
        }).submit("model", {})
      ).rejects.toBeInstanceOf(AmbiguousSubmitError)
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  })
  it("normalizes output and keeps provider refund separate", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        Response.json({
          status: "completed",
          outputs: ["https://cdn.example/video.mp4"],
          cost: { amount_usd: 0.163, refunded: false },
        })
      )
    expect(
      await createMuapiClient({
        credentials: "fixture",
        baseUrl: "https://api.muapi.ai/api/v1",
        fetch,
      }).status("job")
    ).toMatchObject({
      status: "completed",
      artifacts: [{ kind: "video", url: "https://cdn.example/video.mp4" }],
      costUsd: 0.163,
      providerRefunded: false,
    })
  })
  for (const [source, target] of [
    ["pending", "queued"],
    ["processing", "in_progress"],
    ["failed", "failed"],
    ["cancelled", "canceled"],
  ])
    it("maps " + source + " without claiming completion", async () => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json({ status: source }))
      expect(
        (
          await createMuapiClient({
            credentials: "fixture",
            baseUrl: "https://api.muapi.ai/api/v1",
            fetch,
          }).status("job")
        ).status
      ).toBe(target)
    })
  it("does not expose moderated or credential-bearing media URLs", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({
          status: "completed",
          outputs: ["https://cdn.example/video.mp4"],
          has_nsfw_contents: [true],
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "completed",
          outputs: [
            "http://cdn.example/v.mp4",
            "https://user:password@cdn.example/v.mp4",
          ],
        })
      )
    const client = createMuapiClient({
      credentials: "fixture",
      baseUrl: "https://api.muapi.ai/api/v1",
      fetch,
    })
    expect(await client.status("one")).toMatchObject({
      status: "nsfw",
      artifacts: [],
    })
    expect((await client.status("two")).artifacts).toEqual([])
  })
  it("refuses unsupported cancellation without sending a request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    await expect(
      createMuapiClient({
        baseUrl: "https://api.muapi.ai/api/v1",
        fetch,
      }).cancel()
    ).rejects.toMatchObject({ code: "NOT_CANCELABLE" })
    expect(fetch).not.toHaveBeenCalled()
  })
})
