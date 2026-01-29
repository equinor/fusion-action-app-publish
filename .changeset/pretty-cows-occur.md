---
"fusion-action-app-publish": major
---

Official v1.0.0 Release - Stable Production Ready

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
