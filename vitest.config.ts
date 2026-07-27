import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(process.cwd(), "src"),
      "~lib": path.resolve(process.cwd(), "src/lib"),
      "~types": path.resolve(process.cwd(), "src/types"),
      "~popup": path.resolve(process.cwd(), "src/popup")
    }
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    globals: false
  }
})
