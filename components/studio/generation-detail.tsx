/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from "react"
import type { ReactElement, ReactNode } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Check, Copy, Download, X } from "lucide-react"

import type { TileAction } from "@/components/studio/gallery/gallery-types"
import { settingLabel } from "@/components/studio/settings-dialog"
import { Button } from "@/components/ui/button"
import { DialogTrigger } from "@/components/ui/dialog"
import { downloadMedia } from "@/lib/studio/download-media"
import { cn } from "@/lib/utils"

/**
 * GenerationDetailModal — the full-screen lightbox every finished generation
 * opens through: the media as a blurred backdrop, the crisp media stage, and
 * a glass side panel with prompt, details and the same actions as the tile.
 */
export interface GenerationDetail {
  src: string
  mediaType?: "image" | "video" | "audio"
  poster?: string
  aspectRatio?: number
  prompt?: string
  model?: string
  createdAt?: number
  settings?: Record<string, unknown>
  /** Credits this generation cost (net of refunds). */
  cost?: number
  author?: { name: string; image?: string }
}

export interface GenerationDetailRow {
  id: string
  label: string
  value: ReactNode
}

export interface GenerationDetailModalProps {
  trigger: ReactElement
  generation: GenerationDetail
  rows?: GenerationDetailRow[]
  /** Tile actions, rendered as the panel's button grid (the first is primary). */
  actions?: TileAction[]
}

function defaultRows(g: GenerationDetail): GenerationDetailRow[] {
  const rows: GenerationDetailRow[] = []
  if (g.model) rows.push({ id: "model", label: "Model", value: g.model })
  for (const [key, value] of Object.entries(g.settings ?? {})) {
    if (value === undefined || value === null || value === "") continue
    rows.push({
      id: key,
      label: settingLabel(key),
      value:
        typeof value === "boolean" ? (value ? "On" : "Off") : String(value),
    })
  }
  if (typeof g.cost === "number")
    rows.push({ id: "cost", label: "Cost", value: `✦ ${g.cost}` })
  if (g.createdAt)
    rows.push({
      id: "created",
      label: "Created",
      value: new Date(g.createdAt).toLocaleString(),
    })
  return rows
}

export function GenerationDetailModal({
  trigger,
  generation,
  rows,
  actions,
}: GenerationDetailModalProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const kind = generation.mediaType ?? "image"
  const backdrop = kind === "image" ? generation.src : generation.poster
  const detailRows = rows ?? defaultRows(generation)
  const buttons = (actions ?? []).filter((action) => action.id !== "download")

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#131416] duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col duration-150 outline-none md:flex-row data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
          <DialogPrimitive.Title className="sr-only">
            Generation
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {generation.prompt ?? "Generated media"}
          </DialogPrimitive.Description>
          {backdrop ? (
            <img
              aria-hidden
              src={backdrop}
              alt=""
              className="pointer-events-none absolute inset-0 size-full object-cover opacity-50 blur-[64px]"
            />
          ) : null}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute inset-0 hidden cursor-zoom-out md:block"
          />
          <div className="pointer-events-none relative flex min-h-0 flex-1 items-center justify-center p-4 md:p-8">
            <div className="pointer-events-auto flex max-h-full max-w-full items-center justify-center">
              {kind === "video" ? (
                <video
                  src={generation.src}
                  poster={generation.poster}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[calc(100dvh-4rem)] max-w-full rounded-xl shadow-2xl"
                />
              ) : kind === "audio" ? (
                <div className="glass flex w-[min(560px,90vw)] flex-col gap-4 rounded-3xl p-6">
                  <p className="text-sm text-muted-foreground">
                    {generation.model}
                  </p>
                  <audio
                    src={generation.src}
                    controls
                    autoPlay
                    className="w-full"
                  />
                </div>
              ) : (
                <img
                  src={generation.src}
                  alt={generation.prompt ?? ""}
                  className="max-h-[calc(100dvh-4rem)] max-w-full rounded-xl object-contain shadow-2xl"
                />
              )}
            </div>
          </div>
          <aside className="relative flex max-h-[45dvh] w-full shrink-0 flex-col p-2 md:max-h-none md:w-[368px]">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-3xl border border-white/5 bg-[rgba(35,38,42,0.75)] p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                {generation.author ? (
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-lime text-sm font-semibold text-[#131517]">
                      {generation.author.image ? (
                        <img
                          src={generation.author.image}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        generation.author.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {generation.author.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Author
                      </span>
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold">Generation</span>
                )}
                <DialogPrimitive.Close
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close"
                      className="rounded-full bg-white/5"
                    />
                  }
                >
                  <X />
                </DialogPrimitive.Close>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
                {generation.prompt ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium tracking-wide text-[#828282] uppercase">
                        Prompt
                      </span>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          void navigator.clipboard
                            ?.writeText(generation.prompt!)
                            .then(() => {
                              setCopied(true)
                              window.setTimeout(() => setCopied(false), 1200)
                            })
                        }
                      >
                        {copied ? (
                          <Check className="size-3 text-lime" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p
                      className={cn(
                        "text-sm leading-5 text-foreground",
                        !expanded && "line-clamp-5"
                      )}
                    >
                      {generation.prompt}
                    </p>
                    {generation.prompt.length > 240 ? (
                      <button
                        type="button"
                        className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => setExpanded((value) => !value)}
                      >
                        {expanded ? "Show less" : "See all"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {detailRows.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium tracking-wide text-[#828282] uppercase">
                      Details
                    </span>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                      {detailRows.map((row) => (
                        <div key={row.id} className="contents">
                          <dt className="text-[#828282]">{row.label}</dt>
                          <dd className="truncate text-right tabular-nums">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {buttons.map((action, index) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.onSelect?.()
                      if (action.id !== "publish") setOpen(false)
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-sm font-medium transition-colors",
                      index === 0
                        ? "bg-lime text-[#1a1a1a] hover:bg-lime/85"
                        : action.danger
                          ? "bg-white/5 text-[#ff6b6b] hover:bg-white/10"
                          : "bg-white/5 text-foreground hover:bg-white/10"
                    )}
                  >
                    <action.icon className="size-4" /> {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void downloadMedia(generation.src)}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-white/5 text-sm font-medium text-foreground transition-colors hover:bg-white/10",
                    buttons.length % 2 === 0 && "col-span-2"
                  )}
                >
                  <Download className="size-4" /> Download
                </button>
              </div>
            </div>
          </aside>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
