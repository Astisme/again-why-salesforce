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
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	LIGHTNING_FORCE_COM,
	LOCALE_KEY,
	MY_SALESFORCE_COM,
	MY_SALESFORCE_SETUP_COM,
	NO_RELEASE_NOTES,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	PERM_CHECK,
	PREVENT_DEFAULT_OVERRIDE,
	SETUP_LIGHTNING_PATTERN,
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_BOLD,
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
} from "/core/constants.js";
import { isSalesforceHostname, openSettingsPage } from "/core/functions.js";
import Tab from "/core/tab.js";
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
export {
	bg_getSettings,
	bg_getStorage,
	bg_setStorage,
} from "./storage.js";

/**
 * Determines the Salesforce API host and constructs authorization headers based on the current URL.
 * - Validates the URL against supported Salesforce domains.
 * - Normalizes certain Salesforce subdomains to the main domain.
 * - Retrieves the session ID cookie ("sid") for authentication.
 * - Returns the API host origin and headers needed for authorized requests.
 *
 * Why this exists: users navigate on `lightning.force.com` and
 * `my.salesforce-setup.com`, but Salesforce session cookies are scoped to
 * `my.salesforce.com`; API calls fail unless we bridge to that host family.
 *
 * @param {string} currentUrl - Active Salesforce URL.
 * @return {Promise<[string, Record<string, string>]|undefined>} API host and headers or undefined for unsupported hosts.
 */
async function _getAPIHostAndHeaders(currentUrl) {
	const url = new URL(currentUrl);
	let origin = url.origin;
	if (!isSalesforceHostname(url)) {
		return;
	}
	// Why this exists: REST calls and `sid` cookie lookup must use
	// the `my.salesforce.com` host family even when browsing setup/lightning.
	if (url.hostname.endsWith(LIGHTNING_FORCE_COM)) {
		origin = url.origin.replace(LIGHTNING_FORCE_COM, MY_SALESFORCE_COM);
	} else if (url.hostname.endsWith(MY_SALESFORCE_SETUP_COM)) {
		origin = url.origin.replace(
			MY_SALESFORCE_SETUP_COM,
			MY_SALESFORCE_COM,
		);
	}
	const cookies = await BROWSER.cookies?.getAll({
		domain: origin.replace("https://", ""),
		name: "sid",
	});
	if (cookies == null || cookies.length === 0) {
		throw new Error("error_no_cookies");
	}
	return [
		origin,
		{
			Authorization: `Bearer ${cookies[0].value}`,
			"Content-Type": "application/json",
		},
	];
}
/**
 * Retrieves current user information from the Salesforce userinfo API.
 * Determines the API host and authorization headers based on the provided URL,
 * fetches the user info, and returns it as JSON.
 * courtesy of derroman/salesforce-user-language-switcher
 *
 * @param {string} currentUrl - The current Salesforce URL.
 * @return {Promise<Object|undefined>} A promise resolving to the user info object or undefined on error.
 */
async function getCurrentUserInfo(currentUrl) {
	try {
		const apiHostAndHeaders = await _getAPIHostAndHeaders(currentUrl);
		if (apiHostAndHeaders == null) {
			return;
		}
		const [apiHost, headers] = apiHostAndHeaders;
		const retrievedRows = await fetch(
			`${apiHost}/services/oauth2/userinfo`,
			{ headers },
		);
		return await retrievedRows.json();
	} catch (error) {
		console.error(error);
		return;
	}
}

/**
 * Retrieves the Salesforce language setting for the current user.
 * Attempts to fetch language info from Salesforce user data and stores it;
 * falls back to stored locale if unavailable.
 *
 * @param {Function|null} [callback=null] - Optional callback to receive the language.
 * @return {Promise<string|any>|void} The language code or nothing if callback is provided.
 */
