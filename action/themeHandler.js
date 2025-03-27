// deno-lint-ignore-file no-window
import { BROWSER } from "/constants.js";
const html = document.documentElement;
let systemColorListener = null;

/**
 * Sends a message to the runtime to update the theme.
 *
 * @param {string} theme - The theme to be applied.
 */
function sendMessageTheme(theme) {
	BROWSER.runtime.sendMessage({ message: { what: "theme", theme } });
}

/**
 * Updates the theme and applies the changes to the HTML document.
 *
 * @param {string} theme - The theme to be applied.
 * @param {boolean} [updateUserTheme=false] - A flag to determine if the user theme should be updated in localStorage.
 */
function messageAndUpdateTheme(theme, updateUserTheme = false) {
	sendMessageTheme(theme);
	setTimeout(() => {
		html.dataset.theme = theme;
		localStorage.setItem("usingTheme", theme);
		if (updateUserTheme) {
			html.dataset.usertheme = theme;
			localStorage.setItem("userTheme", theme);
		}
	}, 10);
}

/**
 * Handles the system color scheme change event and updates the theme accordingly.
 *
 * @param {MediaQueryListEvent} e - The event triggered when the system color scheme changes.
 */
function handleSystemColorSchemeChange(e) {
	// check if theme has to be changed
	const systemThemeValue = e.matches ? "dark" : "light";
	const htmlThemeValue = html.dataset.theme;
	if (systemThemeValue !== htmlThemeValue) {
		messageAndUpdateTheme(systemThemeValue);
	}
}

/**
 * Enables or disables the listener for system color scheme changes, and updates the theme based on system preferences.
 *
 * @param {boolean} enable - A flag to enable or disable the system color scheme listener.
 */
export function systemColorSchemeListener(enable = true) {
	if (
		window.matchMedia == null || enable == null ||
		(enable && systemColorListener != null) ||
		(!enable && systemColorListener == null)
	) {
		return;
	}

	localStorage.setItem("userTheme", "system");
	if (enable) {
		// If enabling, add the systemColorListener
		systemColorListener = window.matchMedia("(prefers-color-scheme: dark)");
		systemColorListener.addEventListener(
			"change",
			handleSystemColorSchemeChange,
		);
		// Initial check for the current color scheme
		handleSystemColorSchemeChange(systemColorListener);
	} else {
		// If disabling, remove the systemColorListener
		systemColorListener.removeEventListener(
			"change",
			handleSystemColorSchemeChange,
		);
		systemColorListener = null;
	}
}

/**
 * Switches between light and dark themes, and updates the user theme in localStorage.
 */
export function handleSwitchColorTheme() {
	const newTheme = html.dataset.theme === "light" ? "dark" : "light";
	messageAndUpdateTheme(newTheme, true);
}

/**
 * Initializes the theme by checking the user preference stored in localStorage and applying the correct theme.
 * Also listens for system color scheme changes if necessary.
 */
export function initTheme() {
	html.dataset.usertheme = localStorage.getItem("userTheme") ?? "system";
	html.dataset.theme = html.dataset.usertheme !== "system"
		? html.dataset.usertheme
		: null;
	// call other function to match system theme
	systemColorSchemeListener(html.dataset.usertheme === "system");
}

initTheme();
