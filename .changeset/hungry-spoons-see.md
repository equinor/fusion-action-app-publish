---
"fusion-action-app-publish": minor
---

## Automatic Azure Resource ID Detection

Added automatic detection of Azure Resource ID based on deployment environment, eliminating the need for manual configuration in most scenarios.

### What's New

- **Environment-Based Detection**: The action now automatically selects the appropriate Azure Resource ID:
  - Non-production environments (`ci`, `fqa`, `tr`, `next`) → `api://fusion.equinor.com/nonprod`
  - Production environment (`fprd`) → `api://fusion.equinor.com/prod`
  - Unrecognized environments default to non-production with a warning

- **User Override Support**: Still allows manual Azure Resource ID specification when needed, with automatic cleanup of `.default` suffixes

- **Improved Integration**: Enhanced action workflow with better validation outputs and secure token handling

### Benefits

- Reduced configuration complexity for standard Fusion environments
- Automatic environment-appropriate resource ID selection
- Maintains flexibility for custom deployment scenarios
- Better error handling and user feedback
