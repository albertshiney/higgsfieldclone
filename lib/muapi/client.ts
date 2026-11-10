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
} from "@/lib/higgsfield/types"

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
function costOf(value: unknown): number | undefined {
  const amount = record(value).amount_usd
  return typeof amount === "number" && Number.isFinite(amount) && amount >= 0
    ? amount
    : undefined
}
export function createMuapiClient(options: {
  credentials?: string
  baseUrl: string
  fetch?: typeof fetch
}) {
  const base = options.baseUrl.replace(/\/$/, "")
  const fetcher = options.fetch ?? fetch
  async function call(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    authenticated = true
  ): Promise<Record<string, unknown>> {
    if (authenticated && !options.credentials)
      throw new PlatformNotConfiguredError()
    const response = await fetcher(base + path, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        "Content-Type": "application/json",
        ...(authenticated ? { "x-api-key": options.credentials! } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok)
      throw new PlatformError(response.status, {
        detail: "MuAPI rejected the request.",
      })
    return record(await response.json())
  }
  function modelPath(path: string): string {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(path))
      throw new PlatformError(400, { detail: "Invalid MuAPI model path." })
    return path
  }
  return {
    async estimate(
      path: string,
      body: Record<string, unknown>
    ): Promise<Estimate> {
      const result = await call(
        "POST",
        "/models/" + modelPath(path) + "/estimate-cost",
        body,
        false
      )
      if (
        result.currency !== "USD" ||
        typeof result.cost !== "number" ||
        !Number.isFinite(result.cost) ||
        result.cost < 0
      )
        throw new UserFacingError(
          "MuAPI did not return a valid USD estimate.",
          "QUOTE_UNAVAILABLE"
        )
      return { usd: result.cost, credits: 0 }
    },
    async submit(
      path: string,
      body: Record<string, unknown>
    ): Promise<QueuedRequest> {
      let result: Record<string, unknown>
      try {
        result = await call("POST", "/" + modelPath(path), body)
      } catch (error) {
        if (
          error instanceof PlatformNotConfiguredError ||
          (error instanceof PlatformError &&
            error.status < 500 &&
            error.status !== 408)
        )
          throw error
        throw new AmbiguousSubmitError(
          new Error("MuAPI submission was not confirmed.")
        )
      }
      if (typeof result.request_id !== "string" || !result.request_id)
        throw new AmbiguousSubmitError(
          new Error("MuAPI returned no request ID.")
        )
      return {
        requestId: result.request_id,
        status: "queued",
        statusUrl: "",
        cancelUrl: "",
        costUsd: costOf(result.cost),
      }
    },
    async status(requestId: string): Promise<RequestStatus> {
      const result = await call(
        "GET",
        "/predictions/" + encodeURIComponent(requestId) + "/result"
      )
      const statuses: Record<string, string> = {
        queued: "queued",
        pending: "queued",
        processing: "in_progress",
        completed: "completed",
        failed: "failed",
        cancelled: "canceled",
        canceled: "canceled",
      }
      const status =
        typeof result.status === "string" ? statuses[result.status] : undefined
      if (!status)
        throw new PlatformError(502, {
          detail: "MuAPI returned an unknown request status.",
        })
      const urls: unknown[] = Array.isArray(result.outputs)
        ? result.outputs
        : []
      const video =
        typeof result.video === "string"
          ? result.video
          : record(result.video).url
      if (!urls.length && video) urls.push(video)
      const artifacts: PlatformArtifact[] = []
      for (const item of urls) {
        const url = typeof item === "string" ? item : record(item).url
        if (typeof url !== "string") continue
        try {
          const parsed = new URL(url)
          if (
            parsed.protocol === "https:" &&
            !parsed.username &&
            !parsed.password
          )
            artifacts.push({ kind: "video", url })
        } catch {}
      }
      const moderated =
        status === "completed" &&
        Array.isArray(result.has_nsfw_contents) &&
        result.has_nsfw_contents.some(Boolean)
      return {
        requestId,
        status: moderated ? "nsfw" : status,
        artifacts: moderated ? [] : artifacts,
        ...(status === "failed"
          ? { error: "The provider could not complete this generation." }
          : {}),
        costUsd: costOf(result.cost),
        providerRefunded: record(result.cost).refunded === true,
      }
    },
    async cancel(): Promise<void> {
      throw new UserFacingError(
        "Cancellation is not available for this MuAPI model. The request will continue until the provider reports its result.",
        "NOT_CANCELABLE"
      )
    },
  }
}
export function muapi() {
  const value = env()
  return createMuapiClient({
    credentials: value.MUAPI_API_KEY,
    baseUrl: value.MUAPI_API_BASE_URL,
  })
}
