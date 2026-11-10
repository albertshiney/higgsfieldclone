import { afterEach, beforeEach, expect, test, vi } from "vitest"

const sdk = vi.hoisted(() => ({ config: vi.fn(), subscribe: vi.fn() }))
vi.mock("@higgsfield/client/v2", () => ({
  config: sdk.config,
  higgsfield: { subscribe: sdk.subscribe },
  APIError: class extends Error {},
  AuthenticationError: class extends Error {},
  TimeoutError: class extends Error {},
}))
import { runSeedance } from "../index"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("HF_CREDENTIALS", "fixture-id:fixture-secret")
})
afterEach(() => vi.unstubAllEnvs())

test("submits the requested SDK input once and returns only the completed video", async () => {
  sdk.subscribe.mockResolvedValueOnce({
    status: "completed",
    video: { url: "https://example.test/result.mp4" },
  })
  await expect(runSeedance()).resolves.toBe("https://example.test/result.mp4")
  expect(sdk.subscribe).toHaveBeenCalledExactlyOnceWith(
    "bytedance/seedance-2.5/text-to-video",
    {
      input: {
        prompt: "A cinematic scene at sunset",
        duration: 5,
        resolution: "720p",
        aspect_ratio: "16:9",
      },
      withPolling: true,
    }
  )
  expect(sdk.config).toHaveBeenCalledWith(
    expect.objectContaining({
      maxRetries: 0,
      baseURL: "https://api.higgsfield.ai",
    })
  )
})

test.each([
  "failed",
  "canceled",
  "cancelled",
  "nsfw",
  "moderated",
  "queued",
  "in_progress",
])("rejects %s even if the response includes a video URL", async (status) => {
  sdk.subscribe.mockResolvedValueOnce({
    status,
    video: { url: "https://example.test/result.mp4" },
  })
  await expect(runSeedance()).rejects.toThrow("Generation did not succeed")
})

test.each([
  undefined,
  "",
  "file:///local/video.mp4",
  "http://example.test/video.mp4",
  "https://user:password@example.test/video.mp4",
])("does not report completion with a missing or unsafe URL", async (url) => {
  sdk.subscribe.mockResolvedValueOnce({ status: "completed", video: { url } })
  await expect(runSeedance()).rejects.toThrow()
})

test.each(["", "mock:mock", "key_id:key_secret", "malformed"])(
  "rejects missing or demo credentials before submission",
  async (credential) => {
    vi.stubEnv("HF_CREDENTIALS", credential)
    await expect(runSeedance()).rejects.toThrow("real HF_CREDENTIALS")
    expect(sdk.subscribe).not.toHaveBeenCalled()
  }
)
