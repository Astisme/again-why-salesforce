This directory contains the extension settings page exposed through the manifest options UI.

Key files:

- `options.html` defines the settings layout, loads the shared action styles, and mounts the `help-aws`, `review-sponsor-aws`, and `theme-selector-aws` components.
- `options.js` wires the settings controls to extension storage and messaging, requests optional permissions when needed, and keeps the page theme in sync.
- `options.css` contains the page-specific styling layered on top of the shared action styles.

This page is loaded from `options_ui.page` in [`src/manifest/template-manifest.json`](../manifest/template-manifest.json), and the popup also opens it through `openSettingsPage` in [`src/functions.js`](../functions.js).
