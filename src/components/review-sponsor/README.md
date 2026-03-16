This directory contains the reusable `review-sponsor-aws` call-to-action component.

Key files:

- `review-sponsor.js` defines the custom element, decides whether review and sponsor links should be shown, and opens the correct browser-specific or language-specific destination.
- `review-sponsor.css` styles the SVG-based links inside the component shadow DOM and matches the page-level stylesheet loaded by popup and settings HTML.

This component is loaded by both [`src/action/popup/popup.html`](../../action/popup/popup.html) and [`src/settings/options.html`](../../settings/options.html). Visibility depends on saved tab count from `ensureAllTabsAvailability()` and on `EXTENSION_USAGE_DAYS`, so the links stay hidden until the extension has seen enough usage.
