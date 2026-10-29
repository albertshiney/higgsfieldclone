import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { getModel, MODELS, parseSettings } from "@/generation/catalog"
import { groupMedia, inferInputMode } from "@/generation/catalog/media-inputs"
import type {
  GenerationPlane,
  MediaItem,
  MediaRole,
  ModelEntry,
  PlatformRequest,
} from "@/generation/catalog/types"
import { toPlatform } from "@/generation/to-platform"

/* ── Plane builder ──────────────────────────────────────────────────────── */

const PROMPT =
  "A lighthouse keeper climbs a spiral staircase at dusk, warm lamp light, slow push-in."

const EXT: Record<MediaRole, string> = {
  start: "png",
  end: "png",
  reference: "jpg",
  video: "mp4",
  source: "mp4",
  audio: "mp3",
}

type Attach = Partial<Record<MediaRole, number>>

type PlaneOptions = {
  prompt?: string
  settings?: Record<string, unknown>
  /** Explicit input mode; inferred from the media like the UI does when absent. */
  mode?: string
  /** Skip mode inference (simulates a client that sends no inputMode). */
  noMode?: boolean
}

function mediaItems(attach: Attach): MediaItem[] {
  const items: MediaItem[] = []
  for (const [role, count] of Object.entries(attach) as [MediaRole, number][])
    for (let i = 1; i <= count; i++)
      items.push({
        id: `${role}-${i}`,
        role,
        url: `https://media.example.com/${role}-${i}.${EXT[role]}`,
      })
  return items
}

function plane(
  id: string,
  attach: Attach = {},
  options: PlaneOptions = {}
): GenerationPlane {
  const model = getModel(id)
  const items = mediaItems(attach)
  return {
    model: id,
    inputMode: options.noMode
      ? undefined
      : (options.mode ?? inferInputMode(model, items)),
    prompt: { text: options.prompt ?? PROMPT },
    media: groupMedia(items),
    settings: parseSettings(model, options.settings ?? {}),
  }
}

/* ── Every model × every supported input mode ───────────────────────────── */

type Case = {
  name: string
  path: string
  media?: Attach
  mode?: string
  prompt?: string
  settings?: Record<string, unknown>
}

const text = (path: string): Case => ({ name: "text", path })

