---
"fusion-action-app-publish": patch
---

Improve workflow summary to always run and be environment-aware

- Change workflow summary condition from `if: steps.check-meta.outputs.exists == 'false'` to `if: always()` to provide feedback on every run
- Remove `needs: metadata` dependency and add conditional logic to handle cases when metadata is unavailable  
- Make summary environment-aware by using actual target environment instead of hardcoded "CI environment"
- Add conditional app URL display that only shows when metadata step has run and app-url is available
- Ensure workflow summary works for all deployment contexts (PR and non-PR deployments)
