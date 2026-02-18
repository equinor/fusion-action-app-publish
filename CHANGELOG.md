# Changelog

## 1.2.1

### Patch Changes

- 11f7eb2: fix login

## 1.2.0

### Minor Changes

- a41cd2b: Add GitHub Actions workflow summary for PR deployments

  Added a new "Workflow Summary" step that displays deployment information in the GitHub Actions summary, providing better visibility into PR deployments including direct links to the published application in Fusion.

## 1.1.1

### Patch Changes

- 030891c: remove ci as default input for env

## 1.1.0

### Minor Changes

- b0b8bb6: ## Automatic Azure Resource ID Detection

  Added automatic detection of Azure Resource ID based on deployment environment, eliminating the need for manual configuration in most scenarios.

  ### What's New

  - **Environment-Based Detection**: The action now automatically selects the appropriate Azure Resource ID:

    - Non-production environments (`ci`, `fqa`, `tr`, `next`) → `api://fusion.equinor.com/nonprod`
    - Production environment (`fprd`) → `api://fusion.equinor.com/prod`
    - Unrecognized environments default to non-production with a warning

  - **User Override Support**: Still allows manual Azure Resource ID specification when needed, with automatic cleanup of `.default` suffixes

  - **Improved Integration**: Enhanced action workflow with better validation outputs and secure token handling

  ### Benefits

  - Reduced configuration complexity for standard Fusion environments
  - Automatic environment-appropriate resource ID selection
  - Maintains flexibility for custom deployment scenarios
  - Better error handling and user feedback

### Patch Changes

- f37ae16: Validate that 'prNR' and 'env' inputs are not used together in the GitHub Action. If both are provided, the action will fail with an appropriate error message. And update the description of the 'prNR' input in the action.yml file to clarify its usage.

## 1.0.6

### Patch Changes

- db0709b: Fix indentation in PR comment template

## 1.0.5

### Patch Changes

- d715927: Add condition to publishing when no config is provided

## 1.0.4

### Patch Changes

- 14f0f63: - Remove global Fusion CLI installation step and use `npx` to run CLI on-demand
  - Fix config publishing to use `ffc app publish --config` instead of `ffc app config`
  - Add missing `INPUT_ARTIFACT` environment variable to publish-config step
  - Update publish-config step name from "Publish config" to "Publish with config"

## 1.0.3

### Patch Changes

- 28d164b: Add validation step for config and manifest files. New `validate-config-and-manifest` step verifies that the manifest file exists and is valid JSON, and optionally validates the config file if provided. This ensures both files are properly formed before publishing.

## 1.0.2

### Patch Changes

- e76043a: Set explicit npm registry using NPM_CONFIG_REGISTRY environment variable for fusion-framework-cli execution. Without setting `NPM_CONFIG_REGISTRY=https://registry.npmjs.org`, npx may fail to resolve or execute the `@equinor/fusion-framework-cli` package correctly, causing minified code errors and execution failures in GitHub Actions runners. The environment variable approach ensures npx uses the correct registry regardless of the runner's default npm configuration.

## 1.0.1

### Patch Changes

- e22e0b8: Add explicit npm registry to fusion-framework-cli npx commands to prevent package resolution errors. Without specifying `--registry https://registry.npmjs.org`, npx may fail to resolve or execute the CLI package correctly, causing minified code errors and execution failures in GitHub Actions runners.

## 1.0.0

### Major Changes

