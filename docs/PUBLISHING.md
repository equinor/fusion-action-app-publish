# Publishing Guide

This guide explains how to publish new versions of the Fusion Action App Publish using the automated Changesets workflow.

## 🚀 Quick Start

### For Contributors

When you make changes that should be released:

1. **Create your changes** in a feature branch
2. **Add a changeset** to describe your changes:
   ```bash
   pnpm changeset
   ```
3. **Follow the prompts:**
   - Select the version bump type (major/minor/patch)
   - Describe the changes for the changelog
4. **Commit the changeset file** (in `.changeset/`)
5. **Create a Pull Request**

That's it! The automated workflow handles the rest.

## 📦 Automated Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and releases.

### How It Works

1. **Changesets are Added:**
   - Contributors add `.changeset/*.md` files describing their changes
   - These files are committed with their PRs

2. **Release PR is Created:**
   - When changesets are merged to `main`, the CI workflow automatically creates a "Release PR"
   - This PR includes:
     - Version bumps in `package.json`
     - Updated `CHANGELOG.md` with all changes
     - Consumed changeset files (removed from `.changeset/`)

3. **Release is Published:**
   - When the Release PR is merged, the CI workflow:
     - Creates a GitHub Release with release notes
     - Creates and pushes git tags (`v1.2.3`, `v1.2`, `v1`)
     - Updates major/minor version pointers

### Adding a Changeset

Run the interactive CLI:

```bash
pnpm changeset
```

**Example session:**
```
🦋  Which packages would you like to include?
    ◉ fusion-action-app-publish

🦋  Which type of change is this for fusion-action-app-publish?
    ◯ major (breaking change)
    ◯ minor (new feature)
    ◉ patch (bug fix)

🦋  Please enter a summary for this change:
    Fixed artifact validation for special characters in paths

🦋  Generated changeset: .changeset/lazy-dogs-jump.md
```

The generated changeset file (`.changeset/lazy-dogs-jump.md`):
```markdown
---
"fusion-action-app-publish": patch
---

Fixed artifact validation for special characters in paths
```

**Commit this file** with your changes:
```bash
git add .changeset/lazy-dogs-jump.md
git commit -m "fix: handle special characters in artifact paths"
```

## 🏷️ Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **Major (v1.0.0 → v2.0.0):** Breaking changes
  - Changed input/output names
  - Removed features
  - Changed behavior that breaks existing workflows

- **Minor (v1.0.0 → v1.1.0):** New features (backward compatible)
  - New inputs or outputs
  - New validation rules (non-breaking)
  - Enhanced functionality

- **Patch (v1.0.0 → v1.0.1):** Bug fixes
  - Error fixes
  - Documentation updates
  - Dependency updates

### Git Tags

The CI workflow automatically creates and maintains:
- **Full version tag:** `v1.2.3` (immutable, points to specific release)
- **Minor version tag:** `v1.2` (moves forward with v1.2.x releases)
- **Major version tag:** `v1` (moves forward with v1.x.x releases)

Users can pin to different levels:
```yaml
# Pin to exact version (recommended for production)
- uses: equinor/fusion-action-app-publish@v1.2.3

# Auto-update patch versions
- uses: equinor/fusion-action-app-publish@v1.2

# Auto-update minor and patch versions
- uses: equinor/fusion-action-app-publish@v1

# Always latest (not recommended)
- uses: equinor/fusion-action-app-publish@main
```

## 🔄 Release Workflow

### Standard Release (Normal Process)

1. **Merge PRs with changesets to `main`**
   - CI detects changesets
   - Creates/updates Release PR titled "🤖 Release - Fusion Action App Change"
   - Release PR is automatically converted to draft

2. **Review the Release PR**
   - Check version bumps in `package.json`
   - Review `CHANGELOG.md` entries
   - Verify dist files are up to date
   - Undraft the PR when ready to release

3. **Merge the Release PR**
   - CI automatically creates GitHub Release
   - Tags are created and pushed
   - Release notes are generated from changelog

### Emergency Hotfix

For urgent fixes that bypass the normal process:

