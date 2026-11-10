import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `import "server-only"` throws outside React Server Components; tests run server code directly.
      "server-only": fileURLToPath(
        new URL("./tests/support/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/support/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: "forks",
    maxWorkers: 1,
  },
})
