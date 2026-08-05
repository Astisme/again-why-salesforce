"use strict";

import * as openOtherOrgRuntime from "./runtime/openOtherOrg-runtime.js";

/**
 * Creates open-other-org modal with runtime defaults.
 *
 * @param {Object} [options={}] Modal options.
 * @return {Promise<void>}
 */
export function createOpenOtherOrgModal(options = {}) {
	return openOtherOrgRuntime.createOpenOtherOrgModal(options);
}

/**
 * Creates open-other-org helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Record<string, unknown>} Open-other-org module API.
 */
export function createOpenOtherOrgModule(overrides = {}) {
	return openOtherOrgRuntime.createOpenOtherOrgModule(overrides);
}
