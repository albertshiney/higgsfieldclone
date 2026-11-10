import "server-only"
import { env } from "@/lib/env"
import { UserFacingError } from "@/lib/errors"
import {
  AmbiguousSubmitError,
  PlatformError,
  PlatformNotConfiguredError,
} from "@/lib/higgsfield/client"
import type {
  Estimate,
  QueuedRequest,
  RequestStatus,
  PlatformArtifact,
  UploadTicket,
} from "@/lib/higgsfield/types"

const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
function https(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid Sume media URL.")
  const url = new URL(value)
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Invalid Sume media URL.")
  return value
}
export function createSumeClient(options: {
  credentials?: string
  baseUrl: string
  fetch?: typeof fetch
}) {
  const base = options.baseUrl.replace(/\/$/, "")
  const origin = new URL(base)
  if (
    base !== "https://api.sume.com" &&
    !(
      process.env.NODE_ENV !== "production" &&
      origin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(origin.hostname)
    )
  )
    throw new Error("Invalid Sume API origin.")
  const fetcher = options.fetch ?? fetch
  async function call(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    key?: string,
    authenticated = true
  ) {
    if (authenticated && !options.credentials)
      throw new PlatformNotConfiguredError()
    const response = await fetcher(base + path, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        "Content-Type": "application/json",
        ...(authenticated
          ? { Authorization: "Bearer " + options.credentials }
          : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok)
      throw new PlatformError(response.status, {
        detail: "Sume rejected the request.",
      })
    return record(record(await response.json()).data)
  }
  function pathOf(path: string) {
    if (
      !["v1/image-router/generate", "v1/video-router/generate"].includes(path)
    )
      throw new PlatformError(400, { detail: "Invalid Sume route." })
    return "/" + path
  }
  return {
    async estimate(
      path: string,
      body: Record<string, unknown>
    ): Promise<Estimate> {
      pathOf(path)
      const { model, ...input } = body
      delete input.mode
      const result = await call(
        "POST",
        "/v1/open/estimate",
        { model, input },
        undefined,
        false
      )
      const usd =
        typeof result.usd === "string" && /^\d+(\.\d+)?$/.test(result.usd)
          ? Number(result.usd)
          : NaN
      const billing = record(result.billing)
      if (
        result.model !== model ||
        result.currency !== "USD" ||
        !Number.isFinite(usd) ||
        usd < 0 ||
        result.usd_micros !== Math.round(usd * 1e6) ||
        (input.duration !== undefined &&
          billing.duration_seconds !== input.duration) ||
        (input.duration !== undefined &&
          input.resolution !== undefined &&
          billing.resolution !== input.resolution)
      )
        throw new UserFacingError(
          "Sume could not verify the exact request price. No generation was submitted.",
          "QUOTE_UNAVAILABLE"
        )
      return { usd, credits: 0 }
    },
    async submit(
      path: string,
      body: Record<string, unknown>,
      _webhook?: string,
      idempotencyKey?: string
    ): Promise<QueuedRequest> {
      pathOf(path)
      if (!idempotencyKey || !/^[\x20-\x7E]{1,255}$/.test(idempotencyKey))
        throw new Error("A stable Sume idempotency key is required.")
      let data: Record<string, unknown>
      try {
        data = await call(
          "POST",
          pathOf(path),
          { ...body, mode: "async" },
          idempotencyKey
        )
      } catch (error) {
        if (
          error instanceof PlatformNotConfiguredError ||
          (error instanceof PlatformError &&
            error.status < 500 &&
            error.status !== 408 &&
            error.status !== 409)
        )
          throw error
        throw new AmbiguousSubmitError(
          new Error("Sume submission requires reconciliation.")
        )
      }
      const job = record(data.job)
      if (
        typeof data.request_id !== "string" ||
        !data.request_id ||
        job.model !== body.model
      )
        throw new AmbiguousSubmitError(
          new Error("Sume submission was not confirmed.")
        )
      return {
        requestId: data.request_id,
        status: job.status === "processing" ? "in_progress" : "queued",
        statusUrl: "",
        cancelUrl: "",
      }
    },
    async status(requestId: string): Promise<RequestStatus> {
      const path = "/v1/jobs/" + encodeURIComponent(requestId)
      const data = await call("GET", path + "/status")
      const statuses: Record<string, string> = {
        queued: "queued",
        processing: "in_progress",
        completed: "completed",
        failed: "failed",
        canceled: "canceled",
      }
      const status =
        typeof data.sume_status === "string"
          ? statuses[data.sume_status]
          : undefined
      if (!status)
        throw new PlatformError(502, {
          detail: "Sume returned an unknown job status.",
        })
      const reason =
        record(record(data.job).error).public_reason ??
        record(data.error).public_reason
      if (reason === "content_policy_rejected")
        return { requestId, status: "nsfw", artifacts: [] }
      const artifacts: PlatformArtifact[] = []
      if (status === "completed") {
        const result = await call("GET", path + "/result")
        const items = record(result.result).artifacts
        for (const raw of Array.isArray(items) ? items : []) {
          const item = record(raw)
          if (item.stage && item.stage !== "final") continue
          if (!["image", "video", "audio", "file"].includes(String(item.type)))
            continue
          try {
            artifacts.push({
              kind: item.type as PlatformArtifact["kind"],
              url: https(item.url),
              ...(typeof item.content_type === "string"
                ? { contentType: item.content_type }
                : {}),
            })
          } catch {}
        }
      }
      return {
        requestId,
        status,
        artifacts,
        ...(status === "failed"
          ? { error: "Sume could not complete this generation." }
          : {}),
      }
    },
    async cancel(): Promise<void> {
      throw new UserFacingError(
        "Sume cancellation is not enabled in this studio. The job will continue until a confirmed result.",
        "NOT_CANCELABLE"
      )
    },
    async createUpload(
      contentType: string,
      size: number,
      filename: string
    ): Promise<UploadTicket> {
      const data = await call("POST", "/v1/files/generate-upload-url", {
        content_type: contentType,
        size_bytes: size,
        filename,
      })
      if (data.upload_method !== "PUT" || data.content_type !== contentType)
        throw new Error("Invalid Sume upload ticket.")
      const publicUrl = https(data.public_url)
      if (new URL(publicUrl).hostname !== "media.sume.com")
        throw new Error("Invalid Sume upload host.")
      const headers: Record<string, string> = {}
      for (const [key, value] of Object.entries(record(data.upload_headers))) {
        if (
          typeof value !== "string" ||
          /authorization|api.key|cookie/i.test(key)
        )
          throw new Error("Unsafe Sume upload header.")
        headers[key] = value
      }
      return {
        upload_url: https(data.upload_url),
        public_url: publicUrl,
        content_type: contentType,
        upload_headers: headers,
      }
    },
  }
}
export function sume() {
  const value = env()
  return createSumeClient({
    credentials: value.SUME_API_KEY,
    baseUrl: value.SUME_API_BASE_URL,
  })
}
