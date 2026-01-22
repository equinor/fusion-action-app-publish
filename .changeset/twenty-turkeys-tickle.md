---
"fusion-action-app-publish": patch
---

Include built action files in changeset version PR

- Modified `changeset:version` script to run build after version bump
- Removed separate commit step for dist files in CI workflow
- Build artifacts now included directly in changeset PR
