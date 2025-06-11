"use strict";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_OTHER_ORG,
	CMD_OPEN_SETTINGS,
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	CMD_TOGGLE_ORG,
	CMD_UPDATE_TAB,
	GENERIC_TAB_STYLE_KEY,
	LIGHTNING_FORCE_COM,
	LOCALE_KEY,
	MY_SALESFORCE_COM,
	MY_SALESFORCE_SETUP_COM,
	NO_RELEASE_NOTES,
	openSettingsPage,
	ORG_TAB_STYLE_KEY,
	SETTINGS_KEY,
	SETUP_LIGHTNING_PATTERN,
	SUPPORTED_SALESFORCE_URLS,
	WHY_KEY,
} from "/constants.js";
import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkForUpdates,
	checkLaunchExport,
} from "./utils.js";
import { checkAddRemoveContextMenus } from "./context-menus.js";

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
	/**
	 * Invoke the runtime to send the message
	 *
	 * @param {function} callback - The callback to execute after sending the message
	 */
	function getFromStorage(callback) {
		return BROWSER.storage.sync.get(
			[key],
			(items) => {
				callback(items[key]);
			},
		);
	}
	if (callback == null) {
		return new Promise((resolve, reject) => {
			getFromStorage(
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
	getFromStorage(callback);
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
	const response = settingKeys.length > 1
		? requestedSettings
		: requestedSettings[0];
	if (callback == null) {
		return response;
	}
	callback(response);
}

/**
 * Stores the provided tabs data in the browser"s storage and invokes the callback.
 *
 * @param {Array} tabs - The tabs to store.
 * @param {function} callback - The callback to execute after storing the data.
 */
export async function bg_setStorage(tobeset, callback, key = WHY_KEY) {
	const set = {};
	switch (key) {
		case SETTINGS_KEY: {
			// get the settings array
			const settingsArray = await bg_getSettings();
			if (settingsArray != null) {
				for (const item of tobeset) {
					// check if the item.id is already present
					const existingItems = settingsArray.filter((setting) =>
						setting.id === item.id
					);
					if (existingItems.length > 0) {
						existingItems.forEach((existing) =>
							Object.assign(existing, item)
						);
					} else {
						settingsArray.push(item);
					}
				}
			}
			set[SETTINGS_KEY] = settingsArray ?? tobeset;
			break;
		}
		case GENERIC_TAB_STYLE_KEY:
		case ORG_TAB_STYLE_KEY: {
			const settingsArray = await bg_getSettings(null, key);
			if (settingsArray != null) {
				for (const item of tobeset) {
					// check if the item.id is already present
					const existingItems = settingsArray.filter((setting) =>
						setting.id === item.id &&
						(setting.forActive == null ||
							setting.forActive === item.forActive)
					);
					if (existingItems.length > 0) {
						if (item.value == null || item.value === "") { // the item has been removed
							existingItems.forEach((el) => {
								const index = settingsArray.indexOf(el);
								if (index >= 0) {
									settingsArray.splice(index, 1);
								}
							});
						} else {
							existingItems.forEach((existing) =>
								existing.value = item.value
							);
						}
					} else {
						settingsArray.push(item);
					}
				}
			}
			set[key] = settingsArray ?? tobeset;
			break;
		}
		default:
			set[key] = tobeset;
			break;
	}
	return BROWSER.storage.sync.set(set, callback?.(set[key]));
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
	async function getAPIHostAndHeaders(currentUrl) {
		const url = new URL(currentUrl);
		let origin = url.origin;
		if (
			SUPPORTED_SALESFORCE_URLS.filter((pattern) =>
				origin.includes(pattern)
			).length === 0
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
			domain: origin.replace("https:\/\/", ""),
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
	try {
		const [apiHost, headers] = await getAPIHostAndHeaders(currentUrl);
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
	if (language != null) {
		bg_setStorage(language, callback, LOCALE_KEY);
		return language;
	} else {
		return bg_getStorage(callback, LOCALE_KEY);
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
		if (request == null || request.what == null) {
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
				//return false; // we won"t call sendResponse
				break;
			case "export":
				checkLaunchExport(request.tabs);
				sendResponse(null);
				//return false;
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
				bg_getSettings(undefined, request.key, sendResponse);
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
		const broswerTabUrl = (await bg_getCurrentBrowserTab())?.url;
		if (
			broswerTabUrl == null ||
			!broswerTabUrl.match(SETUP_LIGHTNING_PATTERN)
		) {
			// we're not in Salesforce Setup
			return;
		}
		const message = { what: command };
		switch (command) {
			case CMD_IMPORT:
				message.what = "add";
				/* falls through */
			case CMD_SAVE_AS_TAB:
			case CMD_REMOVE_TAB:
			case CMD_TOGGLE_ORG:
			case CMD_UPDATE_TAB:
			case CMD_OPEN_OTHER_ORG:
				bg_notify(message);
				break;
			case CMD_OPEN_SETTINGS:
				openSettingsPage();
				break;
			case CMD_EXPORT_ALL:
				checkLaunchExport();
				break;
			default:
				bg_notify({
					what: "warning",
					message: `Received unknown command: ${command}`,
				});
				break;
		}
	});
}

/**
 * Ensures default organizational style settings exist;
 * if none are found, creates and saves default styles for org-specific tabs.
 */
async function setDefalutOrgStyle() {
	const orgStyles = await bg_getSettings(undefined, ORG_TAB_STYLE_KEY);
	if (orgStyles == null) {
		// no style settings have been found. create the default style for org-specific Tabs & send it to the background.
		const request = {
			key: ORG_TAB_STYLE_KEY,
			set: [
				{ id: "bold", forActive: false, value: "bold" },
				{ id: "bold", forActive: true, value: "bold" },
			],
		};
		bg_setStorage(request.set, () => {}, request.key);
	}
}

/**
 * Sets up various browser event listeners for the extension, including:
 * - Debounced context menu checks on tab/window changes
 * - Handling extension startup and installation events
 * - Opening release notes after updates
 * - Responding to tab activation and window focus changes
 */
function setExtensionBrowserListeners() {
	/**
	 * Creates a debounced version of a function that delays its execution until after a specified delay period has passed since the last call.
	 * The returned debounced function can be called multiple times, but the actual execution of the original function will only happen once the
	 * specified delay has passed since the last invocation.
	 *
	 * @param {Function} fn - The function to debounce.
	 * @param {number} [delay=150] - The delay in milliseconds before the function is executed after the last invocation.
	 * @returns {Function} A debounced version of the provided function.
	 */
	function debounce(fn, delay = 150) {
		let timeout;
		return (...args) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => fn(...args), delay);
		};
	}
	// Debounced version for high-frequency events
	const debouncedCheckMenus = debounce(checkAddRemoveContextMenus);
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
			const manifest = BROWSER.runtime.getManifest();
			const version = manifest.version;
			// open github to show the release notes
			const homepage = manifest.homepage_url;
			// Validate homepage URL (must be GitHub)
			if (!homepage || !homepage.includes("github.com")) {
				console.error("no_manifest_github");
				return;
			}
			BROWSER.tabs.create({
				url: `${homepage}/tree/main/docs/Release Notes/v${version}.md`,
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
