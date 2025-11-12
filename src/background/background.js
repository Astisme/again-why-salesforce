"use strict";
import {
	BROWSER,
  PREVENT_DEFAULT_OVERRIDE,
  TAB_STYLE_BACKGROUND,
  TAB_STYLE_BOLD,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_OTHER_ORG,
	CMD_OPEN_SETTINGS,
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	CMD_TOGGLE_ORG,
	CMD_UPDATE_TAB,
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	LIGHTNING_FORCE_COM,
	LOCALE_KEY,
	MANIFEST,
	MY_SALESFORCE_COM,
	MY_SALESFORCE_SETUP_COM,
	NO_RELEASE_NOTES,
	openSettingsPage,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	SETTINGS_KEY,
	SETUP_LIGHTNING_PATTERN,
	SUPPORTED_SALESFORCE_URLS,
	WHY_KEY,
} from "/constants.js";
import Tab from "/tab.js";
import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkForUpdates,
	checkLaunchExport,
} from "./utils.js";
import { checkAddRemoveContextMenus } from "./context-menus.js";

/**
 * Invoke the runtime to send the message
 *
 * @param {function} callback - The callback to execute after sending the message
 */
function _getFromStorage(key, callback) {
	return BROWSER.storage.sync.get(
		Array.isArray(key) ? key : [key],
		(items) => callback(Array.isArray(key) ? items : items[key]),
	);
}
/**
 * Retrieves data from browser storage under the specified key.
 *
 * Supports both callback and Promise-based usage.
 *
 * @param {function} [callback] - Optional callback to handle the retrieved data.
 * @param {string} [key=WHY_KEY] - The storage key to retrieve data from.
 * @returns {Promise<any>|void} Returns a Promise if no callback is provided, otherwise void.
 */
export function bg_getStorage(callback, key = WHY_KEY) {
	if (callback == null) {
		return new Promise((resolve, reject) => {
			_getFromStorage(
				key,
				(response) => {
					if (BROWSER.runtime.lastError) {
						reject(BROWSER.runtime.lastError);
					} else {
						resolve(response);
					}
				},
			);
		});
	}
	_getFromStorage(key, callback);
}

/**
 * Retrieves settings from background storage based on specified keys.
 * If `settingKeys` is null, returns all settings.
 * Supports optional callback usage or returns a Promise with the result.
 *
 * @param {string|string[]|null} [settingKeys=null] - Single key or array of keys to retrieve. If null, all settings are returned.
 * @param {string} [key=SETTINGS_KEY] - The storage key namespace to retrieve settings from.
 * @param {Function|null} [callback=null] - Optional callback to handle the retrieved settings.
 * @returns {Promise<Object|Object[]>|void} A Promise resolving to the requested settings, or void if a callback is provided.
 */
export async function bg_getSettings(
	settingKeys = null,
	key = SETTINGS_KEY,
	callback = null,
) {
	const settings = await bg_getStorage(null, key);
	if (settingKeys == null || settings == null) {
		if (callback == null) {
			return settings;
		}
		return callback(settings);
	}
	if (!Array.isArray(settingKeys)) {
		settingKeys = [settingKeys];
	}
	const requestedSettings = settings.filter((setting) =>
		settingKeys.includes(setting.id)
	);
	const response = settingKeys.length === 1 && key === SETTINGS_KEY
		? requestedSettings[0]
		: requestedSettings;
	if (callback == null) {
		return response;
	}
	callback(response);
}

async function bg_getStyleSettings(
  key = null,
  callback = null
){
  if(key == null)
    key = [
      GENERIC_TAB_STYLE_KEY,
      ORG_TAB_STYLE_KEY,
      GENERIC_PINNED_TAB_STYLE_KEY,
      ORG_PINNED_TAB_STYLE_KEY,
    ];
  return await bg_getSettings(
    undefined,
    key,
    callback,
  );
}

