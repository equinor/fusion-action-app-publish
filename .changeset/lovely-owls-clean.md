---
"fusion-action-app-publish": patch
---

- fix bundling to keep Node built-ins external (no browser shims)
- replace require.main guards with ESM-safe entry checks for action scripts
