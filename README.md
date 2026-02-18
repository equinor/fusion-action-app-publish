# Fusion App Publish Action

[![SCM Compliance](https://scm-compliance-api.radix.equinor.com/repos/equinor/f16ab4de-c7a6-4487-8a9e-79ba443dd2f0/badge)](https://developer.equinor.com/governance/scm-policy/)

**Automate the deployment of Fusion applications** to Equinor's Fusion platform using a standardized, secure workflow within GitHub Actions.

## Why This Action Exists

This action exists to **make it dead simple for Equinor developers to publish their Fusion applications** without wrestling with complex CLI commands, authentication setup, or deployment configurations. 

**The Problem:** Publishing Fusion apps traditionally required developers to manually handle authentication tokens, remember CLI syntax, manage environment configurations, and track deployment status across multiple tools.

**The Solution:** A single GitHub Action that handles all the orchestration behind the scenes while maintaining enterprise security standards.

### What It Does For You

🔐 **Handles Authentication Complexity** - Whether you have a pre-acquired token or need Azure Service Principal authentication, it just works

🚀 **Eliminates Manual Steps** - No more remembering `@equinor/fusion-framework-cli` commands or debugging deployment issues

🌍 **Manages Multi-Environment Deployments** - Automatically deploys to the right environment (`ci`, `tr`, `fprd`, `fqa`, `next`) with smart PR preview handling

🔍 **Provides Rich Feedback** - Posts deployment details, app URLs, and metadata directly to your PRs

🏢 **Meets Enterprise Standards** - Built for Equinor's Azure infrastructure with full security compliance

*Think of it as your "deploy button" for Fusion apps - one action that handles everything from authentication to deployment feedback.*

## Features

- 🔐 **Flexible Authentication**: Use either pre-acquired Fusion tokens or Azure Service Principal credentials
- 🏗️ **Artifact Publishing**: Support for directories and zip archive files (.zip)
- ⚡ **Efficient Processing**: Direct zip file reading without temporary file extraction
- ✅ **Comprehensive Validation**: Validated inputs, file formats, and authentication methods
- 🌍 **Multi-Environment**: Support for ci, tr, fprd, fqa, and next environments
- 🔄 **PR Deployments**: Automatic preview deployments for pull requests
- 🧪 **Fully Tested**: 100% test coverage with comprehensive unit tests
- 🔍 **Detailed Logging**: Clear output and error messages for debugging
- 📝 **Rich Metadata**: Extracts app information from metadata.json (name -> appKey) and posts deployment details to PRs

## 📖 Complete Use Cases Guide

**👉 For comprehensive examples and deployment patterns, see our [Complete Use Cases Guide](docs/COMPLETE_USE_CASES.md)**

This guide covers 9+ detailed scenarios including:
- 🚀 **Basic to Enterprise deployment pipelines**
- 🔐 **Azure Service Principal with GitHub Environments**  
- 🔄 **Pull Request previews and multi-environment workflows**
- 🏢 **Monorepo deployments and custom configurations**
- 🐛 **Debugging and troubleshooting workflows**

*Whether you're getting started or implementing enterprise-grade deployments, the complete guide has copy-paste ready examples for your use case.*

## Usage

### Basic Usage with Pre-acquired Token

```yaml
name: Deploy to Fusion

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      
      - name: Publish to Fusion
        uses: equinor/fusion-action-app-publish@v1
        with:
          fusion-token: ${{ secrets.FUSION_TOKEN }}
          env: 'fprd'
          artifact: './app-bundle.zip'
          tag: 'v1.0.0'
```

### Using Azure Service Principal (OIDC)

```yaml
name: Deploy to Fusion

on:
  push:
    branches: [main]

# Required for Azure OIDC authentication
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      
      - name: Publish to Fusion
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          azure-resource-id: ${{ secrets.FUSION_RESOURCE_ID }}
          env: 'fprd'
          artifact: './app-bundle.zip'
```

### PR Preview Deployments

```yaml
name: PR Preview

on:
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read
  pull-requests: write  # For posting deployment comments

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy PR Preview
        id: deploy
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          env: 'ci'  # Will create pr-{number} deployment
          prNR: ${{ github.event.number }}
          artifact: './app-bundle.zip'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `fusion-token` | Pre-acquired Fusion bearer token | No | - |
| `azure-client-id` | Azure Service Principal Client ID | No | - |
| `azure-tenant-id` | Azure Tenant ID | No | - |
| `azure-resource-id` | Fusion audience/resource ID for token acquisition | No | - |
| `env` | Target environment (ci/tr/fprd/fqa/next) | No | `ci` |
| `prNR` | Pull Request number (used with env=ci) | No | - |
| `artifact` | Path to built artifact file (.zip) | No | `./app-bundle.zip` |
| `config` | Path to fusion app config file (optional) | No | - |
| `tag` | Tag to apply to the deployment | No | `latest` |
| `working-directory` | Working directory for commands | No | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `app-url` | Direct URL to the published application |
| `portal-url` | Fusion portal URL for managing the application |
| `target-env` | Resolved target environment |
| `app-name` | Application name from metadata |
| `app-version` | Application version from metadata |
| `publish-info` | Formatted publish information for PR comments |
| `auth-type` | Authentication type used (`token` or `service-principal`) |
| `is-token` | Whether fusion-token authentication was used |
| `is-service-principal` | Whether Azure Service Principal authentication was used |

## Authentication Methods

The action provides two distinct functions for authentication validation:

### `validateFusionToken(token)`
Validates the format and structure of Fusion bearer tokens:
- Ensures token is a non-empty string
- Validates BEARER prefix format
- Supports alphanumeric characters, dots, dashes, and underscores

### `detectAndValidateAuthType(credentials)`
Detects authentication type and validates Service Principal credentials:
- Returns authentication type (`token` or `service-principal`)
- Validates complete Azure Service Principal credential sets
- Handles credential precedence when both types are provided

### Method 1: Pre-acquired Fusion Token

Use this method if you already have a Fusion bearer token:

```yaml
- uses: equinor/fusion-action-app-publish@v1
  with:
    fusion-token: ${{ secrets.FUSION_TOKEN }}
    env: 'fprd'
    artifact: './app-bundle.zip'
```

### Method 2: Azure Service Principal

Use this method to let the action acquire a token using Azure Service Principal:

```yaml
# Requires OIDC permissions
permissions:
  id-token: write
  contents: read

# In job steps:
- uses: equinor/fusion-action-app-publish@v1
  with:
    azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
    azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    azure-resource-id: ${{ secrets.FUSION_RESOURCE_ID }}
    env: 'fprd'
    artifact: './app-bundle.zip'
```

**Authentication Priority**: When both authentication methods are provided, the action prioritizes Azure Service Principal authentication over tokens. This allows for future extensibility and consistent behavior.

## Environment Setup

### Required Secrets

For **Fusion Token** method:
- `FUSION_TOKEN`: Your pre-acquired Fusion bearer token

For **Service Principal** method:
- `AZURE_CLIENT_ID`: Azure Application (client) ID
- `AZURE_TENANT_ID`: Azure Directory (tenant) ID  
- `FUSION_RESOURCE_ID`: Fusion API resource/audience ID

### Setting up Azure Service Principal

1. Create an Azure App Registration
2. Create a client secret
3. Assign appropriate permissions to access Fusion APIs
4. Note down the Client ID, Tenant ID, and Resource ID

## Supported Environments

The action validates against these environments:
- `ci` - Continuous Integration / Pull Request previews
- `tr` - Test/Trial environment
- `fprd` - Full Production
- `fqa` - Full Quality Assurance
- `next` - Next/Beta environment

When using `env: 'ci'` with a `prNR`, the action automatically creates preview deployments tagged as `pr-{number}`.

## Artifact Requirements

The action supports various artifact types:

### Archive Files (Recommended)
- `.zip` files - Standard ZIP archives (only format supported currently)

### Directory
```
app-bundle/
├── index.html
├── bundle.js
├── styles.css
└── metadata.json  # Required for metadata extraction
```

The action will automatically extract metadata from `metadata.json` when present. The extraction process uses `unzip -p` to read the metadata directly from the zip archive without creating temporary files, making it more efficient and faster.

#### Expected metadata.json format:
```json
{
  "name": "fusion-framework-cookbook-app-react",
  "version": "4.1.8"
}
```

The `name` field will be used as the app key for deployment.

## Troubleshooting

### Common Issues

**"Artifact not found"**
- Ensure the build step runs before publish
- Check that `artifact` path is correct
- Verify `working-directory` is set properly
- Use absolute paths or verify relative paths from working directory

**"Invalid environment"**
- Use one of: ci, tr, fprd, fqa, next
- Check spelling and case sensitivity
- Environment names are case-sensitive

**"Missing authentication credentials"**
- Provide either `fusion-token` OR all SP credentials
- Don't provide both authentication methods
- Ensure all required Azure credentials are set (client-id, tenant-id, resource-id)

**"Token seems unusually short"**
- Verify your Fusion token is complete and valid
- Check token hasn't expired
- Ensure token includes "BEARER_" prefix

**"Manifest file not found"**
- Ensure `app-manifest.json` exists in your bundle
- Check bundle structure matches requirements
- Verify file names are correct (case-sensitive)

**"Metadata file not found"**
- Ensure `metadata.json` exists in your bundle
- Check JSON syntax is valid
- Verify required fields (name, version) are present

**"Config file validation failed"**
- Ensure config file exists at specified path
- Verify config file contains valid JSON
- Check file permissions

**"Bundle extraction failed"**
- Verify zip file is not corrupted
- Check zip file contains required structure
- Ensure bundle was created properly by your build process

### Debug Mode

Add debug output to your workflow:

```yaml
- name: Debug Bundle Info
  run: |
    echo "Environment: ${{ inputs.env }}"
    echo "Artifact path: ${{ inputs.artifact }}"
    echo "Working directory: $(pwd)"
    ls -la ${{ inputs.artifact }}
    
    # Check bundle contents
    if [[ "${{ inputs.artifact }}" == *.zip ]]; then
      echo "Bundle contents:"
      unzip -l ${{ inputs.artifact }}
      
      # Check for required files
      echo "Checking for required files:"
      unzip -l ${{ inputs.artifact }} | grep -E "(metadata\.json|app-manifest\.json)" || echo "⚠️  Required files missing"
    fi

- name: Validate Bundle Structure
  run: |
    # Extract and validate metadata.json
    unzip -p ${{ inputs.artifact }} metadata.json > /tmp/metadata.json 2>/dev/null || echo "❌ metadata.json missing"
    if [[ -f /tmp/metadata.json ]]; then
      echo "✅ metadata.json found:"
      cat /tmp/metadata.json | jq .
    fi
    
    # Extract and validate app-manifest.json
    unzip -p ${{ inputs.artifact }} app-manifest.json > /tmp/manifest.json 2>/dev/null || echo "❌ app-manifest.json missing"
    if [[ -f /tmp/manifest.json ]]; then
      echo "✅ app-manifest.json found:"
      cat /tmp/manifest.json | jq .
    fi
```

### Error Codes Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| `ENOENT` | File or directory not found | Check paths and ensure files exist |
| `EACCES` | Permission denied | Check file permissions |
| `Invalid JSON` | JSON parsing failed | Validate JSON syntax in metadata/config files |
| `Missing appKey` | app-manifest.json missing required field | Add appKey to manifest |
| `Missing name/version` | metadata.json missing required fields | Add name and version to metadata |
| `Auth validation failed` | Authentication credentials invalid | Check token format or SP credentials |
| `Unsupported environment` | Environment not in allowed list | Use: ci, tr, fprd, fqa, or next |

## Development

### Local Testing

Run the test suite to validate changes:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Test individual validation scripts
node scripts/validate-artifact.js
node scripts/validate-env.js
node scripts/validate-is-token-or-azure.js
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the test suite: `pnpm test`
5. Ensure 100% test coverage: `pnpm run test:coverage`
6. Update documentation if needed
7. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guide.

## License

MIT - see [LICENSE](LICENSE) file for details.

## Support

For issues related to:
- **GitHub Action**: Open an issue in this repository
- **Fusion Framework CLI**: Check [@equinor/fusion-framework-cli](https://github.com/equinor/fusion-framework-cli) 
- **Fusion Platform**: Contact the Fusion Core team
Github Action for publishing Fusion applications
