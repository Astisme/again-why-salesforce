This directory is reserved for generated build artifacts. You shouldn't add anything here.

The manifest and packaging flow reference stable built files (`generated/bundledContent.js`, `generated/bundledBackground.js`).
Keeping generated output in one place avoids mixing authored source with build artifacts.

Generated files:

- `bundledContent.js`: bundled content-script output.
- `bundledBackground.js`: bundled background-script output.
- `bundledPopup.js`: bundled popup page modules.
- `bundledOptions.js`: bundled options page modules.

Authored source files should stay outside this folder.
