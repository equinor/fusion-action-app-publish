---
"fusion-action-app-publish": major
---

Make `artifact` input optional to allow source-based publishing from the working directory.

**BREAKING CHANGE:** The `artifact` input no longer defaults to `./app-bundle.zip`. Workflows that previously relied on the implicit default must now explicitly set `artifact: './app-bundle.zip'`.

When `artifact` is omitted, the action publishes directly from the working directory using `ffc app publish`, letting the CLI handle the build. This simplifies PR preview workflows.

- Skip manifest extraction, config validation, and metadata steps when no artifact is provided
- Emit warning about unavailable metadata outputs in source-based mode
- Emit warning when publishing from source without `prNR` set
