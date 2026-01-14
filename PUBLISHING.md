# Publishing Guide

## 📦 How to Publish the Fusion App Publish Action

### Method 1: GitHub Releases (Start Here)

1. **Prepare for release:**
   ```bash
   # Ensure everything is committed
   git add .
   git commit -m "feat: initial release of fusion-app-publish action"
   git push origin main
   ```

2. **Create a release tag:**
   ```bash
   # Create and push tag
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Create GitHub Release:**
   - Go to: `https://github.com/equinor/fusion-action-app-publish/releases/new`
   - Tag: `v1.0.0`
   - Title: `v1.0.0 - Initial Release`
   - Description: Copy from CHANGELOG.md

4. **Users can now use it:**
   ```yaml
   - uses: equinor/fusion-action-app-publish@v1.0.0
   # or
   - uses: equinor/fusion-action-app-publish@v1
   ```

### Method 2: GitHub Actions Marketplace

1. **Add marketplace metadata to action.yml:**
   ```yaml
   name: 'Fusion App Publish'
   description: 'Authenticate & publish Fusion apps using fusion-framework-cli'
   author: 'Equinor Fusion Core'
   branding:
     icon: 'upload-cloud'
     color: 'blue'
   ```

2. **Create release (same as above)**

3. **Publish to Marketplace:**
   - Go to GitHub repository → Actions tab
   - Click "Publish this Action to Marketplace"
   - Fill out marketplace form
   - Submit for review

### Method 3: Internal/Private Usage

Users can reference directly:
```yaml
- uses: equinor/fusion-action-app-publish@main
```

## 🏷️ Versioning Strategy

### Major Versions (v1, v2, v3)
- Update major version tag after releases
- Users can pin to `@v1` for automatic minor updates

```bash
# After releasing v1.0.0, v1.1.0, v1.2.0...
git tag -f v1  # Move v1 tag to latest v1.x.x
git push origin v1 --force
```

### Example Release Workflow
```bash
# Release v1.1.0
git tag v1.1.0
git push origin v1.1.0

# Update major version pointer
git tag -f v1
git push origin v1 --force
```

## 📋 Pre-publish Checklist

- [ ] All tests pass (run `pnpm test`)
- [ ] Documentation is complete
- [ ] Examples are tested
- [ ] CHANGELOG.md is updated
- [ ] Version in package.json is bumped
- [ ] Action.yml has proper branding
- [ ] No sensitive information in code
- [ ] LICENSE file is present

## 🔒 Security Considerations

- Never include real secrets in examples
- Use placeholder values in documentation
- Ensure validation script handles edge cases
- Test with invalid inputs

## 📈 Post-publish

1. **Monitor usage:**
   - Check GitHub Insights
   - Watch for issues/PRs
   - Monitor marketplace ratings

2. **Maintenance:**
   - Regular dependency updates
   - CLI version updates
   - Bug fixes and improvements

3. **Communication:**
   - Announce in Equinor channels
   - Update internal documentation
   - Create usage guidelines