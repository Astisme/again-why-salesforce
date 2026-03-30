# Why This Exists Hotspots

This index points to runtime paths that are easy to misread and now include
purpose-oriented inline annotations.

## Browser API Selection

- Source: [`src/core/constants.js`](../src/core/constants.js)
- Why: Edge user agents also contain `chrome`, so detection order must preserve
  Edge detection before Chromium detection. The `BROWSER` export then
  normalizes browser API access across Chromium (`chrome`) and Firefox
  (`browser`).
- Tests: [`tests/constants.test.ts`](../tests/constants.test.ts)

## Salesforce Host and Cookie Bridge

- Source: [`src/background/background.js`](../src/background/background.js)
- Why: Salesforce tabs can run on `*.lightning.force.com` or
  `*.my.salesforce-setup.com`, but API auth cookies are scoped to
  `*.my.salesforce.com`. The bridge rewrites origins before cookie lookup and
  API calls so language detection keeps working.
- Tests: [`tests/background/background.test.ts`](../tests/background/background.test.ts)

## Injected Lightning Navigation Bridge

- Source:
  [`src/salesforce/lightning-navigation.js`](../src/salesforce/lightning-navigation.js)
- Why: Aura navigation events are only available in page context, so this
  script receives same-window `postMessage` requests and triggers Salesforce
  navigation. A fallback URL keeps navigation usable if Aura calls fail.
- Tests:
  [`tests/salesforce/lightning-navigation.test.ts`](../tests/salesforce/lightning-navigation.test.ts)
