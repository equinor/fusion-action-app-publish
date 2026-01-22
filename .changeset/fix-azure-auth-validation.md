---
"fusion-action-app-publish": patch
---

Fix Azure credential input validation to properly read environment variables

- Added fallback to direct environment variable access (`INPUT_*`) when `core.getInput()` returns empty
- Ensures Azure credentials (`azure-client-id`, `azure-tenant-id`, `azure-resource-id`) are properly detected
- Added debug logging to help troubleshoot authentication issues
- Added test coverage for environment variable fallback mechanism
- Resolves issue where action failed with "Either 'fusion-token' or all Azure credentials must be provided" error
