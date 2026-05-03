This directory contains explicit runtime entry modules.

Each bundle has a tiny entrypoint that only imports the real feature/runtime module.
We use explicit entrypoints to keep imports/build targets stable and make the build graph obvious at a glance.

Current entrypoints:

- `content.js` -> `salesforce/content.js`
- `background.js` -> `background/background.js`
- `popup.js` -> `action/popup/popup-runtime.js`
- `options.js` -> `settings/options.js`
