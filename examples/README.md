# Usage Examples

This directory contains example workflows showing different ways to use the Fusion App Publish Action.

## 📁 Examples

- [`basic-token.yml`](./basic-token.yml) - Simple publish using pre-acquired token
- [`azure-sp.yml`](./azure-sp.yml) - Publish using Azure Service Principal 
- [`azure-oidc.yml`](./azure-oidc.yml) - Publish using Azure OIDC/Federated credentials
- [`multi-environment.yml`](./multi-environment.yml) - Deploy to different environments based on branch
- [`pr-preview.yml`](./pr-preview.yml) - Create preview deployments for pull requests
- [`build-and-publish.yml`](./build-and-publish.yml) - Complete workflow with build step

## 🚀 Quick Start

1. Copy one of the example workflows to `.github/workflows/` in your repository
2. Update the secrets and environment names for your setup
3. Commit and push to trigger the workflow

## 🔐 Required Secrets

Depending on your authentication method, you'll need:

**For Token Authentication:**
- `FUSION_TOKEN` - Your Fusion bearer token

**For Azure Service Principal:**
- `AZURE_CLIENT_ID` - Azure Application ID
- `AZURE_TENANT_ID` - Azure Directory (tenant) ID  
- `AZURE_CLIENT_SECRET` - Azure Application secret

**For Azure OIDC (Recommended):**
- `AZURE_CLIENT_ID` - Azure Application ID
- `AZURE_TENANT_ID` - Azure Directory (tenant) ID
- No client secret needed (uses workload identity)