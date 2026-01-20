# Contributing to Fusion Action App Publish

We welcome contributions to the Fusion Action App Publish! This guide will help you get started.

## 📋 Prerequisites

- Node.js 24 or higher
- pnpm (package manager)
- Git
- Basic knowledge of GitHub Actions
- TypeScript familiarity

## 🚀 Getting Started

1. **Fork the repository**
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/fusion-action-app-publish.git
   cd fusion-action-app-publish
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run tests**
   ```bash
   pnpm test
   ```

## 🧪 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit files in the `src/` directory (TypeScript source code)
   - Update tests in corresponding `.test.ts` files
   - Update documentation in `docs/` as needed

3. **Test your changes**
   ```bash
   # Run tests
   pnpm test
   
   # Run tests in watch mode
   pnpm run test:watch
   
   # Run tests with coverage
   pnpm run test:coverage
   
   # Run tests locally (without GitHub env)
   pnpm run test:local
   
   # Lint and format code
   pnpm run lint
   
   # Fix lint issues
   pnpm run lint:fix
   
   # Format code
   pnpm run format
   
   # Build the action
   pnpm run build
   ```

4. **Add a changeset (for release)**
   ```bash
   # If your changes should be included in the next release
   pnpm changeset
   
   # Follow the prompts to describe your changes
   # This creates a file in .changeset/ that describes your changes
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use a descriptive title
   - Explain what your PR does
   - Reference any related issues
   - Include the changeset file if this should trigger a release

## 📁 Project Structure

```
fusion-action-app-publish/
├── src/
│   ├── index.ts              # Barrel export of core modules
│   ├── core/                 # Core functionality
│   │   ├── post-publish-metadata.ts
│   │   ├── validate-artifact.ts
│   │   ├── validate-env.ts
│   │   └── validate-is-token-or-azure.ts
│   ├── types/                # TypeScript type definitions
│   │   └── metadata.ts
│   └── tests/                # Test files
│       ├── README.md
│       ├── setup.js
│       ├── infrastructure.test.ts
│       ├── post-publish-metadata.test.ts
│       ├── validate-artifact.test.ts
│       ├── validate-env.test.ts
│       └── validate-is-token-or-azure.test.ts
├── dist/                     # Compiled CJS outputs (committed)
│   ├── post-publish-metadata.cjs
│   ├── validate-artifact.cjs
│   ├── validate-env.cjs
│   └── validate-is-token-or-azure.cjs
├── examples/                 # Example workflow configurations
├── scripts/                  # Compiled JS scripts (legacy)
├── .github/
│   └── workflows/
│       ├── ci.yml           # Release and version workflow
│       ├── test.yml         # Test workflow
│       └── actions/         # Composite actions
├── action.yml                # GitHub Action composite definition
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── biome.json                # Biome (linter/formatter) config
├── vite.config.ts            # Vite build configuration
├── vitest.config.ts          # Vitest test configuration
└── README.md                 # Main documentation
```

## 🧪 Testing

### TypeScript and Building

The action is written in TypeScript and must be compiled before use:

```bash
# Build the action (compiles to dist/*.cjs)
pnpm run build

