---
"fusion-action-app-publish": patch
---

Fix build configuration to externalize all Node.js built-ins and use stable (non-hashed) output filenames, preventing runtime errors and dist drift between environments.
