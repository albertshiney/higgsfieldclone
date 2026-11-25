import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { MongoMemoryReplSet } from "mongodb-memory-server"

const children = []
let mongo
let server
let sumeServer
const app = "http://localhost:3001"
const run = (args, env, stdio = "ignore") => {
  const child = spawn(process.execPath, args, { env, stdio })
  children.push(child)
  return child
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  await new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE")
        reject(new Error("Fixture app port 3001 is already in use."))
      else reject(error)
    })
    probe.listen(3001, "127.0.0.1", () =>
      probe.close((error) => (error ? reject(error) : resolve()))
    )
  })
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  })
  const env = {}
  for (const name of [
    "PATH",
    "Path",
    "SystemRoot",
    "SYSTEMROOT",
    "WINDIR",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "COMSPEC",
    "PATHEXT",
  ])
    if (process.env[name]) env[name] = process.env[name]
  Object.assign(env, {
    NODE_ENV: "development",
    APP_URL: app,
    AUTH_URL: app,
    AUTH_TRUST_HOST: "true",
    AUTH_SECRET: "loopback-fixture-only-never-production",
    MONGODB_URI: mongo.getUri(),
    MONGODB_DB: "muapi-browser-fixture",
    HF_API_BASE_URL: "http://127.0.0.1:4010",
    HF_CREDENTIALS: "mock:mock",
    HF_WEBHOOK_SECRET: "fixture-only",
    HF_PRICE_GUARD: "false",
    SUME_API_KEY: "fixture-only",
    SUME_API_BASE_URL: "http://127.0.0.1:4012",
    E2E_SUME_FIXTURE: "true",
    MUAPI_API_KEY: "fixture-only",
    MUAPI_API_BASE_URL: "http://127.0.0.1:4011/api/v1",
    GENERATION_MAX_USD: "0.5",
    E2E_TEST_MODE: "true",
    E2E_MUAPI_FIXTURE: "true",
    E2E_BASE_URL: app,
    SIGNUP_BONUS_CREDITS: "200",
    CREDIT_USD_VALUE: "0.01",
    CREDIT_MARKUP: "2",
    NEXT_TELEMETRY_DISABLED: "1",
    BLOCK_DISPOSABLE_EMAIL: "false",
  })
  server = createServer(async (req, res) => {
    let text = ""
    for await (const chunk of req) text += chunk
    res.setHeader("content-type", "application/json")
    if (req.url?.endsWith("/estimate-cost")) {
      res.end(
        JSON.stringify({
          cost: text.includes("[expensive]") ? 0.75 : 0.163,
          currency: "USD",
        })
      )
      return
    }
    if (req.method === "POST") {
      res.end(
        JSON.stringify({ request_id: "fixture-request", status: "processing" })
      )
      return
    }
    res.end(JSON.stringify({ status: "processing", outputs: [] }))
  })
  await new Promise((resolve, reject) =>
    server.once("error", reject).listen(4011, "127.0.0.1", resolve)
  )
  sumeServer = createServer(async (req, res) => {
    let raw = ""
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : {}
    res.setHeader("content-type", "application/json")
    if (req.url === "/v1/open/estimate") {
      const usd = String(body.input?.prompt).includes("[expensive]")
        ? 0.75
        : 0.2
      res.end(
        JSON.stringify({
          data: {
            model: body.model,
            currency: "USD",
            usd: usd.toFixed(4),
            usd_micros: Math.round(usd * 1e6),
            billing: {
              duration_seconds: body.input?.duration ?? null,
              resolution: body.input?.resolution ?? null,
            },
          },
        })
      )
      return
    }
    if (req.url === "/v1/video-router/generate" && req.method === "POST") {
      res.end(
        JSON.stringify({
          data: {
            request_id: "sume-browser-fixture",
            job: { model: body.model, status: "processing" },
          },
        })
      )
      return
    }
    if (req.url === "/v1/jobs/sume-browser-fixture/status") {
      res.end(JSON.stringify({ data: { sume_status: "processing" } }))
      return
    }
    res.statusCode = 404
    res.end("{}")
  })
  await new Promise((resolve, reject) =>
    sumeServer.once("error", reject).listen(4012, "127.0.0.1", resolve)
  )
  const init = run(
    ["--conditions=react-server", "--import", "tsx", "scripts/db-init.ts"],
    env,
    "inherit"
  )
  if ((await new Promise((resolve) => init.once("exit", resolve))) !== 0)
    throw new Error("Fixture database initialization failed.")
  const hf = run(["--import", "tsx", "scripts/mock-higgsfield.ts"], env)
  const next = run(
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3001",
    ],
    env
  )
  const deadline = Date.now() + 180000
  while (true) {
    if (next.exitCode !== null || hf.exitCode !== null)
      throw new Error("Fixture server exited.")
    try {
      if ((await fetch(app + "/api/auth/csrf")).ok) break
    } catch {}
    if (Date.now() > deadline) throw new Error("Fixture server did not start.")
    await wait(500)
  }
  console.log(
    "Isolated loopback providers ready. No real provider credentials inherited."
  )
  const child = run(
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    env,
    "inherit"
  )
  process.exitCode = await new Promise((resolve) =>
    child.once("exit", (code) => resolve(code ?? 1))
  )
} finally {
  for (const child of children.reverse())
    if (child.exitCode === null) child.kill()
  await Promise.all(
    children.map((child) =>
      child.exitCode !== null
        ? undefined
        : new Promise((resolve) => child.once("exit", resolve))
    )
  )
  if (sumeServer) await new Promise((resolve) => sumeServer.close(resolve))
  if (server) await new Promise((resolve) => server.close(resolve))
  await mongo?.stop()
}
