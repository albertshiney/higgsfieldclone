import { expect, test } from "./fixtures"
import { signIn, uniqueEmail, balance } from "./helpers"

test.skip(
  process.env.E2E_SUME_FIXTURE !== "true",
  "Requires the isolated Sume fixture launcher."
)

test("Sume displays dollars before submission; dismissal preserves credits", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("sume"), "/video")
  await page.goto("/video?model=sume-seedance-2-mini")
  const field = page.getByRole("textbox", { name: /Prompt|Describe/ }).first()
  await field.fill("A cinematic scene at sunset")
  const before = await balance(page)
  await Promise.all([
    page.waitForEvent("dialog").then(async (dialog) => {
      expect(dialog.message()).toContain("Estimated provider cost: $0.200")
      expect(dialog.message()).toContain("40 credits")
      await dialog.dismiss()
    }),
    page
      .getByRole("button", { name: /^Generate/ })
      .first()
      .click(),
  ])
  await expect(
    page.getByRole("button", { name: /^Generate/ }).first()
  ).toBeEnabled()
  expect(await balance(page)).toBe(before)

  await Promise.all([
    page.waitForEvent("dialog").then((dialog) => dialog.accept()),
    page
      .getByRole("button", { name: /^Generate/ })
      .first()
      .click(),
  ])
  await expect.poll(() => balance(page)).toBe(before - 40)
  await expect(
    page.getByRole("status").filter({ hasText: /Queued|Generating/ })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true })
  ).toHaveCount(0)
  await page.reload()
  expect(await balance(page)).toBe(before - 40)
})
test("Sume refuses over-budget requests without a debit", async ({ page }) => {
  await signIn(page, uniqueEmail("sume-cap"), "/video")
  await page.goto("/video?model=sume-seedance-2-mini")
  const before = await balance(page)
  await page
    .getByRole("textbox", { name: /Prompt|Describe/ })
    .first()
    .fill("[expensive] cinematic scene")
  await page
    .getByRole("button", { name: /^Generate/ })
    .first()
    .click()
  await expect(
    page.getByText(/exceeds.*limit|above.*limit/i).first()
  ).toBeVisible()
  expect(await balance(page)).toBe(before)
})
