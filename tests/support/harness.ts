import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { MongoMemoryReplSet } from "mongodb-memory-server"
import { ObjectId } from "mongodb"

/**
 * Test harness: a single-node MongoDB replica set (transactions need one), a
 * fake Higgsfield REST API, and stubbed CDN downloads. Call `setupEnv()` before
 * importing app modules so env() sees the test configuration.
 */
export function setupEnv(): void {
  Object.assign(process.env, {
    NODE_ENV: "test",
    APP_URL: "http://localhost:3000",
    AUTH_SECRET: "test-secret-test-secret-test-secret",
    HF_API_BASE_URL: "https://hf.test",
    HF_CREDENTIALS: "key:secret",
    HF_WEBHOOK_SECRET: "webhook-secret",
    HF_WEBHOOK_SIGNING_SECRET: `whsec_${Buffer.from("higgsfield-test-signing-key").toString("base64")}`,
    HF_WEBHOOK_BASE_URL: "https://vireo.test",
    HF_PRICE_GUARD: "false",
    CREDIT_USD_VALUE: "0.01",
    CREDIT_MARKUP: "2",
    RUN_TIMEOUT_MINUTES: "30",
    LOCAL_MEDIA_DIR: mkdtempSync(join(tmpdir(), "vireo-media-")),
  })
}

let replSet: MongoMemoryReplSet | undefined

export async function startDatabase(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  })
  process.env.MONGODB_URI = replSet.getUri()
  process.env.MONGODB_DB = `vireo-test-${Date.now()}`
  const { resetEnvForTests } = await import("@/lib/env")
  resetEnvForTests()
  const { db } = await import("@/lib/db/mongo")
  const { ensureIndexes } = await import("@/lib/db/indexes")
  await ensureIndexes(await db())
}

export async function stopDatabase(): Promise<void> {
  const { closeMongoForTests } = await import("@/lib/db/mongo")
  await closeMongoForTests()
  await replSet?.stop()
}

export async function clearDatabase(): Promise<void> {
  const { db } = await import("@/lib/db/mongo")
  const database = await db()
  for (const name of [
    "users",
    "generations",
    "credit_ledger",
    "uploads",
    "projects",
    "rate_limits",
    "hf_webhook_events",
    "stripe_events",
    "model_pricing",
    "reports",
  ])
    await database.collection(name).deleteMany({})
  const { invalidatePricing } = await import("@/lib/billing/pricing")
  invalidatePricing()
}

export async function createUser(
  credits: { subscription?: number; topup?: number } = {},
  plan: "free" | "starter" | "plus" | "ultra" = "plus"
) {
  const { collections } = await import("@/lib/db/collections")
  const { users } = await collections()
  const _id = new ObjectId()
  const email = `user-${_id.toHexString()}@example.com`
  await users.insertOne({
    _id,
    email,
    role: "user",
    plan,
    credits: {
      subscription: credits.subscription ?? 0,
      topup: credits.topup ?? 0,
    },
    createdAt: new Date(),
  })
  return {
    id: _id.toHexString(),
    objectId: _id,
    role: "user" as const,
    email,
  }
}

export async function balanceOf(userId: ObjectId) {
  const { collections } = await import("@/lib/db/collections")
  const { users } = await collections()
  return (await users.findOne({ _id: userId }))!.credits
}

/* ── Fake Higgsfield API ─────────────────────────────────────────────────── */

export type FakeRequest = {
  status: string
  artifacts?: Record<string, unknown>
  error?: string
  path: string
  body: Record<string, unknown>
  webhook?: string
}

export class FakeHiggsfield {
  requests = new Map<string, FakeRequest>()
  submits: { path: string; body: Record<string, unknown>; webhook?: string }[] =
    []
  /** Next submit response: "ok" | an HTTP status | "network" (ambiguous). */
  nextSubmit: "ok" | number | "network" = "ok"
  cdn = new Map<string, { body: Uint8Array<ArrayBuffer>; type: string }>()
  private counter = 0

