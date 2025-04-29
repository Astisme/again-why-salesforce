"use strict";
import { BROWSER } from "/constants.js";
import { initTheme } from "../themeHandler.js";
initTheme();

const html = document.documentElement;
/**
 * set the data-theme attribute on the html tag to the given theme
 * @param {string} theme - The name of the theme to apply (e.g., "light", "dark").
 */
function updateTheme(theme) {
	html.dataset.theme = theme;
}

// Listens for messages from other parts of the extension and updates the theme if the message is valid.
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
