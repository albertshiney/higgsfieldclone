// Genjutsu Light — basic motion-transfer and object-swap workflows.
// Sources (endpoint, request fields, resolutions, pricing):
// https://open.higgsfield.ai/models/higgsfield/genjutsu-light/motion-transfer/v1.0/playground
// https://open.higgsfield.ai/models/higgsfield/genjutsu-light/object-swap/v1.0/playground
// The current API reference has conflicting generic auth examples. Shared
// Higgsfield docs and the v2 playground use Authorization: Key on these paths.
import { first, promptText, urls } from "../mappers"
import type { GenerationPlane, ModelEntry, PlatformRequest } from "../types"

function mapLight(plane: GenerationPlane, operation: string): PlatformRequest {
  const source = plane.media.source?.[0]
  const images = urls(plane, "reference")
  if (!source) throw new Error("Add a source video.")
  if (source.durationSec && source.durationSec < 4)
    throw new Error("Use a source video of at least 4 seconds.")
  if (!images.length) throw new Error("Add a reference image.")
  return {
    path: `higgsfield/genjutsu-light/${operation}/v1.0`,
    body: {
      prompt: promptText(plane) ?? "",
      video_url: first(plane, "source"),
      image_urls: images,
      resolution: plane.settings.resolution,
    },
  }
}

const meta = {
  surface: "video",
  family: "Genjutsu",
  provider: "Higgsfield",
  icon: "higgsfield",
  roles: { source: 1, reference: 1 },
  requiredRoles: ["source", "reference"],
  maxPromptLength: 10000,
  settings: {
    resolution: {
      type: "enum",
      values: ["480p", "720p", "1080p"],
      default: "720p",
      label: "Resolution",
    },
  },
} as const satisfies Partial<ModelEntry>

export const genjutsuLightMotion: ModelEntry = {
  ...meta,
  id: "genjutsu-light-motion",
  tab: "motion",
  label: "Genjutsu Light Motion",
  description:
    "Transfer a clip's movement to a new character or scene from one reference image.",
  bestFor: "Fast motion transfer",
  badges: ["NEW", "FAST"],
  category: "MOTION",
  roleLabels: { source: "Motion video", reference: "Character image" },
  order: 316,
  docs: [
    "https://open.higgsfield.ai/models/higgsfield/genjutsu-light/motion-transfer/v1.0/playground",
  ],
  toPlatform: (plane) => mapLight(plane, "motion-transfer"),
}

export const genjutsuLightSwap: ModelEntry = {
  ...meta,
  id: "genjutsu-light-swap",
  tab: "edit",
  label: "Genjutsu Light Swap",
  description:
    "Replace a subject, object or outfit in a source clip from one reference image.",
  bestFor: "Quick object and clothing swaps",
  badges: ["NEW", "FAST"],
  category: "EDIT",
  roleLabels: { source: "Video to edit", reference: "Replacement image" },
  order: 303,
  docs: [
    "https://open.higgsfield.ai/models/higgsfield/genjutsu-light/object-swap/v1.0/playground",
  ],
  toPlatform: (plane) => mapLight(plane, "object-swap"),
}

const models = [genjutsuLightMotion, genjutsuLightSwap]
export default models
