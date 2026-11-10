import { pathToFileURL } from "node:url"
import {
  config,
  higgsfield,
  APIError,
  AuthenticationError,
  TimeoutError,
} from "@higgsfield/client/v2"

export class SeedanceRunError extends Error {}

export async function runSeedance(): Promise<string> {
  const credentials = process.env.HF_CREDENTIALS?.trim()
  if (
    !credentials ||
    credentials === "mock:mock" ||
    credentials === "key_id:key_secret" ||
    !/^[^:\s]+:[^:\s]+$/.test(credentials)
  )
    throw new SeedanceRunError(
      "A real HF_CREDENTIALS value is required. Enter it locally or inject it from Infisical. Its value will not be displayed."
    )

  config({
    credentials,
    baseURL: "https://api.higgsfield.ai",
    maxRetries: 0,
    timeout: 60_000,
    pollInterval: 3_000,
    maxPollTime: 15 * 60_000,
  })
  const result = await higgsfield.subscribe(
    "bytedance/seedance-2.5/text-to-video",
    {
      input: {
        prompt: "A cinematic scene at sunset",
        duration: 5,
        resolution: "720p",
        aspect_ratio: "16:9",
      },
      withPolling: true,
    }
  )
  const status: string = result.status
  if (status !== "completed") {
    const outcome = [
      "failed",
      "canceled",
      "cancelled",
      "nsfw",
      "moderated",
    ].includes(status)
      ? status
      : "unconfirmed"
    throw new SeedanceRunError(
      `Generation did not succeed (${outcome}). No successful video is being reported.`
    )
  }
  const video = result.video?.url
  if (!video)
    throw new SeedanceRunError(
      "The provider reported completion without a video URL. Success could not be verified."
    )
  let parsed: URL
  try {
    parsed = new URL(video)
  } catch {
    throw new SeedanceRunError("The provider returned an invalid video URL.")
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    throw new SeedanceRunError(
      "The provider returned an unsupported video URL."
    )
  return video
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(await runSeedance())
  } catch (error: unknown) {
    if (error instanceof SeedanceRunError) console.error(error.message)
    else if (error instanceof TimeoutError)
      console.error(
        "Completion was not confirmed before the timeout. The request may still be billable. Check the provider dashboard before running again."
      )
    else if (error instanceof AuthenticationError)
      console.error(
        "Higgsfield rejected authentication. Credential details were withheld."
      )
    else if (error instanceof APIError)
      console.error(
        `Higgsfield rejected the request${typeof error.statusCode === "number" ? ` (HTTP ${error.statusCode})` : ""}. No successful generation was verified.`
      )
    else
      console.error(
        "The SDK request did not complete successfully. Error details were withheld to protect credentials. Check the provider dashboard before running again."
      )
    process.exitCode = 1
  }
}
