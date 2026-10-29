import "server-only"

import { z } from "zod"

/**
 * Server environment, validated once with zod. Production requires every
 * service; development allows documented fallbacks (magic links in the log,
 * media on local disk, the mock Higgsfield server) and says so once.
 */

const bool = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) =>
      value === undefined ? fallback : value === "true" || value === "1"
    )

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : undefined))

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url().default("http://localhost:3000"),

  AUTH_SECRET: optionalString,
  AUTH_RESEND_KEY: optionalString,
  EMAIL_FROM: z.string().default("Vireo <login@vireo.studio>"),
  SUPPORT_EMAIL: z.email().default("support@vireo.studio"),
  SIGNUP_BONUS_CREDITS: z.coerce.number().int().min(0).default(0),
  /** Comma-separated emails that get the admin role. */
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  BLOCK_DISPOSABLE_EMAIL: bool(true),

  MONGODB_URI: optionalString,
  MONGODB_DB: z.string().default("vireo-studio"),

  HF_API_BASE_URL: z.url().default("https://api.higgsfield.ai"),
  HF_CREDENTIALS: optionalString.refine(
    (value) => value === undefined || /^[^:\s]+:[^:\s]+$/.test(value),
    "HF_CREDENTIALS must be key_id:key_secret"
  ),
  HF_WEBHOOK_SECRET: optionalString,
  HF_WEBHOOK_SIGNING_SECRET: optionalString.refine(
    (value) => value === undefined || /^whsec_[A-Za-z0-9+/]+={0,2}$/.test(value),
    "HF_WEBHOOK_SIGNING_SECRET must be the whsec_ secret from Higgsfield Console"
  ),
  HF_WEBHOOK_BASE_URL: optionalString,
  HF_PRICE_GUARD: bool(true),

  CREDIT_USD_VALUE: z.coerce.number().positive().default(0.01),
  CREDIT_MARKUP: z.coerce.number().min(1).default(2),
  RUN_TIMEOUT_MINUTES: z.coerce.number().int().min(5).default(30),

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,

  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,
  R2_PUBLIC_BASE_URL: optionalString,
  /** Overrides the R2 endpoint (e.g. MinIO in local dev). */
  R2_ENDPOINT: optionalString,

  CRON_SECRET: optionalString,
  /** Test-only hooks (dev mailbox route). Never honoured on the production deployment. */
  E2E_TEST_MODE: bool(false),
  /** Required header value for the test mailbox outside development (preview deploys). */
  E2E_SECRET: optionalString,
})

export type Env = z.infer<typeof schema>

const REQUIRED_IN_PRODUCTION = [
  "AUTH_SECRET",
  "AUTH_RESEND_KEY",
  "MONGODB_URI",
  "HF_CREDENTIALS",
  "HF_WEBHOOK_SECRET",
  "HF_WEBHOOK_SIGNING_SECRET",
  "HF_WEBHOOK_BASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "CRON_SECRET",
] as const satisfies readonly (keyof Env)[]

export class EnvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EnvError"
  }
}

let cached: Env | undefined
let warned = false

export function env(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `  • ${issue.path.join(".")}: ${issue.message}`
    )
    throw new EnvError(`Invalid environment:\n${lines.join("\n")}`)
  }
  const value = parsed.data
  if (value.NODE_ENV === "production" && !isBuildPhase()) {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !value[key])
    if (missing.length)
      throw new EnvError(
        `Missing required production environment variables:\n${missing
          .map((key) => `  • ${key}`)
          .join("\n")}\nSee .env.example for what each one does.`
      )
  }
  if (value.NODE_ENV !== "production" && !warned) {
    warned = true
    const fallbacks = [
      !value.MONGODB_URI &&
        "MONGODB_URI unset → run `pnpm db:dev` for a local replica set",
      !value.AUTH_RESEND_KEY &&
        "AUTH_RESEND_KEY unset → magic links are printed to this log",
      !value.HF_CREDENTIALS &&
        "HF_CREDENTIALS unset → generation is disabled (use `pnpm mock:higgsfield` + HF_CREDENTIALS=mock:mock)",
      !r2Configured(value) &&
        "R2 unset → media is stored under .data/media and served by /api/media",
      !value.STRIPE_SECRET_KEY &&
        "STRIPE_SECRET_KEY unset → checkout is disabled",
      !value.HF_WEBHOOK_BASE_URL &&
        "HF_WEBHOOK_BASE_URL unset → no webhooks; the reconciler finishes runs",
    ].filter(Boolean)
    for (const line of fallbacks) console.warn(`[env] ${line}`)
  }
  cached = value
  return value
}

export function r2Configured(value: Env = env()): boolean {
  return Boolean(
    value.R2_ACCOUNT_ID &&
    value.R2_ACCESS_KEY_ID &&
    value.R2_SECRET_ACCESS_KEY &&
    value.R2_BUCKET &&
    value.R2_PUBLIC_BASE_URL
  )
}

/** `next build` evaluates server modules without runtime secrets. */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build"
}

/** Tests replace process.env between suites. */
export function resetEnvForTests(): void {
  cached = undefined
}
