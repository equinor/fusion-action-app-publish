# Fusion App Publish Action

A GitHub Action to authenticate and publish Fusion applications using the `@equinor/fusion-framework-cli`. This action supports both direct token authentication and Azure Service Principal authentication.

## Features

- 🔐 **Flexible Authentication**: Use either pre-acquired Fusion tokens or Azure Service Principal credentials
- 🏗️ **Optional Build Step**: Automatically build your app before publishing
- ✅ **Input Validation**: Comprehensive validation of inputs before execution
- 🌍 **Multi-Environment**: Support for dev, test, staging, prod, and qa environments
- 📦 **Package Manager Agnostic**: Works with pnpm, npm, and yarn
- 🔍 **Detailed Logging**: Clear output and error messages for debugging

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
          env: 'prod'
          artifact: 'dist'
```

### Using Azure Service Principal

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
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          azure-resource-id: ${{ secrets.FUSION_RESOURCE_ID }}
          env: 'prod'
          artifact: 'dist'
```

### Complete Workflow with Build

```yaml
name: Build and Deploy to Fusion

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Publish to Fusion
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          azure-resource-id: ${{ secrets.FUSION_RESOURCE_ID }}
          env: ${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}
          artifact: 'dist'
          build-before-publish: 'true'
          working-directory: '.'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `fusion-token` | Pre-acquired Fusion bearer token | No | - |
| `azure-client-id` | Azure Service Principal Client ID | No | - |
| `azure-tenant-id` | Azure Tenant ID | No | - |
| `azure-resource-id` | Fusion audience/resource ID for token acquisition | No | - |
| `env` | Target environment (dev/test/staging/prod/qa) | **Yes** | - |
| `artifact` | Path to built artifact | No | `dist` |
| `build-before-publish` | Run build step before publishing | No | `true` |
| `working-directory` | Working directory for commands | No | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `published-url` | URL of the published application (if available) |

## Authentication Methods

### Method 1: Pre-acquired Fusion Token

Use this method if you already have a Fusion bearer token:

```yaml
- uses: equinor/fusion-action-app-publish@v1
  with:
    fusion-token: ${{ secrets.FUSION_TOKEN }}
    env: 'prod'
```

### Method 2: Azure Service Principal

Use this method to let the action acquire a token using Azure Service Principal:

```yaml
- uses: equinor/fusion-action-app-publish@v1
  with:
    azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
    azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    azure-resource-id: ${{ secrets.FUSION_RESOURCE_ID }}
    env: 'prod'
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
- `dev` - Development
- `test` - Test 
- `staging` - Staging
- `prod` - Production
- `qa` - Quality Assurance

## Artifact Requirements

The action supports various artifact types:

### Directory (Recommended)
```
dist/
├── index.html
├── bundle.js
├── styles.css
└── manifest.json
```

### Archive Files
- `.zip` files
- `.tar.gz` files
- `.tgz` files

## Troubleshooting

### Common Issues

**"Artifact not found"**
- Ensure the build step runs before publish
- Check that `artifact` path is correct
- Verify `working-directory` is set properly

**"Invalid environment"**
- Use one of: dev, test, staging, prod, qa
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

Test the validation script locally:

```bash
# Test with token auth
node validate.js dev ./dist "your-token" "" "" ""

# Test with SP auth  
node validate.js prod ./dist "" "client-id" "tenant-id" "resource-id"
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the validation script
5. Submit a pull request

## License

MIT - see [LICENSE](LICENSE) file for details.

## Support

For issues related to:
- **GitHub Action**: Open an issue in this repository
- **Fusion Framework CLI**: Check [@equinor/fusion-framework-cli](https://github.com/equinor/fusion-framework-cli) 
- **Fusion Platform**: Contact the Fusion Core team
Github Action for publishing Fusion applications
