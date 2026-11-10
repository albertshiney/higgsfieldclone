import "server-only"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { env } from "@/lib/env"
import { UserFacingError } from "@/lib/errors"

const claimsSchema = z.object({
  user: z.string(),
  submitKey: z.string(),
  fingerprint: z.string(),
  usd: z.number().finite().nonnegative(),
  credits: z.number().int().positive(),
  expires: z.number().int(),
})
type Claims = z.infer<typeof claimsSchema>
export function requestFingerprint(
  provider: string,
  path: string,
  body: Record<string, unknown>
): string {
  return createHash("sha256")
    .update(JSON.stringify([provider, path, body]))
    .digest("hex")
}
function signature(payload: string): Buffer {
  const secret = env().AUTH_SECRET
  if (!secret)
    throw new UserFacingError(
      "Cost confirmation is not configured.",
      "QUOTE_UNAVAILABLE"
    )
  return createHmac("sha256", secret)
    .update("generation-approval-v1:" + payload)
    .digest()
}
export function enforceSpendCap(usd: number): void {
  const cap = env().GENERATION_MAX_USD
  if (!Number.isFinite(usd) || usd < 0)
    throw new UserFacingError(
      "The provider did not return a valid dollar estimate.",
      "QUOTE_UNAVAILABLE"
    )
  if (usd > cap + 0.000001)
    throw new UserFacingError(
      "The provider estimate $" +
        usd.toFixed(3) +
        " exceeds the $" +
        cap.toFixed(2) +
        " generation limit. Choose a cheaper model or setting.",
      "SPEND_LIMIT"
    )
}
export function signApproval(
  claims: Omit<Claims, "expires">,
  now = Date.now()
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, expires: now + 120_000 })
  ).toString("base64url")
  return payload + "." + signature(payload).toString("base64url")
}
export function verifyApproval(
  token: string | undefined,
  actual: Omit<Claims, "expires">,
  now = Date.now()
): void {
  enforceSpendCap(actual.usd)
  try {
    if (!token) throw new Error()
    const parts = token.split(".")
    if (parts.length !== 2) throw new Error()
    const expected = signature(parts[0])
    const supplied = Buffer.from(parts[1], "base64url")
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      throw new Error()
    const claims = claimsSchema.parse(
      JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"))
    )
    if (
      claims.expires <= now ||
      claims.expires > now + 120_000 ||
      claims.user !== actual.user ||
      claims.submitKey !== actual.submitKey ||
      claims.fingerprint !== actual.fingerprint ||
      actual.usd > claims.usd + 0.000001 ||
      actual.credits > claims.credits
    )
      throw new Error()
  } catch {
    throw new UserFacingError(
      "Review the current dollar estimate and confirm this generation again.",
      "APPROVAL_REQUIRED"
    )
  }
}
