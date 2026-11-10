import "server-only"

import { refundGeneration } from "@/lib/billing/ledger"
import { grantMonthlyAllowances } from "@/lib/billing/subscriptions"
import { collections, IN_FLIGHT, TERMINAL } from "@/lib/db/collections"
import { env } from "@/lib/env"
import { higgsfield } from "@/lib/higgsfield/client"

import { finalizeGeneration, recopyPlatformOutputs } from "./finalize"

/**
 * The reconciler (Vercel Cron every minute; an in-process loop in dev):
 *   • pending_submit older than 2 min with no request id → the submit never
 *     confirmed: mark failed and refund (a late webhook still attaches results);
 *   • queued / in_progress with no update for 3 min → finalize (poll status);
 *   • in flight past RUN_TIMEOUT_MINUTES → cancel if queued, fail + refund;
 *   • terminal failures with credits outstanding → refund (crash recovery);
 *   • outputs still on the platform CDN → retry the copy;
 *   • annual plans → monthly credit grants.
 */
export type ReconcileSummary = {
  unconfirmed: number
  finalized: number
  timedOut: number
  refunds: number
  recopied: number
  grants: number
  errors: number
}

const BATCH = 40

export async function reconcile(
  options: { staleSeconds?: number; pendingSeconds?: number; now?: Date } = {}
): Promise<ReconcileSummary> {
  const now = options.now ?? new Date()
  const staleMs = (options.staleSeconds ?? 180) * 1000
  const pendingMs = (options.pendingSeconds ?? 120) * 1000
  const timeoutMs = env().RUN_TIMEOUT_MINUTES * 60_000
  const { generations } = await collections()
  const summary: ReconcileSummary = {
    unconfirmed: 0,
    finalized: 0,
    timedOut: 0,
    refunds: 0,
    recopied: 0,
    grants: 0,
    errors: 0,
  }
  const guard = async (work: () => Promise<unknown>) => {
    try {
      await work()
    } catch (error) {
      summary.errors++
      console.error(
        "[reconcile]",
        error instanceof Error ? error.message : error
      )
    }
  }

  // 1. Submits that never confirmed.
  const unconfirmed = await generations
    .find({
      status: "pending_submit",
      hfRequestId: { $exists: false },
      createdAt: { $lt: new Date(now.getTime() - pendingMs) },
    })
    .limit(BATCH)
    .toArray()
  for (const gen of unconfirmed)
    await guard(async () => {
      if (gen.provider === "muapi" || gen.provider === "sume") return
      const result = await generations.updateOne(
        {
          _id: gen._id,
          status: "pending_submit",
          hfRequestId: { $exists: false },
        },
        {
          $set: {
            status: "failed",
            errorKind: "submit",
            error:
              "We couldn't confirm this generation started. Credits refunded.",
            finishedAt: now,
            updatedAt: now,
          },
        }
      )
      if (result.modifiedCount) {
        await refundGeneration(gen._id, "generation_refund")
        summary.unconfirmed++
      }
    })

  // MuAPI has no verified cancellation contract, so only confirmed terminal states release its credits.
  const expired = await generations
    .find({
      status: { $in: ["queued", "in_progress"] },
      createdAt: { $lt: new Date(now.getTime() - timeoutMs) },
    })
    .limit(BATCH)
    .toArray()
  for (const gen of expired)
    await guard(async () => {
      // One last look: it may have finished without a webhook.
      if ((await finalizeGeneration(gen._id)) !== "in_flight") return
      if (gen.provider === "muapi" || gen.provider === "sume") return
      if (gen.status === "queued" && gen.hfRequestId)
        await higgsfield()
          .cancel(gen.hfRequestId)
          .catch(() => undefined)
      const result = await generations.updateOne(
        { _id: gen._id, status: { $in: ["queued", "in_progress"] } },
        {
          $set: {
            status: "failed",
            errorKind: "timeout",
            error:
              "This generation took too long and was stopped. Credits refunded.",
            finishedAt: now,
            updatedAt: now,
          },
        }
      )
      if (result.modifiedCount) {
        await refundGeneration(gen._id, "generation_refund")
        summary.timedOut++
      }
    })

  // 3. Stale in-flight runs (webhook lost, or no public URL in dev).
  const stale = await generations
    .find({
      status: { $in: [...IN_FLIGHT] },
      hfRequestId: { $exists: true },
      updatedAt: { $lt: new Date(now.getTime() - staleMs) },
    })
    .sort({ updatedAt: 1 })
    .limit(BATCH)
    .toArray()
  for (const gen of stale)
    await guard(async () => {
      const outcome = await finalizeGeneration(gen._id)
      if (outcome === "completed" || outcome === "refunded") summary.finalized++
    })

  // 4. Refund sweep: terminal failures whose refund never landed.
  const owed = await generations
    .find({
      status: { $in: TERMINAL.filter((s) => s !== "completed") },
      $expr: { $lt: [{ $ifNull: ["$refunded", 0] }, "$cost"] },
    })
    .limit(BATCH)
    .toArray()
  for (const gen of owed)
    await guard(async () => {
      const { refunded } = await refundGeneration(gen._id, "generation_refund")
      if (refunded) summary.refunds++
    })

  // 5. Retry recent provider outputs that could not be copied.
  const onPlatform = await generations
    .find({
      status: "completed",
      "outputs.storage": "platform",
      finishedAt: { $gt: new Date(now.getTime() - 6 * 24 * 60 * 60_000) },
    })
    .limit(10)
    .toArray()
  for (const gen of onPlatform)
    await guard(async () => {
      if (await recopyPlatformOutputs(gen)) summary.recopied++
    })

  // 6. Monthly grants for annual subscriptions.
  await guard(async () => {
    summary.grants = await grantMonthlyAllowances(now)
  })

  return summary
}
