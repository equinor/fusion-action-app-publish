---
"fusion-action-app-publish": patch
---

Fix missing `@actions/core` and `@actions/github` modules in built distribution files by bundling them into the compiled outputs instead of treating them as external dependencies.
