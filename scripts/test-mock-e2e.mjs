import { spawnSync } from "node:child_process"

const fixtureApp = new URL("http://localhost:3001/")
const requestedApp = process.env.E2E_BASE_URL
if (requestedApp) {
  let parsedApp
  try {
    parsedApp = new URL(requestedApp)
  } catch {
    throw new Error(
      "E2E_BASE_URL must be the isolated fixture app at http://localhost:3001/."
    )
  }
  if (
    parsedApp.origin !== fixtureApp.origin ||
    parsedApp.pathname !== fixtureApp.pathname ||
    parsedApp.search ||
    parsedApp.hash ||
    parsedApp.username ||
    parsedApp.password
  )
    throw new Error(
      "Secure fixture tests manage their own isolated app at http://localhost:3001/. Unset E2E_BASE_URL or set it to that exact URL."
    )
}

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

const child = spawnSync(
  process.execPath,
  ["scripts/test-provider-fixtures.mjs", ...process.argv.slice(2)],
  { stdio: "inherit", env }
)
if (child.error) {
  console.error("Could not start the isolated browser fixture runner.")
  process.exitCode = 1
} else {
  process.exitCode = child.status ?? 1
}
