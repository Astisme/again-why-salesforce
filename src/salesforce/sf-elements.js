"use strict";

import * as sfElementsRuntime from "./runtime/sf-elements-runtime.js";

/**
 * Creates Salesforce element helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {Record<string, unknown>} Salesforce element helper API.
 */
export function createSfElementsModule(overrides = {}) {
	return sfElementsRuntime.createSfElementsModule(overrides);
}

/**
 * Finds and initializes the extension setup tab UL.
 *
 * @return {boolean} True when setup tab UL exists or gets created.
 */
export function findSetupTabUlInSalesforcePage() {
	return sfElementsRuntime.findSetupTabUlInSalesforcePage();
}

/**
 * Returns current href string.
 *
 * @return {string} Current href value.
 */
export function getCurrentHref() {
	return sfElementsRuntime.getCurrentHref();
}

/**
 * Returns cached modal hanger element.
 *
 * @return {unknown} Modal hanger.
 */
export function getModalHanger() {
	return sfElementsRuntime.getModalHanger();
}

/**
 * Returns setup tab UL element.
 *
 * @return {unknown} Setup tab UL.
 */
export function getSetupTabUl() {
	return sfElementsRuntime.getSetupTabUl();
}

/**
 * Stores setup tab UL element.
 *
 * @param {unknown} newSetupTabUl Setup tab UL.
 * @return {void}
 */
export function setSetupTabUl(newSetupTabUl) {
	return sfElementsRuntime.setSetupTabUl(newSetupTabUl);
}

/**
 * Test hooks exposed by Salesforce element runtime.
 */
export const __testHooks = sfElementsRuntime.__testHooks;
