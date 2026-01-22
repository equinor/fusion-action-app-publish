# Changelog

## 0.1.9

### Patch Changes

- 4096a27: Fix authentication validation to properly handle empty/whitespace credentials. Trim all credential inputs before validation to ensure empty strings and whitespace are correctly identified as missing credentials.

## 0.1.8

### Patch Changes

- 78208fd: - fix bundling to keep Node built-ins external (no browser shims)
  - replace require.main guards with ESM-safe entry checks for action scripts

## 0.1.7

### Patch Changes

- d1f74ed: fix from cjs to js and move some files to doc folder

## 0.1.6

### Patch Changes

- 2d04b4e: Release

## 0.1.5

### Patch Changes

- 14b6e94: Use stable (non-hashed) build output names so dist artifacts no longer churn between local and CI builds.
- 14b6e94: Release

## 0.1.4

### Patch Changes

- 8021ec4: Fix missing `@actions/core` and `@actions/github` modules in built distribution files by bundling them into the compiled outputs instead of treating them as external dependencies.
- 5b10cea: Add Dist files up to date to test workflow

## 0.1.3

### Patch Changes

- 9129be7: Replace missing azure/logout action with explicit `az logout` cleanup step.

## 0.1.2

### Patch Changes

- b4e0d61: Fix invalid `outputs` block in action.yml step definition causing template validation error

## 0.1.1

### Patch Changes

- 5f6f875: Improve test coverage and developer ergonomics:

  - Add orchestration tests for `postPublishMetadata` and `extractAppMetadata`.
  - Provide robust `child_process.exec` mock compatible with `util.promisify`.
  - Fix Biome lint issues (optional chaining, symbol indexing) in tests.
  - Fix TypeScript errors in tests by properly casting mock Octokit and avoiding invalid read-only property assignments.
  - Migrate test setup to TypeScript for better type safety.
  - Keep existing public API unchanged.

## 0.1.0

### Minor Changes

- 5f29d86: Migrate codebase from JavaScript to TypeScript with improved type safety, better error handling, and comprehensive test coverage. Convert all validation scripts and metadata handling to TypeScript, add proper type definitions, upgrade from Jest to Vitest, and modernize the authentication validation logic to support both token and Azure Service Principal authentication.

All notable changes to the Fusion App Publish Action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of Fusion App Publish Action
- Support for Fusion environments: ci, tr, fprd, fqa, next
- Automatic environment resolution with `env: auto`
- PR-specific environment support (`pr-<number>`) when using `ci` environment
- Flexible authentication (Fusion token, Azure OIDC)
- Comprehensive input validation with detailed error messages
- Rich output capture (app URLs, portal URLs, deployment details)
- Configurable CLI version pinning
- Complete test suite with 100% coverage

### Security

- Automatic masking of sensitive tokens in logs
- Support for OIDC/federated credentials (no client secrets)

## [1.0.0] - TBD

### Added

- First stable release

---

## Release Process

1. Update version in `package.json`
2. Update this CHANGELOG.md with release notes
3. Create Git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will create the release automatically

## Contributing

When contributing:

1. Add entries under `[Unreleased]` section
2. Use categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
3. Follow the existing format and style
