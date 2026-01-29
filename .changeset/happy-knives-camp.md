---
"fusion-action-app-publish": patch
---

 add manifest and metadata extraction utilities

- Implemented `loadManifest` function to read and parse `app.manifest.json` from a zip bundle.
- Implemented `loadMetadata` function to read and parse `metadata.json` from a zip bundle.
- Added corresponding TypeScript definitions for manifest and metadata structures.
- Included source maps for both extraction utilities for better debugging.