import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Allow local runs when explicitly opted in to avoid relying on GitHub env
const allowLocal = process.env.ALLOW_LOCAL_TESTS === "true" || process.env.CI === "true";
if (!allowLocal && !process.env.GITHUB_ACTIONS) {
  console.error("❌ Tests are guarded for CI. Set ALLOW_LOCAL_TESTS=true to run locally.");
  process.exit(1);
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["node_modules/", "dist/", "src/tests/"],
    },
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.js"],
    setupFiles: ["src/tests/setup.js"],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
