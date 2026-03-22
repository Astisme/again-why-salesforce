import { WHAT_THEME } from "/core/constants.js";
import { sendExtensionMessage } from "/core/functions.js";
const html = document.documentElement;
let systemColorListener = null;

/**
 * Updates the theme and applies the changes to the HTML document.
 *
 * @param {string} theme - The theme to be applied.
 * @param {boolean} [updateUserTheme=false] - A flag to determine if the user theme should be updated in localStorage.
 * @return {Promise<void>} Promise resolved when the theme update has been applied.
 */
function messageAndUpdateTheme(theme, updateUserTheme = false) {
	html.dataset.theme = theme;
	localStorage.setItem("usingTheme", theme);
	if (updateUserTheme) {
		html.dataset.usertheme = theme;
		localStorage.setItem("userTheme", theme);
	}
	return sendExtensionMessage({ what: WHAT_THEME, theme });
}

/**
 * Handles the system color scheme change event and updates the theme accordingly.
 *
 * @param {MediaQueryListEvent} e - The event triggered when the system color scheme changes.
 * @return {Promise<void>} Promise resolved when the theme update (if needed) has been applied.
 */
async function handleSystemColorSchemeChange(e) {
	// check if theme has to be changed
	const systemThemeValue = e.matches ? "dark" : "light";
	const htmlThemeValue = html.dataset.theme;
	if (systemThemeValue !== htmlThemeValue) {
		return await messageAndUpdateTheme(systemThemeValue);
	}
}

/**
 * Enables or disables the listener for system color scheme changes, and updates the theme based on system preferences.
 *
 * @param {boolean} enable - A flag to enable or disable the system color scheme listener.
 * @return {Promise<void>} Promise resolved when listener and initial update logic are completed.
 */
export async function systemColorSchemeListener(enable = true) {
	if (
		globalThis.matchMedia == null || enable == null ||
		(enable && systemColorListener != null) ||
		(!enable && systemColorListener == null)
	) {
		return;
	}

	localStorage.setItem("userTheme", "system");
	if (enable) {
		// If enabling, add the systemColorListener
		systemColorListener = globalThis.matchMedia(
			"(prefers-color-scheme: dark)",
		);
		systemColorListener.addEventListener(
			"change",
			handleSystemColorSchemeChange,
		);
		// Initial check for the current color scheme
		await handleSystemColorSchemeChange(systemColorListener);
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
 * @return {Promise<void>} Promise resolved when the theme switch has been applied.
 */
export function handleSwitchColorTheme() {
	const newTheme = html.dataset.theme === "light" ? "dark" : "light";
	return messageAndUpdateTheme(newTheme, true);
}

/**
 * Initializes the theme by checking the user preference stored in localStorage and applying the correct theme.
 * Also listens for system color scheme changes if necessary.
 * @return {Promise<void>} Promise resolved when initialization has completed.
 */
export async function initTheme() {
	html.dataset.usertheme = localStorage.getItem("userTheme") ?? "system";
	html.dataset.theme = html.dataset.usertheme === "system"
		? null
		: html.dataset.usertheme;
	// call other function to match system theme
	await systemColorSchemeListener(html.dataset.usertheme === "system");
}

// exported for tests
export const initThemePromise = await initTheme();
