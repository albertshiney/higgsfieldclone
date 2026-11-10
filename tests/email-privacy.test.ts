import { createElement } from "react"
import { afterEach, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  insertOne: vi.fn(async () => ({ acknowledged: true })),
}))

vi.mock("@/lib/db/collections", () => ({
  collections: async () => ({ devMailbox: { insertOne: mocks.insertOne } }),
}))
vi.mock("@/lib/env", () => ({
  env: () => ({
    NODE_ENV: "development",
    E2E_TEST_MODE: true,
    AUTH_RESEND_KEY: undefined,
  }),
}))

import { sendEmail } from "@/lib/email/send"

afterEach(() => vi.restoreAllMocks())

test("development mail retains the sign-in link without disclosing it in logs", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => undefined)
  const url =
    "http://localhost:3000/api/auth/callback/resend?token=fixture-only"
  await sendEmail({
    to: "local-user@example.com",
    subject: "Sign in",
    react: createElement("p", null, "Sign in"),
    text: "Sign in",
    devUrl: url,
  })
  expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({ url }))
  expect(log.mock.calls.flat().join(" ")).not.toContain(url)
  expect(log.mock.calls.flat().join(" ")).not.toContain("fixture-only")
})
