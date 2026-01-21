import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        "check-meta-comment": resolve(__dirname, "src/core/check-meta-comment.ts"),
        "validate-artifact": resolve(__dirname, "src/core/validate-artifact.ts"),
        "validate-env": resolve(__dirname, "src/core/validate-env.ts"),
        "validate-is-token-or-azure": resolve(__dirname, "src/core/validate-is-token-or-azure.ts"),
        "post-publish-metadata": resolve(__dirname, "src/core/post-publish-metadata.ts"),
      },
      formats: ["cjs"],
      fileName: (_format, entryName) => `${entryName}.cjs`,
    },
    outDir: "dist",
    target: "node18",
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: [
        /^node:/,
        "util",
        "fs",
        "path",
        "os",
        "crypto",
        "stream",
        "http",
        "https",
        "net",
        "tls",
        "zlib",
        "events",
        "buffer",
        "string_decoder",
        "child_process",
        "assert",
        "url",
        "querystring",
        "timers",
        "diagnostics_channel",
        "http2",
        "stream/web",
        "util/types",
        "async_hooks",
        "console",
        "worker_threads",
        "perf_hooks",
        "punycode",
        "dns",
        "readline",
        "vm",
        "module",
        "process",
      ],
      output: {
        banner: "#!/usr/bin/env node",
        preserveModules: false,
        // Avoid content-hash filenames so dist artifacts stay stable across environments
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
