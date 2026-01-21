---
"fusion-action-app-publish": patch
---

Improve test coverage and developer ergonomics:

- Add orchestration tests for `postPublishMetadata` and `extractAppMetadata`.
- Provide robust `child_process.exec` mock compatible with `util.promisify`.
- Fix Biome lint issues (optional chaining, symbol indexing) in tests.
- Fix TypeScript errors in tests by properly casting mock Octokit and avoiding invalid read-only property assignments.
- Migrate test setup to TypeScript for better type safety.
- Keep existing public API unchanged.
