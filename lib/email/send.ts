import "server-only"

import type { ReactElement } from "react"
import { ObjectId } from "mongodb"
import { Resend } from "resend"

import { collections } from "@/lib/db/collections"
import { env } from "@/lib/env"

/**
 * Transactional email through Resend. Without AUTH_RESEND_KEY outside
 * production, sign-in links are kept in the
 * dev_mailbox collection (24 h TTL) so E2E tests can follow magic links.
 */
let resend: Resend | undefined

/**
 * E2E runs (local or a preview deploy, never Vercel production) sign in with
 * addresses on the reserved `.test` TLD (RFC 2606). Those can't receive mail,
 * so they're kept in the test mailbox only and skip the per-IP send limits.
 */
export function isE2eAddress(email: string): boolean {
  return (
    env().E2E_TEST_MODE &&
    process.env.VERCEL_ENV !== "production" &&
    email.toLowerCase().endsWith(".test")
  )
}

export async function sendEmail(input: {
  to: string
  subject: string
  react: ReactElement
  text: string
  /** The link a dev/test reader needs (magic link). */
  devUrl?: string
}): Promise<void> {
  const value = env()
  // E2E runs (local or a preview deploy) read magic links from the test mailbox.
  const capture =
    Boolean(input.devUrl) &&
    ((value.E2E_TEST_MODE && process.env.VERCEL_ENV !== "production") ||
      (!value.AUTH_RESEND_KEY && value.NODE_ENV !== "production"))
  if (capture) await storeDevMail(input.to, input.subject, input.devUrl!)
  if (capture && isE2eAddress(input.to)) return
  if (value.AUTH_RESEND_KEY) {
    resend ??= new Resend(value.AUTH_RESEND_KEY)
    const { error } = await resend.emails.send({
      from: value.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      react: input.react,
      text: input.text,
    })
    if (error) throw new Error(`Email delivery failed: ${error.message}`)
    return
  }
  if (value.NODE_ENV === "production")
    throw new Error("AUTH_RESEND_KEY is required to send email in production")
  console.info(
    "[email:dev] Message captured locally. Sign-in links are not logged."
  )
}

async function storeDevMail(
  to: string,
  subject: string,
  url: string
): Promise<void> {
  const { devMailbox } = await collections()
  await devMailbox.insertOne({
    _id: new ObjectId(),
    to: to.toLowerCase(),
    subject,
    url,
    createdAt: new Date(),
  })
}
