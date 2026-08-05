"use strict";

import * as manageTabsRuntime from "./runtime/manageTabs-runtime.js";

/**
 * Shows the manage-tabs modal using runtime defaults.
 *
 * @return {Promise<void>}
 */
export function createManageTabsModal() {
	return manageTabsRuntime.createManageTabsModal();
}

/**
 * Creates manage-tabs helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Record<string, unknown>} Manage-tabs module API.
 */
export function createManageTabsModule(overrides = {}) {
	return manageTabsRuntime.createManageTabsModule(overrides);
}

/**
 * Handles clicks on manage-tabs row action buttons using runtime defaults.
 *
 * @param {Event} e Button click event.
 * @param {Record<string, unknown>} [options={}] Action options.
 * @return {Promise<void>}
 */
export function handleActionButtonClick(e, options = {}) {
	return manageTabsRuntime.handleActionButtonClick(e, options);
}
