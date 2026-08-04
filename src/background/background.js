"use strict";
import {
	ALL_WHAT_REASONS,
	BROWSER,
	CHANGELOG_LINK,
	CXM_MANAGE_TABS,
	NO_RELEASE_NOTES,
	PERM_CHECK,
	PREVENT_ANALYTICS,
	TOAST_ERROR,
	TOAST_WARNING,
	UNINSTALL_SURVEY_LINK_NO_PING,
	UNINSTALL_SURVEY_LINK_YES_PING,
	WHAT_ACTIVATE,
	WHAT_EXPORT,
	WHAT_EXPORT_CHECK,
	WHAT_FOCUS_CHANGED,
	WHAT_GET,
	WHAT_GET_BROWSER_TAB,
	WHAT_GET_COMMANDS,
	WHAT_GET_SETTINGS,
	WHAT_GET_SF_LANG,
	WHAT_GET_STYLE_SETTINGS,
	WHAT_HIGHLIGHTED,
	WHAT_INSTALLED,
	WHAT_SAVED,
	WHAT_SET,
	WHAT_SHOW_EXPORT_MODAL,
	WHAT_SHOW_IMPORT,
	WHAT_SHOW_REVIEW,
	WHAT_SHOW_SPONSOR,
	WHAT_START_TUTORIAL,
	WHAT_STARTUP,
	WHAT_THEME,
} from "../core/constants.js";
import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkForUpdates,
	checkLaunchExport,
} from "./utils.js";
import {
	checkAddRemoveContextMenus,
	refreshContextMenus,
} from "./context-menus.js";
import {
	bg_getSettings,
	bg_getStorage,
	bg_getStyleSettings,
	bg_setStorage,
} from "./storage.js";
import { bg_getSalesforceLanguage } from "./salesforce-language.js";
import { bg_getCommandLinks, listenToExtensionCommands } from "./commands.js";
import { setDefaultOrgStyle } from "./default-styles.js";

/**
 * Checks whether the object passed as contains is contained in the granted permissions.
 *
 * @param {Object} contains - the permission object to be checked.
 * @param {function} callback - the function to call to send the response back.
 * @return {Promise<boolean>} the response from the API.
 */
async function bg_isPermissionGranted(contains, callback) {
	const response = await BROWSER.permissions.contains(contains);
	callback?.(response);
	return response;
}

/**
 * Check if settings contains PREVENT_ANALYTICS and update uninstallURL accordingly
 * @param {any[]} [settings=[]] the settings the user wants to set
 */
function bg_checkUpdateUninstallURL(settings = []) {
	const preventAnalytics = settings.find((el) => el.id === PREVENT_ANALYTICS);
	if (preventAnalytics == null) return;
	const link = preventAnalytics.enabled
		? UNINSTALL_SURVEY_LINK_NO_PING // the user has disabled the analytics
		: UNINSTALL_SURVEY_LINK_YES_PING; // the user has enabled the analytics
	BROWSER.runtime.setUninstallURL(link);
}

/**
 * Listens for incoming messages and processes requests to get, set, or bg_notify about storage changes.
 * Also handles theme updates and tab-related messages.
 *
 * @param {Object} request - The incoming message request.
 * @param {Object} _ - The sender object (unused).
 * @param {function} sendResponse - The function to send a response back.
 * @return {boolean} Whether the message was handled asynchronously.
 */