  complete(requestId: string, kind: "image" | "video" = "image", count = 1) {
    const request = this.requests.get(requestId)!
    const urls = Array.from({ length: count }, (_, i) => {
      const url = `https://cdn.hf.test/${requestId}/${i}.${kind === "image" ? "png" : "mp4"}`
      this.cdn.set(url, {
        body: kind === "image" ? tinyPng(16, 9) : tinyMp4(6),
        type: kind === "image" ? "image/png" : "video/mp4",
      })
      return url
    })
    request.status = "completed"
    request.artifacts =
      kind === "image"
        ? { images: urls.map((url) => ({ url })) }
        : { video: { url: urls[0] } }
  }

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    )
    const method = init?.method ?? "GET"
    if (url.host === "cdn.hf.test") {
      const file = this.cdn.get(url.href)
      if (!file) return new Response("missing", { status: 404 })
      return new Response(file.body, {
        headers: {
          "content-type": file.type,
          "content-length": String(file.body.byteLength),
        },
      })
    }
    const json = (data: unknown, status = 200) =>
      new Response(data === null ? null : JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      })
    const statusMatch = url.pathname.match(/^\/requests\/([^/]+)\/status$/)
    if (statusMatch && method === "GET") {
      const request = this.requests.get(statusMatch[1]!)
      if (!request) return json({ detail: "Not found" }, 404)
      return json({
        status: request.status,
        request_id: statusMatch[1],
        ...(request.artifacts ?? {}),
        ...(request.error ? { error: request.error } : {}),
      })
    }
    const cancelMatch = url.pathname.match(/^\/requests\/([^/]+)\/cancel$/)
    if (cancelMatch && method === "POST") {
      const request = this.requests.get(cancelMatch[1]!)
      if (!request) return json({ detail: "Not found" }, 404)
      if (request.status !== "queued")
        return json({ detail: "Already started" }, 400)
      request.status = "canceled"
      return json(null, 202)
    }
    if (method === "POST") {
      const outcome = this.nextSubmit
      this.nextSubmit = "ok"
      if (outcome === "network") throw new TypeError("fetch failed")
      if (typeof outcome === "number")
        return json({ detail: "Rejected by test" }, outcome)
      const path = url.pathname.slice(1)
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<
        string,
        unknown
      >
      const webhook = url.searchParams.get("hf_webhook") ?? undefined
      const requestId = `00000000-0000-4000-8000-${String(++this.counter).padStart(12, "0")}`
      this.requests.set(requestId, { status: "queued", path, body, webhook })
      this.submits.push({ path, body, webhook })
      return json({
        status: "queued",
        request_id: requestId,
        status_url: `https://hf.test/requests/${requestId}/status`,
        cancel_url: `https://hf.test/requests/${requestId}/cancel`,
      })
    }
    return json({ detail: "Unhandled" }, 404)
  }
}

export async function installFakeHiggsfield(): Promise<FakeHiggsfield> {
  const fake = new FakeHiggsfield()
  const { createHiggsfieldClient, setHiggsfieldClientForTests } =
    await import("@/lib/higgsfield/client")
  setHiggsfieldClientForTests(
    createHiggsfieldClient({
      credentials: "key:secret",
      baseUrl: "https://hf.test",
      fetch: fake.fetch,
      sleep: async () => undefined,
    })
  )
  return fake
}

/* ── Tiny media fixtures ─────────────────────────────────────────────────── */

export function tinyPng(
  width: number,
  height: number
): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.alloc(33)
  buffer.writeUInt32BE(0x89504e47, 0)
  buffer.writeUInt32BE(0x0d0a1a0a, 4)
  buffer.writeUInt32BE(13, 8)
  buffer.write("IHDR", 12, "ascii")
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return new Uint8Array(buffer)
}

function box(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(8 + payload.length, 0)
  header.write(type, 4, "ascii")
  return Buffer.concat([header, payload])
}

/** Minimal MP4: ftyp + moov(mvhd v0, trak(tkhd v0 1280×720)). */
export function tinyMp4(
  seconds: number,
  width = 1280,
  height = 720
): Uint8Array<ArrayBuffer> {
  const mvhd = Buffer.alloc(100)
  mvhd.writeUInt32BE(1000, 12) // timescale
  mvhd.writeUInt32BE(seconds * 1000, 16) // duration
  const tkhd = Buffer.alloc(84)
  tkhd.writeUInt32BE(width * 65536, 76)
  tkhd.writeUInt32BE(height * 65536, 80)
  const trak = box("trak", box("tkhd", tkhd))
  const moov = box("moov", Buffer.concat([box("mvhd", mvhd), trak]))
  const ftyp = box("ftyp", Buffer.from("isom0000isomiso2", "ascii"))
  return new Uint8Array(Buffer.concat([ftyp, moov]))
}

export function tinyWav(seconds: number): Uint8Array<ArrayBuffer> {
  const byteRate = 8000
  const data = Buffer.alloc(8)
  const buffer = Buffer.alloc(44)
  buffer.write("RIFF", 0, "ascii")
  buffer.writeUInt32BE(0, 4)
  buffer.write("WAVE", 8, "ascii")
  buffer.write("fmt ", 12, "ascii")
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.write("data", 36, "ascii")
  buffer.writeUInt32LE(byteRate * seconds, 40)
  return new Uint8Array(Buffer.concat([buffer, data]))
}
