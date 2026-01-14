# Fusion App Publish Action

A GitHub Action to authenticate and publish Fusion applications using the `@equinor/fusion-framework-cli`. This action supports both direct token authentication and Azure Service Principal authentication.

## Features

- 🔐 **Flexible Authentication**: Use either pre-acquired Fusion tokens or Azure Service Principal credentials
- 🏗️ **Artifact Publishing**: Support for directories and archive files (.zip, .tar, .rar)
- ✅ **Comprehensive Validation**: Validated inputs, file formats, and authentication methods
- 🌍 **Multi-Environment**: Support for ci, tr, fprd, fqa, and next environments
- 🔄 **PR Deployments**: Automatic preview deployments for pull requests
- 🧪 **Fully Tested**: 100% test coverage with comprehensive unit tests
- 🔍 **Detailed Logging**: Clear output and error messages for debugging
- 📝 **Rich Metadata**: Extracts app information and posts deployment details to PRs

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
      - uses: actions/checkout@v4
      
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
      - uses: actions/checkout@v4
      
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
      - uses: actions/checkout@v4
      
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
| `azure-resource-id` | Fusion audience/resource ID for token acquisition | No | `https://fusion.equinor.com` |
| `env` | Target environment (ci/tr/fprd/fqa/next) | No | `ci` |
| `prNR` | Pull Request number (used with env=ci) | No | - |
| `artifact` | Path to built artifact file or directory | No | `./app-bundle.zip` |
| `tag` | Tag to apply to the deployment | No | `latest` |
| `working-directory` | Working directory for commands | No | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `app-url` | Direct URL to the published application |
| `portal-url` | Fusion portal URL for managing the application |
| `target-env` | Resolved target environment |
| `app-name` | Application name from manifest |
| `app-version` | Application version from manifest |
| `publish-info` | Formatted publish information for PR comments |

## Authentication Methods

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

**Note**: You must provide **either** `fusion-token` **or** all three Azure SP credentials. Providing both or neither will result in a validation error.

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
- `.zip` files - Standard ZIP archives
- `.tar` files - TAR archives
- `.rar` files - RAR archives

### Directory
```
app-bundle/
├── index.html
├── bundle.js
├── styles.css
└── app.manifest.json  # Required for metadata extraction
```

The action will automatically extract metadata from `app.manifest.json` when present.

## Troubleshooting

### Common Issues

**"Artifact not found"**
- Ensure the build step runs before publish
- Check that `artifact` path is correct
- Verify `working-directory` is set properly

**"Invalid environment"**
- Use one of: ci, tr, fprd, fqa, next
- Check spelling and case sensitivity

**"Missing authentication credentials"**
- Provide either `fusion-token` OR all SP credentials
- Don't provide both authentication methods

**"Token seems unusually short"**
- Verify your Fusion token is complete and valid
- Check token hasn't expired

### Debug Mode

Add debug output to your workflow:

```yaml
- name: Debug info
  run: |
    echo "Environment: ${{ inputs.env }}"
    echo "Artifact path: ${{ inputs.artifact }}"
    ls -la ${{ inputs.artifact }}
```

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

See [TESTING_SETUP.md](TESTING_SETUP.md) for testing infrastructure details.

## License

MIT - see [LICENSE](LICENSE) file for details.

## Support

For issues related to:
- **GitHub Action**: Open an issue in this repository
- **Fusion Framework CLI**: Check [@equinor/fusion-framework-cli](https://github.com/equinor/fusion-framework-cli) 
- **Fusion Platform**: Contact the Fusion Core team
Github Action for publishing Fusion applications
