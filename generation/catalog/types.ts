export type Surface = "image" | "video" | "audio"
export type MediaKind = "image" | "video" | "audio"
export type MediaRole =
  "start" | "end" | "reference" | "video" | "audio" | "source"

/** Generator tab a model lives under (video: Create / Edit / Motion; image: Create / Edit). */
export type GeneratorTab = "create" | "edit" | "motion"

/** Picker badges, mirroring the site's model picker chips. */
export type ModelBadge = "NEW" | "TOP" | "FAST" | "4K" | "AUDIO" | "PRO"

export type MediaItem = {
  id: string
  url: string
  role: MediaRole
  kind?: MediaKind
  name?: string
  /** Length of a video/audio input, probed server-side; prices source-length endpoints. */
  durationSec?: number
}

export type MediaMode = {
  id: string
  label: string
  roles: Partial<Record<MediaRole, number>>
  /** At least one attachment of any role in this mode. */
  requireAny?: boolean
  /** At least one attachment in one of these roles (e.g. audio alone is not enough). */
  requireAnyOf?: MediaRole[]
}

export type SettingField = (
  | {
      type: "enum"
      values: readonly string[]
      default: string
      /** Display labels per value; the raw value is shown when absent. */
      labels?: Readonly<Record<string, string>>
    }
  | { type: "range"; min: number; max: number; default: number; step?: number }
  | { type: "boolean"; default: boolean }
) & {
  /** Human label; defaults to a sentence-cased key. */
  label?: string
  /** One-line hint under the control in the settings dialog. */
  hint?: string
  /** Suffix for range values ("s" for seconds). */
  unit?: string
}

export type PlatformPaths = {
  text?: string
  image?: string
  firstLast?: string
  reference?: string
}

/** Platform request: model path (appended to HF_API_BASE_URL) and JSON body. */
export type PlatformRequest = { path: string; body: Record<string, unknown> }

export type ModelEntry = {
  id: string
  surface: Surface
  apiProvider?: "higgsfield" | "muapi" | "sume"
  label: string
  roles: Partial<Record<MediaRole, number>>
  mediaModes?: MediaMode[]
  requiredRoles?: MediaRole[]
  /** Model-specific names for media slots (e.g. start → "Character image"). */
  roleLabels?: Partial<Record<MediaRole, string>>
  requirePrompt?: boolean
  /** Hard prompt length limit from the docs; enforced client and server side. */
  maxPromptLength?: number
  /** Most media items across all roles in one request. */
  maxTotalMedia?: number
  settings: Record<string, SettingField>
  /** Boolean setting rendered as the "Enhance prompt" toggle beside the prompt. */
  enhanceSetting?: string
  /** Submit paths when the shared mapper is enough. */
  paths?: PlatformPaths
  /** Custom mapper; wins over `paths`. Throw an Error to reject an invalid combination. */
  toPlatform?: (plane: GenerationPlane) => PlatformRequest
  /** Brand file name in /public/model-icons (without .svg). */
  icon?: string
  /** Picker order, lower first. Unset sorts last. */
  order?: number

  /* ── Picker metadata ───────────────────────────────────────────────── */
  /** Generator tab; defaults to "create". */
  tab?: GeneratorTab
  /** Picker group, e.g. "Kling". */
  family: string
  /** Company behind the model, e.g. "ByteDance". */
  provider: string
  /** One line for the picker card. */
  description: string
  /** Short "best for" phrase shown on the model card. */
  bestFor?: string
  badges?: ModelBadge[]
  /** Uppercase eyebrow on the model card: GENERAL, CINEMATIC, FAST… */
  category?: string
  /** Documentation pages this entry was built from. */
  docs: string[]
}

export type GenerationPlane = {
  model: string
  inputMode?: string
  prompt: { text: string }
  media: Partial<Record<MediaRole, MediaItem[]>>
  settings: Record<string, unknown>
}
