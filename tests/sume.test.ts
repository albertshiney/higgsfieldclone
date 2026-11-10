import { describe, expect, it, vi } from "vitest"
import { createSumeClient } from "@/lib/sume/client"
import { AmbiguousSubmitError } from "@/lib/higgsfield/client"
const body = {
  model: "seedance-2-mini",
  prompt: "sunset",
  duration: 5,
  resolution: "480p",
}
const quote = {
  model: body.model,
  currency: "USD",
  usd: "0.2000",
  usd_micros: 200000,
  billing: { duration_seconds: 5, resolution: "480p" },
}
const response = (data: unknown, status = 200) =>
  Response.json({ data }, { status })
const client = (fetch: typeof globalThis.fetch) =>
  createSumeClient({
    credentials: "fixture-only",
    baseUrl: "https://api.sume.com",
    fetch,
  })
describe("Sume protocol", () => {
  it("quotes exact inputs without credentials or paid creation", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(response(quote))
    expect(
      await client(fetch).estimate("v1/video-router/generate", body)
    ).toEqual({ usd: 0.2, credits: 0 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe("https://api.sume.com/v1/open/estimate")
    expect(fetch.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization")
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      model: body.model,
      input: { prompt: "sunset", duration: 5, resolution: "480p" },
    })
  })
  for (const patch of [
    { currency: "EUR" },
    { model: "auto" },
    { usd: "-1" },
    { usd_micros: 1 },
    { billing: { duration_seconds: 4, resolution: "480p" } },
    { billing: { duration_seconds: 5, resolution: "720p" } },
  ])
    it(
      "rejects invalid or clamped quote " + JSON.stringify(patch),
      async () => {
        await expect(
          client(
            vi.fn().mockResolvedValue(response({ ...quote, ...patch }))
          ).estimate("v1/video-router/generate", body)
        ).rejects.toThrow()
      }
    )
  it("requires a stable key and sends it on exactly one async submission", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      response({
        request_id: "job_fixture",
        job: { model: body.model, status: "queued" },
      })
    )
    await expect(
      client(fetch).submit("v1/video-router/generate", body)
    ).rejects.toThrow("idempotency")
    expect(fetch).not.toHaveBeenCalled()
    expect(
      await client(fetch).submit(
        "v1/video-router/generate",
        body,
        undefined,
        "intent-one"
      )
    ).toMatchObject({ requestId: "job_fixture", status: "queued" })
    expect(fetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Idempotency-Key",
      "intent-one"
    )
  })
  it("holds ambiguous submissions without retry", async () => {
    for (const status of [409, 500, 502, 504]) {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(response({}, status))
      await expect(
        client(fetch).submit(
          "v1/video-router/generate",
          body,
          undefined,
          "intent-one"
        )
      ).rejects.toBeInstanceOf(AmbiguousSubmitError)
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  })
  it("fetches only completed final media through canonical paths", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ sume_status: "completed" }))
      .mockResolvedValueOnce(
        response({
          result: {
            artifacts: [
              {
                type: "image",
                stage: "first_frame",
                url: "https://media.sume.com/poster.png",
              },
              { type: "video", url: "https://media.sume.com/video.mp4" },
              { type: "video", url: "http://localhost/private" },
            ],
          },
        })
      )
    expect(await client(fetch).status("job_fixture")).toMatchObject({
      status: "completed",
      artifacts: [{ kind: "video", url: "https://media.sume.com/video.mp4" }],
    })
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://api.sume.com/v1/jobs/job_fixture/status",
      "https://api.sume.com/v1/jobs/job_fixture/result",
    ])
  })
  it("normalizes moderation, cancellation and failure without success", async () => {
    for (const [data, status] of [
      [
        {
          sume_status: "failed",
          job: { error: { public_reason: "content_policy_rejected" } },
        },
        "nsfw",
      ],
      [{ sume_status: "failed" }, "failed"],
      [{ sume_status: "canceled" }, "canceled"],
    ] as const)
      expect(
        await client(vi.fn().mockResolvedValue(response(data))).status(
          "job_fixture"
        )
      ).toMatchObject({ status, artifacts: [] })
  })
  it("rejects arbitrary origins and paths", async () => {
    expect(() =>
      createSumeClient({ baseUrl: "https://attacker.test" })
    ).toThrow()
    await expect(client(vi.fn()).estimate("../me", body)).rejects.toThrow()
  })
})

it("creates a size-bound upload ticket without forwarding API credentials to the upload host", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(
      response({
        upload_method: "PUT",
        public_url: "https://media.sume.com/upload.png",
        upload_url: "https://uploads.fixture.test/signed",
        content_type: "image/png",
        upload_headers: { "Content-Type": "image/png" },
      })
    )
  const ticket = await client(fetch).createUpload("image/png", 68, "sample.png")
  expect(ticket.upload_headers).toEqual({ "Content-Type": "image/png" })
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
    content_type: "image/png",
    size_bytes: 68,
    filename: "sample.png",
  })
  expect(fetch).toHaveBeenCalledTimes(1)
})
