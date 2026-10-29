// Build-time guard: fail if a server secret (or its key prefix) appears in the
// client bundle. Runs after `next build` (see package.json "build").
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs"
import { join } from "node:path"

const STATIC = join(process.cwd(), ".next", "static")
if (!existsSync(STATIC)) {
  console.log("[secrets] no .next/static — skipped")
  process.exit(0)
}

const PATTERNS = [
  /sk_(live|test)_[0-9a-zA-Z]{10,}/, // Stripe secret keys
  /whsec_[0-9a-zA-Z]{10,}/, // Stripe webhook secrets
  /rk_(live|test)_[0-9a-zA-Z]{10,}/, // Stripe restricted keys
  /re_[0-9a-zA-Z]{8,}_[0-9a-zA-Z]{10,}/, // Resend keys
  /mongodb(\+srv)?:\/\/[^"'\s]*@/, // Mongo URIs with credentials
]
// Exact values of server env vars, when set in this build's environment.
const SECRET_ENV = [
  "AUTH_SECRET",
  "AUTH_RESEND_KEY",
  "HF_CREDENTIALS",
  "HF_WEBHOOK_SECRET",
  "HF_WEBHOOK_SIGNING_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "CRON_SECRET",
  "MONGODB_URI",
]
const values = SECRET_ENV.map((name) => [name, process.env[name]]).filter(
  ([, value]) => value && value.length >= 8 && value !== "key_id:key_secret"
)

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (/\.(js|css|json|map|txt|html)$/.test(name)) yield path
  }
}

const leaks = []
for (const file of files(STATIC)) {
  const text = readFileSync(file, "utf8")
  for (const pattern of PATTERNS) if (pattern.test(text)) leaks.push(`${file}: matches ${pattern}`)
  for (const [name, value] of values) if (text.includes(value)) leaks.push(`${file}: contains ${name}`)
}
if (leaks.length) {
  console.error("[secrets] Server secrets found in the client bundle:\n" + leaks.join("\n"))
  process.exit(1)
}
console.log("[secrets] client bundle clean")