const CASES: Record<string, Case[]> = {
  /* Image */
  "ai-influencer": [
    {
      name: "human without references",
      path: "higgsfield/ai-influencer",
      prompt: "",
    },
    {
      name: "animal with identity and item references",
      path: "higgsfield/ai-influencer",
      media: { start: 1, reference: 3 },
      settings: { tier: "cats" },
    },
  ],
  "soul-2": [text("higgsfield-ai/soul/v2/standard")],
  "soul-2-edit": [
    {
      name: "reference photo",
      path: "higgsfield-ai/soul/v2/image-to-image",
      media: { start: 1 },
    },
  ],
  "soul-cinema": [
    text("higgsfield-ai/soul/cinema"),
    {
      name: "batch of 4, enhanced",
      path: "higgsfield-ai/soul/cinema",
      settings: { batchSize: "4", enhancePrompt: true, resolution: "1080p" },
    },
  ],
  soul: [
    text("higgsfield-ai/soul/standard"),
    {
      name: "image reference",
      path: "higgsfield-ai/soul/standard",
      media: { reference: 1 },
    },
  ],
  "marketing-image-flare": [
    text("marketing-studio/image/flare"),
    {
      name: "references",
      path: "marketing-studio/image/flare",
      media: { reference: 3 },
      settings: { quality: "max", resolution: "4k", aspectRatio: "9:16" },
    },
  ],
  "marketing-image-sunburst": [
    text("marketing-studio/image/sunburst"),
    {
      name: "references",
      path: "marketing-studio/image/sunburst",
      media: { reference: 2 },
    },
  ],
  "marketing-image-2": [
    text("marketing-studio/image"),
    {
      name: "references",
      path: "marketing-studio/image",
      media: { reference: 16 },
      settings: { quality: "medium" },
    },
  ],
  "grok-image-2": [
    text("xai/grok-imagine-image-2.0"),
    {
      name: "edit with references",
      path: "xai/grok-imagine-image-2.0",
      media: { reference: 2 },
    },
  ],
  "recraft-4.1": [
    text("recraft/v4.1/text-to-image"),
    {
      name: "standard 2k",
      path: "recraft/v4.1/pro/text-to-image",
      settings: { resolution: "2k", format: "png" },
    },
    {
      name: "utility 1k",
      path: "recraft/v4.1/utility/text-to-image",
      settings: { style: "utility" },
    },
    {
      name: "utility 2k",
      path: "recraft/v4.1/utility/pro/text-to-image",
      settings: { style: "utility", resolution: "2k", aspectRatio: "14:10" },
    },
  ],
  "qwen-image-3": [
    text("alibaba/qwen-image-3/text-to-image"),
    {
      name: "edit",
      path: "alibaba/qwen-image-3/edit",
      media: { reference: 3 },
    },
    {
      name: "extend off disables thinking",
      path: "alibaba/qwen-image-3/text-to-image",
      settings: { promptExtend: false, thinking: true },
    },
  ],
  "ideogram-4": [
    text("ideogram/v4.0"),
    {
      name: "remix with image weight",
      path: "ideogram/v4.0",
      media: { reference: 1 },
      settings: { imageWeight: 80, renderingSpeed: "QUALITY" },
    },
  ],
  "z-image-turbo": [
    text("z-image/turbo"),
    {
      name: "enhanced 2k",
      path: "z-image/turbo",
      settings: { promptExtend: true, resolution: "2k" },
    },
  ],

  /* Video — create */
  "kling-4": [
    text("kling-video/v4.0/text-to-video"),
    {
      name: "ordered keyframes without a prompt",
      path: "kling-video/v4.0/image-to-video",
      media: { start: 1, reference: 2, end: 1 },
      prompt: "",
    },
    {
      name: "image and video references",
      path: "kling-video/v4.0/reference-to-video",
      media: { reference: 2, video: 1 },
      settings: { aspectRatio: "adaptive", duration: 30 },
    },
  ],
  "seedance-2.5": [
    text("bytedance/seedance-2.5/text-to-video"),
    {
      name: "frames",
      path: "bytedance/seedance-2.5/image-to-video",
      media: { start: 1, end: 1 },
    },
    {
      name: "references",
      path: "bytedance/seedance-2.5/reference-to-video",
      media: { reference: 2, video: 1, audio: 1 },
    },
  ],
  "seedance-2": [
    text("bytedance/seedance-2.0/text-to-video"),
    {
      name: "frames",
      path: "bytedance/seedance-2.0/image-to-video",
      media: { start: 1, end: 1 },
      prompt: "",
      settings: { resolution: "4k", duration: 15 },
    },
    {
      name: "references",
      path: "bytedance/seedance-2.0/reference-to-video",
      media: { reference: 9, video: 3, audio: 3 },
    },
  ],
  "kling-3-std": [
    text("kling-video/v3.0/std/text-to-video"),
    {
      name: "start frame",
      path: "kling-video/v3.0/std/image-to-video",
      media: { start: 1 },
    },
    {
      name: "start and end frames",
      path: "kling-video/v3.0/std/image-to-video",
      media: { start: 1, end: 1 },
      settings: { generateAudio: false, multiShots: true, cfgScale: 0.8 },
    },
  ],
  "kling-3-pro": [
    text("kling-video/v3.0/pro/text-to-video"),
    {
      name: "start and end frames",
      path: "kling-video/v3.0/pro/image-to-video",
      media: { start: 1, end: 1 },
    },
  ],
  "kling-3-4k": [
    text("kling-video/v3.0/4k/text-to-video"),
    {
      name: "start frame",
      path: "kling-video/v3.0/4k/image-to-video",
      media: { start: 1 },
    },
  ],
  "kling-3-turbo": [
    text("kling-video/v3.0-turbo/text-to-video"),
    {
      name: "start frame",
      path: "kling-video/v3.0-turbo/image-to-video",
      media: { start: 1 },
      settings: { resolution: "1080p" },
    },
  ],
  "cinema-studio-4": [
    text("higgsfield/cinema-studio/4.0"),
    {
      name: "references with direction",
      path: "higgsfield/cinema-studio/4.0",
      media: { reference: 2, video: 1, audio: 1 },
      settings: {
        genre: "noir",
        era: "1980s",
        cameraMovement: "dolly-in",
        colorPalette: "neon-rain-at-midnight",
        duration: 12,
      },
    },
  ],
  "wan-3": [
    text("alibaba/wan-3.0/text-to-video"),
    {
      name: "frames",
      path: "alibaba/wan-3.0/image-to-video",
      media: { start: 1, end: 1 },
    },
    {
      name: "references",
      path: "alibaba/wan-3.0/reference-to-video",
      media: { reference: 2, video: 1, audio: 1 },
      settings: { thinking: true, aspectRatio: "9:16" },
    },
  ],
  "wan-3-prime": [
    text("alibaba/wan-3.0-prime/text-to-video"),
    {
      name: "start frame",
      path: "alibaba/wan-3.0-prime/image-to-video",
      media: { start: 1 },
    },
    {
      name: "references",
      path: "alibaba/wan-3.0-prime/reference-to-video",
      media: { reference: 10, video: 5, audio: 5 },
    },
  ],
  "kling-o3": [
    {
      name: "text (image-reference without images)",
      path: "kling-video/o3/image-reference",
    },
    {
      name: "frames",
      path: "kling-video/o3/first-last-frame",
      media: { start: 1, end: 1 },
      settings: { mode: "4k", generateAudio: true },
    },
    {
      name: "references",
      path: "kling-video/o3/image-reference",
      media: { reference: 3 },
      settings: { mode: "std" },
    },
  ],
  "kling-o3-video-ref": [
    {
      name: "video reference with images",
      path: "kling-video/o3/video-reference",
      media: { video: 1, reference: 2 },
    },
    {
      name: "video reference only",
      path: "kling-video/o3/video-reference",
      media: { video: 1 },
      settings: { duration: 10, mode: "std" },
    },
  ],
  "kling-omni": [
    {
      name: "text (image-reference without images)",
      path: "kling-video/omni/image-reference",
    },
    {
      name: "frames",
      path: "kling-video/omni/first-last-frame",
      media: { start: 1, end: 1 },
      settings: { duration: "10" },
    },
    {
      name: "references",
      path: "kling-video/omni/image-reference",
      media: { reference: 4 },
    },
  ],
  "kling-omni-video-ref": [
    {
      name: "video reference with images",
      path: "kling-video/omni/video-reference",
      media: { video: 1, reference: 4 },
    },
  ],
  "kling-2.6": [
    text("kling-video/v2.6/pro/text-to-video"),
    {
      name: "start frame",
      path: "kling-video/v2.6/pro/image-to-video",
      media: { start: 1 },
      settings: { duration: "10", generateAudio: false },
    },
  ],
  "kling-2.5-turbo": [
    text("kling-video/v2.5-turbo/pro/text-to-video"),
    {
      name: "start frame",
      path: "kling-video/v2.5-turbo/pro/image-to-video",
      media: { start: 1 },
    },
  ],
  "kling-2.5-turbo-std": [
    {
      name: "start frame",
      path: "kling-video/v2.5-turbo/standard/image-to-video",
      media: { start: 1 },
      settings: { duration: "10" },
    },
  ],
  "minimax-h3": [
    text("minimax/h3/text-to-video"),
    {
      name: "frames",
      path: "minimax/h3/image-to-video",
      media: { start: 1, end: 1 },
    },
    {
      name: "references with audio",
      path: "minimax/h3/reference-to-video",
      media: { reference: 2, video: 1, audio: 1 },
      settings: { duration: 15, aspectRatio: "adaptive" },
    },
  ],
  "hailuo-2.3": [
    text("minimax/hailuo-2.3/standard/text-to-video"),
    {
      name: "start frame",
      path: "minimax/hailuo-2.3/standard/image-to-video",
      media: { start: 1 },
      settings: { duration: "10", promptOptimizer: false },
    },
  ],
  "happy-horse-1.1": [
    text("alibaba/happy-horse/v1.1/text-to-video"),
    {
      name: "start frame without prompt",
      path: "alibaba/happy-horse/v1.1/image-to-video",
      media: { start: 1 },
      prompt: "",
    },
    {
      name: "references",
      path: "alibaba/happy-horse/v1.1/reference-to-video",
      media: { reference: 9 },
    },
  ],
  "happy-horse-1": [
    text("alibaba/happy-horse/text-to-video"),
    {
      name: "start frame",
      path: "alibaba/happy-horse/image-to-video",
      media: { start: 1 },
    },
    {
      name: "references",
      path: "alibaba/happy-horse/reference-to-video",
      media: { reference: 2 },
    },
  ],
  "ltx-2.5-fast": [
    text("lightricks/ltx-2.5/text-to-video/fast"),
    {
      name: "frames at 4k 48fps",
      path: "lightricks/ltx-2.5/image-to-video/fast",
      media: { start: 1, end: 1 },
      settings: {
        resolution: "4k",
        fps: "48",
        duration: "10",
        cameraMovement: "jib_up",
      },
    },
  ],
  "ltx-2.5-pro": [
    text("lightricks/ltx-2.5/text-to-video/pro"),
    {
      name: "start frame",
      path: "lightricks/ltx-2.5/image-to-video/pro",
      media: { start: 1 },
      settings: { fps: "50", aspectRatio: "9:16" },
    },
  ],
  "pixverse-v6": [
    text("pixverse/v6/text-to-video"),
    {
      name: "frames",
      path: "pixverse/v6/image-to-video",
      media: { start: 1, end: 1 },
      settings: { duration: 1, resolution: "1080p" },
    },
  ],
  "wan-2.7": [
    text("wan/v2.7/text-to-video"),
    {
      name: "text with driving audio",
      path: "wan/v2.7/text-to-video",
      media: { audio: 1 },
    },
    {
      name: "frames with driving audio, no prompt",
      path: "wan/v2.7/image-to-video",
      media: { start: 1, end: 1, audio: 1 },
      prompt: "",
    },
    {
      name: "references",
      path: "wan/v2.7/reference-to-video",
      media: { reference: 3, video: 2 },
      settings: { aspectRatio: "9:16", duration: 10 },
    },
  ],
  "wan-2.6": [
    text("wan/v2.6/text-to-video"),
    {
      name: "text with driving audio",
      path: "wan/v2.6/text-to-video",
      media: { audio: 1 },
      settings: { duration: "15", multiShots: true },
    },
    {
      name: "start frame with audio",
      path: "wan/v2.6/image-to-video",
      media: { start: 1, audio: 1 },
      settings: { promptExtend: true },
    },
    {
      name: "video references",
      path: "wan/v2.6/reference-to-video",
      media: { video: 3 },
      settings: { duration: "10", aspectRatio: "9:16" },
    },
  ],
  "grok-video-1.5": [
    text("xai/grok-imagine-video/v1.5/reference-to-video"),
    {
      name: "start frame at 1080p",
      path: "xai/grok-imagine-video/v1.5/reference-to-video",
      media: { start: 1 },
      settings: { resolution: "1080p" },
    },
    {
      name: "references with audio",
      path: "xai/grok-imagine-video/v1.5/reference-to-video",
      media: { reference: 7, audio: 1 },
      settings: { resolution: "720p", duration: 15 },
    },
  ],

  /* Video — edit */
  "kling-4-edit": [
    {
      name: "source with image and video references",
      path: "kling-video/v4.0/video-edit",
      media: { source: 1, reference: 1, video: 1 },
    },
  ],
  "seedance-2.5-edit": [
    {
      name: "source with references",
      path: "bytedance/seedance-2.5/video-edit",
      media: { source: 1, reference: 2, video: 1, audio: 1 },
    },
  ],
  "seedance-2.5-extend": [
    {
      name: "source",
      path: "bytedance/seedance-2.5/video-extend",
      media: { source: 1 },
      settings: { duration: 10 },
    },
  ],
  "kling-o3-edit": [
    {
      name: "source with references",
      path: "kling-video/o3/video-edit",
      media: { source: 1, reference: 4 },
      settings: { mode: "4k" },
    },
  ],
  "kling-omni-edit": [
    {
      name: "source",
      path: "kling-video/omni/video-edit",
      media: { source: 1 },
    },
  ],
  "genjutsu-swap": [
    {
      name: "source with references",
      path: "higgsfield/genjutsu/object-swap/v1.0",
      media: { source: 1, reference: 2 },
    },
  ],
  "genjutsu-light-swap": [
    {
      name: "source and replacement image",
      path: "higgsfield/genjutsu-light/object-swap/v1.0",
      media: { source: 1, reference: 1 },
      prompt: "",
    },
  ],

  /* Video — motion */
  "kling-3-motion-std": [
    {
      name: "character and motion video, no prompt",
      path: "kling-video/v3/motion-control/std",
      media: { start: 1, source: 1 },
      prompt: "",
    },
  ],
  "kling-3-motion-pro": [
    {
      name: "character and motion video",
      path: "kling-video/v3/motion-control/pro",
      media: { start: 1, source: 1 },
      settings: { keepOriginalSound: false, characterOrientation: "image" },
    },
  ],
  "kling-2.6-motion-std": [
    {
      name: "character and motion video",
      path: "kling-video/motion-control/std",
      media: { start: 1, source: 1 },
    },
  ],
  "kling-2.6-motion-pro": [
    {
      name: "character and motion video",
      path: "kling-video/motion-control/pro",
      media: { start: 1, source: 1 },
      prompt: "",
    },
  ],
  "genjutsu-motion": [
    {
      name: "source with references, no prompt",
      path: "higgsfield/genjutsu/motion-transfer/v1.0",
      media: { source: 1, reference: 8 },
      prompt: "",
    },
  ],
  "genjutsu-light-motion": [
    {
      name: "motion video and character image",
      path: "higgsfield/genjutsu-light/motion-transfer/v1.0",
      media: { source: 1, reference: 1 },
      settings: { resolution: "1080p" },
    },
  ],
}

