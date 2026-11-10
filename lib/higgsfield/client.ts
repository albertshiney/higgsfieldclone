import "server-only"

import {
  parseUploadTicket,
  requireUploadContentType,
} from "@/generation/upload-contract"
import { env } from "@/lib/env"

import type {
  Estimate,
  PlatformArtifact,
  QueuedRequest,
  RequestStatus,
  UploadTicket,
} from "./types"

/**
 * Thin server-side client for the Higgsfield REST API
 * (https://docs.higgsfield.ai/docs/api-reference/overview). Adapted from the
 * template's generation/platform.ts: one platform key from the environment,
 * retries with exponential backoff + full jitter for safe calls, and no
 * automatic retry of an ambiguous submit (the API has no idempotency key).
 */

const UPLOAD_PATH = "/files/generate-upload-url"
const MODEL_PATH = /^[a-z0-9][a-z0-9._/-]*$/i

/**
 * Token-metered models answer POST /estimate with
 * `{type: "description", pricing_description}` instead of numbers; their
 * rules are derived by hand (lib/billing/pricing-table.ts).
 */
export class EstimateDescriptionError extends Error {
  readonly description: string
  constructor(description: string) {
    super("This endpoint is priced by description, not by estimate")
    this.name = "EstimateDescriptionError"
    this.description = description
  }
}

export class PlatformError extends Error {
  readonly status: number
  readonly body: unknown
  readonly correlationId?: string

  constructor(status: number, body: unknown, correlationId?: string) {
    super(messageFromBody(status, body))
    this.name = "PlatformError"
    this.status = status
    this.body = body
    this.correlationId = correlationId
  }
}

/** The request may or may not have reached the platform (timeout, network, 502/504). */
export class AmbiguousSubmitError extends Error {
  constructor(readonly cause: unknown) {
    super("The platform did not confirm the submission.")
    this.name = "AmbiguousSubmitError"
  }
}

export class PlatformNotConfiguredError extends Error {
  constructor() {
    super("HF_CREDENTIALS is not set, so generation is disabled.")
    this.name = "PlatformNotConfiguredError"
  }
}

export type ClientOptions = {
  credentials: string
  baseUrl: string
  fetch?: typeof fetch
  /** Per-attempt timeout. */
  timeoutMs?: number
  sleep?: (ms: number) => Promise<void>
}

const SAFE_RETRY = new Set([429, 500, 502, 503, 504])
const SUBMIT_RETRY = new Set([429, 500, 503])

export function isModelPath(path: string): boolean {
  return MODEL_PATH.test(path) && !path.includes("..") && !path.startsWith("/")
}

export function createHiggsfieldClient(options: ClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "")
  const fetchImpl = options.fetch ?? fetch
  const timeoutMs = options.timeoutMs ?? 20_000
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
  if (!/^[^:\s]+:[^:\s]+$/.test(options.credentials))
    throw new Error("HF_CREDENTIALS must be key_id:key_secret")
  const authorization = `Key ${options.credentials}`

  async function once(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>
  ): Promise<{ status: number; payload: unknown; correlationId?: string }> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: authorization,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
        cache: "no-store",
      })
      const payload = await readJson(response)
      return {
        status: response.status,
        payload,
        correlationId: response.headers.get("x-correlation-id") ?? undefined,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  /** Retries network errors and retryable statuses with full-jitter backoff. */
  async function withRetry(
    method: "GET" | "POST",
    path: string,
    body: Record<string, unknown> | undefined,
    retryable: Set<number>,
    retryNetwork: boolean,
    attempts = 3
  ) {
    let lastError: unknown
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await sleep(Math.random() * 400 * 2 ** attempt)
      try {
        const result = await once(method, path, body)
        if (result.status >= 200 && result.status < 300) return result.payload
        const error = new PlatformError(
          result.status,
          result.payload,
          result.correlationId
        )
        if (!retryable.has(result.status)) throw error
        lastError = error
      } catch (caught) {
        if (caught instanceof PlatformError) throw caught
        if (!retryNetwork) throw new AmbiguousSubmitError(caught)
        lastError = caught
      }
    }
    throw lastError
  }

  return {
    /** POST /{path}. Retries only answers that prove nothing was created. */
    async submit(
      path: string,
      body: Record<string, unknown>,
      webhookUrl?: string,
      ...providerOptions: unknown[]
    ): Promise<QueuedRequest> {
      void providerOptions
      if (!isModelPath(path))
        throw new PlatformError(400, { detail: "Invalid model path" })
      const query = webhookUrl
        ? `?hf_webhook=${encodeURIComponent(webhookUrl)}`
        : ""
      try {
        return mapQueued(
          await withRetry("POST", `/${path}${query}`, body, SUBMIT_RETRY, false)
        )
      } catch (caught) {
        // A gateway error after the body was sent is as ambiguous as a timeout.
        if (
          caught instanceof PlatformError &&
          (caught.status === 502 || caught.status === 504)
        )
          throw new AmbiguousSubmitError(caught)
        throw caught
      }
    },

    async status(requestId: string): Promise<RequestStatus> {
      return mapStatus(
        await withRetry(
          "GET",
          `/requests/${encodeURIComponent(requestId)}/status`,
          undefined,
          SAFE_RETRY,
          true
        )
      )
    },

    /** Queued requests only: 202 → canceled; 400 → already started. */
    async cancel(requestId: string): Promise<void> {
      await withRetry(
        "POST",
        `/requests/${encodeURIComponent(requestId)}/cancel`,
        undefined,
        SAFE_RETRY,
        true
      )
    },

    async createUpload(contentType: unknown): Promise<UploadTicket> {
      const type = requireUploadContentType(contentType)
      return parseUploadTicket(
        await withRetry(
          "POST",
          UPLOAD_PATH,
          { content_type: type },
          SAFE_RETRY,
          true
        ),
        type
      )
    },

    /** POST /estimate/{path} (docs: concepts/billing-and-retention). */
    async estimate(
      path: string,
      body: Record<string, unknown>
    ): Promise<Estimate> {
      if (!isModelPath(path))
        throw new PlatformError(400, { detail: "Invalid model path" })
      const payload = asRecord(
        await withRetry("POST", `/estimate/${path}`, body, SAFE_RETRY, true, 2)
      )
      if (payload.type === "description")
        throw new EstimateDescriptionError(
          String(payload.pricing_description ?? "")
        )
      const credits = Number(payload.credits)
      const usd = Number(payload.usd)
      if (!Number.isFinite(usd))
        throw new PlatformError(502, { detail: "Estimate missing usd" })
      return { credits: Number.isFinite(credits) ? credits : 0, usd }
    },
  }
}

