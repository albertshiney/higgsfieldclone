import "server-only"

import type { ObjectId } from "mongodb"

import { refundGeneration } from "@/lib/billing/ledger"
import { roundCredits } from "@/lib/billing/price"
import {
  collections,
  IN_FLIGHT,
  type GenerationDoc,
  type GenerationOutput,
} from "@/lib/db/collections"
import { generationClient } from "@/lib/providers/client"
import { describeTerminal } from "@/lib/higgsfield/errors"
import {
  PLATFORM_TERMINAL,
  type PlatformArtifact,
} from "@/lib/higgsfield/types"
import { copyFromUrl } from "@/lib/storage"

/**
 * finalizeGeneration — the only way a run reaches a terminal state. Called by
 * the webhook, the reconciler and user refreshes; safe to call concurrently
 * and repeatedly:
 *   1. re-fetch the status from the platform (payloads are never trusted);
 *   2. take a lease so only one caller copies outputs;
 *   3. copy outputs to our storage, or refund failed/nsfw/canceled runs;
 *   4. commit with a conditional update (status still in flight).
 */

const LEASE_MS = 5 * 60_000
/** Copy attempts before we keep the platform URL and retry the copy later. */
const MAX_COPY_ATTEMPTS = 4

export type FinalizeOutcome =
  | "missing"
  | "already_terminal"
  | "not_submitted"
  | "in_flight"
  | "leased"
  | "completed"
  | "refunded"
  | "copy_retry"

type Deps = {
  status?: (
    requestId: string
  ) => Promise<import("@/lib/higgsfield/types").RequestStatus>
  copy: typeof copyFromUrl
}

