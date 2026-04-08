import { WHAT_THEME } from "../core/constants.js";
import { sendExtensionMessage } from "../core/functions.js";
import { createThemeHandlerRuntime } from "./themeHandler-runtime.js";

const themeHandlerRuntime = createThemeHandlerRuntime({
	documentRef: document,
	localStorageRef: localStorage,
	matchMediaFn: globalThis.matchMedia?.bind(globalThis),
	sendExtensionMessageFn: sendExtensionMessage,
	whatTheme: WHAT_THEME,
});

/**
 * Enables or disables the listener for system color scheme changes, and updates the theme based on system preferences.
 *
 * @param {boolean} [enable=true] A flag to enable or disable the system color scheme listener.
 * @return {Promise<void> | void} Promise resolved when listener and initial update logic are completed.
 */
export function systemColorSchemeListener(enable = true) {
	return themeHandlerRuntime.systemColorSchemeListener(enable);
}

/**
 * Switches between light and dark themes, and updates the user theme in localStorage.
 *
 * @return {Promise<unknown> | unknown} Promise resolved when the theme switch has been applied.
 */
export function handleSwitchColorTheme() {
	return themeHandlerRuntime.handleSwitchColorTheme();
}

/**
 * Initializes the theme by checking the user preference stored in localStorage and applying the correct theme.
 * Also listens for system color scheme changes if necessary.
 *
 * @return {Promise<void> | void} Promise resolved when initialization has completed.
 */
export function initTheme() {
	return themeHandlerRuntime.initTheme();
}

// exported for tests
export const initThemePromise = await initTheme();
