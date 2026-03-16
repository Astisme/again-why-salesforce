This directory contains the extension settings page exposed through the manifest `options_ui`.

Key files:

- `options.html` defines the settings layout, loads the shared action styles, registers the `help-aws` and `review-sponsor-aws` components, and mounts `theme-selector-aws`.
- `options.js` wires the controls to extension storage and messaging, requests optional permissions when needed, imports `theme-selector-aws`, and coordinates page theme transitions.
- `options.css` contains the page-specific styling layered on top of the shared action styles.

This page is loaded from `options_ui.page` in [`src/manifest/template-manifest.json`](../manifest/template-manifest.json), and extension flows open it through `openSettingsPage` in [`src/functions.js`](../functions.js).
