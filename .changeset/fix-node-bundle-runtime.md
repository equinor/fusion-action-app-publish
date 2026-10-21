---
"fusion-action-app-publish": patch
---

Fix action startup failures after the Vite 8 upgrade by explicitly targeting Node.js when bundling ES modules. This enables CommonJS dependencies to load Node.js built-ins such as `net`. Add built-output smoke tests to catch runtime bundling regressions.
