---
"fusion-action-app-publish": patch
---

Fix authentication validation to properly handle empty/whitespace credentials. Trim all credential inputs before validation to ensure empty strings and whitespace are correctly identified as missing credentials.
