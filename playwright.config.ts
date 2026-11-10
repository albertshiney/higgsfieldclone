if (
  process.env.MUAPI_API_KEY &&
  (process.env.MUAPI_API_KEY !== "fixture-only" ||
    process.env.MUAPI_API_BASE_URL !== "http://127.0.0.1:4011/api/v1")
)
  throw new Error(
    "MuAPI browser tests require the isolated loopback fixture and dummy credential."
  )
if (process.env.SUME_API_KEY && (process.env.SUME_API_KEY !== "fixture-only" || process.env.SUME_API_BASE_URL !== "http://127.0.0.1:4012")) throw new Error("Sume browser tests require an isolated loopback fixture.")
import { defineConfig, devices } from "@playwright/test"

if (process.env.HF_CREDENTIALS && process.env.HF_CREDENTIALS !== "mock:mock")
  throw new Error(
    "Browser tests require the dummy mock credential. Paid-provider credentials must not be used for fixture tests."
  )
if (
  process.env.HF_API_BASE_URL &&
  !["http://localhost:4010", "http://127.0.0.1:4010"].includes(
    process.env.HF_API_BASE_URL.replace(/\/$/, "")
  )
)
  throw new Error(
    "Browser tests require the local mock API. No paid generation is permitted by this test suite."
  )

/** Fixture tests run against the local mock stack started by pnpm dev:local. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "off",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
})