export async function finalizeGeneration(
  generationId: ObjectId,
  deps: Deps = { copy: copyFromUrl }
): Promise<FinalizeOutcome> {
  const { generations } = await collections()
  const gen = await generations.findOne({ _id: generationId })
  if (!gen) return "missing"
  if (!IN_FLIGHT.includes(gen.status)) return "already_terminal"
  if (!gen.hfRequestId) return "not_submitted"

  const status = await (deps.status
    ? deps.status(gen.hfRequestId)
    : generationClient(gen.provider).status(gen.hfRequestId))
  if (status.costUsd !== undefined)
    await generations.updateOne(
      { _id: gen._id },
      {
        $set: {
          providerCostUsd: status.costUsd,
          providerRefunded: status.providerRefunded === true,
        },
      }
    )
  if (!PLATFORM_TERMINAL.has(status.status)) {
    const next = status.status === "in_progress" ? "in_progress" : gen.status
    await generations.updateOne(
      { _id: gen._id, status: { $in: [...IN_FLIGHT] } },
      { $set: { status: next, updatedAt: new Date() } }
    )
    return "in_flight"
  }

  const now = new Date()
  const leased = await generations.findOneAndUpdate(
    {
      _id: gen._id,
      status: { $in: [...IN_FLIGHT] },
      $or: [
        { finalizeLeaseUntil: { $exists: false } },
        { finalizeLeaseUntil: { $lt: now } },
      ],
    },
    {
      $set: { finalizeLeaseUntil: new Date(now.getTime() + LEASE_MS) },
      $inc: { finalizeAttempts: 1 },
    },
    { returnDocument: "after" }
  )
  if (!leased) return "leased"

  const media = status.artifacts.filter((artifact) => artifact.kind !== "file")
  if (status.status === "completed" && media.length > 0) {
    const outputs = await copyOutputs(leased, media, deps.copy)
    if (!outputs) {
      await generations.updateOne(
        { _id: gen._id },
        { $unset: { finalizeLeaseUntil: "" }, $set: { updatedAt: new Date() } }
      )
      return "copy_retry"
    }
    const first = outputs[0]
    const committed = await generations.findOneAndUpdate(
      { _id: gen._id, status: { $in: [...IN_FLIGHT] } },
      {
        $set: {
          status: "completed",
          outputs,
          finishedAt: new Date(),
          updatedAt: new Date(),
          ...(first?.width && first.height
            ? { aspect: first.width / first.height }
            : {}),
        },
        $unset: { finalizeLeaseUntil: "", error: "", errorKind: "" },
      },
      { returnDocument: "after" }
    )
    if (committed) await trueUp(committed)
    return "completed"
  }

  const terminal =
    status.status === "completed"
      ? "failed"
      : (status.status as GenerationDoc["status"])
  const message =
    status.status === "completed"
      ? describeTerminal("failed", "The model finished without returning media")
      : describeTerminal(status.status, status.error)
  const committed = await generations.findOneAndUpdate(
    { _id: gen._id, status: { $in: [...IN_FLIGHT] } },
    {
      $set: {
        status: terminal,
        error: message,
        errorKind:
          terminal === "nsfw"
            ? "nsfw"
            : terminal === "canceled"
              ? "canceled"
              : "failed",
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { finalizeLeaseUntil: "" },
    }
  )
  if (committed) await refundGeneration(gen._id, "generation_refund")
  return "refunded"
}

async function copyOutputs(
  gen: GenerationDoc,
  artifacts: PlatformArtifact[],
  copy: typeof copyFromUrl
): Promise<GenerationOutput[] | null> {
  const outputs: GenerationOutput[] = []
  const base = `u/${gen.userId.toHexString()}/${gen._id.toHexString()}`
  for (const [index, artifact] of artifacts.entries()) {
    const kind = artifact.kind === "file" ? gen.surface : artifact.kind
    try {
      const stored = await copy(artifact.url, `${base}/${index}`, {
        contentType: artifact.contentType ?? defaultType(kind),
      })
      outputs.push({
        kind,
        url: stored.url,
        key: stored.key,
        contentType: stored.contentType,
        bytes: stored.bytes,
        ...(stored.width ? { width: stored.width } : {}),
        ...(stored.height ? { height: stored.height } : {}),
        ...(stored.durationSec ? { durationSec: stored.durationSec } : {}),
        storage: stored.storage,
        platformUrl: artifact.url,
      })
    } catch (error) {
      console.error(
        `[finalize] copy failed for ${gen._id.toHexString()} #${index} (attempt ${gen.finalizeAttempts})`,
        error instanceof Error ? error.message : error
      )
      if (gen.finalizeAttempts < MAX_COPY_ATTEMPTS) return null
      // The provider controls URL expiry; retry the copy rather than discard it.
      outputs.push({
        kind,
        url: artifact.url,
        key: "",
        contentType: artifact.contentType ?? defaultType(kind),
        storage: "platform",
        platformUrl: artifact.url,
      })
    }
  }
  return outputs
}

function defaultType(kind: string): string {
  return kind === "video"
    ? "video/mp4"
    : kind === "audio"
      ? "audio/mpeg"
      : "image/png"
}

/**
 * Source-length endpoints were charged for the longest possible output when
 * the source duration was unknown; refund the difference from the real one.
 */
async function trueUp(gen: GenerationDoc): Promise<void> {
  if (!gen.billing?.provisional) return
  const seconds = gen.outputs.find((output) => output.durationSec)?.durationSec
  if (!seconds) return
  const { creditsPerUnit, unitScale = 1, unitOffset = 0 } = gen.billing
  const actual = roundCredits(
    creditsPerUnit * (unitScale * Math.ceil(seconds) + unitOffset) +
      (gen.billing.extraCredits ?? 0)
  )
  const difference = gen.cost - actual
  if (difference > 0)
    await refundGeneration(gen._id, "generation_adjust", difference)
}

/** Retry copies for outputs still pointing at the platform CDN. */
export async function recopyPlatformOutputs(
  gen: GenerationDoc,
  copy: typeof copyFromUrl = copyFromUrl
): Promise<boolean> {
  if (!gen.outputs.some((output) => output.storage === "platform")) return false
  const { generations } = await collections()
  const base = `u/${gen.userId.toHexString()}/${gen._id.toHexString()}`
  const outputs: GenerationOutput[] = []
  for (const [index, output] of gen.outputs.entries()) {
    if (output.storage !== "platform") {
      outputs.push(output)
      continue
    }
    try {
      const stored = await copy(
        output.platformUrl ?? output.url,
        `${base}/${index}`,
        {
          contentType: output.contentType,
        }
      )
      outputs.push({
        ...output,
        url: stored.url,
        key: stored.key,
        bytes: stored.bytes,
        storage: stored.storage,
        ...(stored.width ? { width: stored.width } : {}),
        ...(stored.height ? { height: stored.height } : {}),
        ...(stored.durationSec ? { durationSec: stored.durationSec } : {}),
      })
    } catch {
      outputs.push(output)
    }
  }
  await generations.updateOne(
    { _id: gen._id },
    { $set: { outputs, updatedAt: new Date() } }
  )
  return true
}
