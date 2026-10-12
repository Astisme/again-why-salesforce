import { WHAT_THEME } from "../core/constants.js";
import { sendExtensionMessage as sendExtensionMessageDefault } from "../core/functions.js";
import {
	createThemeHandlerModule as createThemeHandlerPureModule,
} from "./themeHandler-module.js";

const fallbackDocumentRef = {
	documentElement: {
		dataset: {},
	},
};
const fallbackStorageRef = {
	/**
	 * Returns no stored theme.
	 *
	 * @return {null} No stored value.
	 */
	getItem() {
		return null;
	},
	/**
	 * Ignores a stored theme outside browser runtime.
	 *
	 * @return {void}
	 */
	setItem() {},
};

let themeHandlerModule = null;

/**
 * Creates theme-handler behavior with fully injected dependencies.
 *
 * @param {Parameters<typeof createThemeHandlerPureModule>[0]} [options={}] Module dependencies.
 * @return {ReturnType<typeof createThemeHandlerPureModule>} Theme-handler module API.
 */
export function createThemeHandlerRuntime(options = {}) {
	return createThemeHandlerPureModule(options);
}

/**
 * Creates theme-handler behavior with extension runtime defaults.
 *
 * @param {Parameters<typeof createThemeHandlerPureModule>[0]} [overrides={}] Runtime overrides.
 * @return {ReturnType<typeof createThemeHandlerPureModule>} Theme-handler module API.
 */
export function createThemeHandlerModule(overrides = {}) {
	return createThemeHandlerPureModule({
		documentRef: globalThis.document ?? fallbackDocumentRef,
		localStorageRef: globalThis.localStorage ?? fallbackStorageRef,
		matchMedia: globalThis.matchMedia?.bind(globalThis),
		sendExtensionMessage: sendExtensionMessageDefault,
		whatTheme: WHAT_THEME,
		...overrides,
	});
}

/**
 * Gets default theme-handler module, creating it on first use.
 *
 * @return {ReturnType<typeof createThemeHandlerPureModule>} Theme-handler module API.
 */
function getModule() {
	themeHandlerModule ??= createThemeHandlerModule();
	return themeHandlerModule;
}

/**
 * Enables or disables system color listener.
 *
 * @param {Parameters<ReturnType<typeof createThemeHandlerPureModule>["systemColorSchemeListener"]>[0]} [enable=true] Enable flag.
 * @return {ReturnType<ReturnType<typeof createThemeHandlerPureModule>["systemColorSchemeListener"]>} Listener update result.
 */
export function systemColorSchemeListener(enable = true) {
	return getModule().systemColorSchemeListener(enable);
}

/**
 * Switches between light and dark themes.
 *
 * @return {ReturnType<ReturnType<typeof createThemeHandlerPureModule>["handleSwitchColorTheme"]>} Theme update result.
 */
export function handleSwitchColorTheme() {
	return getModule().handleSwitchColorTheme();
}

/**
 * Initializes theme state from saved user preference.
 *
 * @return {ReturnType<ReturnType<typeof createThemeHandlerPureModule>["initTheme"]>} Initialization result.
 */
export function initTheme() {
	return getModule().initTheme();
}

/**
 * Legacy initialization export retained for compatibility.
 *
 * Theme initialization now starts when `initTheme` is called.
 *
 * @type {undefined}
 */
export const initThemePromise = undefined;

/**
 * Exposes theme-handler module lifecycle controls for tests.
 */
export const __testHooks = {
	getModule,
	/**
	 * Clears cached default module.
	 *
	 * @return {void}
	 */
	resetModule() {
		themeHandlerModule = null;
	},
	/**
	 * Replaces cached default module.
	 *
	 * @param {ReturnType<typeof createThemeHandlerPureModule> | null} module Theme-handler module.
	 * @return {void}
	 */
	setModule(module) {
		themeHandlerModule = module;
	},
};
