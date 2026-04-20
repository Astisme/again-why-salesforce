"use strict";

import { createContentModule as createContentPureModule } from "./content-module.js";

/**
 * Creates the content runtime module with dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {{
 *   __testHooks: Record<string, unknown>;
 *   bootstrapIfNeeded: () => boolean;
 *   getCurrentHref: () => string;
 *   getIsCurrentlyOnSavedTab: () => boolean | undefined;
 *   getModalHanger: () => HTMLElement | null;
 *   getSetupTabUl: () => HTMLElement | null;
 *   getWasOnSavedTab: () => boolean | undefined;
 *   isOnSavedTab: (isFromHrefUpdate?: boolean, callback?: ((isSaved: boolean) => void) | null) => Promise<void>;
 *   makeDuplicatesBold: (miniURL: string) => void;
 *   performActionOnTabs: (action: string, tab?: unknown, options?: unknown) => Promise<void>;
 *   reorderTabsUl: () => Promise<void>;
 *   sf_afterSet: (options?: Record<string, unknown>) => void;
 *   showToast: (message: string | string[], status?: string) => Promise<void> | void;
 * }} Content runtime API.
 */
export function createContentModule(overrides = {}) {
	return createContentPureModule(overrides);
}

const contentModule = createContentModule();

/**
 * Bootstraps content behavior when the current page is compatible.
 *
 * @return {boolean} True when bootstrapping started.
 */
export function bootstrapIfNeeded() {
	return contentModule.bootstrapIfNeeded();
}

/**
 * Returns the current href.
 *
 * @return {string} Current page href.
 */
export function getCurrentHref() {
	return contentModule.getCurrentHref();
}

/**
 * Returns whether the current page is a saved tab.
 *
 * @return {boolean | undefined} Saved-tab state.
 */
export function getIsCurrentlyOnSavedTab() {
	return contentModule.getIsCurrentlyOnSavedTab();
}

/**
 * Returns the modal hanger element.
 *
 * @return {HTMLElement | null} Modal hanger.
 */
export function getModalHanger() {
	return contentModule.getModalHanger();
}

/**
 * Returns the setup tab UL element.
 *
 * @return {HTMLElement | null} Setup tab UL.
 */
export function getSetupTabUl() {
	return contentModule.getSetupTabUl();
}

/**
 * Returns whether the previous page was a saved tab.
 *
 * @return {boolean | undefined} Previous saved-tab state.
 */
export function getWasOnSavedTab() {
	return contentModule.getWasOnSavedTab();
}

/**
 * Checks whether the current page is one of the saved tabs.
 *
 * @param {boolean} [isFromHrefUpdate=false] Whether this check comes from href update.
 * @param {((isSaved: boolean) => void) | null} [callback=null] Optional callback.
 * @return {Promise<void>} Resolves after checks are complete.
 */
export function isOnSavedTab(isFromHrefUpdate = false, callback = null) {
	return contentModule.isOnSavedTab(isFromHrefUpdate, callback);
}

/**
 * Highlights duplicate rows for the provided mini URL.
 *
 * @param {string} miniURL Minified URL used to match duplicates.
 * @return {void}
 */
export function makeDuplicatesBold(miniURL) {
	return contentModule.makeDuplicatesBold(miniURL);
}

/**
 * Performs an action on saved tabs.
 *
 * @param {string} action Action key.
 * @param {unknown} [tab=undefined] Optional tab payload.
 * @param {unknown} [options=undefined] Optional action options.
 * @return {Promise<void>} Resolves when action completes.
 */
export function performActionOnTabs(
	action,
	tab = undefined,
	options = undefined,
) {
	return contentModule.performActionOnTabs(action, tab, options);
}

/**
 * Persists UI row reordering.
 *
 * @return {Promise<void>} Resolves when reordering sync completes.
 */
export function reorderTabsUl() {
	return contentModule.reorderTabsUl();
}

/**
 * Refreshes extension state after storage updates.
 *
 * @param {Record<string, unknown>} [options={}] Optional update payload.
 * @return {void}
 */
export function sf_afterSet(options = {}) {
	return contentModule.sf_afterSet(options);
}

/**
 * Shows a toast notification in Setup pages.
 *
 * @param {string | string[]} message Message key(s).
 * @param {string} [status="success"] Toast status.
 * @return {Promise<void> | void} Toast side effect.
 */
export function showToast(message, status = undefined) {
	return contentModule.showToast(message, status);
}

/**
 * Test hooks exposed by the singleton content runtime module.
 */
export const __testHooks = contentModule.__testHooks;
