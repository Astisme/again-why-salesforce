This directory contains the reusable `theme-selector-aws` theme toggle component.

Key files:

- `theme-selector.js` defines the custom element, injects its stylesheet once, tracks the active document theme, and delegates theme switches to `handleSwitchColorTheme`.
- `theme-selector.css` styles the light and dark toggle buttons and their transition states.

The popup and settings entry scripts both import this module before rendering [`src/action/popup/popup.html`](../../action/popup/popup.html) and [`src/settings/options.html`](../../settings/options.html). The component watches `document.documentElement.dataset.theme` and emits a `before-theme-toggle` event so host pages can prepare their own transitions before the shared theme handler runs.
