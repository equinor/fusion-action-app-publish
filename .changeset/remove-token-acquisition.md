---
"fusion-action-app-publish": patch
---

refactor: remove manual token acquisition step

The CLI now handles Azure authentication internally via the new Azure Identity module. Removes the redundant `Acquire token (if SP)` step that manually called `az account get-access-token`. The `Azure Login` step establishes credentials which the CLI's `DefaultAzureCredential` automatically detects and uses.

For explicit token authentication, users can continue to provide the `fusion-token` input parameter.
