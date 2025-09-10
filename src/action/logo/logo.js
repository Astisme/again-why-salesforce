"use strict";
import { BROWSER } from "/constants.js";
import { initTheme } from "../themeHandler.js";
initTheme();

const html = document.documentElement;

/**
 * Listener for runtime messages related to theme updates.
 * Listens for messages with `what: "theme"` and a valid `theme` property.
 *
 * @param {Object} mess - The incoming message object.
 * @param {*} _ - Unused sender parameter.
 * @param {Function} sendResponse - Callback to respond to the sender.
 */
function readThemeMessage(mess, _, sendResponse) {
	const message = mess.message;
	if (
		message?.what == null || message?.what !== "theme" ||
		message?.theme == null
	) {
		return;
	}
	sendResponse(null);
	/**
	 * Set the data-theme attribute on the html tag to the given theme
	 * @param {string} theme - The name of the theme to apply (e.g., "light", "dark").
	 */
	html.dataset.theme = message.theme;
}
BROWSER.runtime.onMessage.addListener(readThemeMessage);
