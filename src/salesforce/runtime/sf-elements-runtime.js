"use strict";

import { EXTENSION_NAME } from "../../core/constants.js";
import {
	createSfElementsModule as createSfElementsPureModule,
} from "../module/sf-elements-module.js";

/**
 * Creates Salesforce element helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @param {{
 *   createElement: (tag: string) => unknown;
 *   getElementsByClassName: (name: string) => ArrayLike<unknown> | null;
 *   querySelector: (selector: string) => unknown;
 * }} [overrides.documentRef=document] Document-like object.
 * @param {string} [overrides.extensionName=EXTENSION_NAME] Extension id used for setup tab UL id.
 * @param {{ href?: string }} [overrides.locationRef=globalThis.location] Location-like object.
 * @return {{
 *   __testHooks: {
 *     addListeners: (setupTabUl?: unknown) => void;
 *   };
 *   findSetupTabUlInSalesforcePage: () => boolean;
 *   getCurrentHref: () => string;
 *   getModalHanger: () => unknown;
 *   getSetupTabUl: () => unknown;
 *   setSetupTabUl: (newSetupTabUl: unknown) => void;
 * }} Salesforce runtime helper API.
 */
export function createSfElementsModule({
	documentRef = document,
	extensionName = EXTENSION_NAME,
	locationRef = globalThis.location,
} = {}) {
	return createSfElementsPureModule({
		documentRef,
		extensionName,
		locationRef,
	});
}

/** @type {ReturnType<typeof createSfElementsModule> | undefined} */
let sfElementsModule;

/**
 * Returns lazily created Salesforce-element module singleton.
 *
 * @return {ReturnType<typeof createSfElementsModule>} Salesforce-element module singleton.
 */
function getModule() {
	sfElementsModule ??= createSfElementsModule();
	return sfElementsModule;
}

/**
 * Returns the setup tab UL element.
 *
 * @return {unknown} Setup tab UL.
 */
export function getSetupTabUl() {
	return getModule().getSetupTabUl();
}

/**
 * Stores the setup tab UL element.
 *
 * @param {unknown} newSetupTabUl Setup tab UL.
 * @return {void}
 */
export function setSetupTabUl(newSetupTabUl) {
	return getModule().setSetupTabUl(newSetupTabUl);
}

/**
 * Finds and initializes the extension setup tab UL.
 *
 * @return {boolean} True when setup tab UL exists or gets created.
 */
export function findSetupTabUlInSalesforcePage() {
	return getModule().findSetupTabUlInSalesforcePage();
}

/**
 * Returns and caches the modal hanger element.
 *
 * @return {unknown} Modal hanger.
 */
export function getModalHanger() {
	return getModule().getModalHanger();
}

/**
 * Returns the current href string.
 *
 * @return {string} Current href value.
 */
export function getCurrentHref() {
	return getModule().getCurrentHref();
}

/**
 * Test hooks exposed by the singleton sf-elements runtime module.
 */
export const __testHooks = {
	getModule: () => sfElementsModule,
	resetModule: () => {
		sfElementsModule = undefined;
	},
	setModule: (module) => {
		sfElementsModule = module;
	},
};
