---
"fusion-action-app-publish": patch
---

Prevent CI from overwriting existing `vX.Y.Z` patch tags on non-release commits to `main`, create GitHub Releases with changelog notes for each new version, and update floating `vX` / `vX.Y` aliases only when publishing a new stable release.

Documents the release-tag immutability policy, GitHub Immutable Releases guidance, and SHA-pinned consumer recommendations. This patch release also supersedes commit `f10c214` (workflow dependency lockfile, PR #131), which previously updated `v2.2.2` without a distinct patch release or changelog entry.