export async function bg_getSalesforceLanguage(callback = null) {
	const currentUrl = (await bg_getCurrentBrowserTab())?.url;
	const language = (await getCurrentUserInfo(currentUrl))?.language;
	if (language == null) {
		return bg_getStorage(callback, LOCALE_KEY);
	} else {
		bg_setStorage(language, callback, LOCALE_KEY);
		return language;
	}
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
export async function bg_getCommandLinks(commands = null, callback = null) {
	const allCommands = await BROWSER.commands.getAll();
	const availableCommands = allCommands.filter((singleCommand) =>
		singleCommand.shortcut !== ""
	);
	if (commands == null) {
		if (callback == null) {
			return availableCommands;
		}
		callback(availableCommands);
		return;
	}
	if (!Array.isArray(commands)) {
		commands = [commands];
	}
	const requestedCommands = availableCommands.filter((ac) =>
		commands.includes(ac.name)
	);
	if (callback == null) {
		return requestedCommands;
	}
	callback(requestedCommands);
}

/**
 * Checks whether the object passed as contains is contained in the granted permissions
 * @param {Object} contains - the permission object to be checked
 * @param {function} callback - the function to call to send the response back
 * @return {boolean} the response from the API
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
				// Why this exists: popup code asks for a "check-only" preflight so it
				// can show the export modal only when downloads permission is already
				// available, avoiding duplicate UI prompts.
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
		// Why this exists: keyboard shortcuts are extension-wide, but most actions
		// here mutate Salesforce setup tabs; short-circuit outside setup pages.
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
					// Why this exists: settings shortcut should open options immediately
					// and not forward a content-script message.
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
					message.message = `Received unknown command: ${command}`;
				}
				break;
		}
		bg_notify(message);
	});
}

/**
 * Persists the styles for the given key
 *
 * @param {string} [key=ORG_TAB_STYLE_KEY] - the key for which we want to create the style
 * @param {...Array[Object]} styles - the new styles to apply for the key
 * @return {Promise[Array[Object]]} the created styles
 */
async function _createDefaultStyle(key = ORG_TAB_STYLE_KEY, ...styles) {
	await bg_setStorage(
		styles.filter(Boolean),
		undefined,
		key,
	);
	return styles;
}

/**
 * Wrapper function for _createDefaultStyle; filters the availableStyles before calling it
 *
 * @param {Object} availableStyles - the currently saved styles which are in use
 * @param {string} [key=ORG_TAB_STYLE_KEY] - the key for which the function should inherit the styles from
 * @param {string} [newKey=ORG_PINNED_TAB_STYLE_KEY] - the key for which we want to create the style
 * @param {...Array[Object]} styles - the new styles to apply for the newKey
 * @return {Promise[Array[Object]]} the created styles
 */
async function _createDefaultStyleWrapper(
	availableStyles,
	key = ORG_TAB_STYLE_KEY,
	newKey = ORG_PINNED_TAB_STYLE_KEY,
	...styles
) {
	const filteredStyles = availableStyles[key]
		?.filter((el) =>
			el.id !== PREVENT_DEFAULT_OVERRIDE &&
			// override user-set background
			el.id !== TAB_STYLE_BACKGROUND
		) ?? [];
	return await _createDefaultStyle(
		newKey,
		...filteredStyles,
		...styles,
	);
}

/**
 * Ensures default organizational style settings exist;
 * if none are found, creates and saves default styles for org-specific tabs.
 */
async function setDefaultOrgStyle() {
	const availableStyles = (await bg_getStyleSettings()) ?? {};
	// if no style settings have been found,
	// create the default style for org-specific Tabs & send it to the background.
	// same goes for org-specific pinned Tabs
	const boldStyle = [
		{ id: TAB_STYLE_BOLD, forActive: false, value: TAB_STYLE_BOLD },
		{ id: TAB_STYLE_BOLD, forActive: true, value: TAB_STYLE_BOLD },
	];
	if (availableStyles[ORG_TAB_STYLE_KEY] == null) {
		availableStyles[ORG_TAB_STYLE_KEY] = await _createDefaultStyle(
			ORG_TAB_STYLE_KEY,
			...boldStyle,
		);
	}
	// for pinned Tabs, assign the same current styles used for the unpinned counterparts
	// but change the color of the background to the default one
	const pinnedStyles = [
		{ id: TAB_STYLE_BACKGROUND, forActive: false, value: "#FFE4E1" },
		{ id: TAB_STYLE_BACKGROUND, forActive: true, value: "#FFE4E1" },
	];
	if (availableStyles[ORG_PINNED_TAB_STYLE_KEY] == null) {
		availableStyles[ORG_PINNED_TAB_STYLE_KEY] = _createDefaultStyleWrapper(
			availableStyles,
			ORG_TAB_STYLE_KEY,
			ORG_PINNED_TAB_STYLE_KEY,
			...pinnedStyles,
		);
	}
	if (availableStyles[GENERIC_PINNED_TAB_STYLE_KEY] == null) {
		availableStyles[GENERIC_PINNED_TAB_STYLE_KEY] =
			_createDefaultStyleWrapper(
				availableStyles,
				GENERIC_TAB_STYLE_KEY,
				GENERIC_PINNED_TAB_STYLE_KEY,
				...pinnedStyles,
			);
	}
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
		// Why this exists: changelog opens only for real updates so first install
		// and temporary dev loads do not create noisy tabs.
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
	BROWSER.tabs.onActivated.addListener(() =>
		debouncedCheckMenus(WHAT_HIGHLIGHTED, checkForUpdates)
	);
	//BROWSER.tabs.onHighlighted.addListener(() => checkAddRemoveContextMenus(WHAT_HIGHLIGHTED));
	// when the current tab URL changes without switching tabs
	BROWSER.tabs.onUpdated?.addListener((_, changeInfo, tab) => {
		if (
			tab?.active !== true ||
			(changeInfo.status !== "complete" && changeInfo.url == null)
		) {
			// Why this exists: context-menu refresh should happen only when the
			// active tab meaningfully changes, not for background tab churn.
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
