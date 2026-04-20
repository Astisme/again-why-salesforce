/**
 * Creates Lightning navigation handlers and registers the message listener.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ get: (name: string) => { setParams: (params: Record<string, string>) => void; fire: () => void; } }} options.auraApi Salesforce Aura API.
 * @param {(type: string, listener: (event: { data: Record<string, string>; source: unknown }) => void) => void} options.addEventListenerFn Event-listener registrar.
 * @param {{ error: (message: string) => void }} options.consoleRef Console wrapper.
 * @param {(url: string, target: string) => void} options.openFn Window opener.
 * @param {unknown} [options.globalRef=globalThis] Expected `event.source` owner.
 * @return {{
 *   doLightningNavigation: (details: {
 *     navigationType: string;
 *     recordId?: string;
 *     url?: string;
 *     fallbackURL?: string;
 *   }) => void;
 *   handleMessage: (event: { data: Record<string, string>; source: unknown }) => void;
 * }} Lightning navigation API.
 */
export function createLightningNavigationModule({
	auraApi,
	addEventListenerFn,
	consoleRef,
	openFn,
	globalRef = globalThis,
} = {}) {
	const auraApiRuntime = auraApi;
	const consoleRuntime = consoleRef;
	const openRuntime = openFn;
	const globalRuntime = globalRef;

	/**
	 * Handles Lightning navigation using Salesforce events.
	 *
	 * @param {Object} details Navigation details.
	 * @param {string} details.navigationType Navigation type ("recordId" or "url").
	 * @param {string} [details.recordId] Record id.
	 * @param {string} [details.url] URL to navigate to.
	 * @param {string} [details.fallbackURL] URL used when navigation fails.
	 */
	function doLightningNavigation(details) {
		try {
			switch (details.navigationType) {
				case "recordId": {
					const recordEvent = auraApiRuntime.get(
						"e.force:navigateToSObject",
					);
					recordEvent.setParams({ recordId: details.recordId });
					recordEvent.fire();
					break;
				}
				case "url": {
					const urlEvent = auraApiRuntime.get(
						"e.force:navigateToURL",
					);
					urlEvent.setParams({ url: details.url });
					urlEvent.fire();
					break;
				}
				default: {
					consoleRuntime.error("Invalid navigation type");
				}
			}
		} catch (error) {
			const message = error instanceof Error
				? error.message
				: String(error);
			consoleRuntime.error(`Navigation failed: ${message}`);
			if (details.fallbackURL) {
				openRuntime(details.fallbackURL, "_top");
			}
		}
	}

	/**
	 * Handles message events from the page context.
	 *
	 * @param {{ data: Record<string, string>; source: unknown }} event Message event.
	 */
	function handleMessage(event) {
		if (event.source != globalRuntime) {
			return;
		}
		const what = event.data.what;
		if (what === "lightningNavigation") {
			doLightningNavigation(event.data);
		}
	}

	addEventListenerFn("message", handleMessage);
	return {
		doLightningNavigation,
		handleMessage,
	};
}
