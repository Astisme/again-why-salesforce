# Why Annotator Hotspots

This page tracks non-obvious runtime paths where inline `Why this exists` annotations were added.

## Hotspots

- `src/core/constants.js`
  - Browser detection order is intentional to avoid token collisions in user-agent parsing.
  - `BROWSER` picks the correct extension API namespace (`chrome` vs `browser`) once, so callers stay uniform.
- `src/background/background.js`
  - Salesforce API calls bridge Lightning/Setup hosts to cookie-compatible `my.salesforce.com` domains.
  - Export preflight (`WHAT_EXPORT_CHECK`) is separate from actual export launch to avoid duplicate permission prompts.
  - Keyboard commands are gated to Salesforce Setup pages to prevent accidental actions elsewhere.
  - Install/update listener logic intentionally suppresses noisy changelog tabs for temporary installs and non-update events.
  - Tab update listener ignores non-active/incomplete updates to avoid unnecessary context-menu churn.
- `src/salesforce/lightning-navigation.js`
  - Navigation is injected into Salesforce page context because Aura event APIs are unavailable in extension context.
  - Message listener filters to same-window events before invoking navigation.
