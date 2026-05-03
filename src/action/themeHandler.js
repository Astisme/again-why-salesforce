import { WHAT_THEME } from "../core/constants.js";
import { sendExtensionMessage } from "../core/functions.js";
import { createThemeHandlerRuntime } from "./themeHandler-runtime.js";

const fallbackDocumentRef = {
	documentElement: {
		dataset: {},
	},
};
const fallbackStorageRef = {
	getItem() {
		return null;
	},
	setItem() {},
};

/**
 * Creates the theme-handler module with dependency overrides.
 *
 * @param {Object} [overrides={}] Dependency overrides used by tests/runtime.
 * @param {Document} [overrides.documentRef=document] Document reference.
 * @param {Storage} [overrides.localStorageRef=localStorage] Storage reference.
 * @param {(query: string) => MediaQueryList | undefined} [overrides.matchMediaFn=globalThis.matchMedia?.bind(globalThis)] Media-query factory.
 * @param {(message: { what: string; theme: string }) => unknown} [overrides.sendExtensionMessageFn=sendExtensionMessage] Message sender.
 * @param {string} [overrides.whatTheme=WHAT_THEME] Theme message key.
 * @return {{
 *   handleSwitchColorTheme: () => Promise<unknown> | unknown;
 *   initTheme: () => Promise<void> | void;
 *   initThemePromise: Promise<void>;
 *   systemColorSchemeListener: (enable?: boolean) => Promise<void> | void;
 * }} Theme-handler module API.
 */
export function createThemeHandlerModule({
	documentRef = globalThis.document ?? fallbackDocumentRef,
	localStorageRef = globalThis.localStorage ?? fallbackStorageRef,
	matchMediaFn = globalThis.matchMedia?.bind(globalThis),
	sendExtensionMessageFn = sendExtensionMessage,
	whatTheme = WHAT_THEME,
} = {}) {
	const themeHandlerRuntime = createThemeHandlerRuntime({
		documentRef,
		localStorageRef,
		matchMediaFn,
		sendExtensionMessageFn,
		whatTheme,
	});
	return {
		systemColorSchemeListener(enable = true) {
			return themeHandlerRuntime.systemColorSchemeListener(enable);
		},
		handleSwitchColorTheme() {
			return themeHandlerRuntime.handleSwitchColorTheme();
		},
		initTheme() {
			return themeHandlerRuntime.initTheme();
		},
		initThemePromise: Promise.resolve(themeHandlerRuntime.initTheme()),
	};
}

const themeHandlerModule = createThemeHandlerModule();

/**
 * Enables or disables the listener for system color scheme changes, and updates the theme based on system preferences.
 *
 * @param {boolean} [enable=true] A flag to enable or disable the system color scheme listener.
 * @return {Promise<void> | void} Promise resolved when listener and initial update logic are completed.
 */
export function systemColorSchemeListener(enable = true) {
	return themeHandlerModule.systemColorSchemeListener(enable);
}

/**
 * Switches between light and dark themes, and updates the user theme in localStorage.
 *
 * @return {Promise<unknown> | unknown} Promise resolved when the theme switch has been applied.
 */
export function handleSwitchColorTheme() {
	return themeHandlerModule.handleSwitchColorTheme();
}

/**
 * Initializes the theme by checking the user preference stored in localStorage and applying the correct theme.
 * Also listens for system color scheme changes if necessary.
 *
 * @return {Promise<void> | void} Promise resolved when initialization has completed.
 */
export function initTheme() {
	return themeHandlerModule.initTheme();
}

// exported for tests
export const initThemePromise = await themeHandlerModule.initThemePromise;