# Build in watch mode for development
pnpm run dev
```

The `dist/*.cjs` files are the actual entry points used by the GitHub Action composite steps and must be committed when making changes.

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run tests in CI mode (single run with coverage)
pnpm run test:ci

# Run tests locally (without GitHub Actions environment)
pnpm run test:local
```

The test suite uses Vitest and includes:
- Unit tests for validation and metadata modules in `src/tests/`
- Mocking for GitHub Actions core, octokit, and file system
- Coverage reporting (excluded from git)
- Local test support via `ALLOW_LOCAL_TESTS` environment variable

All tests should pass before submitting a PR.

### Integration Testing

Test the action in a real repository:

1. Build the action locally: `pnpm run build`
2. Create a test workflow in `.github/workflows/`
3. Use the action (reference your local version or branch)
4. Test different scenarios:
   - Valid/invalid artifact paths
   - Different environments (ci, tr, fprd, fqa, next)
   - Token vs Azure OIDC authentication
   - PR number and tag handling
   - Metadata extraction and PR commenting

You can use the examples in `examples/` directory as test cases:
- `basic-token.yml` - Token-based authentication
- `azure-oidc.yml` - Azure OIDC authentication
- `multi-environment.yml` - Multiple environment deployments
- `pr-preview.yml` - PR preview deployments

## 📝 Coding Standards

### Code Style
This project uses **Biome** for both linting and formatting:

```bash
# Check for linting and formatting issues
pnpm run lint

# Fix linting and formatting issues
pnpm run lint:fix

# Format only
pnpm run format
```

**Important conventions:**
- TypeScript strict mode is enabled
- Use ES2022 module syntax (`import`/`export`)
- Follow existing code patterns and file organization
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Add inline comments for complex logic
- Prefer async/await over promises
- Use proper TypeScript types (avoid `any`)

### File Organization
- **Core logic**: Place in `src/core/`
- **Types**: Define in `src/types/`
- **Tests**: Place in `src/tests/` as `*.test.ts`
- **Scripts**: Compiled outputs in `scripts/` (legacy) and `dist/` (current)

### Key Architecture Concepts

When contributing to core features, understand these key components:

1. **Artifact Validation** (`validate-artifact.ts`): Validates artifact file existence and format (zip)
2. **Environment Validation** (`validate-env.ts`): Validates deployment environments and tag generation
3. **Authentication Validation** (`validate-is-token-or-azure.ts`): Validates Fusion token or Azure OIDC credentials
4. **Post-Publish Metadata** (`post-publish-metadata.ts`): Extracts metadata and posts PR comments with app URLs

The action is built as a GitHub Actions composite action that orchestrates multiple validation steps before publishing Fusion apps.

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Examples:
```
feat: add support for multiple app directories
fix: handle missing package.json files gracefully
docs: update README with new configuration options
test: add tests for edge cases in app detection
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description** of the issue
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Environment details**:
   - Action version (e.g., `v1.0.0`)
   - Node.js version (from runner)
   - Operating system (runner OS)
   - Repository structure (monorepo, single app, etc.)
6. **Action configuration** (relevant inputs from workflow file)
7. **Logs** from the GitHub Action run (with debug logging if possible)

To enable debug logging in GitHub Actions, add a secret `ACTIONS_STEP_DEBUG` with value `true`.

## 💡 Feature Requests

When requesting features:

1. **Describe the problem** you're trying to solve
2. **Explain your proposed solution**
3. **Provide use cases** and examples
4. **Consider backward compatibility**
5. **Think about performance impact** (especially for large monorepos)

## 📚 Documentation

When making changes, update relevant documentation:

- **README.md**: User-facing features, quick start, basic examples
- **examples/**: Example workflow configurations for different scenarios
- **PUBLISHING.md**: Publishing and release process
- **CHANGELOG.md**: Version history and release notes (managed by changesets)
- **src/tests/README.md**: Test documentation and guidelines
- **Code comments**: JSDoc for public APIs, inline comments for complex logic

## 📦 Releasing

### Automated Releases (Recommended)

This project uses [Changesets](https://github.com/changesets/changesets) for automated release management:

1. **Contributors**: Add changeset files when making changes that should be released
   ```bash
   pnpm changeset
   ```

2. **Maintainers**: When ready to release, merge the automatically created "Release" PR
   - Changesets will automatically create a release PR with version bumps
   - Merging this PR will publish the new version and create GitHub releases
   - Git tags (v1.2.3, v1.2, v1) are automatically created for GitHub Actions marketplace

### Manual Releases (Fallback)

If needed, releases can be created manually:

1. **Update version** in package.json
2. **Build the action**: `pnpm run build`
3. **Create and push tag**:
   ```bash
   git tag -a v0.1.0 -m "v0.1.0 - Description of changes"  
   git push --tags
   ```
4. **Create GitHub release** with release notes

### Version Strategy

- **Major** (v1.0.0): Breaking changes
- **Minor** (v0.1.0): New features, backward compatible  
- **Patch** (v0.0.1): Bug fixes, backward compatible

## 🤝 Code of Conduct

Please be respectful and constructive in all interactions. We aim to create a welcoming environment for all contributors.

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/equinor/fusion-action-app-publish/issues)
- **Discussions**: [GitHub Discussions](https://github.com/equinor/fusion-action-app-publish/discussions)
- **Documentation**: 
  - [README.md](README.md) - Quick start and overview
  - [PUBLISHING.md](PUBLISHING.md) - Publishing process

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

---

Thank you for contributing to the Fusion Action App Publish! 🎉