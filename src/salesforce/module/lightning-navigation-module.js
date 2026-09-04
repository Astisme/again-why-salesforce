/**
 * Creates Salesforce Lightning navigation handlers with injected page dependencies.
 *
 * @param {Object} [options={}] Page-context dependencies.
 * @param {{ get: (name: string) => { fire: () => void; setParams: (params: { recordId?: string; url?: string }) => void; } }} [options.aura] Salesforce Aura event API.
 * @param {{ error: (message: string) => void }} [options.consoleRef=globalThis.console] Console-like logger.
 * @param {(url: string, target: string) => void} [options.openRef=globalThis.open] Page navigation function.
 * @param {object} [options.windowRef=globalThis] Page global object used to validate message sources.
 * @return {{
 *   doLightningNavigation: (details: { fallbackURL?: string; navigationType: string; recordId?: string; url?: string; }) => void;
 *   handleMessage: (event: { data: { fallbackURL?: string; navigationType: string; recordId?: string; url?: string; what?: string; }; source: object; }) => void;
 * }} Lightning navigation API.
 */
export function createLightningNavigationModule({
	aura,
	consoleRef = globalThis.console,
	openRef = globalThis.open,
	windowRef = globalThis,
} = {}) {
	/**
	 * Handles Lightning navigation based on provided details.
	 *
	 * @param {{ fallbackURL?: string; navigationType: string; recordId?: string; url?: string; }} details Navigation request.
	 * @return {void}
	 */
	function doLightningNavigation(details) {
		try {
			switch (details.navigationType) {
				case "recordId": {
					const recordEvent = aura.get("e.force:navigateToSObject");
					recordEvent.setParams({ recordId: details.recordId });
					recordEvent.fire();
					break;
				}
				case "url": {
					const urlEvent = aura.get("e.force:navigateToURL");
					urlEvent.setParams({ url: details.url });
					urlEvent.fire();
					break;
				}
				default: {
					consoleRef.error("Invalid navigation type"); // do not translate as this will be sent from inside Salesforce
				}
			}
		} catch (error) {
			consoleRef.error(`Navigation failed: ${error.message}`); // do not translate as this will be sent from inside Salesforce
			if (details.fallbackURL) {
				openRef(details.fallbackURL, "_top");
			}
		}
	}

	/**
	 * Handles page messages sent by extension content scripts.
	 *
	 * @param {{ data: { fallbackURL?: string; navigationType: string; recordId?: string; url?: string; what?: string; }; source: object; }} event Incoming page message.
	 * @return {void}
	 */
	function handleMessage(event) {
		if (event.source != windowRef) {
			return;
		}
		if (event.data.what === "lightningNavigation") {
			doLightningNavigation(event.data);
		}
	}

	return { doLightningNavigation, handleMessage };
}
