# Again, Why Salesforce - Privacy Policy

_Last updated: June 2026_

**Again, Why Salesforce** is a browser extension that communicates directly between your web browser and the Salesforce page (and Salesforce servers when using the extension in the same language as your Salesforce account). We do **not** collect or store any personal or identifiable information.

---

## 1. Analytics & User Counting

- We rely on [Simple Analytics](https://www.simpleanalytics.com/#why) to estimate user counts and most used extension versions.
- Only anonymous, non-identifiable "ping" messages are sent. No IP addresses, cookies, or device fingerprints are collected by us.
- You'll only send 1 ping per day, and a special ping is sent when you install the extension.
- On Firefox, analytics also follows Firefox's built-in consent for `technicalAndInteraction` data collection.
- You can opt out of analytics in the extension's **Settings** at any time; see "Opt-Out" below.
- All Analytics Data is **automatically deleted** after 30 days and is always available [at this link](https://dashboard.simpleanalytics.com/extension.again.whysalesforce).

---

## 2. Local Storage

We use the browser's `localStorage` for page-local preferences only:

| Key | Description |
| --- | --- |
| `usingTheme` | Current theme applied to the popup/options UI. |
| `userTheme` | User-selected theme preference. |
| `noPerm` | Whether you asked the extension not to prompt again for Salesforce Setup host access. |

No personal data or browsing history is stored in `localStorage`. You can clear this by deleting browser history; the extension will continue to function after a page reload.

---

## 3. Browser Storage (Sync)

- All data you create in the extension (Tabs, settings, decorations) is saved via the browser's **sync storage** API for a seamless experience across devices.
- You can view or edit this directly via your browser's developer tools:
  - Chrome/Edge: DevTools > Application > Storage > Extension Storage
  - Firefox: DevTools > Storage Inspector
- To view or edit the data without relying on the extension, please look at [the official documentation](https://developer.chrome.com/docs/devtools/storage/extensionstorage).
- For more information about how your data is stored and synced, please see [the official documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync).

---

## 4. Tab Data (In-Memory)

- While running, the extension keeps a temporary in-memory copy of your **Tab** data (key: `againWhySalesforce`, variable: `WHY_KEY`).
- This powers the Lightning Setup page sidebar, showing your custom Tabs alongside the standard "Home" and "Object Manager".
- This in-memory copy is deleted when you reload the page or close your browser tab/window. Persisted Tab data remains in browser sync storage as described above.

---

## 5. Settings & Decoration Preferences

All settings live in browser storage and are scoped to this extension only:

| Key | Variable Name | Description |
| --- | --- | --- |
| `againWhySalesforce` | `WHY_KEY` | Saved Tabs and pinned-tab metadata. |
| `settings` | `SETTINGS_KEY` | General extension preferences. |
| `settings-tab_generic_style` | `GENERIC_TAB_STYLE_KEY` | Styles for generic (all-org) Tab decorations. |
| `settings-tab_generic_style-pinned` | `GENERIC_PINNED_TAB_STYLE_KEY` | Styles for pinned generic Tab decorations. |
| `settings-tab_org_style` | `ORG_TAB_STYLE_KEY` | Styles for org-specific Tab decorations. |
| `settings-tab_org_style-pinned` | `ORG_PINNED_TAB_STYLE_KEY` | Styles for pinned org-specific Tab decorations. |
| `_locale` | `LOCALE_KEY` | Stores Salesforce language (if available). |
| `extension_usage_days` | `EXTENSION_USAGE_DAYS` | Number of days the extension has been used, for local review/sponsor UI timing. |
| `extension_last_active_day` | `EXTENSION_LAST_ACTIVE_DAY` | Last active day, used to avoid repeated once-a-day actions. |
| `no_update_notification` | `NO_UPDATE_NOTIFICATION` | Update notification preference and last update-check date. |

You can reset or remove these at any time via your browser's extension storage settings as presented at point 3 above.

---

## 6. Data Retention & Deletion

- **Analytics**: Purged automatically after **30 days**.
- **Settings and Tabs**: Persisted until you clear browser data or uninstall the extension.
- **Local storage preferences**: Persisted until you clear browser data or change/reset them in the extension.
- As we do not store any data beyond what your browser controls, there's nothing for you to request the deletion of.

---

## 7. Opt-Out

Even though we don't collect personal data, you may disable analytics at any time via **Settings** -> **Prevent use of Simple Analytics**. On Firefox, you can also use Firefox's built-in data collection consent controls.

---

## 8. Security Measures

- **Sandboxed Storage**: All data is held within browser-managed storage, preventing cross-site access.
- **Least-Privilege**: We request only the permissions necessary for core functionality. Permissions which may be useful but not at the core of the extension will be requested at the moment you interact with them.
- **Breach Notification**: In the unlikely event of a vulnerability, we'll publish a notice in our extension release notes within **72 hours**.

---

## 9. Third-Party Disclosures

- **Simple Analytics**
  - Provides fully anonymous usage counts with no identifiers shared.
- **Browser Vendors (Chrome, Firefox, Edge, Safari)**
  - Manage storage and browser-level permissions under their respective privacy policies.

---

## 10. Contact & Policy Updates

If you have questions or wish to request data removal beyond what your browser controls, please contact us [via email](mailto:againwhysalesforce@duck.com) (`againwhysalesforce@duck.com`).

We'll notify you of policy changes via extension release notes.
