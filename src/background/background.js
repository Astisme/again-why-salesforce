"use strict";
import {
	ALL_CMD_KEYS,
	ALL_WHAT_REASONS,
	BROWSER,
	CMD_AND_CXM_MAP_TO_WHAT,
	CMD_EXPORT_ALL,
	CMD_OPEN_SETTINGS,
	CXM_MANAGE_TABS,
	EXTENSION_GITHUB_LINK,
	NO_RELEASE_NOTES,
	PERM_CHECK,
	SETUP_LIGHTNING_PATTERN,
	TOAST_ERROR,
	TOAST_WARNING,
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
	WHAT_START_TUTORIAL,
	WHAT_STARTUP,
	WHAT_THEME,
} from "../core/constants.js";
import { openSettingsPage } from "../core/functions.js";
import Tab from "../core/tab.js";
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
import { bg_getSalesforceLanguage as _bg_getSalesforceLanguage } from "./salesforce-language.js";
import { bg_getCommandLinks as _bg_getCommandLinks } from "./commands.js";
import { setDefaultOrgStyle } from "./default-styles.js";

/**
 * Retrieves the Salesforce language setting for the current user.
 * Attempts to fetch language info from Salesforce user data and stores it;
 * falls back to stored locale if unavailable.
 *
 * @param {Function|null} [callback=null] - Optional callback to receive the language.
 * @return {Promise<string|any>|void} The language code or nothing if callback is provided.
 */
export function bg_getSalesforceLanguage(callback = null) {
	return _bg_getSalesforceLanguage(BROWSER, callback);
}

/**
 * Retrieves all or specified command shortcuts available in the browser extension.
 * Filters commands to those that have assigned shortcuts.
 * Supports optional callback or returns a Promise.
 *
 * @param {string|string[]|null} [commands=null] - One or more command names to filter. If null, returns all commands with shortcuts.
 * @param {Function|null} [callback=null] - Optional callback to receive the commands.
 * @return {Promise<Array<Object>>|void} Promise resolving to command objects or void if callback is provided.
 */
export function bg_getCommandLinks(commands = null, callback = null) {
	return _bg_getCommandLinks(BROWSER, commands, callback);
}

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
				break;
			case WHAT_SAVED:
			case WHAT_SHOW_IMPORT:
			case WHAT_THEME:
			case TOAST_ERROR:
			case TOAST_WARNING:
			case WHAT_SHOW_EXPORT_MODAL:
			case CXM_MANAGE_TABS: // from popup
			case WHAT_START_TUTORIAL: // from popup
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
 * Listens for extension command events and executes appropriate actions
 * based on the current Salesforce Setup page context and command received.
 */
function listenToExtensionCommands() {
	BROWSER.commands.onCommand.addListener(async (command) => {
		// check the current page is Salesforce Setup
		const browserTabUrl = (await bg_getCurrentBrowserTab())?.url;
		if (!browserTabUrl?.match(SETUP_LIGHTNING_PATTERN)) { // we're not in Salesforce Setup
			return;
		}
		const message = {
			what: CMD_AND_CXM_MAP_TO_WHAT[command] ?? command,
			url: Tab.minifyURL(browserTabUrl),
			org: Tab.extractOrgName(browserTabUrl),
		};
		switch (command) {
			case CMD_OPEN_SETTINGS:
				openSettingsPage();
				return;
			case CMD_EXPORT_ALL:
				if (!checkLaunchExport(undefined, true)) {
					return;
				}
				break;
			default:
				if (!ALL_CMD_KEYS.has(command)) {
					message.what = TOAST_WARNING;
					message.what = TOAST_WARNING;
					message.message = `Received unknown command: ${command}`;
				}
				break;
		}
		bg_notify(message);
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
			// get the extension version
			// open github to show the release notes
			BROWSER.tabs.create({
				url: `${EXTENSION_GITHUB_LINK}/tree/main/docs/CHANGELOG.md`,
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

	/*
  // TODO update uninstall url
  BROWSER.runtime.setUninstallURL("https://www.duckduckgo.com/", () => {
      removeMenuItems()
  });
  */
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