function run(id: string, c: Case): PlatformRequest {
  return toPlatform(
    plane(id, c.media, { prompt: c.prompt, settings: c.settings, mode: c.mode })
  )
}

describe("toPlatform: every model and input mode", () => {
  it("has cases for every catalog entry and no stale ones", () => {
    expect(Object.keys(CASES).sort()).toEqual(
      MODELS.map((model) => model.id).sort()
    )
  })

  for (const model of MODELS) {
    describe(model.id, () => {
      for (const c of CASES[model.id] ?? []) {
        it(c.name, () => {
          const result = run(model.id, c)
          expect(result.path).toBe(c.path)
          expect(result).toMatchSnapshot()
        })
      }
    })
  }
})

/* ── Bodies only use documented fields and values ───────────────────────── */

type DocField = {
  required: boolean
  type: string
  enumValues?: string[]
  min?: number
  max?: number
}

const DIGEST = new URL("../_reference/docs/digest.md", import.meta.url)

function parseDigest(): Map<string, Map<string, DocField>> {
  const endpoints = new Map<string, Map<string, DocField>>()
  let fields: Map<string, DocField> | undefined
  for (const line of readFileSync(DIGEST, "utf8").split("\n")) {
    const endpoint = /^\s+endpoint: (.+)$/.exec(line)
    if (endpoint) {
      fields = new Map()
      endpoints.set(endpoint[1]!.trim().split(" ").pop()!, fields)
      continue
    }
    if (line.startsWith("## ")) fields = undefined
    const field = /^\s{4}(\*| )(\w+): (\S+)(.*)$/.exec(line)
    if (!field || !fields) continue
    const [, star, name, type, rest] = field
    const enumMatch = /enum\[([^\]]*)\]/.exec(rest!)
    const rangeMatch = /(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)/.exec(rest!)
    fields.set(name!, {
      required: star === "*",
      type: type!,
      enumValues: enumMatch?.[1]!.split(","),
      min: rangeMatch ? Number(rangeMatch[1]) : undefined,
      max: rangeMatch ? Number(rangeMatch[2]) : undefined,
    })
  }
  return endpoints
}

