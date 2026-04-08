/**
 * Initializes logo page theme wiring and runtime theme-message handling.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ runtime: { onMessage: { addListener: (listener: (message: unknown, sender: unknown, sendResponse: (response: null) => void) => void) => void; }; }; }} options.browser Browser runtime object.
 * @param {string} options.whatTheme Message identifier for theme updates.
 * @param {() => unknown} options.initThemeFn Theme initialization callback.
 * @param {{ documentElement: { dataset: Record<string, string> } }} [options.documentRef=document] Document-like host.
 * @return {(message: { what?: string; theme?: string | null }, sender: unknown, sendResponse: (response: null) => void) => void} Registered runtime listener.
 */
export function runLogo({
	browser,
	whatTheme,
	initThemeFn,
	documentRef = document,
}) {
	initThemeFn();
	const html = documentRef.documentElement;
	/**
	 * Listener for runtime messages related to theme updates.
	 *
	 * @param {Object} message Incoming runtime message.
	 * @param {*} _sender Unused sender parameter.
	 * @param {Function} sendResponse Runtime response callback.
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
	browser.runtime.onMessage.addListener(readThemeMessage);
	return readThemeMessage;
}
