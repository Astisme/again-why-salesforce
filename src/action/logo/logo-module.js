/**
 * Creates logo page behavior with explicit dependencies.
 *
 * @param {Object} options Module dependencies.
 * @param {{ runtime: { onMessage: { addListener: (listener: (message: { what?: string; theme?: string | null }, sender: unknown, sendResponse: (response: null) => void) => void) => void; }; }; }} options.browser Browser runtime object.
 * @param {string} options.whatTheme Message identifier for theme updates.
 * @param {() => unknown} options.initTheme Theme initialization callback.
 * @param {{ documentElement: { dataset: Record<string, string> } }} options.documentRef Document-like host.
 * @return {{ runLogo: () => (message: { what?: string; theme?: string | null }, sender: unknown, sendResponse: (response: null) => void) => void; }} Logo module API.
 */
export function createLogoModule({
	browser,
	whatTheme,
	initTheme,
	documentRef,
} = {}) {
	/**
	 * Initializes logo page theme wiring and runtime theme-message handling.
	 *
	 * @return {(message: { what?: string; theme?: string | null }, sender: unknown, sendResponse: (response: null) => void) => void} Registered runtime listener.
	 */
	function runLogo() {
		const html = documentRef.documentElement;

		/**
		 * Reads runtime messages related to theme updates.
		 *
		 * @param {{ what?: string; theme?: string | null }} message Incoming runtime message.
		 * @param {unknown} _sender Runtime message sender.
		 * @param {(response: null) => void} sendResponse Runtime response callback.
		 * @return {void}
		 */
		function readThemeMessage(message, _sender, sendResponse) {
			if (
				message?.what !== whatTheme ||
				message?.theme == null
			) {
				return;
			}
			sendResponse(null);
			html.dataset.theme = message.theme;
		}

		initTheme();
		browser.runtime.onMessage.addListener(readThemeMessage);
		return readThemeMessage;
	}

	return {
		runLogo,
	};
}
