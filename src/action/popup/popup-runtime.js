"use strict";

import {
	createPopupModule as _createPopupModule,
	getPopupRuntimeDefaults as _getPopupRuntimeDefaults,
} from "./popup-module.js";

/**
 * Creates a runtime popup module with extension defaults applied.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {{ runPopup: () => Promise<{ redirected: boolean }> }} Popup module API.
 */
export function createPopupModule(overrides = {}) {
	return _createPopupModule({
		..._getPopupRuntimeDefaults(),
		...overrides,
	});
}

/**
 * Executes popup startup behavior with extension runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
export function runPopup(overrides = {}) {
	return createPopupModule(overrides).runPopup();
}
