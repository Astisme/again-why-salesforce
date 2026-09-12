"use strict";

import { createContentModule as createContentPureModule } from "../module/content-module.js";

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

/** @type {ReturnType<typeof createContentModule> | undefined} */
let contentModule;

/**
 * Returns lazily created content module singleton.
 *
 * @return {ReturnType<typeof createContentModule>} Content module singleton.
 */
function getModule() {
	contentModule ??= createContentModule();
	return contentModule;
}

/**
 * Bootstraps content behavior when the current page is compatible.
 *
 * @return {boolean} True when bootstrapping started.
 */
export function bootstrapIfNeeded() {
	return getModule().bootstrapIfNeeded();
}

/**
 * Returns the current href.
 *
 * @return {string} Current page href.
 */
export function getCurrentHref() {
	return getModule().getCurrentHref();
}

/**
 * Returns whether the current page is a saved tab.
 *
 * @return {boolean | undefined} Saved-tab state.
 */
export function getIsCurrentlyOnSavedTab() {
	return getModule().getIsCurrentlyOnSavedTab();
}

/**
 * Returns the modal hanger element.
 *
 * @return {HTMLElement | null} Modal hanger.
 */
export function getModalHanger() {
	return getModule().getModalHanger();
}

/**
 * Returns the setup tab UL element.
 *
 * @return {HTMLElement | null} Setup tab UL.
 */
export function getSetupTabUl() {
	return getModule().getSetupTabUl();
}

/**
 * Returns whether the previous page was a saved tab.
 *
 * @return {boolean | undefined} Previous saved-tab state.
 */
export function getWasOnSavedTab() {
	return getModule().getWasOnSavedTab();
}

/**
 * Checks whether the current page is one of the saved tabs.
 *
 * @param {boolean} [isFromHrefUpdate=false] Whether this check comes from href update.
 * @param {((isSaved: boolean) => void) | null} [callback=null] Optional callback.
 * @return {Promise<void>} Resolves after checks are complete.
 */
export function isOnSavedTab(isFromHrefUpdate = false, callback = null) {
	return getModule().isOnSavedTab(isFromHrefUpdate, callback);
}

/**
 * Highlights duplicate rows for the provided mini URL.
 *
 * @param {string} miniURL Minified URL used to match duplicates.
 * @return {void}
 */
export function makeDuplicatesBold(miniURL) {
	return getModule().makeDuplicatesBold(miniURL);
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
	return getModule().performActionOnTabs(action, tab, options);
}

/**
 * Persists UI row reordering.
 *
 * @return {Promise<void>} Resolves when reordering sync completes.
 */
export function reorderTabsUl() {
	return getModule().reorderTabsUl();
}

/**
 * Refreshes extension state after storage updates.
 *
 * @param {Record<string, unknown>} [options={}] Optional update payload.
 * @return {void}
 */
export function sf_afterSet(options = {}) {
	return getModule().sf_afterSet(options);
}

/**
 * Shows a toast notification in Setup pages.
 *
 * @param {string | string[]} message Message key(s).
 * @param {string} [status="success"] Toast status.
 * @return {Promise<void> | void} Toast side effect.
 */
export function showToast(message, status = undefined) {
	return getModule().showToast(message, status);
}

/**
 * Test-only singleton lifecycle controls and content-module hooks.
 *
 * @type {{
 *   getModule: () => ReturnType<typeof createContentModule> | undefined;
 *   resetModule: () => void;
 *   setModule: (module: ReturnType<typeof createContentModule>) => void;
 *   [hook: string]: unknown;
 * }}
 */
export const __testHooks = new Proxy({
	getModule: () => contentModule,
	resetModule: () => {
		contentModule = undefined;
	},
	setModule: (module) => {
		contentModule = module;
	},
}, {
	get: (target, property, receiver) =>
		Reflect.get(target, property, receiver) ?? getModule().__testHooks[property],
});