function listenToExtensionMessages() {
	BROWSER.runtime.onMessage.addListener((request, _, sendResponse) => {
		if (request?.what == null) {
			console.error({ error: "error_invalid_request", request });
			sendResponse(null);
			return false;
		}
		switch (request.what) {
			case WHAT_GET:
				bg_getStorage(sendResponse, request.key);
				break;
			case WHAT_SET:
				bg_setStorage(request.set, sendResponse, request.key);
				bg_checkUpdateUninstallURL(request.set);
				break;
			case WHAT_SAVED:
			case WHAT_SHOW_IMPORT:
			case WHAT_THEME:
			case TOAST_ERROR:
			case TOAST_WARNING:
			case WHAT_SHOW_EXPORT_MODAL:
			case CXM_MANAGE_TABS: // from popup
			case WHAT_START_TUTORIAL: // from popup
			case WHAT_SHOW_REVIEW:
			case WHAT_SHOW_SPONSOR:
				sendResponse(null);
				setTimeout(() => bg_notify(request), 250); // delay the notification to prevent accidental removal (for WHAT_SHOW_IMPORT)
				break;
			case WHAT_EXPORT_CHECK:
				if (checkLaunchExport(undefined, true)) {
					sendResponse(null);
					bg_notify({
						what: WHAT_SHOW_EXPORT_MODAL,
					});
				}
				break;
			case WHAT_EXPORT:
				checkLaunchExport(request.tabs);
				sendResponse(null);
				break;
			case WHAT_GET_BROWSER_TAB:
				bg_getCurrentBrowserTab(sendResponse);
				break;
			case WHAT_GET_SF_LANG:
				bg_getSalesforceLanguage(sendResponse);
				break;
			case WHAT_GET_SETTINGS:
				bg_getSettings(request.keys, undefined, sendResponse);
				break;
			case WHAT_GET_STYLE_SETTINGS:
				bg_getStyleSettings(request.key, sendResponse);
				break;
			case WHAT_GET_COMMANDS:
				bg_getCommandLinks(request.commands, sendResponse);
				break;
			case PERM_CHECK:
				bg_isPermissionGranted(request.contains, sendResponse);
				break;
			default:
				if (!ALL_WHAT_REASONS.has(request.what)) {
					console.error({ error: "error_unknown_request", request });
				}
				break;
		}
		return true;
	});
}

/**
 * Creates a debounced version of a function that delays its execution until after a specified delay period has passed since the last call.
 * The returned debounced function can be called multiple times, but the actual execution of the original function will only happen once the
 * specified delay has passed since the last invocation.
 *
 * @param {Function} fn - The function to debounce.
 * @param {number} [delay=150] - The delay in milliseconds before the function is executed after the last invocation.
 * @return {Function} A debounced version of the provided function.
 */
function _debounce(fn, delay = 150) {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Sets up various browser event listeners for the extension, including:
 * - Debounced context menu checks on tab/window changes
 * - Handling extension startup and installation events
 * - Opening release notes after updates
 * - Responding to tab activation and window focus changes
 */
function setExtensionBrowserListeners() {
	// Debounced version for high-frequency events
	const debouncedCheckMenus = _debounce(checkAddRemoveContextMenus);
	// when the browser starts
	BROWSER.runtime.onStartup.addListener(() =>
		checkAddRemoveContextMenus(WHAT_STARTUP)
	);
	// when the extension is installed / updated
	BROWSER.runtime.onInstalled.addListener(async (details) => {
		if (details.temporary) return; // skip during development
		checkAddRemoveContextMenus(WHAT_INSTALLED);
		if (details.reason === "update") {
			// the extension has been updated
			// check user settings
			const no_release_notes = await bg_getSettings(NO_RELEASE_NOTES);
			if (no_release_notes?.enabled === true) {
				return;
			}
			// open changelog to show the release notes
			BROWSER.tabs.create({
				url: CHANGELOG_LINK,
			});
		}
	});
	// when the extension is activated by the BROWSER
	self.addEventListener(
		"activate",
		() => checkAddRemoveContextMenus(WHAT_ACTIVATE),
	);
	// when the active tab changes
	BROWSER.tabs.onActivated.addListener(() => {
		debouncedCheckMenus(WHAT_HIGHLIGHTED, checkForUpdates);
	});
	//BROWSER.tabs.onHighlighted.addListener(() => checkAddRemoveContextMenus(WHAT_HIGHLIGHTED));
	// when the current tab URL changes without switching tabs
	BROWSER.tabs.onUpdated?.addListener((_, changeInfo, tab) => {
		if (
			tab?.active !== true ||
			(changeInfo.status !== "complete" && changeInfo.url == null)
		) {
			return;
		}
		debouncedCheckMenus(WHAT_HIGHLIGHTED);
	});
	// when window changes
	BROWSER.windows.onFocusChanged.addListener(() =>
		checkAddRemoveContextMenus(WHAT_FOCUS_CHANGED)
	);
	BROWSER.commands.onChanged?.addListener(() => {
		refreshContextMenus(WHAT_HIGHLIGHTED);
	});

	BROWSER.runtime.setUninstallURL(UNINSTALL_SURVEY_LINK_YES_PING);
}

/**
 * Main entry point to initialize extension listeners, default styles,
 * command listeners, message listeners, and context menu checks.
 */
function main() {
	setExtensionBrowserListeners();
	setDefaultOrgStyle();
	listenToExtensionMessages();
	listenToExtensionCommands();
	checkAddRemoveContextMenus();
}

main();
