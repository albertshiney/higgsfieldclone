import { createHmac } from "node:crypto"

import { describe, expect, it } from "vitest"

import { setupEnv, tinyMp4, tinyPng, tinyWav } from "./support/harness"

setupEnv()

const { refundSplit, splitDebit, InsufficientCreditsError } =
  await import("@/lib/billing/ledger")
const { probeMedia, probeImage } = await import("@/lib/storage/probe")
const { verifyWebhookToken, verifyWebhookSignature, webhookToken, webhookUrlFor } =
  await import("@/lib/higgsfield/webhook")
const { extractArtifacts } = await import("@/lib/higgsfield/client")
const { parseUploadTicket, requireUploadContentType } =
  await import("@/generation/upload-contract")
const { applyTemplate } = await import("@/lib/presets")

describe("credit buckets", () => {
  it("spends subscription credits first, then top-ups", () => {
    expect(splitDebit({ subscription: 50, topup: 100 }, 80)).toEqual({
      subscription: 50,
      topup: 30,
    })
    expect(splitDebit({ subscription: 100, topup: 0 }, 80)).toEqual({
      subscription: 80,
      topup: 0,
    })
  })

  it("refuses to overdraw", () => {
    expect(() => splitDebit({ subscription: 10, topup: 5 }, 16)).toThrow(
      InsufficientCreditsError
    )
  })

  it("refunds back to the buckets that paid, top-up first, never twice", () => {
    const split = { subscription: 50, topup: 30 }
    expect(refundSplit(split, 0, 80)).toEqual({ subscription: 50, topup: 30 })
    expect(refundSplit(split, 0, 20)).toEqual({ subscription: 0, topup: 20 })
    // 20 already returned from top-up: the rest comes from what remains.
    expect(refundSplit(split, 20, 60)).toEqual({ subscription: 50, topup: 10 })
  })
})

describe("media probes", () => {
  it("reads PNG dimensions", () => {
    expect(probeImage(Buffer.from(tinyPng(640, 360)))).toEqual({
      width: 640,
      height: 360,
    })
  })

  it("reads MP4 duration and video size", () => {
    expect(probeMedia(Buffer.from(tinyMp4(6)), "video/mp4")).toEqual({
      durationSec: 6,
      width: 1280,
      height: 720,
    })
  })

  it("reads WAV duration", () => {
    expect(probeMedia(Buffer.from(tinyWav(3)), "audio/wav")).toEqual({
      durationSec: 3,
    })
  })

  it("returns nothing for garbage instead of throwing", () => {
    expect(probeMedia(Buffer.from("not media"), "video/mp4")).toEqual({})
  })
})

describe("webhook tokens", () => {
  const gid = "0123456789abcdef01234567"
  it("verifies its own token in constant time", () => {
    const token = webhookToken(gid, "secret")
    expect(verifyWebhookToken(gid, token, "secret")).toBe(true)
    expect(verifyWebhookToken(gid, token, "other")).toBe(false)
    expect(
      verifyWebhookToken("0123456789abcdef01234568", token, "secret")
    ).toBe(false)
    expect(verifyWebhookToken(gid, "short", "secret")).toBe(false)
  })

  it("builds the hf_webhook URL with gid and token", () => {
    const url = new URL(webhookUrlFor(gid)!)
    expect(url.pathname).toBe("/api/webhooks/higgsfield")
    expect(url.searchParams.get("gid")).toBe(gid)
    expect(
      verifyWebhookToken(gid, url.searchParams.get("t")!, "webhook-secret")
    ).toBe(true)
  })
})

describe("Higgsfield signed deliveries", () => {
  it("verifies raw body, timestamp, and a signature among rotated keys", () => {
    const body = '{"request_id":"a","status":"completed"}'
    const now = 1_792_000_000
    const id = "msg_123"
    const secret = `whsec_${Buffer.from("test-key").toString("base64")}`
    const signed = createHmac("sha256", "test-key")
      .update(`${id}.${now}.${body}`)
      .digest("base64")
    const headers = new Headers({
      "webhook-id": id,
      "webhook-timestamp": String(now),
      "webhook-signature": `v1,${"A".repeat(44)} v1,${signed}`,
    })
    expect(verifyWebhookSignature(body, headers, secret, now)).toBe(true)
    expect(verifyWebhookSignature(`${body} `, headers, secret, now)).toBe(false)
    expect(verifyWebhookSignature(body, headers, secret, now + 301)).toBe(false)
  })
})

describe("platform payloads", () => {
  it("extracts images, video, audio and only https URLs", () => {
    expect(
      extractArtifacts({
        images: [
          { url: "https://cdn/a.png" },
          { url: "http://insecure/b.png" },
        ],
        video: { url: "https://cdn/v.mp4", content_type: "video/mp4" },
        audios: [{ url: "https://cdn/a.mp3" }],
      })
    ).toEqual([
      { kind: "image", url: "https://cdn/a.png" },
      { kind: "video", url: "https://cdn/v.mp4", contentType: "video/mp4" },
      { kind: "audio", url: "https://cdn/a.mp3" },
    ])
  })
})

describe("upload contract (from the template)", () => {
  const ticket = {
    upload_url: "https://storage.example.com/ref.png?signature=test",
    public_url: "https://cdn.example.com/ref.png",
    content_type: "image/png",
    upload_headers: {
      "Content-Type": "image/png",
      "x-amz-tagging": "retention=temporary",
    },
  }

  it("accepts the documented types only", () => {
    expect(requireUploadContentType("video/mp4")).toBe("video/mp4")
    expect(() => requireUploadContentType("application/pdf")).toThrow(
      /Unsupported/
    )
  })

  it("rejects tickets carrying credentials or mismatched types", () => {
    expect(parseUploadTicket(ticket, "image/png").public_url).toBe(
      ticket.public_url
    )
    expect(() =>
      parseUploadTicket(
        {
          ...ticket,
          upload_headers: { ...ticket.upload_headers, Authorization: "x" },
        },
        "image/png"
      )
    ).toThrow()
    expect(() => parseUploadTicket(ticket, "image/jpeg")).toThrow()
    expect(() =>
      parseUploadTicket(
        { ...ticket, public_url: "http://insecure" },
        "image/png"
      )
    ).toThrow()
  })
})

describe("preset templates", () => {
  it("substitutes the subject or prefixes it", () => {
    expect(applyTemplate("{subject}, neon", "a fox")).toBe("a fox, neon")
    expect(applyTemplate("{subject}, neon", "")).toBe(
      "a striking subject, neon"
    )
    expect(applyTemplate("neon city", "a fox")).toBe("a fox, neon city")
  })
})
