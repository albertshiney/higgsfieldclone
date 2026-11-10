import { getModel, parseSettings } from "../generation/catalog"
import { toPlatform } from "../generation/to-platform"
import {
  higgsfield,
  EstimateDescriptionError,
  PlatformError,
} from "../lib/higgsfield/client"
if (process.env.HF_API_BASE_URL !== "https://api.higgsfield.ai")
  throw new Error(
    "Configure the official live API origin before this non-generating check."
  )
const client = higgsfield()

for (const id of ["minimax-h3", "wan-2.6", "seedance-2"]) {
  const model = getModel(id)
  const request = toPlatform({
    model: id,
    prompt: { text: "A cinematic scene at sunset" },
    media: {},
    settings: parseSettings(model, {}),
  })
  try {
    const estimate = await client.estimate(request.path, request.body)
    console.log(
      JSON.stringify({
        model: id,
        path: request.path,
        usd: estimate.usd,
        duration: request.body.duration,
        resolution: request.body.resolution,
      })
    )
  } catch (error) {
    if (error instanceof EstimateDescriptionError)
      console.log(
        JSON.stringify({ model: id, pricingDescription: error.description })
      )
    else {
      console.error(
        JSON.stringify({
          model: id,
          status: error instanceof PlatformError ? error.status : "unconfirmed",
        })
      )
      process.exitCode = 1
    }
  }
}