- Official v1.0.0 Release - Stable Production Ready

  This is the first major release of `fusion-action-app-publish`, marking a stable and production-ready version of the GitHub Action for authenticating and publishing Fusion applications.

  ## Major Features

  - **Flexible Authentication**: Support for both direct Fusion bearer tokens and Azure Service Principal authentication (including OIDC)
  - **Multi-Environment Deployment**: Support for ci, tr, fprd, fqa, and next environments with automatic PR-based preview deployments
  - **Comprehensive Validation**: Full input validation, artifact format verification, and authentication method checking
  - **Rich Metadata Extraction**: Extracts app information from package.json and metadata.json, automatically posts deployment summaries to PR comments
  - **Production Grade**: 100% test coverage with comprehensive unit and integration tests
  - **Well Documented**: Complete usage examples, architecture documentation, and contribution guidelines

  ## Key Capabilities

  - Direct zip archive publishing without temporary file extraction
  - Automatic environment resolution for pull requests
  - Detailed logging and error messages for debugging
  - Outputs include app URL, portal URL, app name, version, and deployment information
  - Support for custom app configuration files and deployment tags

  ## Breaking Changes

  None - this is the initial major release establishing the stable API.

  ## Migration Guide

  No migration needed if upgrading from pre-1.0 versions. Simply update your workflows to reference `v1` tag instead of specific version numbers.

### Patch Changes

- 9d27ed5: streamline post PR comment functionality and update metadata handling

  - Simplified `postPrComment` function to focus on essential parameters.
  - Updated deployment comment structure to enhance clarity and relevance.
  - Improved error handling in manifest and metadata extraction modules.
  - Enhanced type definitions for Fusion applications and package metadata.
  - Updated Node.js engine requirement in package.json to >=24.0.0.
  - Fixed test cases to align with changes in comment structure and parameters.
  - Added comprehensive documentation review summary for project assessment.

## 0.1.23

### Patch Changes

- f187a11: move Node setup step and extract manifest in action workflow and fix app-maniifest extraction

## 0.1.22

### Patch Changes

- 3dfc3ba: add manifest and metadata extraction utilities

  - Implemented `loadManifest` function to read and parse `app.manifest.json` from a zip bundle.
  - Implemented `loadMetadata` function to read and parse `metadata.json` from a zip bundle.
  - Added corresponding TypeScript definitions for manifest and metadata structures.
  - Included source maps for both extraction utilities for better debugging.

## 0.1.21

### Patch Changes

- 8d7e337: add environment variable to publish command for improved configuration

## 0.1.20

### Patch Changes

- fc06d75: improve error message for missing artifact input and update upload step to publish

## 0.1.19

### Patch Changes

- 669dd4b: remove unnecessary dependency on upload step for publish config

## 0.1.18

### Patch Changes

- fef018e: remove validate-working-dir script and update action.yml for app upload

## 0.1.17

### Patch Changes

- d30e05e: update error handling in testIsFusionApp to use setFailed for invalid Fusion app

## 0.1.16

### Patch Changes

- 1b0c564: enhance working directory input handling in testIsFusionApp function

## 0.1.15

### Patch Changes

- f5d6b4e: add validate-working-dir

## 0.1.14

### Patch Changes

- 0cdb2e2: Add working directory validation step to verify Fusion app presence before artifact validation. This new validation step checks if the specified working directory contains a valid Fusion application by analyzing package.json for Fusion dependencies and app indicators (CLI, scripts, or config).

## 0.1.13

### Patch Changes

- 47e6921: Use scoped CLI package in publish step

  - Replace `npx fusion-framework-cli` with `npx -y -p @equinor/fusion-framework-cli ffc ...`
  - Explicitly invokes the CLI binary (`ffc`) via npx while installing the scoped package
  - Fixes 404 error from npm registry when running the publish step

## 0.1.12

### Patch Changes

- 92b4ddb: Fix Azure credential input validation to properly read environment variables

  - Added fallback to direct environment variable access (`INPUT_*`) when `core.getInput()` returns empty
  - Ensures Azure credentials (`azure-client-id`, `azure-tenant-id`, `azure-resource-id`) are properly detected
  - Added debug logging to help troubleshoot authentication issues
  - Added test coverage for environment variable fallback mechanism
  - Resolves issue where action failed with "Either 'fusion-token' or all Azure credentials must be provided" error

## 0.1.11

### Patch Changes

- 44cf901: Include built action files in changeset version PR

  - Modified `changeset:version` script to run build after version bump
  - Removed separate commit step for dist files in CI workflow
  - Build artifacts now included directly in changeset PR

## 0.1.10

### Patch Changes

- be876e6: update dist files

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
