/** Request statuses, per https://docs.higgsfield.ai/docs/concepts/requests */
export type PlatformStatus =
  "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled"

export const PLATFORM_TERMINAL: ReadonlySet<string> = new Set([
  "completed",
  "failed",
  "nsfw",
  "canceled",
])

export type QueuedRequest = {
  status: string
  requestId: string
  costUsd?: number
  statusUrl: string
  cancelUrl: string
}

export type PlatformArtifact = {
  kind: "image" | "video" | "audio" | "file"
  url: string
  contentType?: string
}

export type RequestStatus = {
  status: string
  requestId: string
  artifacts: PlatformArtifact[]
  costUsd?: number
  providerRefunded?: boolean
  error?: string
}

export type UploadTicket = {
  upload_url: string
  public_url: string
  content_type: string
  upload_headers: Record<string, string>
}

export type Estimate = { credits: number; usd: number }
