"use strict";

import { createGeneratorModule as createGeneratorPureModule } from "../module/generator-module.js";

/**
 * Creates generator helpers with optional dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Record<string, unknown>} Generator module API.
 */
export function createGeneratorModule(overrides = {}) {
	return createGeneratorPureModule(overrides);
}

let generatorModule;

/**
 * Returns the lazily-created generator module singleton.
 *
 * @return {Record<string, unknown>} Generator module API.
 */
export function getModule() {
	generatorModule ??= createGeneratorModule();
	return generatorModule;
}

/**
 * Test-only controls for the generator module lifecycle.
 */
export const __testHooks = {
	/**
	 * Returns the current generator module singleton.
	 *
	 * @return {Record<string, unknown>} Generator module API.
	 */
	getModule,

	/**
	 * Clears the generator module singleton.
	 *
	 * @return {void}
	 */
	resetModule() {
		generatorModule = undefined;
	},

	/**
	 * Replaces the generator module singleton.
	 *
	 * @param {Record<string, unknown>} module Generator module API.
	 * @return {void}
	 */
	setModule(module) {
		generatorModule = module;
	},
};

export const handleLightningLinkClick =
	(...args) => getModule().handleLightningLinkClick(...args);
export const generateStyleFromSettings =
	(...args) => getModule().generateStyleFromSettings(...args);
export const generateRowTemplate = (...args) =>
	getModule().generateRowTemplate(...args);
export const generateSldsToastMessage =
	(...args) => getModule().generateSldsToastMessage(...args);
export const generateSection = (...args) => getModule().generateSection(...args);
export const generateSldsModal = (...args) =>
	getModule().generateSldsModal(...args);
export const generateRadioButtons = (...args) =>
	getModule().generateRadioButtons(...args);
export const generateOpenOtherOrgModal =
	(...args) => getModule().generateOpenOtherOrgModal(...args);
export const generateSldsFileInput = (...args) =>
	getModule().generateSldsFileInput(...args);
export const generateCheckboxWithLabel =
	(...args) => getModule().generateCheckboxWithLabel(...args);
export const generateUpdateTabModal = (...args) =>
	getModule().generateUpdateTabModal(...args);
export const generateHelpWith_i_popup =
	(...args) => getModule().generateHelpWith_i_popup(...args);
export const generateSldsModalWithTabList =
	(...args) => getModule().generateSldsModalWithTabList(...args);
export const createManageTabRow = (...args) =>
	getModule().createManageTabRow(...args);
export const generateManageTabsModal = (...args) =>
	getModule().generateManageTabsModal(...args);
export const generateReviewSponsorSvgs =
	(...args) => getModule().generateReviewSponsorSvgs(...args);
/** Generates tutorial elements, including optional guide link button. */
export const generateTutorialElements =
	(...args) => getModule().generateTutorialElements(...args);
export const sldsConfirm = (...args) => getModule().sldsConfirm(...args);
