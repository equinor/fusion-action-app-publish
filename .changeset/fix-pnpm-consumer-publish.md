---
"fusion-action-app-publish": patch
---

Fix publishing from consumer repositories that require pnpm through devEngines by isolating npx from their package-manager configuration while preserving the publish working directory.

Use pnpm/setup@v2 for repository CI with pnpm pinned to 12.4.2 and preserve the existing dependency cache behavior.