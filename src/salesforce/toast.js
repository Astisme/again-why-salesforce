"use strict";

import * as toastRuntime from "./runtime/toast-runtime.js";

/**
 * Creates toast helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {Record<string, unknown>} Toast module API.
 */
export function createToastModule(overrides = {}) {
	return toastRuntime.createToastModule(overrides);
}

/**
 * Shows a toast notification in Setup pages.
 *
 * @param {string | string[]} message Message key(s).
 * @param {string} [status="success"] Toast status.
 * @return {Promise<void>} Promise resolved when toast side effect is complete.
 */
export function showToast(message, status = undefined) {
	return toastRuntime.showToast(message, status);
}

/**
 * Test hooks exposed by toast runtime.
 */
export const __testHooks = toastRuntime.__testHooks;
