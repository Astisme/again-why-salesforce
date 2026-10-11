import {
	createThemeHandlerModule as createRuntimeThemeHandlerModule,
	handleSwitchColorTheme as handleRuntimeSwitchColorTheme,
	initTheme as initRuntimeTheme,
	systemColorSchemeListener as systemRuntimeColorSchemeListener,
} from "./themeHandler-runtime.js";

export {
	initThemePromise,
	__testHooks,
} from "./themeHandler-runtime.js";

/**
 * Creates theme-handler behavior with extension runtime defaults.
 *
 * @param {Parameters<typeof createRuntimeThemeHandlerModule>[0]} [overrides={}] Runtime overrides.
 * @return {ReturnType<typeof createRuntimeThemeHandlerModule>} Theme-handler module API.
 */
export function createThemeHandlerModule(overrides = {}) {
	return createRuntimeThemeHandlerModule(overrides);
}

/**
 * Enables or disables system color listener.
 *
 * @param {Parameters<typeof systemRuntimeColorSchemeListener>[0]} [enable=true] Enable flag.
 * @return {ReturnType<typeof systemRuntimeColorSchemeListener>} Listener update result.
 */
export function systemColorSchemeListener(enable = true) {
	return systemRuntimeColorSchemeListener(enable);
}

/**
 * Switches between light and dark themes.
 *
 * @return {ReturnType<typeof handleRuntimeSwitchColorTheme>} Theme update result.
 */
export function handleSwitchColorTheme() {
	return handleRuntimeSwitchColorTheme();
}

/**
 * Initializes theme state from saved user preference.
 *
 * @return {ReturnType<typeof initRuntimeTheme>} Initialization result.
 */
export function initTheme() {
	return initRuntimeTheme();
}
