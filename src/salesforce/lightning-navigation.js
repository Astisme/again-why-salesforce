// This script is injected in Salesforce context and does not share the context with the rest of the scripts in this direcory.

/**
 * Handles Lightning navigation based on the provided details.
 * Navigates to a record page or a URL based on the navigation type.
 *
 * @param {Object} details - The details for navigation.
 * @param {string} details.navigationType - The type of navigation ("recordId" or "url").
 * @param {string} [details.recordId] - The record ID for "recordId" navigation type.
 * @param {string} [details.url] - The URL for "url" navigation type.
 * @param {string} [details.fallbackURL] - The fallback URL to navigate to in case of error.
 */
function doLightningNavigation(details) {
	try {
		switch (details.navigationType) {
			case "recordId": {
				const recordEvent = $A.get("e.force:navigateToSObject");
				recordEvent.setParams({ recordId: details.recordId });
				recordEvent.fire();
				break;
			}
			case "url": {
				const urlEvent = $A.get("e.force:navigateToURL");
				urlEvent.setParams({ url: details.url });
				urlEvent.fire();
				break;
			}
			default: {
				console.error("Invalid navigation type"); // do not translate as this will be sent from inside Salesforce
			}
		}
	} catch (error) {
		console.error(`Navigation failed: ${error.message}`); // do not translate as this will be sent from inside Salesforce
		if (details.fallbackURL) {
			open(details.fallbackURL, "_top");
		}
	}
}

// listen to possible updates from tableDragHandler
addEventListener("message", (e) => {
	if (e.source != globalThis) {
		return;
	}
	const what = e.data.what;
	if (what === "lightningNavigation") {
		doLightningNavigation(e.data);
	}
});
