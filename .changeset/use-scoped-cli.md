---
"fusion-action-app-publish": patch
---

Use scoped CLI package in publish step

- Replace `npx fusion-framework-cli` with `npx -y -p @equinor/fusion-framework-cli ffc ...`
- Explicitly invokes the CLI binary (`ffc`) via npx while installing the scoped package
- Fixes 404 error from npm registry when running the publish step
