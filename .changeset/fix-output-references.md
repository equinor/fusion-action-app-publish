---
"fusion-action-app-publish": patch
---

Fix broken `app-url` and `portal-url` outputs that were always empty

- Fixed output references in `action.yml` to point to correct step (`steps.metadata.outputs.*` instead of non-existent `steps.publish.outputs.*`)
- Implemented missing `portal-url` output generation that returns the base Fusion portal URL for the environment
- Updated publish-info format to include both application and portal management links

Closes https://github.com/equinor/fusion-action-app-publish/issues/71