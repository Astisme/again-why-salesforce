"use strict";

import * as importRuntime from "./runtime/import-runtime.js";

/**
 * Shows import modal with runtime defaults.
 *
 * @return {Promise<void>}
 */
export function createImportModal() {
	return importRuntime.createImportModal();
}

/**
 * Creates import helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Record<string, unknown>} Import module API.
 */
export function createImportModule(overrides = {}) {
	return importRuntime.createImportModule(overrides);
}

/**
 * Test-only singleton lifecycle controls from import runtime.
 */
export const __testHooks = importRuntime.__testHooks;
