// Kling 4.0 — four REST workflows, with exact fields from the console API pages.
// Sources:
// https://open.higgsfield.ai/models/kling-video/v4.0/text-to-video/api-reference
// https://open.higgsfield.ai/models/kling-video/v4.0/image-to-video/api-reference
// https://open.higgsfield.ai/models/kling-video/v4.0/reference-to-video/api-reference
// https://open.higgsfield.ai/models/kling-video/v4.0/video-edit/api-reference
import { compact, first, promptText, requirePrompt, urls } from "../mappers"
import type { GenerationPlane, ModelEntry, PlatformRequest } from "../types"

const BASE = "kling-video/v4.0"
const DOCS = `https://open.higgsfield.ai/models/${BASE}`

const duration = {
  type: "range",
  min: 3,
  max: 30,
  default: 10,
  step: 1,
  unit: "s",
  label: "Duration",
} as const satisfies ModelEntry["settings"][string]

const resolution = {
  type: "enum",
  values: ["720p", "1080p"],
  default: "1080p",
  label: "Resolution",
} as const satisfies ModelEntry["settings"][string]

const aspectRatio = {
  type: "enum",
  values: ["21:9", "16:9", "9:16", "1:1", "adaptive"],
  default: "16:9",
  label: "Aspect ratio",
  hint: "Adaptive is available with references or video editing.",
} as const satisfies ModelEntry["settings"][string]

function mapCreate(plane: GenerationPlane): PlatformRequest {
  const start = first(plane, "start")
  const end = first(plane, "end")
  const images = urls(plane, "reference")
  const videos = urls(plane, "video")
  const shared = {
    duration: plane.settings.duration,
    resolution: plane.settings.resolution,
  }
  if (end && !start) throw new Error("Add a first frame before an end frame.")
  if (start) {
    if (videos.length)
      throw new Error("Video references cannot be used with keyframes.")
    return {
      path: `${BASE}/image-to-video`,
      body: compact({
        ...shared,
        image_url: start,
        image_urls: images.length ? images : undefined,
        end_image_url: end,
        prompt: promptText(plane),
      }),
    }
  }
  if (images.length || videos.length)
    return {
      path: `${BASE}/reference-to-video`,
      body: compact({
        ...shared,
        aspect_ratio: plane.settings.aspectRatio,
        prompt: requirePrompt(plane, "Kling 4.0 References"),
        image_urls: images.length ? images : undefined,
        video_urls: videos.length ? videos : undefined,
      }),
    }
  if (plane.settings.aspectRatio === "adaptive")
    throw new Error("Adaptive aspect ratio needs references.")
  return {
    path: `${BASE}/text-to-video`,
    body: {
      ...shared,
      aspect_ratio: plane.settings.aspectRatio,
      prompt: requirePrompt(plane, "Kling 4.0"),
    },
  }
}

const meta = {
  surface: "video",
  family: "Kling",
  provider: "Kuaishou",
  icon: "kling",
} as const

export const kling4: ModelEntry = {
  ...meta,
  id: "kling-4",
  label: "Kling 4.0",
  description:
    "Direct 3–30 second shots with text, ordered keyframes, or image and video references.",
  bestFor: "Longer shots with precise scene control",
  badges: ["NEW", "TOP"],
  category: "CINEMATIC",
  roles: { start: 1, end: 1, reference: 10, video: 5 },
  mediaModes: [
    {
      id: "references",
      label: "References",
      roles: { reference: 10, video: 5 },
      requireAny: true,
    },
    {
      id: "frames",
      label: "Keyframes",
      roles: { start: 1, reference: 8, end: 1 },
    },
  ],
  roleLabels: { start: "First frame", reference: "Middle frames or references" },
  settings: { aspectRatio, duration, resolution },
  order: 103,
  docs: [
    `${DOCS}/text-to-video/api-reference`,
    `${DOCS}/image-to-video/api-reference`,
    `${DOCS}/reference-to-video/api-reference`,
  ],
  toPlatform: mapCreate,
}

export const kling4Edit: ModelEntry = {
  ...meta,
  id: "kling-4-edit",
  label: "Kling 4.0 Edit",
  tab: "edit",
  description:
    "Change a source video while preserving its movement, guided by optional image and video references.",
  bestFor: "Directed edits to existing footage",
  badges: ["NEW"],
  category: "EDIT",
  roles: { source: 1, reference: 10, video: 5 },
  requiredRoles: ["source"],
  requirePrompt: true,
  settings: {
    duration,
    resolution,
    aspectRatio: { ...aspectRatio, default: "adaptive" },
  },
  order: 104,
  docs: [`${DOCS}/video-edit/api-reference`],
  toPlatform: (plane) => ({
    path: `${BASE}/video-edit`,
    body: compact({
      prompt: requirePrompt(plane, "Kling 4.0 Edit"),
      video_url: first(plane, "source"),
      image_urls: urls(plane, "reference").length
        ? urls(plane, "reference")
        : undefined,
      video_urls: urls(plane, "video").length ? urls(plane, "video") : undefined,
      duration: plane.settings.duration,
      resolution: plane.settings.resolution,
      aspect_ratio: plane.settings.aspectRatio,
    }),
  }),
}

const models = [kling4, kling4Edit]
export default models
