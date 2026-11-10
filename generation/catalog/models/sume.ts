import type { ModelEntry } from "../types"
const docs = [
  "https://www.sume.com/docs",
  "https://api.sume.com/v1/openapi.json",
]
const videoRows = [
  {
    model: "seedance-2-mini",
    label: "Seedance 2 Mini",
    resolutions: ["480p", "720p"],
    min: 4,
    family: "Seedance",
  },
  {
    model: "seedance-2-fast",
    label: "Seedance 2 Fast",
    resolutions: ["480p", "720p"],
    min: 4,
    family: "Seedance",
  },
  {
    model: "minimax-h3-max",
    label: "MiniMax H3 Max",
    resolutions: ["480p", "768p", "1080p"],
    min: 5,
    family: "MiniMax",
  },
  {
    model: "minimax-h3",
    label: "MiniMax H3",
    resolutions: ["768p", "2K", "4K"],
    min: 5,
    family: "MiniMax",
  },
] as const
const videos: ModelEntry[] = videoRows.map((row) => ({
  id: "sume-" + row.model,
  apiProvider: "sume",
  surface: "video",
  label: row.label,
  order: 100,
  icon: row.family === "MiniMax" ? "minimax" : "seedance",
  family: row.family,
  provider: row.family + " via Sume",
  roles: { start: 1 },
  requirePrompt: true,
  description: "Sume generation with an exact dollar quote before payment.",
  docs,
  settings: {
    resolution: {
      type: "enum",
      values: row.resolutions,
      default: row.resolutions[0],
      label: "Resolution",
    },
    duration: {
      type: "range",
      min: row.min,
      max: 15,
      step: 1,
      default: 5,
      label: "Duration",
      unit: "s",
    },
    aspectRatio: {
      type: "enum",
      values: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
      default: "16:9",
      label: "Aspect ratio",
    },
    ...(row.family === "Seedance"
      ? {
          generateAudio: {
            type: "boolean" as const,
            default: true,
            label: "Generate audio",
          },
        }
      : {}),
  },
  toPlatform: (plane) => ({
    path: "v1/video-router/generate",
    body: {
      model: row.model,
      prompt: plane.prompt.text.trim(),
      duration: plane.settings.duration,
      resolution: plane.settings.resolution,
      aspect_ratio: plane.settings.aspectRatio,
      ...(plane.media.start?.[0]
        ? { image_url: plane.media.start[0].url }
        : {}),
      ...(row.family === "Seedance"
        ? { generate_audio: plane.settings.generateAudio }
        : {}),
    },
  }),
}))
const images: ModelEntry[] = (["create", "edit"] as const).map((tab) => ({
  id: "sume-gpt-image-2" + (tab === "edit" ? "-edit" : ""),
  apiProvider: "sume",
  surface: "image",
  tab,
  label: "GPT Image 2" + (tab === "edit" ? " Edit" : ""),
  order: 0,
  icon: "media",
  family: "OpenAI",
  provider: "OpenAI via Sume",
  roles: tab === "edit" ? { reference: 4 } : {},
  ...(tab === "edit" ? { requiredRoles: ["reference" as const] } : {}),
  requirePrompt: true,
  description: "Sume image generation. Low quality and one image by default.",
  docs,
  settings: {
    quality: {
      type: "enum",
      values: ["low", "medium", "high"],
      default: "low",
      label: "Quality",
    },
    resolution: {
      type: "enum",
      values: ["1K", "2K", "4K"],
      default: "1K",
      label: "Resolution",
    },
    aspectRatio: {
      type: "enum",
      values: ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "5:4"],
      default: "1:1",
      label: "Aspect ratio",
    },
  },
  toPlatform: (plane) => ({
    path: "v1/image-router/generate",
    body: {
      model: "gpt-image-2",
      prompt: plane.prompt.text.trim(),
      quality: plane.settings.quality,
      resolution: plane.settings.resolution,
      aspect_ratio: plane.settings.aspectRatio,
      num_images: 1,
      output_format: "png",
      ...(tab === "edit"
        ? { image_urls: plane.media.reference?.map((item) => item.url) }
        : {}),
    },
  }),
}))
const lipsync: ModelEntry = {
  id: "sume-veed-lipsync",
  apiProvider: "sume",
  surface: "video",
  tab: "edit",
  label: "Veed Lip Sync",
  order: 100,
  icon: "media",
  family: "Veed",
  provider: "Veed via Sume",
  roles: { source: 1, audio: 1 },
  requiredRoles: ["source", "audio"],
  description:
    "Match a source video's lips to your audio. Duration is measured on the server.",
  docs,
  settings: {},
  toPlatform: (plane) => {
    const video = plane.media.source?.[0],
      audio = plane.media.audio?.[0]
    const duration = video?.durationSec ?? 60
    if (!video || !audio || !duration || duration < 2 || duration > 60)
      throw new Error(
        "Lip sync requires a measurable video between 2 and 60 seconds."
      )
    return {
      path: "v1/video-router/generate",
      body: {
        model: "veed-lipsync",
        video_url: video.url,
        audio_url: audio.url,
        duration: Math.ceil(duration),
      },
    }
  },
}
const models: ModelEntry[] = [...videos, ...images, lipsync]
export default models
