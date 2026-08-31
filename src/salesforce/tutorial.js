"use strict";

import * as tutorialRuntime from "./runtime/tutorial-runtime.js";

/**
 * Checks if tutorial should run and starts/prompts accordingly.
 *
 * @param {boolean} [fromPopup=false] Whether invocation came from popup.
 * @return {Promise<void>}
 */
export function checkTutorial(fromPopup = false) {
	return tutorialRuntime.checkTutorial(fromPopup);
}

/**
 * Creates tutorial helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Record<string, unknown>} Tutorial module API with guide button support.
 */
export function createTutorialModule(overrides = {}) {
	return tutorialRuntime.createTutorialModule(overrides);
}