1. **Create and merge fix PR with changeset**
2. **Manually trigger release:**
   ```bash
   # Update version and changelog
   pnpm changeset version
   
   # Commit changes
   git add .
   git commit -m "chore: release v1.2.4"
   git push
   
   # Create and push tag
   git tag v1.2.4
   git push origin v1.2.4
   ```

3. **Create GitHub Release manually** from the tag

## 📋 Pre-Release Checklist

Before merging the Release PR, verify:

- [ ] All tests pass (`pnpm run test:ci`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] `dist/` files are up to date (CI checks this)
- [ ] `CHANGELOG.md` accurately describes changes
- [ ] Version bump is appropriate (major/minor/patch)
- [ ] Breaking changes are clearly documented
- [ ] Examples are updated if inputs/outputs changed
- [ ] No sensitive information in code or changelog

## 🛠️ Maintainer Tasks

### Update Dependencies

```bash
# Update dependencies
pnpm update

# Run tests
pnpm test

# If updates affect functionality, add a changeset
pnpm changeset
```

### Update Node.js Version

If changing the Node.js version requirement:

1. Update `package.json` engines field
2. Update `.github/workflows/actions/node-setup/action.yml`
3. Update `CONTRIBUTING.md` prerequisites
4. Add a **major** changeset (breaking change)

### Manually Version (if needed)

```bash
# Apply all changesets and update versions
pnpm changeset version

# This will:
# - Update package.json version
# - Update CHANGELOG.md
# - Delete consumed changeset files
# - Require pnpm install to update lockfile
```

## 🔒 Security Considerations

- Never include real secrets in examples or tests
- Use placeholder values in documentation
- Review dependency updates for security issues
- Test edge cases with invalid/malicious inputs
- Validate all user inputs in validation scripts

### GitHub Actions SHA Pinning

The composite action's remote dependencies must use full commit SHAs when callers require GitHub Actions to be pinned. At the reported revision `d331a49e913781e970f3d0b0a80375f65c0a395a` and the current pre-fix revision, `action.yml` used `actions/setup-node@v6` and `azure/login@v3`; both were mutable major-version references. The action now pins setup-node v6.5.0 to `249970729cb0ef3589644e2896645e5dc5ba9c38` and azure/login v3.1.0 to `a641126d1b8aa4d1fa005f4f92df94a3a4c4c906`.

The `github-actions` Dependabot updater is configured weekly for `/`. Dependabot's GitHub Actions file fetcher includes root `action.yml` and `action.yaml` alongside `.github/workflows` files, and its parser supports dependencies in composite actions. Keep the `# vX.Y.Z` comments when updating pins; Dependabot can update version comments alongside SHA references. The infrastructure test checks that every remote action reference in this composite manifest remains pinned and has a version comment.

To verify native policy enforcement after merging, use a disposable caller repository with **Require actions to be pinned to a full-length commit SHA** enabled. Invoke this action by the full SHA of the merge commit under test, pin every other caller action to a full SHA, and run a publish against an authorized test environment using test credentials. A successful run should pass GitHub's policy check and exercise the selected authentication/publishing path. Record the caller workflow and the 40-character action revision used with the validation result. This workspace cannot validate that repository-level policy or perform a publish without access to an authorized caller repository and test credentials.

## 📈 Post-Release

After a release is published:

1. **Verify the release:**
   - Check GitHub Releases page
   - Verify tags are created (`v1.2.3`, `v1.2`, `v1`)
   - Test the released action in a workflow

2. **Monitor:**
   - Watch for issues related to the release
   - Check CI/CD pipelines using the action
   - Review any user feedback

3. **Communicate (if significant):**
   - Announce in Equinor Fusion channels
   - Update internal documentation
   - Create migration guides for breaking changes

## 🐛 Troubleshooting

### Release PR not created

- Ensure changesets exist in `.changeset/` (not just `README.md`)
- Check CI workflow logs for errors
- Verify `GITHUB_TOKEN` permissions in workflow

### Dist files out of sync

```bash
# Rebuild dist files
pnpm run build

# Commit the changes
git add dist/
git commit -m "build: update dist files"
```

### Tag already exists

```bash
# Delete local and remote tag
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3

# Recreate tag at current commit
git tag v1.2.3
git push origin v1.2.3
```

## 📚 Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Publishing](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace)
- [Contributing Guide](CONTRIBUTING.md)