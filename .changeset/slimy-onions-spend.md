---
"fusion-action-app-publish": minor
---

fixing: standardize GitHub Action output names to kebab-case and enhance Azure Resource ID detection

- **BREAKING**: Standardized GitHub Action output names to use kebab-case for consistency
  - Old camelCase output names (`isToken`, `isServicePrincipal`) are no longer available
  - New kebab-case names: `is-token`, `is-service-principal`
  - Added `auth-type` output for string-based authentication type checking
- Enhanced Azure Resource ID detection with improved validation and logging
- Updated action.yml to use kebab-case output references consistently

### Note

The new outputs provide both boolean (`is-token`, `is-service-principal`) and string (`auth-type`) formats for authentication type checking. Choose the format that best fits your workflow needs.