/**
 * Finds the already stored settings and merges them with the new ones passed as input by matching them with the id field
 *
 * @param {Array} newsettings - The settings to be stored
 * @param {string} [key=SETTINGS_KEY]  - The key of the settings where to merge and store the newsettings array
 */
async function mergeSettings(newsettings, key = SETTINGS_KEY) {
	// get the settings array
	const isStyleKey = 
    key === GENERIC_TAB_STYLE_KEY ||
		key === ORG_TAB_STYLE_KEY ||
    key === GENERIC_PINNED_TAB_STYLE_KEY ||
		key === ORG_PINNED_TAB_STYLE_KEY;
	const settingsArray = await bg_getSettings(
		...(isStyleKey ? [null, key] : []),
	);
	if (settingsArray == null) {
		return newsettings;
	}
	for (const item of newsettings) {
		// check if the item.id is already present
		const existingItems = settingsArray.filter((setting) =>
			setting.id === item.id &&
			(
				!isStyleKey ||
				(
					setting.forActive == null ||
					setting.forActive === item.forActive
				)
			)
		);
		if (existingItems.length <= 0) {
			// add the new setting
			settingsArray.push(item);
			continue;
		}
		for (const existing of existingItems) {
			if (isStyleKey) {
				if (item.value == null || item.value === "") {
					// the item has been removed
					const index = settingsArray.indexOf(existing);
					if (index >= 0) {
						settingsArray.splice(index, 1);
					}
				} else {
					// the item has been updated
					existing.value = item.value;
				}
			} else {
				// update the object reference (inside the settingsArray)
				Object.assign(existing, item);
			}
		}
	}
	return settingsArray;
}

/**
 * Stores the provided tabs data in the browser's storage and invokes the callback.
 *
 * @param {Array} tobeset - The object to be stored
 * @param {function} callback - The callback to execute after storing the data.
 * @param {string} [key=WHY_KEY] - The key of the map where to store the tobeset array
 * @returns {Promise} the promise from BROWSER.storage.sync.set
 */
export async function bg_setStorage(tobeset, callback, key = WHY_KEY) {
	const set = {};
	const changedToArray = !Array.isArray(tobeset);
	if (changedToArray) {
		tobeset = [tobeset];
	}
	switch (key) {
		case SETTINGS_KEY:
		case GENERIC_TAB_STYLE_KEY:
		case ORG_TAB_STYLE_KEY:
		case GENERIC_PINNED_TAB_STYLE_KEY:
		case ORG_PINNED_TAB_STYLE_KEY: {
			set[key] = await mergeSettings(tobeset, key);
			break;
		}
    case WHY_KEY:
    case LOCALE_KEY:
			if (changedToArray) {
				tobeset = tobeset[0];
			}
			set[key] = tobeset;
      break;
		default:
      throw new Error("error_unknown_request",key);
	}
	if (callback == null) {
		return BROWSER.storage.sync.set(set);
	}
	return BROWSER.storage.sync.set(set, () => callback(set[key]));
}

/**
 * Determines the Salesforce API host and constructs authorization headers based on the current URL.
 * - Validates the URL against supported Salesforce domains.
 * - Normalizes certain Salesforce subdomains to the main domain.
 * - Retrieves the session ID cookie ("sid") for authentication.
 * - Returns the API host origin and headers needed for authorized requests.
 *
 * @param {string} currentUrl - The current Salesforce URL.
 * @returns {Promise<[string, Object]>|undefined} A promise resolving to a tuple of the API host origin and headers, or undefined if URL is unsupported.
 * @throws {Error} Throws if required authentication cookies are not found.
 */
