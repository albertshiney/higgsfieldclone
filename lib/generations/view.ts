import type { MediaKind, MediaRole, Surface } from "@/generation/catalog/types"

/** What the browser sees of a generation (no request bodies, no platform ids). */
export type GenerationStatusView =
  | "pending_submit"
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw"
  | "canceled"

export interface OutputView {
  kind: MediaKind
  url: string
  width?: number
  height?: number
  durationSec?: number
}

export interface GenerationView {
  id: string
  surface: Surface
  modelId: string
  modelLabel: string
  prompt: string
  settings: Record<string, unknown>
  media: { role: MediaRole; kind: MediaKind; url: string; name?: string }[]
  status: GenerationStatusView
  cost: number
  refunded: number
  canCancel?: boolean
  outputs: OutputView[]
  aspect: number
  error?: string
  errorKind?: string
  isPublic: boolean
  projectId?: string
  presetId?: string
  createdAt: number
  finishedAt?: number
}

export const IN_FLIGHT_VIEW: ReadonlySet<GenerationStatusView> = new Set([
  "pending_submit",
  "queued",
  "in_progress",
])

export function isInFlight(status: GenerationStatusView): boolean {
  return IN_FLIGHT_VIEW.has(status)
}

export interface UploadView {
  id: string
  kind: MediaKind
  url: string
  name: string
  width?: number
  height?: number
  durationSec?: number
  createdAt: number
}

export interface ProjectView {
  id: string
  name: string
  generationCount: number
  cover?: string
  updatedAt: number
  createdAt: number
}
