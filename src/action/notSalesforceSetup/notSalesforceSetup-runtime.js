"use strict";

import {
	BROWSER,
	HIDDEN_CLASS,
	POPUP_LOGIN_NEW_TAB,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_SETUP_NEW_TAB,
	SALESFORCE_LIGHTNING_PATTERN,
	SALESFORCE_SETUP_HOME_MINI,
	SETUP_LIGHTNING,
	WHAT_GET_BROWSER_TAB,
} from "../../core/constants.js";
import {
	getSettings as getSettingsDefault,
	sendExtensionMessage as sendExtensionMessageDefault,
} from "../../core/functions.js";
import { TranslationService } from "../../core/translator.js";
import {
	createNotSalesforceSetupModule as createNotSalesforceSetupPureModule,
} from "./notSalesforceSetup-module.js";

let notSalesforceSetupModule = null;

/**
 * Creates non-Salesforce setup popup behavior with extension runtime defaults.
 *
 * @param {Parameters<typeof createNotSalesforceSetupPureModule>[0]} [overrides={}] Runtime overrides.
 * @return {ReturnType<typeof createNotSalesforceSetupPureModule>} Non-Salesforce setup module API.
 */
export function createNotSalesforceSetupModule(overrides = {}) {
	return createNotSalesforceSetupPureModule({
		browser: BROWSER,
		closePopup: globalThis.close ?? (() => {}),
		consoleRef: console,
		documentRef: globalThis.document,
		ensureTranslatorAvailability:
			TranslationService.ensureTranslatorAvailability,
		getSettings: getSettingsDefault,
		hiddenClass: HIDDEN_CLASS,
		locationRef: globalThis.location,
		popupLoginNewTab: POPUP_LOGIN_NEW_TAB,
		popupOpenLogin: POPUP_OPEN_LOGIN,
		popupOpenSetup: POPUP_OPEN_SETUP,
		popupSetupNewTab: POPUP_SETUP_NEW_TAB,
		salesforceLightningPattern: SALESFORCE_LIGHTNING_PATTERN,
		salesforceSetupHomeMini: SALESFORCE_SETUP_HOME_MINI,
		sendExtensionMessage: sendExtensionMessageDefault,
		setTimeout: globalThis.setTimeout,
		setupLightning: SETUP_LIGHTNING,
		whatGetBrowserTab: WHAT_GET_BROWSER_TAB,
		...overrides,
	});
}

/**
 * Gets default non-Salesforce setup module, creating it on first use.
 *
 * @return {ReturnType<typeof createNotSalesforceSetupPureModule>} Non-Salesforce setup module API.
 */
function getModule() {
	notSalesforceSetupModule ??= createNotSalesforceSetupModule();
	return notSalesforceSetupModule;
}

/**
 * Runs non-Salesforce setup popup behavior.
 *
 * @param {Parameters<typeof createNotSalesforceSetupModule>[0]} [overrides] Runtime overrides.
 * @return {ReturnType<ReturnType<typeof createNotSalesforceSetupPureModule>["runNotSalesforceSetup"]>} State describing active redirect button.
 */
export function runNotSalesforceSetup(overrides = undefined) {
	return overrides == null
		? getModule().runNotSalesforceSetup()
		: createNotSalesforceSetupModule(overrides).runNotSalesforceSetup();
}

/**
 * Exposes non-Salesforce setup module lifecycle controls for tests.
 */
export const __testHooks = {
	getModule,
	/**
	 * Clears cached default module.
	 *
	 * @return {void}
	 */
	resetModule() {
		notSalesforceSetupModule = null;
	},
	/**
	 * Replaces cached default module.
	 *
	 * @param {ReturnType<typeof createNotSalesforceSetupPureModule> | null} module Non-Salesforce setup module.
	 * @return {void}
	 */
	setModule(module) {
		notSalesforceSetupModule = module;
	},
};