async function _getAPIHostAndHeaders(currentUrl) {
	const url = new URL(currentUrl);
	let origin = url.origin;
	if (
		SUPPORTED_SALESFORCE_URLS.filter((pattern) => origin.includes(pattern))
			.length === 0
	) {
		return;
	}
	if (url.origin.includes(LIGHTNING_FORCE_COM)) {
		origin = url.origin.replace(LIGHTNING_FORCE_COM, MY_SALESFORCE_COM);
	} else if (url.origin.includes(MY_SALESFORCE_SETUP_COM)) {
		origin = url.origin.replace(
			MY_SALESFORCE_SETUP_COM,
			MY_SALESFORCE_COM,
		);
	}
	const cookies = await BROWSER.cookies.getAll({
		domain: origin.replace("https://", ""),
		name: "sid",
	});
	if (cookies.length === 0) {
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
 * @returns {Promise<Object|undefined>} A promise resolving to the user info object or undefined on error.
 */
async function getCurrentUserInfo(currentUrl) {
	try {
		const [apiHost, headers] = await _getAPIHostAndHeaders(currentUrl);
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
 * @returns {Promise<string|any>|void} The language code or nothing if callback is provided.
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
 * @param {string[]|null} [commands=null] - Array of command names to filter. If null, returns all commands with shortcuts.
 * @param {Function|null} [callback=null] - Optional callback to receive the commands.
 * @returns {Promise<Array<Object>>|void} Promise resolving to command objects or void if callback is provided.
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
 * Listens for incoming messages and processes requests to get, set, or bg_notify about storage changes.
 * Also handles theme updates and tab-related messages.
 *
 * @param {Object} request - The incoming message request.
 * @param {Object} _ - The sender object (unused).
 * @param {function} sendResponse - The function to send a response back.
 * @returns {boolean} Whether the message was handled asynchronously.
 */
function listenToExtensionMessages() {
	BROWSER.runtime.onMessage.addListener((request, _, sendResponse) => {
		if (request?.what == null) {
			console.error({ error: "error_invalid_request", request });
			sendResponse(null);
			return false;
		}
		switch (request.what) {
			case "get":
				bg_getStorage(sendResponse, request.key);
				break;
			case "set":
				bg_setStorage(request.set, sendResponse, request.key);
				break;
			case "saved":
			case "add":
			case "theme":
			case "error":
			case "warning":
				sendResponse(null);
				setTimeout(() => bg_notify(request), 250); // delay the notification to prevent accidental removal (for "add")
				break;
			case "export":
				checkLaunchExport(request.tabs);
				sendResponse(null);
				break;
			case "browser-tab":
				bg_getCurrentBrowserTab(sendResponse);
				break;
			case "get-sf-language":
				bg_getSalesforceLanguage(sendResponse);
				break;
			case "get-settings":
				bg_getSettings(request.keys, undefined, sendResponse);
				break;
			case "get-style-settings":
				bg_getStyleSettings(request.key, sendResponse);
				break;
			case "get-commands":
				bg_getCommandLinks(request.commands, sendResponse);
				break;
			default:
				if (!["import"].includes(request.what)) {
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
		switch (command) {
			case CMD_OPEN_SETTINGS:
				openSettingsPage();
				return;
			case CMD_EXPORT_ALL:
				checkLaunchExport();
				return;
		}
		const message = {
			what: command,
			url: Tab.minifyURL(browserTabUrl),
			org: Tab.extractOrgName(browserTabUrl),
		};
		switch (command) {
			case CMD_IMPORT:
				message.what = "add";
				break;
			case CMD_SAVE_AS_TAB:
			case CMD_REMOVE_TAB:
			case CMD_TOGGLE_ORG:
			case CMD_UPDATE_TAB:
			case CMD_OPEN_OTHER_ORG:
				break;
			default:
				message.what = "warning";
				message.message = `Received unknown command: ${command}`;
				break;
		}
		bg_notify(message);
	});
}

async function _createDefaultStyle(key = ORG_TAB_STYLE_KEY, ...styles){
  await bg_setStorage(
    styles.filter(Boolean),
    undefined,
    key
  );
  return styles;
}

/**
 * Ensures default organizational style settings exist;
 * if none are found, creates and saves default styles for org-specific tabs.
 */
async function setDefalutOrgStyle() {
	const availableStyles = (await bg_getStyleSettings()) ?? {};
  // if no style settings have been found,
  // create the default style for org-specific Tabs & send it to the background.
  // same goes for org-specific pinned Tabs
  const boldStyle = [
    { id: TAB_STYLE_BOLD, forActive: false, value: TAB_STYLE_BOLD },
    { id: TAB_STYLE_BOLD, forActive: true, value: TAB_STYLE_BOLD },
  ];
  if(availableStyles[ORG_TAB_STYLE_KEY] == null){
    availableStyles[ORG_TAB_STYLE_KEY] = await _createDefaultStyle(ORG_TAB_STYLE_KEY, boldStyle);
  }
  // for pinned Tabs, assign the same current styles used for the unpinned counterparts
  // but change the color of the background to the default one
  const pinnedStyles = [
    { id: TAB_STYLE_BACKGROUND, forActive: false, value: "mistyrose" },
    { id: TAB_STYLE_BACKGROUND, forActive: true, value: "mistyrose" },
  ];
  if(availableStyles[ORG_PINNED_TAB_STYLE_KEY] == null){
    availableStyles[ORG_PINNED_TAB_STYLE_KEY] = await _createDefaultStyle(
      ORG_PINNED_TAB_STYLE_KEY,
      ...availableStyles[ORG_TAB_STYLE_KEY]
        ?.filter(el => 
          el.id !== PREVENT_DEFAULT_OVERRIDE &&
          // override user-set background
          el.id !== TAB_STYLE_BACKGROUND 
        ),
      ...pinnedStyles,
    );
  }
  if(availableStyles[GENERIC_PINNED_TAB_STYLE_KEY] == null){
    availableStyles[GENERIC_PINNED_TAB_STYLE_KEY] = await _createDefaultStyle(
      GENERIC_PINNED_TAB_STYLE_KEY,
      ...availableStyles[GENERIC_TAB_STYLE_KEY]
        ?.filter(el => 
          el.id !== PREVENT_DEFAULT_OVERRIDE &&
          // override user-set background
          el.id !== TAB_STYLE_BACKGROUND 
        ),
      ...pinnedStyles
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
 * @returns {Function} A debounced version of the provided function.
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
		checkAddRemoveContextMenus("startup")
	);
	// when the extension is installed / updated
	BROWSER.runtime.onInstalled.addListener(async (details) => {
		checkAddRemoveContextMenus("installed");
		if (details.reason === "update") {
			// the extension has been updated
			// check user settings
			const no_release_notes = await bg_getSettings(NO_RELEASE_NOTES);
			if (no_release_notes != null && no_release_notes.enabled === true) {
				return;
			}
			// get the extension version
			// open github to show the release notes
			const homepage = MANIFEST.homepage_url;
			// Validate homepage URL (must be GitHub)
			if (!homepage?.startsWith("https://github.com/")) {
				console.error("no_manifest_github");
				return;
			}
			BROWSER.tabs.create({
				url: `${homepage}/tree/main/docs/CHANGELOG.md`,
			});
		}
		/* TODO add tutorial on install
      if (details.reason == "install") {
      }
      */
	});
	// when the extension is activated by the BROWSER
	self.addEventListener(
		"activate",
		() => checkAddRemoveContextMenus("activate"),
	);
	// when the tab changes
	BROWSER.tabs.onActivated.addListener(() =>
		debouncedCheckMenus("highlighted", checkForUpdates)
	);
	//BROWSER.tabs.onHighlighted.addListener(() => checkAddRemoveContextMenus("highlighted"));
	// when window changes
	//BROWSER.windows.onFocusChanged.addListener(() => debouncedCheckMenus("focuschanged"));
	BROWSER.windows.onFocusChanged.addListener(() =>
		checkAddRemoveContextMenus("focuschanged")
	);

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
	setDefalutOrgStyle();
	listenToExtensionMessages();
	listenToExtensionCommands();
	checkAddRemoveContextMenus();
}

main();
