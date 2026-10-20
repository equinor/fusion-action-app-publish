---
"fusion-action-app-publish": minor
---

Add the default-off `allow-existing-version` input for reruns and redeployment of existing bundle versions. Opted-in publishing uses CLI 15.7.0 to recover only a confirmed duplicate-version upload response, retaining the original app key, version, environment, authentication and tag.

Successful recovery completes requested config publication, emits a notice identifying the existing version that was re-tagged, and continues the normal metadata/PR-comment path. Unrelated conflicts, authentication, discovery, network, validation, tagging and config failures still fail; omitted or false inputs preserve existing publishing behavior.

Addresses the action integration for [equinor/fusion-core-tasks#2357](https://github.com/equinor/fusion-core-tasks/issues/2357). Consumer delivery still requires releasing this action.
