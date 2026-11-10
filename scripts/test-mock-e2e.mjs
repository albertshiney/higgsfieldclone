import { spawnSync } from "node:child_process"
const provider = new URL(
  process.env.HF_API_BASE_URL || "https://api.higgsfield.ai"
)
const app = new URL(
  process.env.E2E_BASE_URL || process.env.APP_URL || "http://localhost:3000"
)
if (
  !["http://localhost:4010", "http://127.0.0.1:4010"].includes(provider.origin)
)
  throw new Error(
    "Fixture tests require the local mock provider. No paid generation is allowed."
  )
if (!["localhost", "127.0.0.1", "[::1]"].includes(app.hostname))
  throw new Error("Fixture tests require a loopback studio.")
const child = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      HF_CREDENTIALS: "mock:mock",
      SUME_API_KEY: "",
      MUAPI_API_KEY: "",
      MUAPIAPP_API_KEY: "",
      MUAPI_SANDBOX_API_KEY: "",
      HF_API_BASE_URL: provider.origin,
    },
  }
)
process.exitCode = child.status ?? 1
