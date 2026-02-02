---
"fusion-action-app-publish": patch
---

- Remove global Fusion CLI installation step and use `npx` to run CLI on-demand
- Fix config publishing to use `ffc app publish --config` instead of `ffc app config`
- Add missing `INPUT_ARTIFACT` environment variable to publish-config step
- Update publish-config step name from "Publish config" to "Publish with config"
