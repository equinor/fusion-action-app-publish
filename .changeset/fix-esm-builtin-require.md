---
"fusion-action-app-publish": patch
---

Fix "Calling `require` for \"net\"" failures in the ESM action bundles (#120). The build
now targets Rolldown's `node` platform, so bundled CommonJS dependencies can require
Node.js built-ins during artifact validation and other action steps.
