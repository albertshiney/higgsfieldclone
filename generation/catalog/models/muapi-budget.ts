import type { ModelEntry } from "../types"
// Verified schemas: https://api.muapi.ai/api/v1/models/{model-name}
const entries = [
  {
    id: "muapi-h3-max-turbo",
    label: "MiniMax H3 Max Turbo",
    path: "minimax-h3-max-turbo-text-to-video",
    family: "MiniMax",
    icon: "minimax",
    kind: "h3",
  },
  {
    id: "muapi-h3-max",
    label: "MiniMax H3 Max",
    path: "minimax-h3-max-text-to-video",
    family: "MiniMax",
    icon: "minimax",
    kind: "h3",
  },
  {
    id: "muapi-seedance-mini",
    label: "Seedance 2.0 Mini",
    path: "seedance-2-mini-text-to-video",
    family: "Seedance",
    icon: "seedance",
    kind: "mini",
  },
  {
    id: "muapi-seedance-fast",
    label: "Seedance 2.0 Fast",
    path: "seedance-2-text-to-video-fast",
    family: "Seedance",
    icon: "seedance",
    kind: "fast",
  },
  {
    id: "muapi-wan25-fast",
    label: "Wan 2.5 Fast",
    path: "wan2.5-text-to-video-fast",
    family: "Wan",
    icon: "wan",
    kind: "wan25",
  },
  {
    id: "muapi-wan26",
    label: "Wan 2.6 · MuAPI",
    path: "wan2.6-text-to-video",
    family: "Wan",
    icon: "wan",
    kind: "wan26",
  },
] as const
const models: ModelEntry[] = entries.map((entry, index) => {
  const settings: ModelEntry["settings"] = {
    aspectRatio: {
      type: "enum",
      values: entry.kind.startsWith("wan")
        ? ["16:9", "9:16"]
        : ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9",
      label: "Aspect ratio",
    },
    duration: entry.kind.startsWith("wan")
      ? {
          type: "enum",
          values: entry.kind === "wan26" ? ["5", "10", "15"] : ["5", "10"],
          default: "5",
          label: "Duration",
          labels:
            entry.kind === "wan26"
              ? { "5": "5s", "10": "10s", "15": "15s" }
              : { "5": "5s", "10": "10s" },
        }
      : {
          type: "range",
          min: entry.kind === "h3" ? 5 : 4,
          max: 15,
          default: 5,
          unit: "s",
          label: "Duration",
        },
  }
  if (entry.kind !== "fast")
    settings.resolution = {
      type: "enum",
      values:
        entry.kind === "h3"
          ? ["480p", "768p", "1080p"]
          : entry.kind === "mini"
            ? ["480p", "720p"]
            : ["720p", "1080p"],
      default: entry.kind === "h3" || entry.kind === "mini" ? "480p" : "720p",
      label: "Resolution",
    }
  if (entry.kind === "h3")
    settings.promptExpansion = {
      type: "enum",
      values: ["disabled", "balanced", "quality"],
      default: "disabled",
      label: "Prompt expansion",
    }
  if (entry.kind === "mini") {
    settings.generateAudio = {
      type: "boolean",
      default: true,
      label: "Generate audio",
    }
    settings.highBitrate = {
      type: "boolean",
      default: false,
      label: "High bitrate",
    }
  }
  if (entry.kind === "wan26")
    settings.shotType = {
      type: "enum",
      values: ["single", "multi"],
      default: "single",
      label: "Shot type",
    }
  return {
    id: entry.id,
    label: entry.label,
    apiProvider: "muapi",
    surface: "video",
    family: entry.family,
    provider: entry.family + " via MuAPI",
    icon: entry.icon,
    roles: {},
    requirePrompt: true,
    category: "BUDGET",
    order: 100 + index,
    settings,
    description:
      "Text-to-video via MuAPI. Review the exact dollar estimate before paying.",
    bestFor: "Cost-confirmed text-to-video",
    docs: [
      "https://api.muapi.ai/api/v1/models/" + entry.path,
      "https://muapi.ai/docs/pricing",
    ],
    toPlatform: (plane) => ({
      path: entry.path,
      body: {
        prompt: plane.prompt.text.trim(),
        duration: Number(plane.settings.duration),
        aspect_ratio: plane.settings.aspectRatio,
        ...(entry.kind !== "fast"
          ? { resolution: plane.settings.resolution }
          : {}),
        ...(entry.kind === "h3"
          ? { prompt_expansion_mode: plane.settings.promptExpansion }
          : {}),
        ...(entry.kind === "mini"
          ? {
              generate_audio: plane.settings.generateAudio,
              high_bitrate: plane.settings.highBitrate,
            }
          : {}),
        ...(entry.kind === "wan26"
          ? { shot_type: plane.settings.shotType }
          : {}),
      },
    }),
  }
})
export default models
