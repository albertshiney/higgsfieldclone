import { expect, test } from "./fixtures"

import { dismissCookies, signIn, uniqueEmail } from "./helpers"

const consent = () =>
  localStorage.setItem(
    "vireo.consent.v1",
    JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      at: 0,
    })
  )

test("user B can't read user A's generation status or open A's project", async ({
  browser,
}) => {
  const a = await browser.newContext()
  await a.addInitScript(consent)
  const pageA = await a.newPage()
  await signIn(pageA, uniqueEmail("owner-a"), "/assets")
  await dismissCookies(pageA)
  await pageA.getByRole("button", { name: "New project" }).click()
  await pageA.getByRole("textbox").last().fill("Private project")
  await pageA.getByRole("button", { name: "Create" }).click()
  await expect(pageA).toHaveURL(/\/projects\/[a-f0-9]{24}/)
  const projectUrl = pageA.url()

  await pageA.goto("/image?model=soul-2")
  await pageA
    .getByRole("textbox", { name: /Describe the scene/ })
    .fill("Owner-only image")
  await pageA.getByRole("button", { name: /^Generate/ }).click()
  await expect
    .poll(
      async () =>
        (
          (await (await pageA.request.get("/api/generations")).json()) as {
            items: unknown[]
          }
        ).items.length
    )
    .toBeGreaterThan(0)
  const list = (await (await pageA.request.get("/api/generations")).json()) as {
    items: { id: string }[]
  }
  const id = list.items[0]!.id

  const b = await browser.newContext()
  await b.addInitScript(consent)
  const pageB = await b.newPage()
  await signIn(pageB, uniqueEmail("intruder-b"), "/video")
  const status = (await (
    await pageB.request.get(`/api/generations/status?ids=${id}`)
  ).json()) as { items: unknown[] }
  expect(status.items).toEqual([])
  const response = await pageB.goto(projectUrl)
  expect(response?.status()).toBe(404)
  const anonymous = await (
    await browser.newContext()
  ).request.get(
    new URL(`/api/generations/status?ids=${id}`, pageA.url()).toString()
  )
  expect(anonymous.status()).toBe(401)
  await a.close()
  await b.close()
})

test("dialog controls cannot receive clicks before client scripts run", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto("/video")
    await expect(
      page.getByRole("button", { name: "Sign up", exact: true }).first()
    ).toBeDisabled()
    await expect(
      page.getByRole("button", {
        name: "Open menu",
        exact: true,
        includeHidden: true,
      })
    ).toBeDisabled()
    await signIn(page, uniqueEmail("before-hydration"), "/assets")
    await expect(
      page.getByRole("button", { name: "New project" })
    ).toBeDisabled()
    await page.goto("/video")
    await expect(
      page.getByRole("button", { name: "Change", exact: true })
    ).toHaveCount(0)
  } finally {
    await context.close()
  }
})
