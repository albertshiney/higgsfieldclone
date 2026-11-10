"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Clapperboard,
  Download,
  FolderPlus,
  Globe,
  GlobeLock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react"

import { moveToProjectAction } from "@/app/actions/generations"
import { createProjectAction, listProjectsAction } from "@/app/actions/projects"
import { useToast } from "@/components/providers/app-providers"
import type {
  GalleryItem,
  TileAction,
} from "@/components/studio/gallery/gallery-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { GenerationView, ProjectView } from "@/lib/generations/view"
import type { Runs } from "@/lib/studio/use-runs"
import { cn } from "@/lib/utils"

/**
 * Hover-rail + lightbox actions for a user's own generations, shared by the
 * generator feeds and the asset library. The first action is the lightbox's
 * primary (lime) button.
 */
export function useTileActions({
  runs,
  reuse,
  onChanged,
}: {
  runs: Runs
  reuse?: (run: GenerationView) => void
  onChanged?: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const [projectFor, setProjectFor] = useState<string[] | null>(null)
  const [deleteFor, setDeleteFor] = useState<string[] | null>(null)

  const actions = useCallback(
    (item: GalleryItem): TileAction[] => {
      const run = item.generation
      if (!run) return []
      const reuseAction: TileAction = {
        id: "reuse",
        label: "Reuse",
        icon: RotateCcw,
        onSelect: () =>
          reuse
            ? reuse(run)
            : router.push(
                `/${run.surface}?model=${encodeURIComponent(run.modelId)}`
              ),
      }
      const remove: TileAction = {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        danger: true,
        onSelect: () => setDeleteFor([run.id]),
      }
      if (item.status === "generating") {
        const elapsed = Date.now() - run.createdAt
        return [
          ...(run.status === "queued" && run.canCancel !== false
            ? [
                {
                  id: "cancel",
                  label: "Cancel",
                  icon: Square,
                  onSelect: () =>
                    void runs
                      .cancel(run.id)
                      .then(
                        (ok) =>
                          ok && toast.success("Canceled — credits refunded")
                      ),
                } satisfies TileAction,
              ]
            : []),
          ...(elapsed > 90_000
            ? [
                {
                  id: "refresh",
                  label: "Check status",
                  icon: RefreshCw,
                  onSelect: () => void runs.refresh(run.id),
                } satisfies TileAction,
              ]
            : []),
        ]
      }
      if (item.status === "failed") return [reuseAction, remove]
      const src = item.videoSrc ?? item.audioSrc ?? item.src
      return [
        reuseAction,
        { id: "download", label: "Download", icon: Download },
        ...(item.kind === "image"
          ? [
              {
                id: "animate",
                label: "Animate",
                icon: Clapperboard,
                onSelect: () =>
                  router.push(`/video?animate=${encodeURIComponent(src)}`),
              } satisfies TileAction,
            ]
          : []),
        {
          id: "publish",
          label: run.isPublic ? "Unpublish" : "Publish",
          icon: run.isPublic ? GlobeLock : Globe,
          onSelect: () =>
            void runs.publish(run.id, !run.isPublic).then((ok) => {
              if (ok)
                toast.success(
                  run.isPublic
                    ? "Removed from Community"
                    : "Published to Community"
                )
            }),
        },
        {
          id: "project",
          label: "Add to project",
          icon: FolderPlus,
          onSelect: () => setProjectFor([run.id]),
        },
        remove,
      ]
    },
    [reuse, router, runs, toast]
  )

  const dialogs = (
    <>
      <ProjectPickerDialog
        runIds={projectFor}
        onClose={() => setProjectFor(null)}
        onMoved={(name) => {
          toast.success(name ? `Moved to ${name}` : "Removed from project")
          onChanged?.()
        }}
      />
      <ConfirmDialog
        open={deleteFor !== null}
        title={
          deleteFor && deleteFor.length > 1
            ? `Delete ${deleteFor.length} generations?`
            : "Delete this generation?"
        }
        description="The media is removed from your library and storage. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteFor(null)}
        onConfirm={async () => {
          if (!deleteFor) return
          const ok = await runs.remove(deleteFor)
          setDeleteFor(null)
          if (ok) {
            toast.success("Deleted")
            onChanged?.()
          }
        }}
      />
    </>
  )

  return {
    actions,
    dialogs,
    openProjectPicker: setProjectFor,
    openDelete: setDeleteFor,
  }
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}) {
  const [pending, setPending] = useState(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !pending && onCancel()}
    >
      <DialogContent size="xs">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true)
              try {
                await onConfirm()
              } finally {
                setPending(false)
              }
            }}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}{" "}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProjectPickerDialog({
  runIds,
  onClose,
  onMoved,
}: {
  runIds: string[] | null
  onClose: () => void
  onMoved: (projectName: string | null) => void
}) {
  const toast = useToast()
  const [projects, setProjects] = useState<ProjectView[] | null>(null)
  const [name, setName] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const open = runIds !== null

  useEffect(() => {
    if (!open) return
    let alive = true
    void listProjectsAction().then((result) => {
      if (alive) setProjects(result.ok ? result.data : [])
    })
    return () => {
      alive = false
    }
  }, [open])

  const move = async (projectId: string | null, projectName: string | null) => {
    if (!runIds) return
    setPending(projectId ?? "none")
    const result = await moveToProjectAction(runIds, projectId)
    setPending(null)
    if (!result.ok) {
      toast.error("Couldn't move", result.error)
      return
    }
    onMoved(projectName)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add to project</DialogTitle>
          <DialogDescription>
            Group generations into projects in your library.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-1">
            {projects === null ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading projects…
              </p>
            ) : projects.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No projects yet — create one below.
              </p>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void move(project.id, project.name)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5",
                    pending === project.id && "opacity-60"
                  )}
                >
                  <span className="truncate">{project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {project.generationCount}
                  </span>
                </button>
              ))
            )}
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void move(null, null)}
              className="rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-white/5"
            >
              Remove from project
            </button>
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault()
              const created = await createProjectAction(name)
              if (!created.ok) {
                toast.error("Couldn't create project", created.error)
                return
              }
              setName("")
              await move(created.data.id, created.data.name)
            }}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New project name"
              aria-label="New project name"
              maxLength={80}
              className="h-9 flex-1 rounded-lg border border-white/10 bg-surface px-3 text-sm outline-none focus:border-lime/50"
            />
            <Button type="submit" disabled={!name.trim() || pending !== null}>
              Create
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
