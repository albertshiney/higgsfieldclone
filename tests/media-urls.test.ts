import { ObjectId } from "mongodb"
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest"
import {
  setupEnv,
  startDatabase,
  stopDatabase,
  clearDatabase,
  createUser,
} from "./support/harness"
setupEnv()
const { resolveOwnedMedia } = await import("@/lib/generations/media")
const { collections } = await import("@/lib/db/collections")

beforeAll(startDatabase, 120_000)
afterAll(stopDatabase)
beforeEach(clearDatabase)

const base = {
  kind: "image" as const,
  contentType: "image/png",
  bytes: 10,
  name: "ref.png",
  createdAt: new Date(),
}

it("sends the durable copy once an upload has been stored, and the platform URL before", async () => {
  const user = await createUser({ topup: 10 })
  const { uploads } = await collections()
  await uploads.insertMany([
    {
      _id: new ObjectId(),
      userId: user.objectId,
      ...base,
      url: "https://media.example.test/u/stored.png",
      key: "u/stored.png",
      platformUrl: "https://platform.example.test/tmp/stored.png",
    },
    {
      _id: new ObjectId(),
      userId: user.objectId,
      ...base,
      url: "https://platform.example.test/tmp/only.png",
      platformUrl: "https://platform.example.test/tmp/only.png",
    },
  ])
  const [stored, platformOnly] = await resolveOwnedMedia(user.objectId, [
    { role: "reference", url: "https://media.example.test/u/stored.png" },
    { role: "reference", url: "https://platform.example.test/tmp/only.png" },
  ])
  expect(stored?.url).toBe("https://media.example.test/u/stored.png")
  expect(platformOnly?.url).toBe("https://platform.example.test/tmp/only.png")
})
