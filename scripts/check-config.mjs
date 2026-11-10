const required = ["AUTH_SECRET", "MONGODB_URI", "SUME_API_KEY"]
const optional = [
  "HF_CREDENTIALS",
  "MUAPI_API_KEY",
  "AUTH_RESEND_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
]
const configured = (key) => Boolean(process.env[key]?.trim())
const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
const appUrl = new URL(process.env.APP_URL || "http://localhost:3000")
const providerUrl = new URL(
  process.env.SUME_API_BASE_URL || "https://api.sume.com"
)
const mongoUri = process.env.MONGODB_URI || ""
const providerMode = localHosts.has(providerUrl.hostname)
  ? "mock"
  : configured("SUME_API_KEY")
    ? "live"
    : "unconfigured"
const databaseMode = /^mongodb:\/\/(127\.0\.0\.1|localhost):27027\//.test(
  mongoUri
)
  ? "local"
  : configured("MONGODB_URI")
    ? "remote"
    : "missing"
const missing = required.filter((key) => !configured(key))
const unsafeTestMode =
  process.env.E2E_TEST_MODE === "true" && !localHosts.has(appUrl.hostname)
const report = {
  source: "Infisical runtime injection",
  providerMode,
  databaseMode,
  required: Object.fromEntries(required.map((key) => [key, configured(key)])),
  optional: Object.fromEntries(optional.map((key) => [key, configured(key)])),
  missing,
  unsafeTestMode,
}
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report))
} else {
  console.log(`Configuration source: ${report.source}`)
  console.log(
    `Generation mode: ${providerMode}${providerMode === "mock" ? " (demo, no real Higgsfield requests)" : ""}`
  )
  console.log(`Database mode: ${databaseMode}`)
  for (const [key, present] of Object.entries({
    ...report.required,
    ...report.optional,
  }))
    console.log(`${key}: ${present ? "configured" : "missing"}`)
  if (unsafeTestMode)
    console.error(
      "E2E_TEST_MODE must not expose the development mailbox on a non-local app origin."
    )
}
if (missing.length || unsafeTestMode) process.exitCode = 1
