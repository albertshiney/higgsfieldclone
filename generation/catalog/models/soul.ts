// Soul 2, Soul Cinema and Soul (standard) — text and image generation.
// Sources:
//   https://docs.higgsfield.ai/docs/models/soul-2
//   https://docs.higgsfield.ai/docs/models/soul-2/generate
//   https://docs.higgsfield.ai/docs/models/soul-cinema
//   https://docs.higgsfield.ai/docs/models/soul-cinema/generate
//   https://docs.higgsfield.ai/docs/models/soul-standard
//   https://docs.higgsfield.ai/docs/models/soul-standard/generate
//   https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/image-to-image/api-reference
// Not exposed: seed, style_id / style_strength, custom_reference_* (Soul ID is v2).
import { compact, first, int, requirePrompt } from "../mappers"
import { SOUL_ASPECT } from "../tokens"
import type { GenerationPlane, ModelEntry, SettingField } from "../types"

const DOCS = "https://docs.higgsfield.ai/docs/models"

const meta = {
  surface: "image",
  family: "Soul",
  provider: "Higgsfield",
  icon: "higgsfield",
} as const

function aspectRatio(fallback: (typeof SOUL_ASPECT)[number]): SettingField {
  return {
    type: "enum",
    values: SOUL_ASPECT,
    default: fallback,
    label: "Aspect ratio",
  }
}

const shared = {
  resolution: {
    type: "enum",
    values: ["720p", "1080p"],
    default: "720p",
    label: "Resolution",
  },
  batchSize: {
    type: "enum",
    values: ["1", "4"],
    default: "1",
    label: "Images",
    labels: { "1": "1 image", "4": "4 images" },
  },
  enhancePrompt: {
    type: "boolean",
    default: false,
    label: "Enhance prompt",
    hint: "Expands a short prompt before generating.",
  },
} as const satisfies ModelEntry["settings"]

function soulBody(plane: GenerationPlane, label: string) {
  return {
    prompt: requirePrompt(plane, label),
    aspect_ratio: plane.settings.aspectRatio,
    resolution: plane.settings.resolution,
    batch_size: int(plane.settings.batchSize),
    enhance_prompt: plane.settings.enhancePrompt,
  }
}

export const soul2: ModelEntry = {
  ...meta,
  id: "soul-2",
  label: "Soul 2",
  description:
    "Editorial-grade people pictures: fashion, lifestyle and portraits with a polished magazine finish.",
  bestFor: "Fashion, UGC-style and portrait shots",
  badges: ["TOP"],
  category: "PORTRAIT",
  roles: {},
  requirePrompt: true,
  settings: { aspectRatio: aspectRatio("1:1"), ...shared },
  enhanceSetting: "enhancePrompt",
  order: 0,
  docs: [`${DOCS}/soul-2`, `${DOCS}/soul-2/generate`],
  toPlatform: (plane) => ({
    path: "higgsfield-ai/soul/v2/standard",
    body: compact(soulBody(plane, "Soul 2")),
  }),
}

export const soul2Edit: ModelEntry = {
  ...meta,
  id: "soul-2-edit",
  tab: "edit",
  label: "Soul 2 Edit",
  description: "Guide an editorial image from a reference photo and a new prompt.",
  bestFor: "Restyling a portrait or fashion reference",
  category: "PORTRAIT",
  roles: { start: 1 },
  requiredRoles: ["start"],
  roleLabels: { start: "Reference photo" },
  requirePrompt: true,
  settings: {
    aspectRatio: aspectRatio("4:3"),
    resolution: shared.resolution,
    batchSize: shared.batchSize,
  },
  order: 3,
  docs: [
    "https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/image-to-image/api-reference",
  ],
  toPlatform: (plane) => ({
    path: "higgsfield-ai/soul/v2/image-to-image",
    body: compact({
      prompt: requirePrompt(plane, "Soul 2 Edit"),
      image_url: first(plane, "start"),
      aspect_ratio: plane.settings.aspectRatio,
      resolution: plane.settings.resolution,
      batch_size: int(plane.settings.batchSize),
      enhance_prompt: true,
    }),
  }),
}

export const soulCinema: ModelEntry = {
  ...meta,
  id: "soul-cinema",
  label: "Soul Cinema",
  description:
    "Stills that look lifted from a film: moody grading, filmic light and a fixed cinematic style.",
  bestFor: "Film-look stills and concept frames",
  category: "CINEMATIC",
  roles: {},
  requirePrompt: true,
  settings: { aspectRatio: aspectRatio("1:1"), ...shared },
  enhanceSetting: "enhancePrompt",
  order: 1,
  docs: [`${DOCS}/soul-cinema`, `${DOCS}/soul-cinema/generate`],
  toPlatform: (plane) => ({
    path: "higgsfield-ai/soul/cinema",
    body: compact(soulBody(plane, "Soul Cinema")),
  }),
}

export const soul: ModelEntry = {
  ...meta,
  id: "soul",
  label: "Soul",
  description:
    "The original Soul look for people and lifestyle images, with an optional picture to steer prompt enhancement.",
  bestFor: "Lifestyle photos with a consistent style",
  category: "PORTRAIT",
  roles: { reference: 1 },
  requirePrompt: true,
  settings: { aspectRatio: aspectRatio("4:3"), ...shared },
  enhanceSetting: "enhancePrompt",
  order: 2,
  docs: [`${DOCS}/soul-standard`, `${DOCS}/soul-standard/generate`],
  toPlatform: (plane) => ({
    path: "higgsfield-ai/soul/standard",
    body: compact({
      ...soulBody(plane, "Soul"),
      image_reference_url: first(plane, "reference"),
    }),
  }),
}

const models = [soul2, soul2Edit, soulCinema, soul]
export default models