/** The one workflow page the digest does not cover (see docs/decisions.md). */
const UNDIGESTED = new Set(["bytedance/seedance-2.5/text-to-video"])

describe.skipIf(!existsSync(DIGEST))(
  "bodies match the documented schema",
  () => {
    const digest = existsSync(DIGEST)
      ? parseDigest()
      : new Map<string, Map<string, DocField>>()
    const reached = new Set<string>()

    for (const model of MODELS) {
      for (const c of CASES[model.id] ?? []) {
        it(`${model.id} › ${c.name}`, () => {
          const { path, body } = run(model.id, c)
          reached.add(path)
          if (UNDIGESTED.has(path)) return
          const fields = digest.get(path)
          expect(fields, `undocumented path ${path}`).toBeDefined()
          if (!fields) return
          for (const [key, value] of Object.entries(body)) {
            const doc = fields.get(key)
            expect(
              doc,
              `${path} has no documented field "${key}"`
            ).toBeDefined()
            if (!doc) continue
            if (Array.isArray(value)) {
              expect(doc.type).toBe("array")
              if (doc.min !== undefined)
                expect(value.length).toBeGreaterThanOrEqual(doc.min)
              if (doc.max !== undefined)
                expect(value.length).toBeLessThanOrEqual(doc.max)
              continue
            }
            if (doc.enumValues)
              expect(doc.enumValues, `${path}.${key}`).toContain(String(value))
            if (typeof value === "number") {
              expect(["integer", "number"]).toContain(doc.type)
              if (doc.type === "integer")
                expect(Number.isInteger(value)).toBe(true)
              if (doc.min !== undefined)
                expect(value).toBeGreaterThanOrEqual(doc.min)
              if (doc.max !== undefined)
                expect(value).toBeLessThanOrEqual(doc.max)
            }
            if (typeof value === "boolean") expect(doc.type).toBe("boolean")
            if (typeof value === "string")
              expect(doc.type.split("|")).toContain("string")
          }
          for (const [key, doc] of fields)
            if (doc.required)
              expect(
                body,
                `${path} is missing required "${key}"`
              ).toHaveProperty(key)
        })
      }
    }

    it("reaches every documented generation endpoint", () => {
      expect(digest.size).toBeGreaterThan(70)
      expect(digest.get("z-image/turbo")?.get("prompt")?.required).toBe(true)
      const documented = [...digest.keys()].filter(
        (path) => !path.startsWith("https://")
      )
      expect(documented.filter((path) => !reached.has(path))).toEqual([])
    })
  }
)

