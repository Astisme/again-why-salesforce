# Privacy Policy

The "Again, Why Salesforce" browser extension communicates directly between the user's web browser and the Salesforce page (and servers when using the extension in the same language as your Salesforce account, which is the default).

To count the number of users, we rely on Simple Analytics to which the extension sends only a simple message which is completely useless for fingerprinting our users. You may read more about this service [here](https://www.simpleanalytics.com/#why). You may opt-out from being counted from the extension's settings screen. The code that's responsible for following your choice is located [here](/salesforce/content.js) (search for `checkInsertAnalytics`).

To validate the accuracy of this description, we encourage you to do the following:

- Inspect the source code [here](https://www.github.com/Astisme/again-why-salesforce);
- Ask a friend or an AI agent to explain the source code;
- Monitor the network traffic in your browser.

## Local Storage

The extension uses the browser's localStorage to save your theme preferences for better performance. You may inspect what is stored by following [this tutorial](https://developer.chrome.com/docs/devtools/storage/localstorage). We do not use local storage objects for any other purpose. You may erase the local storage objects by deleting your browser's history without affecting the functionality of the extension (after a page reload).

## Browser Storage

The extension uses the browser's storage to sync the data you create while using the extension for a seamless experience.

For more information about how your data is stored and synced, please see [the official documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync).

To view or edit the data without relying on the extension, please look at [the official documentation](https://developer.chrome.com/docs/devtools/storage/extensionstorage).

### Tab data

When running, the extension stores the Tab data in-memory and keeps it updated even if you use Salesforce in multiple browser tabs or windows (or even different computers!).

The Tabs will only be shown into the Salesforce Lightning Setup page to the right of the standard "Home" and "Object Manager" buttons (by default).

This data is saved using the key `againWhySalesforce`, saved with variable name `WHY_KEY`.

### General Settings

While using this extension, you may want to customize your experience. You may do so heading to the Settings page.

Any update you make in the general settings tab, is saved by the extension and will affect its functionality.

This data is saved using the key `settings`, saved with variable name `SETTINGS_KEY`.

### Tab decoration preferences

The way you want your Tabs to appear is saved into objects which tell the extension the bare minimum about how to style your Tabs and whether these should be used when the Tab is active or inactive.

To change the style of your Tabs, head to the Settings page!

These data is used only to create `style` elements that are appended into the `head` of the Salesforce Setup page you're currently visiting. The inserted styles affect only the Tabs created by this extension.

#### Generic Tab decoration preferences

This data is saved using the key `settings-tab_generic_style`, saved with variable name `GENERIC_TAB_STYLE_KEY`.

#### Org Tab decoration preferences

This data is saved using the key `settings-tab_org_style`, saved with variable name `ORG_TAB_STYLE_KEY`.
