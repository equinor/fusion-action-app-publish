# Test Documentation

This document describes the test suite for the fusion-action-app-publish GitHub Action.

## Test Framework

We use **Vitest** as our testing framework, which provides:
- Fast test runner with native ESM support
- Compatible with Vite build tooling
- Full TypeScript support
- Mocking capabilities for external dependencies
- Code coverage reporting via v8
- Watch mode for development

## Test Structure

### Test Files

All tests are located in `src/tests/`:

- `src/tests/validate-artifact.test.ts` - Artifact validation (zip format)
- `src/tests/validate-env.test.ts` - Environment validation (ci/tr/fprd/fqa/next)
- `src/tests/validate-is-token-or-azure.test.ts` - Token/Azure credential validation
- `src/tests/post-publish-metadata.test.ts` - Metadata extraction and PR commenting
- `src/tests/infrastructure.test.ts` - Infrastructure validation tests
- `src/tests/setup.js` - Global test setup (mocks console methods)

### Configuration Files

- `vitest.config.ts` - Vitest configuration with coverage and setup
- `src/tests/setup.js` - Global test setup

## Running Tests

### Test Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm run test:watch

# Run tests with coverage report
pnpm run test:coverage

# Run tests in CI mode (single run with coverage)
pnpm run test:ci

# Run tests locally (without GitHub Actions environment)
pnpm run test:local
```

## Local Testing

Tests can run locally without requiring GitHub Actions environment by setting `ALLOW_LOCAL_TESTS=true`. The `test:local` script handles this automatically.

```bash
# Test various input validation scenarios
pnpm run test:auto
pnpm run test:token
pnpm run validate-example

# Test individual components
pnpm run test:install-cli
pnpm run test:build
pnpm run test:metadata
pnpm run test:resolve-env
pnpm run test:auth
pnpm run test:publish-dry
pnpm run test:orchestrator
```

## Test Coverage

### validate-artifact.test.js

Tests for `scripts/validate-artifact.js`:

**Input Validation:**
- Missing artifact input
- Undefined/null artifact values

**File Existence:**
- Non-existent files
- Existing files

**File Extension Validation:**
- Supported formats: .zip
- Unsupported formats: .tar, .rar, .txt, .pdf, no extension
- Case insensitive extensions (.ZIP)

**Output Setting:**
- Setting artifact-path output
- Handling relative/absolute paths

### validate-env.test.js

Tests for `scripts/validate-env.js`:

**PR Number Handling:**
- Setting tag output with pr-{number} format
- Setting env output to 'ci'
- Early return behavior (skip other validations)

**Environment Validation:**
- Missing env input
- Invalid environment values
- Valid environments: ci, tr, fprd, fqa, next
- Case sensitivity

**Tag Validation:**
- Missing tag input
- Undefined/null tag values

**Output Setting:**
- Setting env and tag outputs for successful validation

### validate-is-token-or-azure.test.js

Tests for `scripts/validate-is-token-or-azure.js`:

**Credential Requirements:**
- Missing both token and Azure credentials
- Partial Azure credentials

**Azure Credentials:**
- All three Azure credentials provided
- Skipping token validation
- Setting isToken=false

**Token Validation:**
- Token presence validation
- Token format validation (BEARER prefix)
- Alphanumeric character validation
- Case handling

**Priority Logic:**
- Azure credentials take priority over token
- Proper output setting (isToken true/false)

### post-publish-metadata.test.js

Tests for `scripts/post-publish-metadata.js`:

**Metadata Extraction:**
- ZIP file direct reading using `unzip -p` (no temporary files)
- Async metadata extraction with proper error handling
- metadata.json format support (name -> appKey mapping)
- Unsupported file formats (only .zip supported)
- Missing metadata files detection
- JSON parsing validation
- Command execution error handling
- Field mapping and additional metadata preservation

**URL Generation:**
- Environment-specific URLs (ci, fqa, fprd, tr, next)
- Default environment handling
- Latest tag handling
- App key/name resolution

**PR Comments:**
- GitHub token availability
- PR detection (event vs tag-based)
- Comment content formatting
- Error handling

**Main Function:**
- Input processing
- Output setting
- Error handling
- Working directory handling

## Mocking Strategy

### External Dependencies

**@actions/core:**
- Mock all input/output functions
- Mock logging functions
- Mock error reporting

**@actions/github:**
- Mock GitHub API client
- Mock context object
- Mock PR operations

**File System (fs):**
- Mock file existence checks
- Mock file reading/writing
- Mock directory operations

**Child Process (child_process):**
- Mock command execution
- Mock extraction commands

### Test Isolation

Each test:
- Resets all mocks before running
- Cleans up module cache after running
- Uses independent test data
- Doesn't depend on external files

## Best Practices

### Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the scenario
- Test both success and failure cases
- Test edge cases and error conditions

### Assertions

- Use specific assertions (`toHaveBeenCalledWith` vs `toHaveBeenCalled`)
- Verify both positive and negative cases
- Check all relevant outputs and side effects

### Mock Management

- Reset mocks in `beforeEach`
- Use specific mock implementations for each test
- Verify mock calls where relevant

### Error Testing

- Test error conditions explicitly
- Verify error messages and logging
- Test cleanup behavior on errors

## Coverage Goals

The test suite aims for:
- **90%+ statement coverage** - Most code paths executed
- **85%+ branch coverage** - Most conditional logic tested  
- **80%+ function coverage** - All major functions tested
- **85%+ line coverage** - Most lines of code executed

Run `pnpm run test:coverage` to see current coverage metrics.

## Contributing

When adding new scripts or modifying existing ones:

1. Create corresponding test files in `/tests`
2. Follow existing test patterns and structure
3. Ensure good coverage of new functionality
4. Update this documentation if needed
5. Run all tests before submitting changes

## Troubleshooting

### Common Issues

**Module not found errors:**
- Ensure all dependencies are installed: `pnpm install`
- Check that test files import correct paths

**Mock-related errors:**
- Verify mocks are reset in `beforeEach`
- Check mock implementations match expected interfaces

**Timeout errors:**
- Increase Jest timeout for async operations
- Check for unresolved promises in async tests

**Coverage issues:**
- Use `--verbose` flag to see which tests are running
- Check for unreachable code or missing test cases