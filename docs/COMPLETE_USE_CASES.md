# Complete Use Cases Guide: Fusion App Publish Action

This comprehensive guide covers all use cases for the **Fusion App Publish Action**, from basic deployments to advanced enterprise scenarios. Examples reflect real-world developer practices using Azure Service Principal authentication and GitHub Environments.

## 📋 Quick Reference

| Scenario | Authentication | Environment Setup | Complexity | Priority |
|----------|---------------|------------------|------------|----------|
| [Basic Production Deploy](#1-basic-production-deployment) | Azure SP | Repository Secrets | 🟢 Simple | 🔥 Essential |
| [Multi-Environment with GitHub Environments](#2-multi-environment-with-github-environments) | Azure SP | Environment Variables | 🟡 Medium | 🔥 Essential |
| [PR Previews](#3-pull-request-previews) | Azure SP | Repository Secrets | 🟢 Simple | 🔥 Essential |
| [Manual Token Acquisition](#4-manual-token-acquisition) | Manual `az` | Environment Variables | 🟡 Medium | ⚠️ Advanced |
| [Enterprise Multi-Pipeline](#5-enterprise-multi-environment-pipeline) | Azure SP | Environment Variables | 🔴 Complex | 🔥 Essential |
| [Monorepo Deployments](#6-monorepo-applications) | Azure SP | Mixed | 🔴 Complex | ⚠️ Advanced |
| [Custom Configuration](#7-custom-configuration-deployments) | Azure SP | Any | 🟡 Medium | ⚠️ Advanced |
| [Complete PR Workflow with Build](#8-complete-pr-workflow-with-build-integration) | Azure SP | Repository Secrets | 🟡 Medium | 🔥 Essential |

---

## 1. Basic Production Deployment

**Scenario:** Simple deployment to production from main branch releases.

**When to use:** Single-environment deployment, getting started, simple projects.

**Setup:** Repository secrets only.

### Workflow Configuration

```yaml
name: Deploy to Production

on:
  release:
    types: [published]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy to Fusion Production
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          env: 'fprd'
          artifact: './app-bundle.zip'
          tag: ${{ github.event.release.tag_name }}
```

### Required Repository Secrets

```
AZURE_CLIENT_ID=your-azure-client-id
AZURE_TENANT_ID=your-azure-tenant-id
```

### Benefits
- ✅ Simple setup
- ✅ No environment configuration needed
- ✅ Uses default production resource ID automatically
- ✅ Perfect for single-environment projects

---

## 2. Multi-Environment with GitHub Environments

**Scenario:** Different deployment targets (staging, production) with environment-specific configuration.

**When to use:** Professional development workflows, multiple deployment stages.

**Setup:** GitHub Environments with environment variables.

### Workflow Configuration

```yaml
name: Multi-Environment Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy-staging:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy to Staging
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: 'staging-${{ github.sha }}'

  deploy-production:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy to Production
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: 'prod-${{ github.sha }}'
```

### GitHub Environment Setup

**Environment: `staging`**
```
Variables:
  AZURE_CLIENT_ID=staging-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=fqa
```

**Environment: `production`**
```
Variables:
  AZURE_CLIENT_ID=production-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=fprd
```

### Benefits
- ✅ Environment-specific configuration
- ✅ Clear separation between staging and production
- ✅ Environment protection rules apply
- ✅ Easy to manage different Azure credentials per environment
- ✅ Visible configuration in GitHub UI

---

## 3. Pull Request Previews

**Scenario:** Automatic preview deployments for every pull request.

**When to use:** Code review process, testing changes before merge.

**Setup:** Repository secrets with PR permissions.

### Workflow Configuration

```yaml
name: PR Preview Deployment

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

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
          env: 'ci'
          prNR: ${{ github.event.number }}
          artifact: './app-bundle.zip'

      - name: Comment PR with Deployment Info
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 **PR Preview Deployed**
              
              **App URL:** ${{ steps.deploy.outputs.app-url }}
              **Portal URL:** ${{ steps.deploy.outputs.portal-url }}
              **Environment:** ${{ steps.deploy.outputs.target-env }}
              **Tag:** pr-${{ github.event.number }}
              
              App Name: ${{ steps.deploy.outputs.app-name }}
              Version: ${{ steps.deploy.outputs.app-version }}`
            })
```

### Required Repository Secrets

```
AZURE_CLIENT_ID=your-azure-client-id
AZURE_TENANT_ID=your-azure-tenant-id
```

### Benefits
- ✅ Automatic deployment URL in PR comments
- ✅ Easy testing of changes before merge
- ✅ Uses `pr-{number}` tagging for easy identification
- ✅ Deploys to CI environment automatically

---

## 4. Manual Token Acquisition

**Scenario:** Manual control over token acquisition using `az` CLI.

**When to use:** Advanced scenarios, debugging, custom authentication flows.

**Setup:** Environment variables with manual Azure login.

### Workflow Configuration

```yaml
name: Manual Token Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: ['staging', 'production']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v6
      
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          allow-no-subscriptions: true

      - name: Acquire Fusion Token
        run: |
          TOKEN=$(az account get-access-token \
            --resource "${{ vars.FUSION_RESOURCE_ID }}" \
            --query accessToken -o tsv)
          echo "FUSION_TOKEN=BEARER $TOKEN" >> $GITHUB_ENV
          echo "::add-mask::$TOKEN"

      - name: Deploy to Fusion
        uses: equinor/fusion-action-app-publish@v1
        with:
          fusion-token: ${{ env.FUSION_TOKEN }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: 'manual-${{ github.run_number }}'

      - name: Azure Logout
        if: always()
        run: az logout
```

### Environment Variables Setup

**Environment: `staging`**
```
Variables:
  AZURE_CLIENT_ID=staging-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_RESOURCE_ID=api://fusion.equinor.com/nonprod
  FUSION_ENVIRONMENT=fqa
```

**Environment: `production`**
```
Variables:
  AZURE_CLIENT_ID=production-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_RESOURCE_ID=api://fusion.equinor.com/prod
  FUSION_ENVIRONMENT=fprd
```

### Benefits
- ✅ Full control over token acquisition
- ✅ Manual deployment approval
- ✅ Environment-specific resource IDs
- ✅ Good for debugging authentication issues

---

## 5. Enterprise Multi-Environment Pipeline

**Scenario:** Complete enterprise deployment pipeline with staging gates and approvals.

**When to use:** Large organizations, production-critical applications, compliance requirements.

**Setup:** Multiple GitHub Environments with protection rules.

### Workflow Configuration

```yaml
name: Enterprise Deployment Pipeline

on:
  push:
    branches: [main]
  release:
    types: [published]

permissions:
  id-token: write
  contents: read

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy to Development
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: 'dev-${{ github.sha }}'

  deploy-test:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: test
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy to Test
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: 'test-${{ github.sha }}'

  deploy-qa:
    needs: deploy-test
    runs-on: ubuntu-latest
    environment: qa
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy to QA
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: 'qa-${{ github.sha }}'

  deploy-production:
    needs: deploy-qa
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy to Production
        id: deploy
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: ${{ github.event.release.tag_name }}

      - name: Notify Teams on Success
        if: success()
        run: |
          echo "🚀 Production Deployment Successful!"
          echo "App URL: ${{ steps.deploy.outputs.app-url }}"
          echo "Version: ${{ steps.deploy.outputs.app-version }}"
```

### GitHub Environment Configuration

**Environment: `development`**
```
Variables:
  AZURE_CLIENT_ID=dev-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=ci
Protection Rules: None
```

**Environment: `test`**
```
Variables:
  AZURE_CLIENT_ID=test-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=tr
Protection Rules: None
```

**Environment: `qa`**
```
Variables:
  AZURE_CLIENT_ID=qa-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=fqa
Protection Rules: Wait timer: 5 minutes
```

**Environment: `production`**
```
Variables:
  AZURE_CLIENT_ID=prod-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=fprd
Protection Rules:
  - Required reviewers: [team-leads, security-team]
  - Wait timer: 30 minutes
  - Restrict to main branch
```

### Benefits
- ✅ Controlled deployment progression
- ✅ Environment-specific protection rules
- ✅ Automatic dev/test, manual QA/production
- ✅ Full audit trail
- ✅ Production requires release events only

---

## 6. Monorepo Applications

**Scenario:** Multiple Fusion applications in a single repository.

**When to use:** Monorepo architecture, multiple related applications.

**Setup:** Path-based configuration with selective deployment.

### Workflow Configuration

```yaml
name: Monorepo Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      app:
        description: 'Application to deploy'
        required: true
        type: choice
        options: ['frontend', 'admin', 'mobile', 'all']

jobs:
  determine-changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.changes.outputs.frontend }}
      admin: ${{ steps.changes.outputs.admin }}
      mobile: ${{ steps.changes.outputs.mobile }}
    steps:
      - uses: actions/checkout@v6
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            frontend:
              - 'apps/frontend/**'
            admin:
              - 'apps/admin/**'
            mobile:
              - 'apps/mobile/**'

  deploy-frontend:
    needs: determine-changes
    if: |
      (github.event_name == 'push' && needs.determine-changes.outputs.frontend == 'true') ||
      (github.event_name == 'workflow_dispatch' && (github.event.inputs.app == 'frontend' || github.event.inputs.app == 'all'))
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy Frontend App
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './apps/frontend/dist/app-bundle.zip'
          working-directory: './apps/frontend'
          tag: 'frontend-${{ github.sha }}'

  deploy-admin:
    needs: determine-changes
    if: |
      (github.event_name == 'push' && needs.determine-changes.outputs.admin == 'true') ||
      (github.event_name == 'workflow_dispatch' && (github.event.inputs.app == 'admin' || github.event.inputs.app == 'all'))
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy Admin App
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './apps/admin/dist/admin-bundle.zip'
          working-directory: './apps/admin'
          config: './apps/admin/fusion.config.json'
          tag: 'admin-${{ github.sha }}'

  deploy-mobile:
    needs: determine-changes
    if: |
      (github.event_name == 'push' && needs.determine-changes.outputs.mobile == 'true') ||
      (github.event_name == 'workflow_dispatch' && (github.event.inputs.app == 'mobile' || github.event.inputs.app == 'all'))
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v6
      
      - name: Deploy Mobile App
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './apps/mobile/build/mobile-app.zip'
          working-directory: './apps/mobile'
          tag: 'mobile-${{ github.sha }}'
```

### Repository Structure

```
monorepo/
├── apps/
│   ├── frontend/
│   │   ├── dist/app-bundle.zip
│   │   └── package.json
│   ├── admin/
│   │   ├── dist/admin-bundle.zip
│   │   └── fusion.config.json
│   └── mobile/
│       ├── build/mobile-app.zip
│       └── package.json
└── .github/workflows/deploy.yml
```

### Benefits
- ✅ Selective deployment based on file changes
- ✅ Manual deployment of specific apps
- ✅ App-specific configuration and artifacts
- ✅ Shared Azure credentials across apps
- ✅ Independent versioning per app

---

## 7. Custom Configuration Deployments

**Scenario:** Applications requiring specific deployment configuration.

**When to use:** Complex deployment requirements, custom environment variables, advanced Fusion CLI options.

**Setup:** Custom configuration files with environment-specific settings.

### Workflow Configuration

```yaml
name: Custom Configuration Deploy

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v6
      
      - name: Generate Dynamic Config
        run: |
          # Create environment-specific configuration
          cat > fusion.config.json << EOF
          {
            "environment": "${{ vars.FUSION_ENVIRONMENT }}",
            "features": {
              "enableBeta": ${{ vars.ENABLE_BETA_FEATURES }},
              "analytics": ${{ vars.ENABLE_ANALYTICS }}
            },
            "endpoints": {
              "api": "${{ vars.API_ENDPOINT }}",
              "auth": "${{ vars.AUTH_ENDPOINT }}"
            },
            "deployment": {
              "strategy": "${{ vars.DEPLOYMENT_STRATEGY }}",
              "timeout": ${{ vars.DEPLOYMENT_TIMEOUT }}
            }
          }
          EOF

      - name: Deploy with Custom Configuration
        id: deploy
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          config: './fusion.config.json'
          tag: '${{ vars.TAG_PREFIX }}-${{ github.sha }}'

      - name: Validate Deployment
        run: |
          echo "Deployment successful!"
          echo "App URL: ${{ steps.deploy.outputs.app-url }}"
          echo "Environment: ${{ steps.deploy.outputs.target-env }}"
          
          # Custom validation logic
          curl -f "${{ steps.deploy.outputs.app-url }}/health" || exit 1
```

### Environment Variables (Production)

```
Variables:
  AZURE_CLIENT_ID=prod-client-id
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=fprd
  ENABLE_BETA_FEATURES=false
  ENABLE_ANALYTICS=true
  API_ENDPOINT=https://api.fusion.equinor.com/prod
  AUTH_ENDPOINT=https://auth.fusion.equinor.com
  DEPLOYMENT_STRATEGY=blue-green
  DEPLOYMENT_TIMEOUT=300
  TAG_PREFIX=prod
```

### Environment Variables (Staging)

```
Variables:
  AZURE_CLIENT_ID=staging-client-id  
  AZURE_TENANT_ID=your-tenant-id
  FUSION_ENVIRONMENT=fqa
  ENABLE_BETA_FEATURES=true
  ENABLE_ANALYTICS=false
  API_ENDPOINT=https://api.fusion.equinor.com/staging
  AUTH_ENDPOINT=https://auth-staging.fusion.equinor.com
  DEPLOYMENT_STRATEGY=rolling
  DEPLOYMENT_TIMEOUT=600
  TAG_PREFIX=staging
```

### Benefits
- ✅ Environment-specific feature flags
- ✅ Dynamic configuration generation
- ✅ Custom validation logic
- ✅ Advanced deployment strategies
- ✅ Full control over Fusion CLI options

---

## 8. Complete PR Workflow with Build Integration

**Scenario:** Full PR workflow with build process, path filtering, and automatic deployment.

**When to use:** Production applications with build steps, monorepo with multiple apps, when you want efficient CI that only runs when relevant files change.

**Setup:** Repository secrets with complete build integration.

### Workflow Configuration

```yaml
name: PR Deployment with Build

on:
  pull_request:
    types: [opened, reopened, labeled, synchronize]
    paths:
      - apps/my-fusion-app/src/**
      - apps/my-fusion-app/package*

concurrency:
  group: pr-my-fusion-app-${{ github.event.pull_request.id }}
  cancel-in-progress: true

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  build-and-deploy:
    name: 🛠️ Build and Deploy PR
    runs-on: ubuntu-latest
    env:
      app-name: my-fusion-app
      work-dir: ./apps/my-fusion-app
    environment: CI
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      # Install dependencies and setup Node.js environment
      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build and Pack Application for PR
        working-directory: ${{ env.work-dir }}
        run: |
          # Build the application
          pnpm run build
          
          # Pack for PR deployment with snapshot version
          npx -y -p @equinor/fusion-framework-cli@latest ffc app pack --snapshot pr

      - name: Publish PR Application
        id: deploy
        uses: equinor/fusion-action-app-publish@v1
        with:
          artifact: ./app-bundle.zip
          prNR: ${{ github.event.number }}
          working-directory: ${{ env.work-dir }}
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}


```

### Required Repository Secrets

```
AZURE_CLIENT_ID=your-azure-client-id
AZURE_TENANT_ID=your-azure-tenant-id
```

### Directory Structure Expected

```
your-repo/
├── apps/
│   └── my-fusion-app/
│       ├── src/
│       ├── package.json
│       ├── package-lock.json (or pnpm-lock.yaml)
│       └── [build output will create app-bundle.zip]
└── .github/workflows/pr-deploy.yml
```

### Benefits
- ✅ **Efficient CI**: Only runs when app-specific files change
- ✅ **Concurrency Control**: Prevents multiple deployments for same PR
- ✅ **Complete Build Integration**: Handles dependencies, build, and pack
- ✅ **Rich Feedback**: Workflow summary + PR comment with links
- ✅ **Production Ready**: Uses latest Fusion Framework CLI
- ✅ **Snapshot Versioning**: PR-specific versioning with `--snapshot pr`
- ✅ **Direct Links**: Provides direct access to deployed app

### Key Features

**Path Filtering:**
```yaml
paths:
  - apps/my-fusion-app/src/**
  - apps/my-fusion-app/package*
```
Only triggers when source code or dependencies change.

**Concurrency Control:**
```yaml
concurrency:
  group: pr-my-fusion-app-${{ github.event.pull_request.id }}
  cancel-in-progress: true
```
Cancels previous runs when new commits are pushed.

**Environment Variables:**
```yaml
env:
  app-name: my-fusion-app
  work-dir: ./apps/my-fusion-app
```
Makes the workflow easy to adapt for different apps.

**Latest CLI Usage:**
```bash
npx -y -p @equinor/fusion-framework-cli@latest ffc app pack --snapshot pr
```
Ensures access to latest features like `--snapshot` flag.

---

## 9. Debugging and Troubleshooting Workflows

**Scenario:** Debugging deployment issues and understanding what's happening.

**When to use:** Development, troubleshooting authentication or deployment issues.

### Workflow Configuration

```yaml
name: Debug Deployment

on:
  workflow_dispatch:
    inputs:
      debug_level:
        description: 'Debug level'
        type: choice
        options: ['basic', 'verbose', 'full']
      dry_run:
        description: 'Dry run (validation only)'
        type: boolean
        default: false

jobs:
  debug-deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v6
      
      - name: Debug Information
        run: |
          echo "🔍 Debug Information"
          echo "Event: ${{ github.event_name }}"
          echo "Ref: ${{ github.ref }}"
          echo "SHA: ${{ github.sha }}"
          echo "Environment: staging"
          echo "Debug Level: ${{ github.event.inputs.debug_level }}"
          echo "Dry Run: ${{ github.event.inputs.dry_run }}"

      - name: Validate Environment Variables
        run: |
          echo "🔧 Environment Variables"
          echo "AZURE_CLIENT_ID exists: ${{ vars.AZURE_CLIENT_ID != '' }}"
          echo "AZURE_TENANT_ID exists: ${{ vars.AZURE_TENANT_ID != '' }}"
          echo "FUSION_ENVIRONMENT: ${{ vars.FUSION_ENVIRONMENT }}"

      - name: Check Artifact
        run: |
          echo "📦 Artifact Information"
          if [[ -f "./app-bundle.zip" ]]; then
            echo "✅ Artifact exists: ./app-bundle.zip"
            echo "Size: $(stat -c%s ./app-bundle.zip 2>/dev/null || stat -f%z ./app-bundle.zip) bytes"
            
            # Check contents
            echo "Contents:"
            unzip -l ./app-bundle.zip | head -20
            
            # Validate required files
            echo "Required files check:"
            unzip -l ./app-bundle.zip | grep -E "(metadata\.json|app-manifest\.json)" || echo "⚠️ Missing required files"
          else
            echo "❌ Artifact not found: ./app-bundle.zip"
            echo "Available files:"
            ls -la .
          fi

      - name: Test Azure Authentication
        if: github.event.inputs.dry_run != 'true'
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          allow-no-subscriptions: true

      - name: Test Token Acquisition
        if: github.event.inputs.dry_run != 'true'
        run: |
          echo "🔑 Testing Token Acquisition"
          RESOURCE_ID="api://fusion.equinor.com/nonprod"
          
          TOKEN=$(az account get-access-token --resource "$RESOURCE_ID" --query accessToken -o tsv)
          if [[ -n "$TOKEN" ]]; then
            echo "✅ Token acquired successfully"
            echo "Token length: ${#TOKEN}"
            echo "Token prefix: ${TOKEN:0:20}..."
          else
            echo "❌ Failed to acquire token"
            exit 1
          fi

      - name: Deploy (or Validate)
        if: github.event.inputs.dry_run != 'true'
        uses: equinor/fusion-action-app-publish@v1
        with:
          azure-client-id: ${{ vars.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          env: ${{ vars.FUSION_ENVIRONMENT }}
          artifact: './app-bundle.zip'
          tag: 'debug-${{ github.run_number }}'

      - name: Dry Run Summary
        if: github.event.inputs.dry_run == 'true'
        run: |
          echo "🏃‍♂️ Dry Run Complete"
          echo "✅ Workflow validation passed"
          echo "✅ Environment variables configured" 
          echo "✅ Artifact structure validated"
          echo "Ready for actual deployment!"
```

### Benefits
- ✅ Comprehensive validation before deployment
- ✅ Artifact structure verification
- ✅ Authentication testing
- ✅ Dry run capability
- ✅ Detailed debug information

---

## 🔧 Setup Instructions

### 1. Azure Service Principal Setup

1. **Create Azure App Registration:**
   ```bash
   az ad app create --display-name "fusion-app-deploy-prod"
   ```

2. **Create Service Principal:**
   ```bash
   az ad sp create --id <app-id>
   ```

3. **Configure OIDC:**
   ```bash
   az ad app federated-credential create \
     --id <app-id> \
     --parameters @credential.json
   ```

   `credential.json`:
   ```json
   {
     "name": "github-actions",
     "issuer": "https://token.actions.githubusercontent.com",
     "subject": "repo:your-org/your-repo:environment:production",
     "description": "GitHub Actions OIDC",
     "audiences": ["api://AzureADTokenExchange"]
   }
   ```

### 2. GitHub Environment Configuration

1. **Go to Repository Settings → Environments**
2. **Create environments:** `staging`, `production`
3. **Configure environment variables and protection rules**

### 3. Required Permissions

**Repository Settings → Actions → General:**
```yaml
permissions:
  id-token: write      # For OIDC authentication
  contents: read       # For code checkout
  pull-requests: write # For PR comments (optional)
```

---

## 📊 Decision Matrix

| Need | Use Case | Authentication | Environment Setup | Complexity |
|------|----------|---------------|------------------|------------|
| **Quick Start** | [Basic Production](#1-basic-production-deployment) | Repository Secrets | Simple | 🟢 |
| **Professional Workflow** | [Multi-Environment](#2-multi-environment-with-github-environments) | Environment Variables | Medium | 🟡 |
| **Code Review Process** | [PR Previews](#3-pull-request-previews) | Repository Secrets | Simple | 🟢 |
| **Full Control** | [Manual Token](#4-manual-token-acquisition) | Manual `az` | Advanced | 🔴 |
| **Enterprise Grade** | [Multi-Pipeline](#5-enterprise-multi-environment-pipeline) | Environment Variables | Complex | 🔴 |
| **Multiple Apps** | [Monorepo](#6-monorepo-applications) | Mixed | Complex | 🔴 |
| **Custom Requirements** | [Custom Config](#7-custom-configuration-deployments) | Environment Variables | Medium | 🟡 |
| **Production PR Workflow** | [Complete PR Build](#8-complete-pr-workflow-with-build-integration) | Repository Secrets | Medium | 🟡 |
| **Debugging Issues** | [Debug Workflow](#9-debugging-and-troubleshooting-workflows) | Any | Any | 🟡 |

---

## 🚀 Quick Start Recommendations

1. **New Project:** Start with [Basic Production Deployment](#1-basic-production-deployment)
2. **Growing Team:** Upgrade to [Multi-Environment](#2-multi-environment-with-github-environments)  
3. **Professional Workflow:** Add [PR Previews](#3-pull-request-previews) or [Complete PR Workflow](#8-complete-pr-workflow-with-build-integration)
4. **Enterprise Scale:** Implement [Multi-Pipeline](#5-enterprise-multi-environment-pipeline)

Choose the use case that matches your current needs and complexity tolerance. You can always start simple and evolve your deployment strategy over time.