---
"fusion-action-app-publish": patch
---

Add PR dist sync validation to prevent stale build artifacts from being merged. CI workflow now validates dist files are up-to-date on main branch to ensure published action versions work correctly.
