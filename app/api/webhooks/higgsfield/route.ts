import { after } from "next/server"
import { ObjectId } from "mongodb"

import { collections } from "@/lib/db/collections"
import { isDuplicateKey } from "@/lib/billing/ledger"
import { env } from "@/lib/env"
import { finalizeGeneration } from "@/lib/generations/finalize"
import { asRecord } from "@/lib/higgsfield/client"
import {
  verifyWebhookSignature,
  verifyWebhookToken,
} from "@/lib/higgsfield/webhook"
import { json } from "@/lib/http"

export const runtime = "nodejs"

const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"])
const REQUEST_ID = /^[a-f0-9-]{8,64}$/i

/**
 * Higgsfield completion webhook (docs: how-to/webhooks). The URL carries the
 * generation id and an HMAC token. The raw delivery also has a Standard
 * Webhooks signature; finalizeGeneration re-fetches status before acting.
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  const gid = url.searchParams.get("gid") ?? ""
  const token = url.searchParams.get("t") ?? ""
  const { HF_WEBHOOK_SECRET: secret, HF_WEBHOOK_SIGNING_SECRET: signingSecret } =
    env()
  if (!secret || !verifyWebhookToken(gid, token, secret))
    return json({ error: "Invalid webhook token" }, 401)

  const rawBody = await request.text()
  if (
    signingSecret &&
    !verifyWebhookSignature(rawBody, request.headers, signingSecret)
  )
    return json({ error: "Invalid webhook signature" }, 401)
  const envelope = asRecord(
    (() => {
      try {
        return JSON.parse(rawBody) as unknown
      } catch {
        return null
      }
    })()
  )
  const requestId = envelope.request_id
  const status = envelope.status
  if (
    typeof requestId !== "string" ||
    !REQUEST_ID.test(requestId) ||
    typeof status !== "string" ||
    !TERMINAL.has(status)
  )
    return json({ error: "Invalid webhook envelope" }, 400)

  const { generations, hfWebhookEvents } = await collections()
  const generationId = new ObjectId(gid)
  let duplicate = false
  try {
    await hfWebhookEvents.insertOne({
      _id: new ObjectId(),
      requestId,
      status,
      generationId,
      receivedAt: new Date(),
    })
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    duplicate = true
  }

  const gen = await generations.findOne({ _id: generationId })
  if (!gen) return json({ ok: true, ignored: "unknown generation" })
  if (gen.hfRequestId && gen.hfRequestId !== requestId)
    return json({ ok: true, ignored: "request mismatch" })

  if (!gen.hfRequestId) {
    // The submit response never arrived (ambiguous); adopt the request now.
    await generations.updateOne(
      { _id: gen._id, hfRequestId: { $exists: false } },
      { $set: { hfRequestId: requestId, updatedAt: new Date() } }
    )
  }
  if (
    status === "completed" &&
    gen.status === "failed" &&
    (gen.errorKind === "submit" || gen.errorKind === "timeout")
  ) {
    // Late success for a run we already refunded: deliver it anyway.
    console.warn(
      `[webhook] late delivery for ${gid}; delivering without re-charging`
    )
    await generations.updateOne(
      { _id: gen._id, status: "failed" },
      {
        $set: {
          status: "in_progress",
          hfRequestId: requestId,
          updatedAt: new Date(),
        },
        $unset: { error: "", errorKind: "", finishedAt: "" },
      }
    )
  }

  if (!duplicate || gen.status !== "completed")
    after(async () => {
      try {
        await finalizeGeneration(gen._id)
      } catch (error) {
        // The reconciler retries anything left in flight.
        console.error(`[webhook] finalize failed for ${gid}`, error)
      }
    })
  return json({ ok: true })
}
