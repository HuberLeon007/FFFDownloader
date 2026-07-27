import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "~": "./src",
      "~lib": "./src/lib",
      "~types": "./src/types",
      "~popup": "./src/popup"
    }
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    globals: false
  }
})
