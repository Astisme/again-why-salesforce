"use strict";

import { BROWSER, WHAT_THEME } from "../../core/constants.js";
import { initTheme } from "../themeHandler.js";
import { createLogoModule as createLogoPureModule } from "./logo-module.js";

let logoModule = null;

/**
 * Creates logo page behavior with extension runtime defaults.
 *
 * @param {Parameters<typeof createLogoPureModule>[0]} [overrides={}] Runtime overrides.
 * @return {ReturnType<typeof createLogoPureModule>} Logo module API.
 */
export function createLogoModule(overrides = {}) {
	return createLogoPureModule({
		browser: BROWSER,
		documentRef: globalThis.document,
		initTheme,
		whatTheme: WHAT_THEME,
		...overrides,
	});
}

/**
 * Gets default logo module, creating it on first use.
 *
 * @return {ReturnType<typeof createLogoPureModule>} Logo module API.
 */
function getModule() {
	logoModule ??= createLogoModule();
	return logoModule;
}

/**
 * Initializes logo page behavior.
 *
 * @param {Parameters<typeof createLogoModule>[0]} [overrides] Runtime overrides.
 * @return {ReturnType<ReturnType<typeof createLogoPureModule>["runLogo"]>} Registered runtime listener.
 */
export function runLogo(overrides = undefined) {
	return overrides == null
		? getModule().runLogo()
		: createLogoModule(overrides).runLogo();
}

/**
 * Exposes logo module lifecycle controls for tests.
 */
export const __testHooks = {
	getModule,
	/**
	 * Clears cached default module.
	 *
	 * @return {void}
	 */
	resetModule() {
		logoModule = null;
	},
	/**
	 * Replaces cached default module.
	 *
	 * @param {ReturnType<typeof createLogoPureModule> | null} module Logo module.
	 * @return {void}
	 */
	setModule(module) {
		logoModule = module;
	},
};
