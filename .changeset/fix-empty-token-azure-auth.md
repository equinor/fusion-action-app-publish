---
"fusion-action-app-publish": patch
---

Unset an empty `FUSION_TOKEN` before publishing so Azure-authenticated runs use ambient credentials instead of selecting the CLI's token-authentication path. Preserve non-empty tokens for direct token authentication.
