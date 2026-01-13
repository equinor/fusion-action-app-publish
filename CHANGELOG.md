# Changelog

All notable changes to the Fusion App Publish Action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Fusion App Publish Action
- Support for Fusion environments: CI, FQA, FPRD, TR
- Automatic environment resolution with `env: auto`
- PR-specific environment support (`pr-<number>`)
- Flexible authentication (Fusion token, Azure SP, Azure OIDC)
- Comprehensive input validation
- Rich output capture (app URLs, portal URLs, metadata)
- Optional build step before publishing
- Configurable CLI version pinning

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