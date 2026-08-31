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
import { TranslationService } from "../../core/translator.js";
import { createPopupModule as _createPopupModule } from "./popup-module.js";

/**
 * Builds runtime defaults for popup wiring.
 *
 * @return {Object} Runtime popup defaults.
 */
export function getPopupRuntimeDefaults() {
	return {
		browser: BROWSER,
		areFramePatternsAllowed: areFramePatternsAllowed,
		closePopup: globalThis.close ?? (() => {}),
		documentRef: globalThis.document,
		getTranslations: TranslationService.getTranslations,
		isOnSalesforceSetup: isOnSalesforceSetup,
		locationRef: globalThis.location,
		openSettingsPage: openSettingsPage,
		sendExtensionMessage: sendExtensionMessage,
		translationDataset: TranslationService.TRANSLATE_DATASET,
		translationSeparator: TranslationService.TRANSLATE_SEPARATOR,
		cmdExportAll: CMD_EXPORT_ALL,
		cmdImport: CMD_IMPORT,
		cmdOpenSettings: CMD_OPEN_SETTINGS,
		cxmManageTabs: CXM_MANAGE_TABS,
		whatExportCheck: WHAT_EXPORT_CHECK,
		whatGetCommands: WHAT_GET_COMMANDS,
		whatShowImport: WHAT_SHOW_IMPORT,
		whatStartTutorial: WHAT_START_TUTORIAL,
	};
}

/**
 * Creates a runtime popup module with extension defaults applied.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {{ runPopup: () => Promise<{ redirected: boolean }> }} Popup module API.
 */
export function createPopupModule(overrides = {}) {
	return _createPopupModule({
		...getPopupRuntimeDefaults(),
		...overrides,
	});
}

/**
 * Executes popup startup behavior with extension runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
export function runPopup(overrides = {}) {
	return createPopupModule(overrides).runPopup();
}
