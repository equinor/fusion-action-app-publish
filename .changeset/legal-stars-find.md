---
"fusion-action-app-publish": patch
---

Add validation step for config and manifest files. New `validate-config-and-manifest` step verifies that the manifest file exists and is valid JSON, and optionally validates the config file if provided. This ensures both files are properly formed before publishing.
