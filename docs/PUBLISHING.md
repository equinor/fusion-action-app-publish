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

### Git Tags and Immutability Policy

The CI workflow (`.github/workflows/ci.yml` + `.github/scripts/release-tags.sh`) separates **immutable release tags** from **floating compatibility aliases**:

- **Release-specific patch tags (`vX.Y.Z`, e.g., `v2.2.3`):** Immutable. Created once per new `package.json` version without `--force`, never overwritten on subsequent commits, and paired with a GitHub Release whose notes are extracted from the matching `CHANGELOG.md` section.
- **Floating minor aliases (`vX.Y`, e.g., `v2.2`):** Mutable Git tags (no GitHub Release). Updated forward via explicit refspecs only when a new highest stable `vX.Y.*` patch release is published.
- **Floating major aliases (`vX`, e.g., `v2`):** Mutable Git tags (no GitHub Release). Updated forward via explicit refspecs only when a new highest stable `vX.*.*` release is published.
- **Prerelease tags (`vX.Y.Z-rc.1`):** Published as GitHub prereleases and never update `vX` or `vX.Y` aliases.
- **Non-release commits on `main`:** Pushes without a version bump leave existing `vX.Y.Z`, `vX.Y`, and `vX` tags untouched and do not create a release.

#### Consumer Pinning Guidance

```yaml
# Pin to a full 40-character commit SHA with a version comment (recommended for security-sensitive workflows)
- uses: equinor/fusion-action-app-publish@<40-char-commit-sha> # v2.2.3

# Pin to an exact immutable patch tag
- uses: equinor/fusion-action-app-publish@v2.2.3

# Follow backward-compatible patch releases on v2.2
- uses: equinor/fusion-action-app-publish@v2.2

# Follow backward-compatible minor and patch releases on v2
- uses: equinor/fusion-action-app-publish@v2
```

For SHA-pinned consumers (including repositories enforcing GitHub's *Require actions to be pinned to a full-length commit SHA* policy or using Dependabot `github-actions` updates), keep the `# vX.Y.Z` comment alongside the 40-character commit SHA. Because published `vX.Y.Z` tags are never moved, Dependabot only proposes SHA bumps when a new version is genuinely released with matching `CHANGELOG.md` and GitHub Release notes.

### Repository-Level Release Safeguards

In addition to the CI script guards (no `git tag -f` on `vX.Y.Z`, no `git push --tags --force`, remote existence check on `origin`), GitHub provides two complementary repository-level controls:

1. **GitHub Immutable Releases** (*Settings → Releases → Enable immutable releases*): Cryptographically locks every published GitHub Release and its associated `vX.Y.Z` tag against modification or deletion, while still allowing floating `vX` and `vX.Y` Git tags that have no GitHub Release to move forward on new releases. See [GitHub Docs: Using immutable releases and tags to manage your action's releases](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/using-immutable-releases-and-tags-to-manage-your-actions-releases).
2. **Tag Protection Ruleset** (optional defense-in-depth): A repository tag ruleset targeting `refs/tags/v*.*.*` with **Restrict updates** and **Restrict deletions** blocks force-pushes to patch tags even before a GitHub Release is created, while leaving `v*` and `v*.*` aliases outside the pattern.

Enabling repository-level Immutable Releases or tag rulesets requires repository admin permissions and must be configured in GitHub Settings.

## 🔄 Release Workflow

### Standard Release (Normal Process)

1. **Merge PRs with changesets to `main`**
   - CI detects pending `.changeset/*.md` files
   - `changesets/action` creates/updates the Release PR titled `"🤖 Release - Fusion Action App Publish"`
   - The Release PR is automatically converted to draft
   - No tags or releases are modified while changesets are pending

2. **Review the Release PR**
   - Check the version bump in `package.json`
   - Review `CHANGELOG.md` entries
   - Verify `dist/` files are up to date
   - Mark the PR ready for review when ready to release

3. **Merge the Release PR**
   - CI runs `.github/scripts/release-tags.sh`
   - Verifies `vX.Y.Z` does not already exist on `origin`
   - Creates and pushes the immutable `vX.Y.Z` tag without `--force`
   - Creates the GitHub Release `vX.Y.Z` with release notes from `CHANGELOG.md`
   - Updates floating `vX.Y` and `vX` aliases to the new stable release commit

4. **Subsequent non-release commits on `main`**
   - CI detects that `vX.Y.Z` already exists on `origin` at an earlier commit and exits without changing any tags or releases

### Emergency Hotfix

For urgent fixes that need to publish immediately:

1. **Create and merge the fix PR with a patch changeset** (preferred — follow Standard Release to allocate the next unused patch version, e.g., `v2.2.4`).
2. **Never overwrite or move an existing `vX.Y.Z` tag.** Always allocate a new unused patch version (`package.json` + `CHANGELOG.md`), push the new `vX.Y.Z` tag without `--force`, create a matching GitHub Release, and only then update floating `vX.Y` and `vX` tags explicitly.

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

Do **not** delete, force-move, or recreate an already-published `vX.Y.Z` tag. Moving a published patch tag breaks immutability guarantees for SHA-pinned consumers and causes unexpected Dependabot updates.

Instead, allocate the next unused patch version:

1. Add a patch changeset with `pnpm changeset` describing the fix.
2. Merge the PR to `main` and merge the resulting Release PR so CI creates the next unused `vX.Y.Z` tag and GitHub Release.

## 📚 Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Publishing](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace)
- [Contributing Guide](CONTRIBUTING.md)