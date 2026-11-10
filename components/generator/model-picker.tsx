"use client"

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type ReactElement } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Check, Search, Sparkle, X } from "lucide-react"

import { useApp } from "@/components/providers/app-providers"
import { DialogTrigger } from "@/components/ui/dialog"
import type { ModelBadge, ModelEntry } from "@/generation/catalog/types"
import { familyCover } from "@/lib/showcase"
import { cn } from "@/lib/utils"

export function ModelIcon({
  model,
  className,
}: {
  model: ModelEntry
  className?: string
}) {
  return model.icon ? (
    <img
      src={`/model-icons/${model.icon}.svg`}
      alt=""
      aria-hidden
      className={cn("size-5 brightness-0 invert", className)}
    />
  ) : (
    <Sparkle className={cn("size-5", className)} aria-hidden />
  )
}

const BADGE_CLASS: Record<ModelBadge, string> = {
  NEW: "bg-lime text-[#131517]",
  TOP: "bg-gradient-to-r from-[#4fc9dc] via-[#32a2ee] to-[#167bff] text-white",
  FAST: "bg-white/10 text-white",
  "4K": "bg-white/10 text-white",
  AUDIO: "bg-white/10 text-white",
  PRO: "bg-white/10 text-white",
}

export function Badge({ badge }: { badge: ModelBadge }) {
  return (
    <span
      className={cn(
        "font-display rounded-[4px] px-1.5 py-px text-[10px] leading-4 italic",
        BADGE_CLASS[badge]
      )}
    >
      {badge}
    </span>
  )
}

/** Searchable, family-grouped model grid. Every entry shows its "from ✦N" price. */
export function ModelPicker({
  models,
  value,
  onChange,
  trigger,
  title = "Choose a model",
}: {
  models: ModelEntry[]
  value?: string
  onChange: (id: string) => void
  trigger: ReactElement
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { pricing } = useApp()

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = models.filter(
      (model) =>
        !q ||
        model.label.toLowerCase().includes(q) ||
        model.family.toLowerCase().includes(q) ||
        model.description.toLowerCase().includes(q) ||
        (model.bestFor ?? "").toLowerCase().includes(q)
    )
    const byFamily = new Map<string, ModelEntry[]>()
    for (const model of filtered)
      byFamily.set(model.family, [...(byFamily.get(model.family) ?? []), model])
    return [...byFamily.entries()]
  }, [models, query])
  const featured = useMemo(
    () =>
      models
        .filter(
          (model) => model.surface !== "video" && model.badges?.includes("TOP")
        )
        .slice(0, 3),
    [models]
  )

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery("")
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="glass fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl duration-200 outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[min(760px,calc(100dvh-4rem))] sm:w-[min(900px,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl data-open:animate-in data-open:slide-in-from-bottom-8 sm:data-open:zoom-in-95">
          <div className="flex items-center gap-3 border-b border-white/5 p-4">
            <DialogPrimitive.Title className="text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
            <label className="ml-auto flex h-10 w-full max-w-72 items-center gap-2 rounded-[10px] bg-surface px-3 text-sm">
              <Search className="size-4 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search models…"
                aria-label="Search models"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-white/10 hover:bg-white/5"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Pick the model for your next generation.
          </DialogPrimitive.Description>
          <div className="flex-1 overflow-y-auto p-4">
            {!query && featured.length ? (
              <section className="mb-6">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <Sparkle className="size-3 fill-lime text-lime" /> Featured
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {featured.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => pick(model.id)}
                      className={cn(
                        "group relative flex h-36 flex-col justify-end overflow-hidden rounded-2xl p-3 text-left ring-1 ring-white/10 transition hover:ring-lime/50",
                        value === model.id && "ring-2 ring-lime"
                      )}
                    >
                      <img
                        src={familyCover(model.family, model.surface)}
                        alt=""
                        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                      <span className="relative flex items-center gap-2">
                        <ModelIcon model={model} className="size-4" />
                        <span className="text-sm font-semibold text-white">
                          {model.label}
                        </span>
                        {model.badges?.slice(0, 1).map((badge) => (
                          <Badge key={badge} badge={badge} />
                        ))}
                      </span>
                      <span className="relative mt-1 line-clamp-1 text-xs text-white/70">
                        {model.bestFor}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            {groups.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No models match “{query}”.
              </p>
            ) : (
              groups.map(([family, entries]) => (
                <section key={family} className="mb-5">
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {family}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {entries.map((model) => {
                      const from = pricing.fromPrices[model.id]
                      const selected = value === model.id
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => pick(model.id)}
                          aria-pressed={selected}
                          className={cn(
                            "flex items-center gap-3 rounded-xl p-2 pr-3 text-left transition-colors hover:bg-white/5",
                            selected && "bg-white/5"
                          )}
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-hover">
                            <ModelIcon model={model} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium">
                                {model.label}
                              </span>
                              {model.badges?.map((badge) => (
                                <Badge key={badge} badge={badge} />
                              ))}
                            </span>
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {model.description}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            {typeof from === "number" ? (
                              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                from ✦{from}
                              </span>
                            ) : null}
                            {selected ? (
                              <Check
                                className="size-4 text-lime"
                                aria-label="Selected"
                              />
                            ) : null}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
