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

const {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkForUpdates,
	checkLaunchExport,
} = createBackgroundUtilsModule({
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
	isExportAllowedFn: isExportAllowed,
	tabContainerRef: TabContainer,
	bgGetSettingsFn: bg_getSettings,
	bgGetStorageFn: bg_getStorage,
	bgSetStorageFn: bg_setStorage,
	fetchFn: (input) => globalThis.fetch(input),
});

export { bg_getCurrentBrowserTab, bg_notify, checkForUpdates, checkLaunchExport };
