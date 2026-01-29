---
"fusion-action-app-publish": patch
---

Set explicit npm registry using NPM_CONFIG_REGISTRY environment variable for fusion-framework-cli execution. Without setting `NPM_CONFIG_REGISTRY=https://registry.npmjs.org`, npx may fail to resolve or execute the `@equinor/fusion-framework-cli` package correctly, causing minified code errors and execution failures in GitHub Actions runners. The environment variable approach ensures npx uses the correct registry regardless of the runner's default npm configuration.
