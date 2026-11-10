import { describe, expect, it } from "vitest"

import { MODELS } from "@/generation/catalog"
import type { MediaItem } from "@/generation/catalog/types"
import {
  billableUnits,
  creditsFromUsd,
  fromPrice,
  priceFor,
  roundCredits,
  toCreditTable,
  tryPriceFor,
} from "@/lib/billing/price"
import { PLACEHOLDER_PRICING, PRICING_TABLE } from "@/lib/billing/pricing-table"

const config = { markup: 2, creditUsd: 0.01 }
const table = toCreditTable(PRICING_TABLE, config)

const source = (seconds?: number): MediaItem => ({
  id: "s",
  role: "source",
  kind: "video",
  url: "https://example.com/source.mp4",
  ...(seconds ? { durationSec: seconds } : {}),
})

describe("priceFor", () => {
  it("applies the brief's formula: ceil(usd × markup / creditUsd)", () => {
    expect(creditsFromUsd(0.094, config)).toBe(19)
    expect(creditsFromUsd(0.1, config)).toBe(20)
    expect(roundCredits(0.2)).toBe(1)
    expect(roundCredits(20.0000000001)).toBe(20)
  })

  it("scales video by duration and resolution", () => {
    const five = priceFor(
      "seedance-2.5",
      { duration: 5, resolution: "720p" },
      [],
      table
    )
    const ten = priceFor(
      "seedance-2.5",
      { duration: 10, resolution: "720p" },
      [],
      table
    )
    const low = priceFor(
      "seedance-2.5",
      { duration: 10, resolution: "480p" },
      [],
      table
    )
    expect(five.path).toBe("bytedance/seedance-2.5/text-to-video")
    // Twice the seconds, within one credit of rounding.
    expect(ten.units).toBe(five.units * 2)
    expect(Math.abs(ten.credits - five.credits * 2)).toBeLessThanOrEqual(1)
    expect(low.credits).toBeLessThan(ten.credits)
    expect(five.provisional).toBe(false)
  })

  it("multiplies images by batch size", () => {
    const one = priceFor("soul-2", { batchSize: "1" }, [], table)
    const four = priceFor("soul-2", { batchSize: "4" }, [], table)
    expect(four.credits).toBe(one.credits * 4)
  })

  it("prices source-length endpoints from the probed source duration", () => {
    const known = priceFor(
      "seedance-2.5-edit",
      {},
      [source(8)],
      table,
      "make it snow"
    )
    const unknown = priceFor(
      "seedance-2.5-edit",
      {},
      [source()],
      table,
      "make it snow"
    )
    // Edit bills input + generated seconds (both the source length) at 0.6×.
    expect(known.units).toBeCloseTo(8 * 2 * 0.6)
    expect(known.provisional).toBe(false)
    expect(unknown.units).toBeCloseTo(30 * 2 * 0.6)
    expect(unknown.provisional).toBe(true)
    expect(unknown.unitScale).toBeCloseTo(1.2)
    expect(unknown.credits).toBeGreaterThan(known.credits)
  })

  it("bills reference videos as input seconds at the with-video rate", () => {
    const video = (seconds?: number): MediaItem => ({
      id: "v",
      role: "video",
      kind: "video",
      url: "https://example.com/ref.mp4",
      ...(seconds ? { durationSec: seconds } : {}),
    })
    const prompt = "a dancer"
    const plain = priceFor("seedance-2.5", { duration: 5 }, [], table, prompt)
    const withRef = priceFor(
      "seedance-2.5",
      { duration: 5 },
      [video(4)],
      table,
      prompt
    )
    const unknownRef = priceFor(
      "seedance-2.5",
      { duration: 5 },
      [video()],
      table,
      prompt
    )
    expect(withRef.path).toBe("bytedance/seedance-2.5/reference-to-video")
    expect(plain.units).toBe(5)
    expect(withRef.units).toBeCloseTo((5 + 4) * 0.6)
    // Unknown lengths are billed at the rule's maximum, never less.
    expect(unknownRef.units).toBeCloseTo((5 + 30) * 0.6)
  })

  it("charges extra reference images beyond the included count", () => {
    const refs = (count: number): MediaItem[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `r${i}`,
        role: "reference" as const,
        kind: "image" as const,
        url: `https://example.com/r${i}.png`,
      }))
    const five = priceFor("minimax-h3", { duration: 5 }, refs(5), table, "x")
    const seven = priceFor("minimax-h3", { duration: 5 }, refs(7), table, "x")
    expect(five.path).toBe("minimax/h3/reference-to-video")
    expect(seven.credits - five.credits).toBe(creditsFromUsd(0.16, config))
  })

  it("returns null from tryPriceFor while inputs are incomplete", () => {
    expect(tryPriceFor("kling-3-motion-std", {}, [], table)).toBeNull()
  })

  it("rejects out-of-range settings instead of pricing them", () => {
    expect(() => priceFor("seedance-2.5", { duration: 99 }, [], table)).toThrow(
      /duration/
    )
    expect(() =>
      priceFor("seedance-2.5", { duration: 5.5 }, [], table)
    ).toThrow(/duration/)
  })

  it("has a static price for every Higgsfield catalog model", () => {
    const missing = MODELS.filter(
      (model) =>
        model.apiProvider !== "muapi" &&
        model.apiProvider !== "sume" &&
        fromPrice(model.id, table) === null
    ).map((model) => model.id)
    expect(missing).toEqual([])
  })

  it("has a static rule for every Higgsfield endpoint a model can reach", () => {
    const base = { id: "p", url: "https://example.com/x", durationSec: 5 }
    const trials: Record<string, MediaItem[]>[] = [
      {},
      { start: [{ ...base, role: "start", kind: "image" }] },
      { reference: [{ ...base, role: "reference", kind: "image" }] },
      { video: [{ ...base, role: "video", kind: "video" }] },
      {
        source: [{ ...base, role: "source", kind: "video" }],
        reference: [{ ...base, role: "reference", kind: "image" }],
      },
      {
        start: [{ ...base, role: "start", kind: "image" }],
        source: [{ ...base, role: "source", kind: "video" }],
      },
      { source: [{ ...base, role: "source", kind: "video" }] },
    ]
    const unpriced = new Set<string>()
    for (const model of MODELS.filter(
      (model) => model.apiProvider !== "muapi" && model.apiProvider !== "sume"
    )) {
      const defaults = Object.fromEntries(
        Object.entries(model.settings).map(([k, f]) => [k, f.default])
      )
      const enums = Object.entries(model.settings).flatMap(([key, field]) =>
        field.type === "enum" && field.values.length <= 6
          ? [[key, field.values] as const]
          : []
      )
      const variants: Record<string, unknown>[] = [{}]
      for (const [key, values] of enums)
        for (const value of values) variants.push({ [key]: value })
      for (let i = 0; i < enums.length; i++)
        for (let j = i + 1; j < enums.length; j++)
          for (const a of enums[i]![1])
            for (const b of enums[j]![1])
              variants.push({ [enums[i]![0]]: a, [enums[j]![0]]: b })
      for (const media of trials)
        for (const variant of variants) {
          try {
            const request = model.toPlatform!({
              model: model.id,
              prompt: { text: "coverage" },
              media,
              settings: { ...defaults, ...variant },
            })
            if (!PRICING_TABLE[request.path]) unpriced.add(request.path)
          } catch {
            /* invalid combination */
          }
        }
    }
    expect([...unpriced]).toEqual([])
  })

  it("flags every static rule as placeholder or description-derived", () => {
    for (const rule of Object.values(PLACEHOLDER_PRICING))
      expect(["placeholder", "description"]).toContain(rule.source)
  })

  it("reads units from the body, else falls back", () => {
    expect(billableUnits({ per: "request" }, {}, []).units).toBe(1)
    expect(billableUnits({ per: "second" }, { duration: 7 }, []).units).toBe(7)
    expect(billableUnits({ per: "output" }, { batch_size: 4 }, []).units).toBe(
      4
    )
    expect(billableUnits({ per: "output" }, {}, []).units).toBe(1)
  })
})
