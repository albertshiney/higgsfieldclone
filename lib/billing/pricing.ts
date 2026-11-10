import "server-only"

import { MODELS } from "@/generation/catalog"
import { collections } from "@/lib/db/collections"
import { env, providerFixtureMode } from "@/lib/env"

import { creditConfig } from "./config"
import { fromPrice, toCreditTable, type CreditTable } from "./price"
import { PRICING_TABLE } from "./pricing-table"
import type { PricingTable } from "./pricing-types"

/**
 * The pricing in force: static table (placeholders, then estimate-synced
 * rules) overlaid with admin overrides from `model_pricing`, plus the set of
 * models an admin switched off. Cached briefly per process.
 *
 * Against the live platform, placeholder (unverified) rules are left out of
 * the credit table, so those endpoints can't be run until an admin prices
 * them; the local mock keeps them so every model can be exercised.
 */
export type PricingContext = {
  usd: PricingTable
  credits: CreditTable
  disabled: Set<string>
  /** Placeholder rules still in use (shown as a warning in admin). */
  placeholderPaths: string[]
}

const TTL_MS = 30_000
let cached: { at: number; value: PricingContext } | undefined

export async function pricingContext(fresh = false): Promise<PricingContext> {
  if (!fresh && cached && Date.now() - cached.at < TTL_MS) return cached.value
  const usd: PricingTable = { ...PRICING_TABLE }
  const disabled = new Set<string>(
    livePlatform()
      ? ["seedance-2.5", "seedance-2.5-edit", "seedance-2.5-extend"]
      : []
  )
  for (const model of MODELS) {
    if (!providerFixtureMode() && model.apiProvider !== "sume")
      disabled.add(model.id)
    if (model.apiProvider === "sume" && !env().SUME_API_KEY)
      disabled.add(model.id)
    if (model.apiProvider === "muapi" && !env().MUAPI_API_KEY)
      disabled.add(model.id)
  }
  try {
    const { modelPricing } = await collections()
    for (const doc of await modelPricing.find({}).toArray()) {
      if (!doc.enabled) disabled.add(doc.modelId)
      for (const [path, rule] of Object.entries(doc.rules ?? {}))
        usd[path] = { ...rule, source: "admin" }
    }
  } catch (error) {
    // Pricing must not take the site down when the database is unreachable.
    console.error("[pricing] could not load overrides", error)
  }
  const sellable = livePlatform()
    ? Object.fromEntries(
        Object.entries(usd).filter(([, rule]) => rule.source !== "placeholder")
      )
    : usd
  const value: PricingContext = {
    usd,
    credits: toCreditTable(sellable, creditConfig()),
    disabled,
    placeholderPaths: Object.entries(usd)
      .filter(([, rule]) => rule.source === "placeholder")
      .map(([path]) => path),
  }
  cached = { at: Date.now(), value }
  return value
}

/** True when requests go to the real Higgsfield API (not the local mock). */
export function livePlatform(): boolean {
  try {
    return new URL(env().HF_API_BASE_URL).hostname.endsWith("higgsfield.ai")
  } catch {
    return false
  }
}

export function invalidatePricing(): void {
  cached = undefined
}

/** What client pages need: credit rules (no USD) and enabled model ids. */
export type ClientPricing = {
  table: CreditTable
  disabled: string[]
  fromPrices: Record<string, number>
  live: boolean
}

export async function clientPricing(): Promise<ClientPricing> {
  const context = await pricingContext()
  const fromPrices: Record<string, number> = {}
  for (const model of MODELS) {
    const price = fromPrice(model.id, context.credits)
    if (price !== null) fromPrices[model.id] = price
  }
  return {
    table: context.credits,
    disabled: [...context.disabled],
    fromPrices,
    live: livePlatform(),
  }
}
