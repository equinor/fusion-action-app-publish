---
"fusion-action-app-publish": patch
---

Validate that 'prNR' and 'env' inputs are not used together in the GitHub Action. If both are provided, the action will fail with an appropriate error message. And update the description of the 'prNR' input in the action.yml file to clarify its usage.