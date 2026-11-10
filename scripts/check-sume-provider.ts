import { sume } from "../lib/sume/client"
const client = sume()
for (const [path, body] of [
  [
    "v1/video-router/generate",
    {
      model: "seedance-2-mini",
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "480p",
      aspect_ratio: "16:9",
      generate_audio: true,
    },
  ],
  [
    "v1/image-router/generate",
    {
      model: "gpt-image-2",
      prompt: "A cinematic scene at sunset",
      quality: "low",
      resolution: "1K",
      aspect_ratio: "1:1",
      num_images: 1,
      output_format: "png",
    },
  ],
] as const) {
  const result = await client.estimate(path, body)
  console.log(
    JSON.stringify({
      model: body.model,
      estimateUsd: result.usd,
      generated: false,
    })
  )
}
