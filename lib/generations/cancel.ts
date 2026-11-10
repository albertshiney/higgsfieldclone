import "server-only"

import type { ObjectId } from "mongodb"

import { NotFoundError, UserFacingError } from "@/lib/errors"
import { collections } from "@/lib/db/collections"
import { PlatformError } from "@/lib/higgsfield/client"

import { generationClient } from "@/lib/providers/client"
import { finalizeGeneration } from "./finalize"

/**
 * Cancel really cancels on the platform (POST /requests/{id}/cancel): 202 while
 * queued, 400 once processing started. The canceled status then flows through
 * finalizeGeneration, which refunds exactly once.
 */
export async function cancelGeneration(
  userId: ObjectId,
  generationId: ObjectId
): Promise<void> {
  const { generations } = await collections()
  const gen = await generations.findOne({ _id: generationId, userId })
  if (!gen) throw new NotFoundError("Generation not found.")
  if (gen.status === "pending_submit")
    throw new UserFacingError(
      "Still starting — try cancelling again in a few seconds.",
      "NOT_YET"
    )
  if (gen.status !== "queued")
    throw new UserFacingError(
      gen.status === "in_progress"
        ? "This generation already started, so it can't be canceled."
        : "This generation already finished.",
      "NOT_CANCELABLE"
    )
  try {
    await generationClient(gen.provider).cancel(gen.hfRequestId!)
  } catch (caught) {
    if (caught instanceof PlatformError && caught.status === 400) {
      await generations.updateOne(
        { _id: gen._id, status: "queued" },
        { $set: { status: "in_progress", updatedAt: new Date() } }
      )
      throw new UserFacingError(
        "This generation already started, so it can't be canceled.",
        "NOT_CANCELABLE"
      )
    }
    throw caught
  }
  await finalizeGeneration(gen._id)
}