/* ── Catalog metadata ───────────────────────────────────────────────────── */

const ICONS = new URL("../public/model-icons/", import.meta.url)

/** Settings in the Seedance 2.5 exemplar that fall back to the key as label. */
const UNLABELLED = new Set([
  "seedance-2.5.resolution",
  "seedance-2.5-edit.resolution",
  "seedance-2.5-extend.resolution",
])
const DOCS_PREFIX = "https://docs.higgsfield.ai/docs/models/"
const CRAWLED = new URL("../_reference/docs/models/", import.meta.url)

function visibleStrings(model: ModelEntry): string[] {
  const strings = [
    model.label,
    model.description,
    model.bestFor ?? "",
    model.category ?? "",
    ...(model.mediaModes ?? []).map((mode) => mode.label),
  ]
  for (const field of Object.values(model.settings)) {
    strings.push(field.label ?? "", field.hint ?? "")
    if (field.type === "enum")
      strings.push(...Object.values(field.labels ?? {}))
  }
  return strings
}

describe("catalog metadata", () => {
  it("has unique ids", () => {
    const ids = MODELS.map((model) => model.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("keeps image orders below 100 and video orders from 100", () => {
    expect(MODELS.find((model) => model.id === "soul-2")?.order).toBe(0)
    expect(MODELS.find((model) => model.id === "seedance-2.5")?.order).toBe(100)
    for (const model of MODELS) {
      expect(model.order, model.id).toBeTypeOf("number")
      if (model.surface === "image") expect(model.order).toBeLessThan(100)
      if (model.surface === "video")
        expect(model.order).toBeGreaterThanOrEqual(100)
    }
  })

  for (const model of MODELS) {
    describe(model.id, () => {
      it("cites docs pages", () => {
        expect(model.docs.length).toBeGreaterThan(0)
        for (const url of model.docs) {
          const isLegacyDocs = url.startsWith(DOCS_PREFIX)
          expect(
            isLegacyDocs || url.startsWith("https://open.higgsfield.ai/models/")
          ).toBe(true)
          // Every cited page was crawled into _reference/docs/models.
          const page = `${url.slice(DOCS_PREFIX.length).replace("/", "__")}.md`
          if (isLegacyDocs && existsSync(CRAWLED))
            expect(existsSync(new URL(page, CRAWLED)), url).toBe(true)
        }
      })

      it("uses an installed icon", () => {
        expect(model.icon).toBeTruthy()
        expect(existsSync(new URL(`${model.icon}.svg`, ICONS))).toBe(true)
      })

      it("has picker metadata", () => {
        expect(model.family).toBeTruthy()
        expect(model.provider).toBeTruthy()
        expect(model.description).toBeTruthy()
        if (model.category)
          expect(model.category).toBe(model.category.toUpperCase())
      })

      it("never shows the platform name", () => {
        for (const value of visibleStrings(model))
          expect(value.toLowerCase()).not.toContain("higgsfield")
      })

      it("has valid setting defaults and labels", () => {
        for (const [key, field] of Object.entries(model.settings)) {
          if (!UNLABELLED.has(`${model.id}.${key}`))
            expect(field.label, `${key} label`).toBeTruthy()
          if (field.type === "enum") {
            expect(field.values).toContain(field.default)
            for (const labelled of Object.keys(field.labels ?? {}))
              expect(field.values).toContain(labelled)
          }
          if (field.type === "range") {
            expect(field.default).toBeGreaterThanOrEqual(field.min)
            expect(field.default).toBeLessThanOrEqual(field.max)
          }
        }
        expect(() => parseSettings(model, {})).not.toThrow()
      })

      it("keeps roles, modes and the enhance toggle consistent", () => {
        for (const mode of model.mediaModes ?? [])
          for (const [role, max] of Object.entries(mode.roles))
            expect(max).toBeLessThanOrEqual(model.roles[role as MediaRole] ?? 0)
        for (const role of model.requiredRoles ?? [])
          expect(model.roles[role]).toBeGreaterThan(0)
        if (model.enhanceSetting)
          expect(model.settings[model.enhanceSetting]?.type).toBe("boolean")
        if ((model.tab ?? "create") !== "create" && model.surface === "video")
          expect(model.requiredRoles ?? []).toContain("source")
      })
    })
  }
})

/* ── Rules that must reject ─────────────────────────────────────────────── */

describe("rejections", () => {
  it("rejects frames mixed with references", () => {
    expect(() =>
      toPlatform(
        plane("seedance-2", { start: 1, reference: 1 }, { noMode: true })
      )
    ).toThrow(/either frames or references/)
    expect(() =>
      toPlatform(
        plane("seedance-2", { start: 1, reference: 1 }, { mode: "frames" })
      )
    ).toThrow(/not supported with start\/end frames/)
    expect(() =>
      toPlatform(plane("wan-2.6", { start: 1, video: 1 }, { noMode: true }))
    ).toThrow(/either frames or references/)
    expect(() =>
      toPlatform(
        plane("kling-o3", { start: 1, reference: 2 }, { noMode: true })
      )
    ).toThrow(/either frames or references/)
  })

  it("rejects an end frame without a start frame", () => {
    expect(() => toPlatform(plane("pixverse-v6", { end: 1 }))).toThrow(
      /start frame before using an end frame/
    )
  })

  it("requires the source video on edit models", () => {
    for (const id of [
      "kling-o3-edit",
      "kling-omni-edit",
      "genjutsu-swap",
      "seedance-2.5-edit",
    ])
      expect(() => toPlatform(plane(id, { reference: 1 })), id).toThrow(
        /source video/
      )
  })

  it("rejects Kling motion control without a motion video", () => {
    for (const id of [
      "kling-3-motion-std",
      "kling-3-motion-pro",
      "kling-2.6-motion-std",
      "kling-2.6-motion-pro",
    ])
      expect(() => toPlatform(plane(id, { start: 1 })), id).toThrow(
        /motion video/
      )
    expect(() =>
      toPlatform(plane("kling-3-motion-std", { source: 1 }))
    ).toThrow(/character image/)
  })

  it("rejects Genjutsu without reference images", () => {
    expect(() =>
      toPlatform(plane("genjutsu-motion", { source: 1 }, { prompt: "" }))
    ).toThrow(/character image/)
  })

  it("rejects Grok video at 1080p with references", () => {
    expect(() =>
      toPlatform(
        plane(
          "grok-video-1.5",
          { reference: 2 },
          { settings: { resolution: "1080p" } }
        )
      )
    ).toThrow(/480p or 720p/)
    expect(() =>
      toPlatform(
        plane(
          "grok-video-1.5",
          { audio: 1 },
          { settings: { resolution: "1080p" } }
        )
      )
    ).toThrow(/480p or 720p/)
  })

  it("rejects Wan 2.6 at 15 s with video references", () => {
    expect(() =>
      toPlatform(
        plane("wan-2.6", { video: 2 }, { settings: { duration: "15" } })
      )
    ).toThrow(/5 or 10 seconds/)
  })

  it("rejects Wan 2.7 reference limits", () => {
    expect(() =>
      toPlatform(
        plane(
          "wan-2.7",
          { reference: 3, video: 3 },
          { settings: { aspectRatio: "16:9" } }
        )
      )
    ).toThrow(/at most 5/)
    expect(() =>
      toPlatform(
        plane("wan-2.7", { reference: 1 }, { settings: { aspectRatio: "1:1" } })
      )
    ).toThrow(/16:9 or 9:16/)
    expect(() =>
      toPlatform(plane("wan-2.7", { video: 1 }, { settings: { duration: 12 } }))
    ).toThrow(/up to 10 seconds/)
  })

  it("rejects audio-only references where audio needs company", () => {
    for (const id of ["seedance-2", "minimax-h3"]) {
      expect(() => toPlatform(plane(id, { audio: 1 })), id).toThrow(
        /reference image or reference video/
      )
      expect(
        () => toPlatform(plane(id, { audio: 1 }, { noMode: true })),
        id
      ).toThrow(/reference image or reference video|image or video reference/)
    }
  })

  it("rejects prompts over the documented limit", () => {
    expect(() =>
      toPlatform(plane("z-image-turbo", {}, { prompt: "a".repeat(801) }))
    ).toThrow(/limited to 800 characters/)
    expect(() =>
      toPlatform(plane("ideogram-4", {}, { prompt: "a".repeat(2049) }))
    ).toThrow(/limited to 2,048 characters/)
    expect(() =>
      toPlatform(plane("z-image-turbo", {}, { prompt: "a".repeat(800) }))
    ).not.toThrow()
  })

  it("requires a prompt where the docs do", () => {
    expect(() =>
      toPlatform(plane("kling-3-std", {}, { prompt: "  " }))
    ).toThrow(/prompt is required/)
    expect(() =>
      toPlatform(plane("happy-horse-1", { reference: 1 }, { prompt: "" }))
    ).toThrow(/Enter a prompt/)
    expect(() => toPlatform(plane("wan-2.7", {}, { prompt: "" }))).toThrow(
      /Enter a prompt/
    )
    expect(() => toPlatform(plane("seedance-2", {}, { prompt: "" }))).toThrow(
      /Enter a prompt/
    )
  })

  it("requires the start frame on start-frame-only endpoints", () => {
    expect(() => toPlatform(plane("kling-2.5-turbo-std"))).toThrow(
      /start frame/
    )
  })

  it("rejects settings outside the catalog", () => {
    expect(() => parseSettings(getModel("wan-3"), { duration: 31 })).toThrow(
      /Invalid duration/
    )
    expect(() =>
      parseSettings(getModel("kling-omni"), { duration: "7" })
    ).toThrow(/Invalid duration/)
  })
})

/* ── Mapping details worth pinning explicitly ───────────────────────────── */

describe("mapping details", () => {
  it("sends image_weight only with an Ideogram reference", () => {
    expect(toPlatform(plane("ideogram-4")).body).not.toHaveProperty(
      "image_weight"
    )
    expect(
      toPlatform(plane("ideogram-4", { reference: 1 })).body
    ).toMatchObject({ image_weight: 50 })
  })

  it("turns Qwen thinking off when prompt extension is off", () => {
    expect(
      toPlatform(
        plane("qwen-image-3", {}, { settings: { promptExtend: false } })
      ).body
    ).toMatchObject({ prompt_extend: false, enable_thinking: false })
  })

  it("omits Cinema Studio creative controls left on Auto", () => {
    const { body } = toPlatform(plane("cinema-studio-4"))
    for (const key of [
      "genre",
      "era",
      "light",
      "camera_movement",
      "color_palette",
    ])
      expect(body).not.toHaveProperty(key)
  })

  it("always sends MiniMax H3 at the fixed 2K resolution", () => {
    for (const media of [{}, { start: 1 }, { reference: 1 }] as Attach[])
      expect(toPlatform(plane("minimax-h3", media)).body.resolution).toBe("2K")
  })

  it("keeps aspect_ratio off endpoints that do not take it", () => {
    for (const [id, media] of [
      ["kling-3-pro", { start: 1 }],
      ["kling-3-turbo", { start: 1 }],
      ["kling-2.5-turbo", {}],
      ["hailuo-2.3", {}],
      ["pixverse-v6", { start: 1 }],
      ["wan-2.6", {}],
      ["wan-2.6", { start: 1 }],
      ["wan-2.7", { start: 1 }],
    ] as [string, Attach][])
      expect(toPlatform(plane(id, media)).body, id).not.toHaveProperty(
        "aspect_ratio"
      )
  })
})
