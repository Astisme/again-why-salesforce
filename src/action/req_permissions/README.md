This directory contains the permission request page used when the popup cannot continue without an optional permission.

Key files:

- `req_permissions.html` renders the shared permission prompt UI for both host access and downloads access.
- `req_permissions.js` reads the `whichid` query parameter, requests the matching permission, and routes the user back to the normal popup flow.
- `req_permissions.css` styles the page on top of the shared action styles.

This page is opened from [`src/action/popup/popup.js`](../popup/popup.js) when host permissions are missing, and from [`src/background/utils.js`](../../background/utils.js) when an export needs downloads permission. The `whichid=hostpermissions` flow can also persist a local `DO_NOT_REQUEST_FRAME_PERMISSION` flag when the user asks not to be prompted again.
