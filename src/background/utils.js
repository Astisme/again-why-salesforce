"use strict";
import {
	BROWSER,
	EXTENSION_GITHUB_LINK,
	EXTENSION_NAME,
	EXTENSION_VERSION,
	ISCHROME,
	ISFIREFOX,
	NO_UPDATE_NOTIFICATION,
	SETTINGS_KEY,
	WHAT_EXPORT_FROM_BG,
	WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
	WHAT_UPDATE_EXTENSION,
} from "../core/constants.js";
import { isExportAllowed } from "../core/functions.js";
import { TabContainer } from "../core/tabContainer.js";
import { bg_getSettings, bg_getStorage, bg_setStorage } from "./storage.js";
import { createBackgroundUtilsModule } from "./utils-runtime.js";

let backgroundUtilsModule = null;

/**
 * Creates the default background utilities module.
 *
 * @return {ReturnType<typeof createBackgroundUtilsModule>} Background utilities module.
 */
function createDefaultModule() {
	return createBackgroundUtilsModule({
		browser: BROWSER,
		extensionGithubLink: EXTENSION_GITHUB_LINK,
		extensionName: EXTENSION_NAME,
		extensionVersion: EXTENSION_VERSION,
		isChrome: ISCHROME,
		isFirefox: ISFIREFOX,
		noUpdateNotification: NO_UPDATE_NOTIFICATION,
		settingsKey: SETTINGS_KEY,
		whatExportFromBg: WHAT_EXPORT_FROM_BG,
		whatRequestExportPermissionToOpenPopup:
			WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
		whatUpdateExtension: WHAT_UPDATE_EXTENSION,
		isExportAllowed: isExportAllowed,
		tabContainerRef: TabContainer,
		bgGetSettings: bg_getSettings,
		bgGetStorage: bg_getStorage,
		bgSetStorage: bg_setStorage,
		fetch: (input) => globalThis.fetch(input),
	});
}

/**
 * Gets default background utilities module, creating it on first use.
 *
 * @return {ReturnType<typeof createBackgroundUtilsModule>} Background utilities module.
 */
function getModule() {
	backgroundUtilsModule ??= createDefaultModule();
	return backgroundUtilsModule;
}

/**
 * Retrieves current active browser tab.
 *
 * @param {Parameters<ReturnType<typeof createBackgroundUtilsModule>["bg_getCurrentBrowserTab"]>[0]} [callback] Optional callback.
 * @return {ReturnType<ReturnType<typeof createBackgroundUtilsModule>["bg_getCurrentBrowserTab"]>} Current tab result.
 */
export function bg_getCurrentBrowserTab(callback) {
	return getModule().bg_getCurrentBrowserTab(callback);
}

/**
 * Sends a message to current browser tab.
 *
 * @param {Parameters<ReturnType<typeof createBackgroundUtilsModule>["bg_notify"]>[0]} message Message payload.
 * @return {ReturnType<ReturnType<typeof createBackgroundUtilsModule>["bg_notify"]>} Notification result.
 */
export function bg_notify(message) {
	return getModule().bg_notify(message);
}

/**
 * Checks extension releases and notifies about newer versions.
 *
 * @return {ReturnType<ReturnType<typeof createBackgroundUtilsModule>["checkForUpdates"]>} Update check result.
 */
export function checkForUpdates() {
	return getModule().checkForUpdates();
}

/**
 * Checks download permission and optionally launches export.
 *
 * @param {Parameters<ReturnType<typeof createBackgroundUtilsModule>["checkLaunchExport"]>[0]} [tabs] Optional tab payload.
 * @param {Parameters<ReturnType<typeof createBackgroundUtilsModule>["checkLaunchExport"]>[1]} [checkOnly] Whether to skip export.
 * @return {ReturnType<ReturnType<typeof createBackgroundUtilsModule>["checkLaunchExport"]>} Permission state.
 */
export function checkLaunchExport(tabs, checkOnly) {
	return getModule().checkLaunchExport(tabs, checkOnly);
}

/**
 * Exposes background utility module lifecycle controls for tests.
 */
export const __testHooks = {
	getModule,
	/**
	 * Clears cached default module.
	 *
	 * @return {void}
	 */
	resetModule() {
		backgroundUtilsModule = null;
	},
	/**
	 * Replaces cached default module.
	 *
	 * @param {ReturnType<typeof createBackgroundUtilsModule> | null} module Background utilities module.
	 * @return {void}
	 */
	setModule(module) {
		backgroundUtilsModule = module;
	},
};
