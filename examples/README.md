# Usage Examples

This directory contains example workflows showing different ways to use the Fusion App Publish Action.

## 📁 Examples

- [`basic-token.yml`](./basic-token.yml) - Simple publish using pre-acquired token
- [`azure-oidc.yml`](./azure-oidc.yml) - Publish using Azure OIDC/Federated credentials (Recommended)
- [`multi-environment.yml`](./multi-environment.yml) - Deploy to different environments based on branch/input
- [`pr-preview.yml`](./pr-preview.yml) - Create preview deployments for pull requests with PR comments

## 🚀 Quick Start

1. Choose an example that matches your authentication method
2. Copy the workflow to `.github/workflows/` in your repository
3. Update the secrets and environment names for your setup
4. Ensure your app bundle is built and available at the specified artifact path
5. Commit and push to trigger the workflow

## 🔐 Required Secrets

Depending on your authentication method, you'll need:

**For Token Authentication:**
- `FUSION_TOKEN` - Your Fusion bearer token (format: `BEARER <token>`)

**For Azure OIDC (Recommended):**
- `AZURE_CLIENT_ID` - Azure Application ID
- `AZURE_TENANT_ID` - Azure Directory (tenant) ID
- `FUSION_RESOURCE_ID` - Fusion API resource ID (usually `https://fusion.equinor.com`)

**Workflow Permissions for OIDC:**
```yaml
permissions:
  id-token: write    # Required for Azure OIDC
  contents: read     # Required for checkout
  pull-requests: write  # Required for PR comments (PR workflows only)
```

## 🌍 Environment Names

The action supports these environments:
- `ci` - Continuous Integration (creates `pr-{number}` deployments when used with `prNR`)
- `tr` - Test/Trial environment  
- `fprd` - Full Production
- `fqa` - Full Quality Assurance
- `next` - Next/Beta environment

## 📦 Artifact Requirements

Your app bundle should be:
- A `.zip` archive file, OR
- A directory containing your built application
- Should include `metadata.json` for automatic metadata extraction
- Default path expected: `./app-bundle.zip`

Expected `metadata.json` format:
```json
{
  "name": "your-app-name",
  "version": "1.0.0"
}
```