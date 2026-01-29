import { builtinModules } from "node:module";
import { resolve } from "node:path";
import nodeResolve from "@rollup/plugin-node-resolve";
import { defineConfig } from "vite";

const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig({
  build: {
    lib: {
      entry: {
        "check-meta-comment": resolve(__dirname, "src/core/check-meta-comment.ts"),
        "validate-artifact": resolve(__dirname, "src/core/validate-artifact.ts"),
        "validate-env": resolve(__dirname, "src/core/validate-env.ts"),
        "validate-is-token-or-azure": resolve(__dirname, "src/core/validate-is-token-or-azure.ts"),
        "post-publish-metadata": resolve(__dirname, "src/core/post-publish-metadata.ts"),
        "extract-manifest": resolve(__dirname, "src/core/extract-manifest.ts"),
        "extract-metadata": resolve(__dirname, "src/core/extract-metadata.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: "dist",
    target: "node24",
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: [...nodeBuiltins],
      output: {
        esModule: true,
        format: "es",
        // Avoid content-hash filenames so dist artifacts stay stable across environments
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
      plugins: [nodeResolve({ preferBuiltins: true })],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
