"use strict";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
	CXM_MANAGE_TABS,
	WHAT_EXPORT_CHECK,
	WHAT_GET_COMMANDS,
	WHAT_SHOW_IMPORT,
	WHAT_START_TUTORIAL,
} from "../../core/constants.js";
import {
	areFramePatternsAllowed,
	isOnSalesforceSetup,
	openSettingsPage,
	sendExtensionMessage,
} from "../../core/functions.js";
import { getTranslations, TranslationService } from "../../core/translator.js";
import {
	createPopupModule as createPopupPureModule,
	runPopup as runPopupPure,
} from "./popup-module.js";

/**
 * Creates the popup runtime module with real dependencies by default.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @param {{ runtime: { getURL: (path: string) => string } }} [overrides.browser=BROWSER] Browser API object.
 * @param {() => Promise<boolean>} [overrides.areFramePatternsAllowedFn=areFramePatternsAllowed] Frame permission checker.
 * @param {() => void} [overrides.closePopupFn=close] Popup close callback.
 * @param {{ getElementById: (id: string) => {
 *   addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *   dataset: Record<string, string>;
 *   title: string;
 * } | null }} [overrides.documentRef=document] Popup document-like object.
 * @param {(message: string | string[], connector?: string) => Promise<string | string[]>} [overrides.getTranslationsFn=getTranslations] Translation function.
 * @param {() => Promise<{ison: boolean; url?: string | null}>} [overrides.isOnSalesforceSetupFn=isOnSalesforceSetup] Salesforce setup detector.
 * @param {{ href: string }} [overrides.locationRef=globalThis.location] Mutable location object for redirects.
 * @param {() => void} [overrides.openSettingsPageFn=openSettingsPage] Settings opener.
 * @param {(message: Record<string, unknown>) => Promise<unknown> | unknown} [overrides.sendExtensionMessageFn=sendExtensionMessage] Extension message sender.
 * @param {string} [overrides.translationDataset=TranslationService.TRANSLATE_DATASET] Dataset key for translation attributes.
 * @param {string} [overrides.translationSeparator=TranslationService.TRANSLATE_SEPARATOR] Separator in translation attributes.
 * @return {{ runPopup: () => Promise<{ redirected: boolean }> }} Popup runtime API.
 */
export function createPopupModule({
	browser = BROWSER,
	areFramePatternsAllowedFn = areFramePatternsAllowed,
	closePopupFn = close,
	documentRef = document,
	getTranslationsFn = getTranslations,
	isOnSalesforceSetupFn = isOnSalesforceSetup,
	locationRef = globalThis.location,
	openSettingsPageFn = openSettingsPage,
	sendExtensionMessageFn = sendExtensionMessage,
	translationDataset = TranslationService.TRANSLATE_DATASET,
	translationSeparator = TranslationService.TRANSLATE_SEPARATOR,
} = {}) {
	return createPopupPureModule({
		browser,
		areFramePatternsAllowedFn,
		closePopupFn,
		documentRef,
		getTranslationsFn,
		isOnSalesforceSetupFn,
		locationRef,
		openSettingsPageFn,
		sendExtensionMessageFn,
		translationDataset,
		translationSeparator,
		cmdExportAll: CMD_EXPORT_ALL,
		cmdImport: CMD_IMPORT,
		cmdOpenSettings: CMD_OPEN_SETTINGS,
		cxmManageTabs: CXM_MANAGE_TABS,
		whatExportCheck: WHAT_EXPORT_CHECK,
		whatGetCommands: WHAT_GET_COMMANDS,
		whatShowImport: WHAT_SHOW_IMPORT,
		whatStartTutorial: WHAT_START_TUTORIAL,
	});
}

/**
 * Executes popup startup behavior with real runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
export function runPopup(overrides = {}) {
	const popupModule = createPopupModule(overrides);
	return popupModule.runPopup();
}

/**
 * Executes popup startup behavior with complete dependency overrides.
 *
 * @param {Object} [options={}] Fully injected popup options.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
export function runPopupWithInjectedOptions(options = {}) {
	return runPopupPure(options);
}
