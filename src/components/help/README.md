This directory contains the reusable `help-aws` help icon component.

Key files:

- `help.js` defines the custom element, attaches generated tooltip markup in shadow DOM, and keeps the link target plus accessible name in sync with host attributes.
- `help.css` styles the tooltip and is injected both by the component itself and by generated Salesforce help markup.

The settings page loads this component directly from [`src/settings/options.html`](../../settings/options.html). The same stylesheet is also referenced by [`src/salesforce/generator.js`](../../salesforce/generator.js) and exposed in the manifest as a web-accessible resource so generated help popups render consistently on Salesforce pages.
