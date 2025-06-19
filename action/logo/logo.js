"use strict";
import { BROWSER } from "/constants.js";
import { initTheme } from "../themeHandler.js";
initTheme();

const html = document.documentElement;

/**
 * Set the data-theme attribute on the html tag to the given theme
 * @param {string} theme - The name of the theme to apply (e.g., "light", "dark").
 */
function updateTheme(theme) {
	html.dataset.theme = theme;
}

/**
 * Listener for runtime messages related to theme updates.
 * Listens for messages with `what: "theme"` and a valid `theme` property.
 * If such a message is received, it triggers a theme update using `updateTheme`.
 *
 * @param {Object} mess - The incoming message object.
 * @param {*} _ - Unused sender parameter.
 * @param {Function} sendResponse - Callback to respond to the sender.
 */
BROWSER.runtime.onMessage.addListener(function (mess, _, sendResponse) {
	const message = mess.message;
	if (
		message == null || message.what == null || message.what !== "theme" ||
		message.theme == null
	) {
		return;
	}
	sendResponse(null);
	updateTheme(message.theme);
});
