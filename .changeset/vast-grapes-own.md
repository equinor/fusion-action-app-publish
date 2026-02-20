---
"fusion-action-app-publish": patch
---

Simplify Azure Service Principal authentication by making `azure-resource-id` optional. The action now automatically detects the appropriate Azure Resource ID based on the target environment, reducing required inputs from 3 to 2 Azure credentials (`azure-client-id` and `azure-tenant-id`).
