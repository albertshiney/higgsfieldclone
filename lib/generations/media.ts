import "server-only"

import type { ObjectId } from "mongodb"

import type {
  MediaItem,
  MediaKind,
  MediaRole,
} from "@/generation/catalog/types"
import { UserFacingError } from "@/lib/errors"
import { collections, type GenerationOutput } from "@/lib/db/collections"

/**
 * Attachments arrive from the browser as display URLs. Each one must belong to
 * the signed-in user (an upload, or an output of their own generation); we
 * swap in the URL the platform can fetch and the server-probed duration.
 * Client-supplied kinds and durations are never trusted.
 */
export type ClientMedia = { role: MediaRole; url: string; name?: string }

export type ResolvedMedia = MediaItem & {
  kind: MediaKind
  /** What the generation document stores (display URL). */
  displayUrl: string
}

/** URL the platform should fetch for an output. */
export function fetchableOutputUrl(output: GenerationOutput): string {
  return output.storage === "r2"
    ? output.url
    : (output.platformUrl ?? output.url)
}

export async function resolveOwnedMedia(
  userId: ObjectId,
  items: ClientMedia[]
): Promise<ResolvedMedia[]> {
  if (!items.length) return []
  const { uploads, generations } = await collections()
  const urls = [...new Set(items.map((item) => item.url))]
  const [ownUploads, ownGenerations] = await Promise.all([
    uploads
      .find({
        userId,
        $or: [{ url: { $in: urls } }, { platformUrl: { $in: urls } }],
      })
      .toArray(),
    generations
      .find(
        { userId, "outputs.url": { $in: urls } },
        { projection: { outputs: 1 } }
      )
      .toArray(),
  ])
  return items.map((item, index) => {
    const upload = ownUploads.find(
      (doc) => doc.url === item.url || doc.platformUrl === item.url
    )
    if (upload)
      return {
        id: `m${index}`,
        role: item.role,
        kind: upload.kind,
        url: upload.platformUrl ?? upload.url,
        displayUrl: upload.url,
        name: item.name ?? upload.name,
        ...(upload.durationSec ? { durationSec: upload.durationSec } : {}),
      }
    const output = ownGenerations
      .flatMap((doc) => doc.outputs)
      .find((candidate) => candidate.url === item.url)
    if (output)
      return {
        id: `m${index}`,
        role: item.role,
        kind: output.kind,
        url: fetchableOutputUrl(output),
        displayUrl: output.url,
        ...(item.name ? { name: item.name } : {}),
        ...(output.durationSec ? { durationSec: output.durationSec } : {}),
      }
    throw new UserFacingError(
      "One of your attachments is no longer available. Remove it and add it again.",
      "MEDIA_NOT_FOUND"
    )
  })
}
