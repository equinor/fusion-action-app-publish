---
"fusion-action-app-publish": patch
---

Add explicit npm registry to fusion-framework-cli npx commands to prevent package resolution errors. Without specifying `--registry https://registry.npmjs.org`, npx may fail to resolve or execute the CLI package correctly, causing minified code errors and execution failures in GitHub Actions runners.