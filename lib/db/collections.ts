import "server-only"

import type { ObjectId } from "mongodb"

import type { MediaKind, MediaRole, Surface } from "@/generation/catalog/types"
import type { PlanId, BillingInterval } from "@/lib/billing/plans"
import type { PriceRule } from "@/lib/billing/pricing-types"

import { db } from "./mongo"

/* ── Users (Auth.js adapter document + our fields) ────────────────────────── */

export type Role = "user" | "admin"
export type CreditBucket = "subscription" | "topup"
export type Credits = Record<CreditBucket, number>

export interface UserDoc {
  _id: ObjectId
  email: string
  name?: string | null
  image?: string | null
  emailVerified?: Date | null
  role: Role
  credits: Credits
  plan: PlanId
  planInterval?: BillingInterval
  planStatus?: string
  planRenewsAt?: Date
  /** Plan allowance granted per month (annual plans get monthly grants). */
  subscriptionAllowance?: number
  /** Next monthly grant for annual subscriptions. */
  nextGrantAt?: Date
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  /** Set when a charge was refunded after its credits were spent. */
  billingFlag?: { reason: string; at: Date }
  createdAt: Date
}

/* ── Generations ─────────────────────────────────────────────────────────── */

export type GenerationStatus =
  | "pending_submit"
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw"
  | "canceled"

export const IN_FLIGHT: readonly GenerationStatus[] = [
  "pending_submit",
  "queued",
  "in_progress",
]
export const TERMINAL: readonly GenerationStatus[] = [
  "completed",
  "failed",
  "nsfw",
  "canceled",
]

export interface GenerationMedia {
  role: MediaRole
  kind: MediaKind
  url: string
  name?: string
}

export interface GenerationOutput {
  kind: MediaKind
  url: string
  key: string
  contentType: string
  bytes?: number
  width?: number
  height?: number
  durationSec?: number
  /** Where the bytes live: our bucket, or the platform CDN while a copy is pending. */
  storage: "r2" | "local" | "platform"
  /** Original platform URL; used as a fetchable input when storage is local. */
  platformUrl?: string
}

export interface GenerationDoc {
  _id: ObjectId
  userId: ObjectId
  projectId?: ObjectId | null
  /** One per Generate press; unique per user so double submits collapse. */
  submitKey: string
  surface: Surface
  modelId: string
  modelLabel: string
  modelPath: string
  requestBody: Record<string, unknown>
  prompt: string
  settings: Record<string, unknown>
  media: GenerationMedia[]
  status: GenerationStatus
  hfRequestId?: string
  provider?: "higgsfield" | "muapi" | "sume"
  providerCostUsd?: number
  providerRefunded?: boolean
  /** Credits charged, and how they split across buckets. */
  cost: number
  costSplit: Credits
  /** Credits returned so far (partial adjustments and full refunds). */
  refunded: number
  /** USD our price was based on (for margin reporting). */
  priceUsd: number
  /** How the charge was computed; provisional units are trued up at finalize. */
  billing: {
    units: number
    provisional: boolean
    creditsPerUnit: number
    /** units = unitScale × source seconds + unitOffset (absent: 1 and 0). */
    unitScale?: number
    unitOffset?: number
    /** Flat per-item credits (e.g. extra references), outside the units. */
    extraCredits?: number
  }
  outputs: GenerationOutput[]
  aspect: number
  error?: string
  errorKind?: "failed" | "nsfw" | "canceled" | "submit" | "timeout"
  isPublic: boolean
  publishedAt?: Date
  unpublishedByAdmin?: boolean
  presetId?: string
  createdAt: Date
  updatedAt: Date
  submittedAt?: Date
  finishedAt?: Date
  /** Finalizer lease so two finalizers never copy the same outputs. */
  finalizeLeaseUntil?: Date
  finalizeAttempts: number
}

/* ── Everything else ─────────────────────────────────────────────────────── */

export interface ProjectDoc {
  _id: ObjectId
  userId: ObjectId
  name: string
  coverGenerationId?: ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface UploadDoc {
  _id: ObjectId
  userId: ObjectId
  kind: MediaKind
  /** URL the platform can fetch (our bucket copy when available). */
  url: string
  /** Original platform storage URL (temporary retention). */
  platformUrl: string
  key?: string
  contentType: string
  bytes: number
  name: string
  width?: number
  height?: number
  durationSec?: number
  createdAt: Date
}

export type LedgerReason =
  | "generation_debit"
  | "generation_refund"
  | "generation_adjust"
  | "subscription_grant"
  | "subscription_reset"
  | "topup_purchase"
  | "signup_bonus"
  | "admin_adjust"
  | "stripe_refund"

export interface LedgerDoc {
  _id: ObjectId
  userId: ObjectId
  delta: number
  bucket: CreditBucket
  reason: LedgerReason
  refType: string
  refId: string
  balanceAfter: Credits
  note?: string
  actorId?: ObjectId
  createdAt: Date
}

export interface StripeEventDoc {
  _id: string
  type: string
  processedAt: Date
}

export interface HfWebhookEventDoc {
  _id: ObjectId
  requestId: string
  status: string
  generationId?: ObjectId
  receivedAt: Date
}

export interface PresetDoc {
  _id: ObjectId
  slug: string
  title: string
  description: string
  surface: Surface
  modelId: string
  promptTemplate: string
  settings: Record<string, unknown>
  coverUrl: string
  coverVideoUrl?: string
  category: string
  order: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ModelPricingDoc {
  _id: ObjectId
  modelId: string
  enabled: boolean
  /** Per-endpoint overrides keyed by platform path. */
  rules?: Record<string, PriceRule>
  /** Set by the estimate guard when live cost exceeded our price. */
  repriceNeeded?: { path: string; liveUsd: number; ourUsd: number; at: Date }
  note?: string
  updatedAt: Date
}

export interface RateLimitDoc {
  _id: string
  count: number
  expiresAt: Date
}

export interface ReportDoc {
  _id: ObjectId
  generationId: ObjectId
  reporterId: ObjectId | null
  reason: string
  details?: string
  status: "open" | "dismissed" | "actioned"
  createdAt: Date
}

export interface DevMailDoc {
  _id: ObjectId
  to: string
  subject: string
  url: string
  createdAt: Date
}

/* ── Typed accessors ─────────────────────────────────────────────────────── */

export async function collections() {
  const database = await db()
  return {
    users: database.collection<UserDoc>("users"),
    generations: database.collection<GenerationDoc>("generations"),
    projects: database.collection<ProjectDoc>("projects"),
    uploads: database.collection<UploadDoc>("uploads"),
    ledger: database.collection<LedgerDoc>("credit_ledger"),
    stripeEvents: database.collection<StripeEventDoc>("stripe_events"),
    hfWebhookEvents:
      database.collection<HfWebhookEventDoc>("hf_webhook_events"),
    presets: database.collection<PresetDoc>("presets"),
    modelPricing: database.collection<ModelPricingDoc>("model_pricing"),
    rateLimits: database.collection<RateLimitDoc>("rate_limits"),
    reports: database.collection<ReportDoc>("reports"),
    devMailbox: database.collection<DevMailDoc>("dev_mailbox"),
    sessions: database.collection<{
      userId: ObjectId
      expires: Date
      sessionToken: string
    }>("sessions"),
  }
}

export type Collections = Awaited<ReturnType<typeof collections>>
