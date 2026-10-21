# Architecture Documentation

## Overview

**Fusion Action App Publish** is a GitHub Action that authenticates and publishes Fusion applications using the `@equinor/fusion-framework-cli`. The action provides a complete workflow for:

- Validating application artifacts and deployment parameters
- Authenticating using either direct tokens or Azure Service Principal (OIDC)
- Extracting application metadata from build artifacts
- Generating deployment information and posting to GitHub PRs

## System Architecture

### Existing-version recovery investigation

Investigation for [equinor/fusion-core-tasks#2357](https://github.com/equinor/fusion-core-tasks/issues/2357),
2026-10-20:

- Released action **v2.1.1**, commit
  [`dafe22c3a6b5d6fb66943b2522bf725b2f443000`](https://github.com/equinor/fusion-action-app-publish/blob/dafe22c3a6b5d6fb66943b2522bf725b2f443000/action.yml),
  invokes `@equinor/fusion-framework-cli@latest` in both publish branches.
  An action version does not identify the CLI version used by a historical run.
- Published CLI **15.6.3**, release commit
  [`ebe110a156b38372b738c80b39d058e8d83297bf`](https://github.com/equinor/fusion-framework/tree/ebe110a156b38372b738c80b39d058e8d83297bf/packages/cli),
  uploads the bundle, tags the returned app key/version, then publishes config
  when requested. An upload failure exits before tagging or config publishing.
- CLI 15.6.3 maps **every upload HTTP 409**, including unrelated conflicts and
  responses without a JSON error body, to
  `409 - Version is already published, please generate a new release`.
  That line alone is not a reliable duplicate-version contract.
- Controlled execution of the published upload/tag functions and publish callback
  covered 19 scenarios: successful `latest` and preview tagging, source-bundle
  version propagation, rerun/older-version/preview duplicates, unrelated and
  unstructured conflicts, HTTP 401/403/404/410/500, network failures, discovery
  failures during initialization/upload/tagging, tagging failure, and config
  failure after tagging. Discovery and HTTP were test doubles; no production
  registry, tags, credentials, or consumer workflows were used.
- All duplicate scenarios exited with code 1 before tagging. Unrelated and
  unstructured upload conflicts produced the same duplicate-version summary.
  Successful tagging used the upload result's exact app key/version.
  Config failure still failed publishing even after tagging succeeded.

These checks characterize CLI behavior, not a full GitHub Actions deployment or
the original reported run. The historical job logs were unavailable through the
GitHub API, so its CLI version remains unverified. They do not verify deployed
backend response serialization, real authentication/discovery, or registry state.

**Implementation:** the action exposes `allow-existing-version`, default `false`,
and forwards it to the CLI. Recovery is implemented in the CLI, where the built
bundle, authentication, discovery and config continuation are already available.
The action does not interpret logs or HTTP conflicts to decide whether to recover.

Further source tracing found a structured backend discriminator:
[`CreateAppVersion`](https://github.com/equinor/fusion-core-services/blob/fa025d4e36242f65ec7ba9316887f13dbb100d46/src/Fusion.Services.Apps/Applications/Domain/Commands/CreateAppVersion.cs)
throws `ConflictError` with resource `version`; the
[`controller response`](https://github.com/equinor/fusion-core-services/blob/fa025d4e36242f65ec7ba9316887f13dbb100d46/src/Fusion.Services.Apps/Shared/Controllers/BaseController.cs)
and
[`API error serializer`](https://github.com/equinor/fusion-libraries/blob/2f142938ba0d2902a7db189d97bd5924e7861977/src/Web/Fusion.AspNetCore/Models/Errors/ApiResourceExistsError.cs)
retain `error.code: "ConflictError"` and `error.resourceIdentifier: "version"`.
The CLI implementation gates on these fields, upload HTTP 409 and the exact
duplicate message matching the valid, lowercased version in the uploaded
`app-manifest.json`. This is a source-verified contract, not verification of the
response from a deployed service.

The prerequisite is released in CLI **15.7.0**, commit
[`18afbe03fa6363a3c7d1b77e3aac5392ce780e08`](https://github.com/equinor/fusion-framework/tree/18afbe03fa6363a3c7d1b77e3aac5392ce780e08/packages/cli).
Recovery-enabled publishing selects that exact version; default publishing
retains `latest`. Both action publish branches invoke the shared
[`scripts/publish-app.sh`](../scripts/publish-app.sh) with resolved environment/tag
and unchanged authentication.

Before invoking the CLI, the helper unsets an empty `FUSION_TOKEN`. The composite
action supplies an empty value for Azure-authenticated runs, but the CLI's
environment-backed token option treats its presence as explicit token auth.
Omitting that empty variable preserves ambient Azure authentication from
`azure/login`; non-empty tokens are forwarded unchanged. Both publish branches
and existing-version recovery use the same normalization.

The helper propagates CLI failures using Bash `errexit` and `pipefail`; it never
retries or invokes a separate tag command. Only after exit code zero does it
translate the CLI's final re-tagging confirmation for the resolved target into
an escaped GitHub notice. This pinned log format is used for notification only,
not recovery decisions. Intermediate messages, ordinary successful uploads and
nonzero exits never generate a recovery-success notice. Temporary captured logs
are removed on success and failure. The workflow summary runs only on success.

Successful recovery follows the same metadata and PR-comment conditions as a
successful upload, including artifact-only processing and duplicate-comment
checks. Config-enabled recovery must also complete the requested config
publication. Discovery, authentication, network, validation, unknown conflicts,
missing identity, tagging and config failures remain failures without fallback
targets. This action integration still requires an action release; the issue
must not be treated as delivered to consumers solely because the CLI is released.

The offline [publish orchestration tests](../src/tests/publish-orchestration.test.ts)
execute both action publish entry points and the shared helper with an intercepted
`npx` command. They verify default-off/opt-in CLI selection, resolved arguments,
source/snapshot/config behavior, rollback/preview notices, failure propagation,
log cleanup and reachability of following work. Metadata orchestration tests
cover its existing outputs and PR-comment behavior. These checks do not perform
a live registry deployment or simulate GitHub's step scheduler.

```mermaid
graph TD
    A["GitHub Action Workflow<br/>(action.yml)<br/>Defines inputs & orchestrates steps"]
    B["Input Validation Layer<br/>(src/core/validate-*.ts)"]
    C["Artifact Validation<br/>validateArtifact()"]
    D["Environment Validation<br/>validateEnv()"]
    E["Auth Validation<br/>validateIsTokenOrAzure()"]
    F["Configuration Validation<br/>validateConfigAndManifest()"]
    G["Bundle Processing Layer<br/>(src/core/extract-*.ts)"]
    H["Extract Manifest<br/>loadManifest()"]
    O["fusion-framework-cli<br/>(External tool)<br/>Performs publishing"]
    J["Metadata & Publishing<br/>(src/core/post-publish-metadata.ts)"]
    K["Extract App Metadata<br/>extractAppMetadata()"]
    L["Generate URLs<br/>generateAppUrl()"]
    M["Post PR Comment<br/>postPrComment()"]
    N["Check Meta Comment<br/>checkMetaComment()"]

    A --> B
    B --> C
    B --> D
    C --> G
    G --> H
    H --> F
    F --> E

    %% All validation outputs feed into CLI publishing
    C --> O
    D --> O
    E --> O

    %% After publishing, metadata processing happens
    O --> N
    O --> J
    J --> K
    K --> L
    L --> M
```

## Module Structure

### `/src/index.ts`
**Main Entry Point**

Exports the public API of the library. All validation and publishing functions are re-exported here for clean module access.

```typescript
export { checkMetaComment };
export { loadManifest };
export { loadMetadata };
export { extractAppMetadata, generateAppUrl, postPrComment, postPublishMetadata };
export { validateArtifact };
export { validateConfigAndManifest };
export { validateEnv };
export { validateIsTokenOrAzure };
export * from "./types";
```

### `/src/core/` - Core Business Logic

#### `validate-artifact.ts`
**Artifact Validation**

- If artifact is not provided, skips validation and sets `artifact-provided` to `false` (source-based publish)
- If artifact is provided, checks file exists on filesystem
- Ensures file is `.zip` format
- Sets `artifact-path` and `artifact-provided` outputs for downstream steps

**Key Functions:**
- `validateArtifact()`: Main validation function

**GitHub Action Integration:**
- Reads input: `artifact`
- Sets outputs: `artifact-path`, `artifact-provided`

---

#### `validate-env.ts`
**Environment & Deployment Target Validation**

Handles deployment environment configuration with special logic for PR preview deployments:

- **Standard Deployments**: Validates `env` input (ci, tr, fprd, fqa, next) and requires `tag`
- **PR Previews**: When `prNR` provided, sets environment to `ci` with tag `pr-{number}`

This enables automatic preview deployments on pull requests without duplicating production environment settings.

**Key Functions:**
- `validateEnv()`: Validates environment inputs

**GitHub Action Integration:**
- Reads inputs: `env`, `prNR`, `tag`
- Sets outputs: `env`, `tag`

**Example PR Flow:**
```
User input: prNR=42
↓
validateEnv()
↓
Output: env='ci', tag='pr-42'
↓
Creates deployment: https://fusion.ci.fusion-dev.net/apps/{appKey}?$tag[{appKey}]=pr-42
```

---

#### `validate-is-token-or-azure.ts`
**Authentication Validation & Detection**

Supports two authentication methods with automatic detection:

1. **Direct Token Authentication**
   - User provides pre-acquired Fusion API token
   - Format: `BEARER {token}`
   - Use when you already have valid Fusion credentials

2. **Azure Service Principal (OIDC)**
   - Uses GitHub's OIDC for secure credential exchange
   - Requires: `azure-client-id`, `azure-tenant-id`, `azure-resource-id`
   - More secure for cloud environments

**Detection Priority** (when both provided):
- Service Principal takes precedence when all credentials available
- Falls back to token if only token provided

**Key Functions:**
- `validateFusionToken()`: Validates token format (BEARER prefix + valid chars)
- `detectAndValidateAuthType()`: Detects auth type and validates credentials
- `validateIsTokenOrAzure()`: Main orchestration function

**GitHub Action Integration:**
- Reads inputs: `fusion-token`, `azure-client-id`, `azure-tenant-id`, `azure-resource-id`
- Sets outputs: `auth-type`, `is-token`, `is-service-principal`
- **Auto-detects Azure Resource ID** when not provided based on environment (non-prod vs prod)

---

#### `post-publish-metadata.ts`
**Metadata Extraction & Deployment Info**

Extracts application information from the artifact and posts deployment details.

**Key Functions:**

- **`extractAppMetadata(artifactPath: string)`**
  - Executes `unzip -p {artifact} "*/metadata.json"`
  - Reads metadata without temporary file extraction (more secure)
  - Maps `name` field to `key` for URL generation
  - Parses and validates JSON structure

- **`generateAppUrl(meta, env, tag)`**
  - Creates environment-specific URLs
  - Adds tag as query parameter for non-latest deployments
  - Environment mapping:
    - `ci` → `https://fusion.ci.fusion-dev.net`
    - `fqa` → `https://fusion.fqa.fusion-dev.net`
    - `fprd` → `https://fusion.equinor.com` (production)
    - `tr` → `https://fusion.tr.fusion-dev.net`
    - `next` → `https://fusion.next.fusion-dev.net`

- **`postPrComment(meta, tag, appUrl)`**
  - Posts formatted Markdown comment to PR with:
    - Application name and deployed tag
    - Direct link to deployed application
    - Deployment metadata for tracking
  - Includes meta-comment identifier for deduplication checks
  - Silently skips if not in PR context

- **`postPublishMetadata()`**
  - Main orchestration function
  - Reads inputs: `artifact`, `env`, `tag`, `working-directory`
  - Sets multiple outputs for downstream steps:
    - `app-name`: Application name
    - `app-version`: Version from metadata
    - `app-url`: Generated application URL
    - `portal-url`: Fusion portal URL for app management
    - `target-env`: Resolved target environment
    - `publish-info`: Formatted summary for notifications

**GitHub Action Integration:**
- Reads inputs: `artifact`, `env`, `tag`, `working-directory`
- Sets outputs: `app-name`, `app-version`, `app-url`, `portal-url`, `target-env`, `publish-info`

---

#### `check-meta-comment.ts`
**PR Comment Deduplication**

Prevents duplicate PR comments when action runs multiple times:

- Queries GitHub API for existing comments on PR
- Searches for meta-comment identifier: `<!-- fusion-app-publish-meta -->`
- Returns early if comment already exists
- Enables conditional PR commenting in workflows

**Key Functions:**
- `checkMetaComment()`: Checks for existing meta comment

**GitHub Action Integration:**
- Reads environment: `GITHUB_TOKEN`, workflow context
- Reads inputs: `tag` (for PR number fallback)
- Sets output: `exists` ('true' or 'false')

---

#### `extract-manifest.ts`
**Application Manifest Extraction**

Extracts and loads the `app-manifest.json` file from Fusion application bundles. The manifest contains essential deployment configuration including the `appKey` used for identifying and configuring the application in the Fusion platform.

**Key Functions:**
- `loadManifest(bundle: AdmZip): Promise<Manifest>`
  - Reads `app-manifest.json` from zip bundle using AdmZip
  - Parses JSON and validates structure
  - Returns manifest object with `appKey` and other configuration
  - Throws error if manifest file is missing or malformed

**Integration Notes:**
- **Now Exported**: Available as public API from main index.ts
- Used by publishing pipeline for deployment configuration
- Performant: Direct zip reading without temporary file extraction
- Essential for proper Fusion app registration and routing
- **Library Usage**: `import { loadManifest } from '@equinor/fusion-action-app-publish'`

**Bundle Structure Requirements:**
```
app-bundle.zip
├── app-manifest.json     # Required: App configuration
├── metadata.json         # Required: App metadata
└── ...                  # Other app files
```

**Manifest Type Definition:**
```typescript
type Manifest = {
  appKey: string;           // Required: Unique app identifier
} & Record<string, unknown>; // Additional configuration properties
```

---

#### `extract-metadata.ts`
**Application Metadata Extraction**

Extracts application metadata (name, version, appKey) from the `metadata.json` file within Fusion application bundles. This metadata is used for deployment tracking, URL generation, and PR comment information.

**Key Functions:**
- `loadMetadata(bundle: AdmZip): Promise<BundleMetadata>`
  - Reads `metadata.json` from zip bundle using AdmZip
  - Parses JSON and extracts name, version fields
  - Maps name to appKey for URL generation
  - Throws error if metadata file missing or lacks required fields

**Integration Notes:**
- **Now Exported**: Available as public API from main index.ts
- Core dependency for `extractAppMetadata()` in post-publish-metadata.ts
- Used for generating deployment URLs and tracking information
- Direct zip access prevents temporary file creation
- **Library Usage**: `import { loadMetadata } from '@equinor/fusion-action-app-publish'`

**Metadata Type Definition:**
```typescript
type BundleMetadata = {
  appKey: string;   // Mapped from name field
  name: string;     // Required: Application name
  version: string;  // Required: Semantic version
};
```

**Expected metadata.json Structure:**
```json
{
  "name": "my-fusion-app",
  "version": "1.2.3",
  "description": "App description (optional)"
}
```

---

#### `validate-config-and-manifest.ts`
**Local Configuration File Validation**

Validates the existence and structure of local configuration files, including both the application manifest and optional fusion app config files. This function ensures all required configuration files are present and contain valid JSON before deployment.

**Key Functions:**
- `validateConfigAndManifest(): Promise<void>`
  - Validates `./app.manifest.json` exists and contains valid JSON
  - Validates optional config file (from `INPUT_CONFIG` environment variable) if provided
  - Logs validation success messages using `core.info()`
  - Throws descriptive errors if files missing or JSON invalid

**Validation Flow:**
1. **Manifest Validation**
   - Checks `./app.manifest.json` exists in current working directory
   - Validates JSON parsing without syntax errors
   - Logs success message for valid files

2. **Config File Validation** (optional)
   - Checks config file path from `config` input parameter
   - Validates file exists and contains parseable JSON
   - Skips validation if no config file specified

**Integration Notes:**
- **Now Exported**: Available as public API from main index.ts
- Runs early in deployment pipeline before bundle processing
- Provides fast-fail validation for malformed configuration files
- Uses GitHub Actions core logging for user feedback
- **Library Usage**: `import { validateConfigAndManifest } from '@equinor/fusion-action-app-publish'`

**Environment Dependencies:**
- `INPUT_CONFIG`: Path to optional config file (from action inputs)
- `process.cwd()`: Current working directory for manifest file lookup

**Error Handling:**
```typescript
// Manifest file missing
throw new Error(`Manifest file not found: ${path.join(cwd, manifestFile)}`);

// Invalid JSON syntax
throw new Error(`Manifest file is not valid JSON: ${error.message}`);

// Config file missing (when specified)
throw new Error(`Config file not found: ${configPath}`);
```

---

### `/src/types/` - Type Definitions

#### `auth.ts`
```typescript
type AuthType = "token" | "service-principal";

interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

interface AuthDetectionResult {
  authType: AuthType | null;
  isValid: boolean;
  error: string | null;
}

interface Credentials {
  fusionToken: string;
  azureClientId: string;
  azureTenantId: string;
  azureResourceId: string;
}
```

#### `fusion-app.ts`
Type definitions for Fusion applications and package metadata:
```typescript
interface FusionApp {
  name: string;
  path: string;
  version?: string;
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}
```

#### `metadata.ts`
```typescript
interface AppMetadata {
  name: string;              // Required: app name (mapped to key)
  version?: string;          // Optional: semantic version
  description?: string;      // Optional: human-readable description
  key: string;               // Unique identifier (set during extraction)
  entry?: {
    path?: string;           // Main entry file path
  };
  [key: string]: unknown;    // Allow additional properties
}

interface ExecResult {
  stdout: string;            // Command stdout
  stderr: string;            // Command stderr
}
```

---

## Complete End-to-End Flow

### Full Deployment Sequence Diagram
```mermaid
sequenceDiagram
    participant User as Developer
    participant GH as GitHub Actions
    participant Val as Validation Layer
    participant Auth as Auth Handler
    participant Azure as Azure OIDC
    participant Ext as Bundle Extractor
    participant CLI as fusion-framework-cli
    participant Fusion as Fusion Platform
    participant PR as GitHub PR

    User->>GH: Push code / Create PR
    GH->>Val: validateArtifact()
    Val-->>GH: artifact-path set

    GH->>Val: validateEnv()
    Val->>Val: Check prNR vs env/tag
    Val-->>GH: env, tag resolved

    GH->>Auth: validateIsTokenOrAzure()
    Auth->>Auth: Detect auth method

    alt Token Authentication
        Auth->>Auth: validateFusionToken()
        Auth-->>GH: token validated
    else Azure Service Principal
        Auth-->>GH: SP credentials validated
        GH->>Azure: Request OIDC token
        Azure-->>GH: Access token
    end

    GH->>Ext: Extract manifest to app.manifest.json
    GH->>Val: validateConfigAndManifest()
    Val-->>GH: Config files validated

    GH->>CLI: Publish with credentials
    CLI->>Fusion: Deploy application
    Fusion-->>CLI: Deployment success
    CLI-->>GH: Publish complete

    GH->>GH: checkMetaComment()

    alt No existing comment
        GH->>Ext: extractAppMetadata()
        Ext-->>GH: App name, version, key
        GH->>GH: generateAppUrl()
        GH->>PR: postPrComment()
        PR-->>GH: Comment posted
    else Comment exists
        GH->>GH: Skip posting
    end

    GH-->>User: Deployment complete with outputs
```

## Data Flow

### Validation Phase
```mermaid
graph LR
    I1["artifact<br/>file path"]
    I2["env +<br/>prNR + tag"]
    I3["auth<br/>credentials"]

    V1["validateArtifact()"]
    V2["validateEnv()"]
    V3["validateIsTokenOrAzure()"]

    O1["artifact-path"]
    O2["env, tag"]
    O3["auth-type"]

    I1 --> V1 --> O1
    I2 --> V2 --> O2
    I3 --> V3 --> O3
```

### Metadata & Publishing Phase
```mermaid
graph TD
    A["artifact-path"]
    B["extractAppMetadata()"]
    C["App metadata"]
    D["generateAppUrl()"]
    E["App URL + Portal URL"]
    F["postPrComment()"]
    G["GitHub PR Comment"]

    A --> B --> C
    C --> D --> E
    E --> F --> G
```

### Token Authentication Flow
```mermaid
sequenceDiagram
    participant User
    participant Action as GitHub Action
    participant Validator as validateFusionToken
    participant CLI as fusion-framework-cli

    User->>Action: fusion-token=BEARER xxx
    Action->>Validator: Validate token format
    Validator->>Validator: Check BEARER prefix
    Validator->>Validator: Validate characters
    Validator->>Action: Return valid result
    Action->>CLI: Pass token to CLI
    CLI->>CLI: Publish application
```

### Azure Service Principal (OIDC) Flow
```mermaid
sequenceDiagram
    participant User
    participant Action as GitHub Action
    participant Validator as detectAndValidateAuthType
    participant Azure as Azure OIDC
    participant CLI as fusion-framework-cli

    User->>Action: azure-client-id, tenant-id, resource-id
    Action->>Validator: Validate all fields present
    Validator->>Validator: Check non-empty strings
    Validator->>Action: Return valid result
    Action->>Azure: Request token (OIDC)
    Azure->>Action: Return access token
    Action->>CLI: Pass credentials to CLI
    CLI->>CLI: Publish application
```

### Standard Production Deployment
```mermaid
graph TD
    A["User Input<br/>env='fprd'<br/>tag='v1.0.0'"]
    B["generateAppUrl()"]
    C["https://fusion.equinor.com<br/>/apps/{appKey}?$tag[{appKey}]=v1.0.0"]
    D["postPrComment()"]
    E["Deploy to Production"]

    A --> B --> C
    C --> D --> E
```

### PR Preview Deployment
```mermaid
graph TD
    A["User Input<br/>prNR='42'"]
    B["validateEnv()"]
    C["Converted to:<br/>env='ci'<br/>tag='pr-42'"]
    D["generateAppUrl()"]
    E["https://fusion.ci.fusion-dev.net<br/>/apps/{appKey}?$tag[{appKey}]=pr-42"]
    F["postPrComment()"]
    G["Post to PR #42"]

    A --> B --> C
    C --> D --> E
    E --> F --> G
```

---

## PR Deployment Flow

### Standard Deployment (Production)
```
User: env='fprd', tag='v1.0.0'
  ↓
Environment: https://fusion.equinor.com/apps/{appKey}?$tag[{appKey}]=v1.0.0
PR Comment: Posts link to deployed app
```

### PR Preview Deployment
```
User: prNR='42' (pull request #42)
  ↓
validateEnv() converts to: env='ci', tag='pr-42'
  ↓
Environment: https://fusion.ci.fusion-dev.net/apps/{appKey}?$tag[{appKey}]=pr-42
PR Comment: Posts link to preview deployment
  ↓
Automatic comment posted to PR #42
```

---

## Error Handling

Each module follows a consistent error handling pattern:

1. **Validation Functions**: Use `core.setFailed()` and return early
2. **Async Functions**: Wrap in try-catch and use `core.setFailed()` on errors
3. **Non-blocking Operations**: Use `core.warning()` and continue (e.g., PR comments)

This ensures:
- Action fails fast on critical validation errors
- Warnings don't block deployment but are visible in logs
- GitHub Action output captures all error details

---

## Build & Distribution Architecture

### Build Configuration (vite.config.ts)

The project uses **Vite** for building individual executable modules rather than a single bundle. This approach enables the GitHub Action to execute specific functionality as separate Node.js scripts.

**Build Strategy:**
```typescript
// Each core module becomes a standalone executable
entry: {
  "check-meta-comment": "src/core/check-meta-comment.ts",
  "validate-artifact": "src/core/validate-artifact.ts",
  "validate-env": "src/core/validate-env.ts",
  // ... etc
}
```

**Key Build Features:**
- **Individual Entry Points**: Each validation/processing step is a separate executable
- **ES Module Format**: Modern JavaScript modules for Node.js 24+
- **Node.js Platform**: Vite 8's Rolldown bundler explicitly targets `node`, enabling its `createRequire` shim for bundled CommonJS dependencies that load Node.js built-ins. The default browser platform cannot execute those `require` calls in ES modules.
- **External Node.js Built-ins**: Reduces bundle size by excluding Node.js modules
- **Stable Filenames**: No content hashing for predictable GitHub Action execution
- **Source Maps**: Enabled for debugging in production
- **No Minification**: Preserves readable stack traces

**Distribution Structure:**

The [built-action tests](../src/tests/built-action.test.ts) build into an isolated
temporary directory and load every entry point in a separate Node.js process
without installed runtime dependencies. They also execute artifact validation
(provided, omitted and missing artifacts) and ZIP manifest extraction, catching
bundling failures that mocked source-level tests cannot detect.

```
dist/
├── check-meta-comment.js
├── validate-artifact.js
├── validate-env.js
├── validate-is-token-or-azure.js
├── validate-config-and-manifest.js
├── post-publish-metadata.js
├── extract-manifest.js
└── extract-metadata.js
```

**GitHub Action Integration:**
```yaml
# Each step executes a specific built module
- name: Validate Environment
  run: node ${{ github.action_path }}/dist/validate-env.js
```

**Benefits:**
- **Faster Execution**: Only loads required functionality per step
- **Better Error Isolation**: Failures are contained to specific steps
- **Parallel Execution**: Multiple validation steps can run simultaneously
- **Clear Separation**: Each step has single responsibility

---

## Testing Architecture

The project maintains **100% test coverage** with a comprehensive testing strategy built on **Vitest**.

### Testing Framework Configuration

**Test Environment Setup** (vitest.config.ts):
```typescript
// CI-First Testing: Prevents accidental local runs
const allowLocal = process.env.ALLOW_LOCAL_TESTS === "true" || process.env.CI === "true";

// Node.js environment with V8 coverage
environment: "node",
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html", "lcov"]
}
```

### Testing Patterns & Strategies

#### 1. **Unit Testing Pattern**
```typescript
// Example: validate-env.test.ts
describe("validate-env.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset all mocks between tests
  });

  // GitHub Actions core module mocking
  vi.mock("@actions/core");

  // Input/output validation testing
  it("should set tag and env outputs when prNR is provided", () => {
    vi.mocked(core.getInput).mockImplementation((input: string) => {
      // Mock specific GitHub Action inputs
    });

    validateEnv();

    // Verify correct outputs set
    expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("tag", "pr-123");
  });
});
```

#### 2. **Integration Testing Pattern**
```typescript
// Example: post-publish-metadata.orchestration.test.ts

// Hoisted state management for complex mocks
const zipState = vi.hoisted(() => ({
  metadata: null,
  shouldThrowOnInit: false,
  // ... complex state management
}));

// Module-level mocking with state
vi.mock("adm-zip", () => {
  class AdmZipMock {
    constructor(filepath: string) {
      if (zipState.shouldThrowOnInit) {
        throw new Error("ADM-ZIP: Invalid filename");
      }
    }
  }
  return { default: AdmZipMock };
});
```

#### 3. **Mock Strategy Architecture**

**GitHub Actions Core Mocking:**
- **Complete API Surface**: Mock all `@actions/core` methods (getInput, setOutput, setFailed)
- **Behavior Verification**: Test both success and failure paths
- **Output Validation**: Verify correct GitHub Action outputs are set

**File System Mocking:**
- **ZIP Processing**: Mock `adm-zip` for bundle extraction testing
- **File Existence**: Mock `fs.existsSync` for configuration validation
- **State-Based Testing**: Use hoisted state to simulate different file conditions

**External Service Mocking:**
- **GitHub API**: Mock `@actions/github` for PR comment functionality
- **Process Execution**: Mock child_process for CLI interactions

#### 4. **Error Handling Test Patterns**

**Validation Error Testing:**
```typescript
it("should fail for invalid environment value", () => {
  // Setup invalid input
  vi.mocked(core.getInput).mockReturnValue("invalid-env");

  validateEnv();

  // Verify proper error handling
  expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith(
    "Input 'env' must be one of the following values: ci, tr, fprd, fqa, next."
  );
});
```

**Exception Handling Testing:**
```typescript
it("should handle zip extraction errors gracefully", async () => {
  zipState.shouldThrowOnGetData = true;

  await expect(extractAppMetadata("/tmp/app.zip"))
    .rejects.toThrow("Failed to read metadata.json");
});
```

### Test Organization Structure

```
src/tests/
├── setup.ts                           # Global test configuration
├── validate-artifact.test.ts           # Unit tests for validation
├── validate-env.test.ts               # Environment validation tests
├── validate-is-token-or-azure.test.ts # Authentication tests
├── post-publish-metadata.test.ts      # Metadata extraction tests
├── post-publish-metadata.orchestration.test.ts # Integration tests
├── check-meta-comment.test.ts         # PR comment tests
└── infrastructure.test.ts             # Infrastructure/utility tests
```

### Coverage Strategy

- **100% Line Coverage**: Every line of production code is tested
- **Branch Coverage**: All conditional paths are verified
- **Error Path Testing**: All error conditions have dedicated tests
- **Integration Testing**: Cross-module interactions are validated
- **Mock Isolation**: Each test runs in isolation with fresh mocks

### CI/Local Testing Guard

**Purpose**: Prevent accidental local test runs that might interact with real GitHub APIs
```typescript
// Requires explicit opt-in for local development
if (!allowLocal && !process.env.GITHUB_ACTIONS) {
  console.error("❌ Tests are guarded for CI. Set ALLOW_LOCAL_TESTS=true to run locally.");
  process.exit(1);
}
```

### Test Utilities & Setup

**Global Console Mocking** (setup.ts):
```typescript
// Prevent console spam during tests while maintaining test tracking
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};
```

This testing architecture ensures:
- **Reliability**: Tests accurately reflect production behavior
- **Maintainability**: Clear patterns for adding new tests
- **Performance**: Fast test execution with efficient mocking
- **Confidence**: Comprehensive coverage of all code paths and error conditions

---

## Performance Considerations

### Metadata Extraction
- Uses `unzip -p` to read metadata directly from archive
- Avoids temporary file extraction (faster, more secure)
- Single process execution for efficiency

### API Calls
- Minimal GitHub API calls (only for PR comments and deduplication)
- Early return if not in PR context (GITHUB_TOKEN not available)

### Parallelization
- Validation steps can run in parallel in workflows
- Metadata extraction depends on artifact validation

---

## Security Considerations

1. **Token Handling**
   - Tokens marked as GitHub secrets (redacted in logs)
   - Not written to filesystem
   - Only passed to CLI via environment/args

2. **Azure Credentials**
   - Uses OIDC (no static secrets in repository)
   - Credentials fetched fresh for each deployment
   - Token lifespan limited by GitHub Actions

3. **Artifact Processing**
   - No temp file extraction (zip read streamed)
   - File path validated and resolved safely
   - Extension check prevents file type confusion

4. **PR Comments**
   - Only posts to authorized PR context
   - Uses meta-comment identifier to prevent duplication
   - Comments include timestamp for tracking

---

## Extension Points

### Adding New Environments
Update `validateEnv.ts` and `generateAppUrl()`:
```typescript
const envUrls: Record<string, string> = {
  // ... existing environments
  "my-env": "https://fusion.my-env.net",
};
```

### Adding New Metadata Fields
Extend `AppMetadata` interface in `metadata.ts`:
```typescript
interface AppMetadata {
  // ... existing fields
  customField?: string;
}
```

### Adding New Authentication Methods
Create new validation function and extend `AuthType`:
```typescript
export type AuthType = "token" | "service-principal" | "oauth";
```

---

## Dependencies

### Runtime
- `@actions/core`: GitHub Actions toolkit
- `@actions/github`: GitHub API access
- Node.js built-ins: `child_process`, `fs`, `path`, `util`

### Development
- `vitest`: Test runner
- `@vitest/coverage-v8`: Code coverage
- `biome`: Linter and formatter
- `typescript`: Type checking

---

## Related Documentation

- [README.md](README.md) - Usage guide and examples
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guide
- [PUBLISHING.md](PUBLISHING.md) - Release process
- [action.yml](action.yml) - GitHub Action interface definition
