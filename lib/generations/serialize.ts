import "server-only"

import type { GenerationDoc, ProjectDoc, UploadDoc } from "@/lib/db/collections"

import type { GenerationView, ProjectView, UploadView } from "./view"

export function toGenerationView(doc: GenerationDoc): GenerationView {
  return {
    id: doc._id.toHexString(),
    surface: doc.surface,
    modelId: doc.modelId,
    modelLabel: doc.modelLabel,
    prompt: doc.prompt,
    settings: doc.settings,
    media: doc.media.map(({ role, kind, url, name }) => ({
      role,
      kind,
      url,
      ...(name ? { name } : {}),
    })),
    status: doc.status,
    cost: doc.cost,
    refunded: doc.refunded ?? 0,
    canCancel: doc.provider !== "muapi" && doc.provider !== "sume",
    outputs: doc.outputs.map(({ kind, url, width, height, durationSec }) => ({
      kind,
      url,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(durationSec ? { durationSec } : {}),
    })),
    aspect: doc.aspect,
    ...(doc.error ? { error: doc.error } : {}),
    ...(doc.errorKind ? { errorKind: doc.errorKind } : {}),
    isPublic: doc.isPublic,
    ...(doc.projectId ? { projectId: doc.projectId.toHexString() } : {}),
    ...(doc.presetId ? { presetId: doc.presetId } : {}),
    createdAt: doc.createdAt.getTime(),
    ...(doc.finishedAt ? { finishedAt: doc.finishedAt.getTime() } : {}),
  }
}

export function toUploadView(doc: UploadDoc): UploadView {
  return {
    id: doc._id.toHexString(),
    kind: doc.kind,
    url: doc.url,
    name: doc.name,
    ...(doc.width ? { width: doc.width } : {}),
    ...(doc.height ? { height: doc.height } : {}),
    ...(doc.durationSec ? { durationSec: doc.durationSec } : {}),
    createdAt: doc.createdAt.getTime(),
  }
}

export function toProjectView(
  doc: ProjectDoc,
  stats: { count: number; cover?: string }
): ProjectView {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    generationCount: stats.count,
    ...(stats.cover ? { cover: stats.cover } : {}),
    updatedAt: doc.updatedAt.getTime(),
    createdAt: doc.createdAt.getTime(),
  }
}
