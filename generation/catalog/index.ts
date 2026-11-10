import { MODELS } from "./models.generated"
import { parseSettings } from "./parse-settings"
import type { GeneratorTab, ModelEntry, Surface } from "./types"

export { MODELS }

const VIDEO_PREFERENCES = [
  "sume-seedance-2-mini",
  "sume-minimax-h3-max",
  "sume-minimax-h3",
  "sume-seedance-2-fast",
  "sume-gpt-image-2",
  "sume-gpt-image-2-edit",
  "sume-veed-lipsync",
  "muapi-h3-max-turbo",
  "muapi-h3-max",
  "muapi-seedance-mini",
  "muapi-wan25-fast",
  "minimax-h3",
  "wan-2.6",
  "seedance-2",
  "hailuo-2.3",
]

export const SURFACES: readonly Surface[] = ["image", "video", "audio"]

export function findModel(id: string): ModelEntry | undefined {
  return MODELS.find((entry) => entry.id === id)
}

export function getModel(id: string): ModelEntry {
  const model = findModel(id)
  if (!model) throw new Error(`Unknown model: ${id}`)
  return model
}

export function modelsFor(surface: Surface, tab?: GeneratorTab): ModelEntry[] {
  const preferred = new Map(VIDEO_PREFERENCES.map((id, index) => [id, index]))
  return MODELS.filter(
    (entry) =>
      entry.surface === surface && (!tab || (entry.tab ?? "create") === tab)
  ).sort(
    (a, b) =>
      (preferred.get(a.id) ?? Infinity) - (preferred.get(b.id) ?? Infinity)
  )
}

/** Surfaces that currently have at least one model (drives the nav). */
export function activeSurfaces(): Surface[] {
  return SURFACES.filter((surface) => modelsFor(surface).length > 0)
}

/** Tabs a surface offers, in site order, only when a model lives there. */
export function tabsFor(surface: Surface): GeneratorTab[] {
  return (["create", "edit", "motion"] as const).filter(
    (tab) => modelsFor(surface, tab).length > 0
  )
}

/** First model of a surface (and tab); undefined when none is installed. */
export function defaultModel(
  surface: Surface = "video",
  tab?: GeneratorTab
): ModelEntry | undefined {
  return modelsFor(surface, tab)[0] ?? modelsFor(surface)[0]
}

export type {
  GenerationPlane,
  GeneratorTab,
  MediaItem,
  MediaKind,
  MediaRole,
  ModelBadge,
  ModelEntry,
  PlatformPaths,
  PlatformRequest,
  SettingField,
  Surface,
} from "./types"
export { parseSettings }
