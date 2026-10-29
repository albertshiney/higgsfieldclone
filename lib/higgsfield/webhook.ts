import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

/** Extra URL binding between a delivery and the generation it claims. */
export function webhookToken(generationId: string, secret: string): string {
  return createHmac("sha256", secret).update(generationId).digest("hex")
}

export function verifyWebhookToken(
  generationId: string,
  token: string,
  secret: string
): boolean {
  if (!/^[a-f0-9]{24}$/.test(generationId) || !/^[a-f0-9]{64}$/.test(token))
    return false
  const expected = Buffer.from(webhookToken(generationId, secret), "hex")
  const given = Buffer.from(token, "hex")
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/**
 * Standard Webhooks signature as documented at
 * https://docs.higgsfield.ai/docs/how-to/webhooks.md
 * Verify the untouched request body before JSON parsing.
 */
export function verifyWebhookSignature(
  rawBody: string,
  headers: Headers,
  signingSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const id = headers.get("webhook-id")
  const timestamp = headers.get("webhook-timestamp")
  const signatures = headers.get("webhook-signature")
  if (!id || !timestamp || !signatures || !/^\d{10}$/.test(timestamp))
    return false
  const signedAt = Number(timestamp)
  if (!Number.isSafeInteger(signedAt) || Math.abs(nowSeconds - signedAt) > 300)
    return false
  if (!signingSecret.startsWith("whsec_")) return false
  const encodedKey = signingSecret.slice(6)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedKey)) return false
  const key = Buffer.from(encodedKey, "base64")
  if (key.length === 0 || key.toString("base64") !== encodedKey) return false
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest()
  return signatures.split(/\s+/).some((entry) => {
    if (!entry.startsWith("v1,")) return false
    const encodedSignature = entry.slice(3)
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedSignature)) return false
    const signature = Buffer.from(encodedSignature, "base64")
    return (
      signature.length === expected.length &&
      timingSafeEqual(expected, signature)
    )
  })
}

/** Full hf_webhook URL for a generation, or undefined when webhooks are off. */
export function webhookUrlFor(generationId: string): string | undefined {
  const { HF_WEBHOOK_BASE_URL: base, HF_WEBHOOK_SECRET: secret } = env()
  if (!base || !secret) return undefined
  const url = new URL("/api/webhooks/higgsfield", base)
  url.searchParams.set("gid", generationId)
  url.searchParams.set("t", webhookToken(generationId, secret))
  return url.toString()
}
