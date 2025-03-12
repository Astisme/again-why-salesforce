# Privacy Policy

The "Again, Why Salesforce" browser extension communicates directly between the user's web browser and the Salesforce servers. No data is sent to other parties.

To validate the accuracy of this description, we encourage you to do the following:

- Inspect the source code [here](https://www.github.com/Astisme/again-why-salesforce);
- Ask a friend or an AI agent to explain the source code;
- Monitor the network traffic in your browser.

## Local Storage

The extension uses the browser's localStorage to save your theme preferences for better performance. You may inspect what is stored by following [this tutorial](https://developer.chrome.com/docs/devtools/storage/localstorage). We do not use local storage objects for any other purpose. You may erase the local storage objects by deleting your browser's history without affecting the functionality of the extension (after a page reload).

## Browser Storage

The extension uses the browser's storage to sync the tabs you've saved so that you may find them later on. The tabs will only be shown into the Salesforce Lightning Setup page close to the standard "Home" and "Object Manager" buttons. When running, the extension stores the tab data in-memory without needing a full reload on every page update. For more information about how your tab data is used, please see [the official documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync).