export type HiggsfieldClient = ReturnType<typeof createHiggsfieldClient>

let shared: HiggsfieldClient | undefined

/** The platform client configured from env; throws when unconfigured. */
export function higgsfield(): HiggsfieldClient {
  if (shared) return shared
  const value = env()
  if (!value.HF_CREDENTIALS) throw new PlatformNotConfiguredError()
  shared = createHiggsfieldClient({
    credentials: value.HF_CREDENTIALS,
    baseUrl: value.HF_API_BASE_URL,
  })
  return shared
}

/** Tests inject a client backed by a fake fetch. */
export function setHiggsfieldClientForTests(client?: HiggsfieldClient): void {
  shared = client
}

/* ── Response mapping ─────────────────────────────────────────────────────── */

function mapQueued(payload: unknown): QueuedRequest {
  const data = asRecord(payload)
  const requestId = stringField(data, "request_id")
  if (!requestId)
    throw new AmbiguousSubmitError(
      new PlatformError(502, { detail: "Response missing request_id" })
    )
  return {
    status: stringField(data, "status") ?? "queued",
    requestId,
    statusUrl: stringField(data, "status_url") ?? "",
    cancelUrl: stringField(data, "cancel_url") ?? "",
  }
}

/** Platform media is HTTPS; the local mock serves http://localhost outside production. */
export function isAllowedMediaUrl(url: string): boolean {
  if (url.startsWith("https://")) return true
  return (
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)
  )
}

/** Status or webhook payload → artifacts. Handles images/video/audio/audios and extra files. */
export function extractArtifacts(source: unknown): PlatformArtifact[] {
  const data = asRecord(source)
  const out: PlatformArtifact[] = []
  const push = (kind: PlatformArtifact["kind"], item: unknown) => {
    const record = asRecord(item)
    const url = record.url
    if (typeof url === "string" && isAllowedMediaUrl(url))
      out.push({
        kind,
        url,
        ...(typeof record.content_type === "string"
          ? { contentType: record.content_type }
          : {}),
      })
  }
  if (Array.isArray(data.images)) data.images.forEach((i) => push("image", i))
  if (data.video) push("video", data.video)
  if (Array.isArray(data.audios) && data.audios.length)
    data.audios.forEach((a) => push("audio", a))
  else if (data.audio) push("audio", data.audio)
  for (const key of ["zip", "mov", "jsx", "fbx", "ply"]) {
    if (data[key]) push("file", data[key])
  }
  return out
}

function mapStatus(payload: unknown): RequestStatus {
  const data = asRecord(payload)
  const error = data.error
  return {
    status: stringField(data, "status") ?? "unknown",
    requestId: stringField(data, "request_id") ?? "",
    artifacts: extractArtifacts(data),
    ...(typeof error === "string" && error ? { error } : {}),
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringField(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  const field = value[key]
  return typeof field === "string" ? field : undefined
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function messageFromBody(status: number, body: unknown): string {
  const detail = asRecord(body).detail
  if (typeof detail === "string" && detail) return detail
  if (Array.isArray(detail) && detail.length) {
    const first = asRecord(detail[0])
    if (typeof first.msg === "string") return first.msg
  }
  return `Platform request failed (${status})`
}
