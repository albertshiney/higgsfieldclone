import { MODELS, parseSettings } from "../generation/catalog"
import { toPlatform } from "../generation/to-platform"
import { env } from "../lib/env"
import { muapi } from "../lib/muapi/client"
const config = env()
if (config.MUAPI_API_BASE_URL !== "https://api.muapi.ai/api/v1")
  throw new Error("This check requires the official MuAPI origin.")
if (!config.MUAPI_API_KEY) {
  console.log("MuAPI account access: blocked, MUAPI_API_KEY is missing.")
  process.exitCode = 1
} else {
  try {
    const response = await fetch(
      config.MUAPI_API_BASE_URL + "/account/balance",
      {
        headers: { "x-api-key": config.MUAPI_API_KEY },
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      }
    )
    const data = response.ok
      ? ((await response.json()) as { balance?: unknown })
      : null
    const valid =
      data && typeof data.balance === "number" && Number.isFinite(data.balance)
    console.log(
      JSON.stringify({
        accountAccess: valid ? "verified" : "unverified",
        httpStatus: response.status,
      })
    )
    if (!valid) process.exitCode = 1
  } catch {
    console.log("MuAPI account access: unverified, connection failed.")
    process.exitCode = 1
  }
}
for (const model of MODELS.filter((model) => model.apiProvider === "muapi")) {
  const request = toPlatform({
    model: model.id,
    prompt: { text: "A cinematic scene at sunset" },
    media: {},
    settings: parseSettings(model, {}),
  })
  try {
    const estimate = await muapi().estimate(request.path, request.body)
    console.log(
      JSON.stringify({
        model: model.id,
        usd: estimate.usd,
        withinCap: estimate.usd <= config.GENERATION_MAX_USD,
      })
    )
  } catch {
    console.log(JSON.stringify({ model: model.id, estimate: "unverified" }))
    process.exitCode = 1
  }
}
