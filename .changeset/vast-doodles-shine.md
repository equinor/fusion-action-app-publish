---
"fusion-action-app-publish": patch
---

Add working directory validation step to verify Fusion app presence before artifact validation. This new validation step checks if the specified working directory contains a valid Fusion application by analyzing package.json for Fusion dependencies and app indicators (CLI, scripts, or config).
