"use strict";
import {
	BROWSER,
	DO_NOT_REQUEST_FRAME_PERMISSION,
	EXTENSION_NAME,
	EXTENSION_OPTIONAL_HOST_PERM,
	FRAME_PATTERNS,
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	HAS_ORG_TAB,
	ISSAFARI,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	PIN_TAB_CLASS,
	PREVENT_DEFAULT_OVERRIDE,
	SETUP_LIGHTNING_PATTERN,
	SLDS_ACTIVE,
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_BOLD,
	TAB_STYLE_BORDER,
	TAB_STYLE_COLOR,
	TAB_STYLE_HOVER,
	TAB_STYLE_ITALIC,
	TAB_STYLE_SHADOW,
	TAB_STYLE_TOP,
	TAB_STYLE_UNDERLINE,
} from "/constants.js";

/**
 * Invoke the runtime to send the message
 *
 * @param {Object} message - The message to send
 * @param {function} callback - The callback to execute after sending the message
 * @return {Promise} from BROWSER.runtime.sendMessage
 */
function sendMessage(message, callback) {
	return BROWSER.runtime.sendMessage(message, callback);
}
/**
 * Sends a message to the background script with the specified message.
 *
 * @param {Object} message - The message to send.
 * @param {function} callback - The callback to execute after sending the message.
 * @return {Promise} promise resolving based on sendMessage
 */
export function sendExtensionMessage(message, callback = null) {
	if (message == null) {
		return;
	}
	if (callback == null) {
		return new Promise((resolve, reject) => {
			sendMessage(
				message,
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
	sendMessage(message, callback);
}
/**
 * Retrieves extension settings for the specified keys.
 *
 * @param {string[] | null} [keys=null] - An array of setting keys to retrieve. If null, all settings will be returned.
 * @return {Promise<Object>} A promise that resolves to an object containing the requested settings.
 */
export async function getSettings(keys = null) {
	return await sendExtensionMessage({ what: "get-settings", keys });
}
/**
 * Retrieves saved style settings for the specified key.
 * @async
 * @param {string} [key=null] - Key identifying which style settings to fetch. When null finds all style settings
 * @return {Promise<Object|null>} The retrieved style settings or null if none exist.
 */
export async function getStyleSettings(key = null) {
	return await sendExtensionMessage({ what: "get-style-settings", key });
}
const GENERIC_STYLE_KEYS = new Set([
	GENERIC_TAB_STYLE_KEY,
	GENERIC_PINNED_TAB_STYLE_KEY,
]);
/**
 * Checks if a key is a generic key
 *
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - the key to be checked
 * @return {boolean} true if the key is a generic key
 */
export function isGenericKey(key = GENERIC_TAB_STYLE_KEY) {
	return GENERIC_STYLE_KEYS.has(key);
}
const PINNED_STYLE_KEYS = new Set([
	GENERIC_PINNED_TAB_STYLE_KEY,
	ORG_PINNED_TAB_STYLE_KEY,
]);
/**
 * Checks if a key is a pinned key
 *
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - the key to be checked
 * @return {boolean} true if the key is a pinned key
 */
export function isPinnedKey(key = GENERIC_TAB_STYLE_KEY) {
	return PINNED_STYLE_KEYS.has(key);
}
const ALL_STYLE_KEYS = new Set([
	GENERIC_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	GENERIC_PINNED_TAB_STYLE_KEY,
	ORG_PINNED_TAB_STYLE_KEY,
]);
/**
 * Checks if a key is a style key
 *
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - the key to be checked
 * @return {boolean} true if the key is a style key
 */
export function isStyleKey(key = GENERIC_TAB_STYLE_KEY) {
	return ALL_STYLE_KEYS.has(key);
}
const PINNED_KEY_FINDER = {
	// true = isGeneric
	[true]: {
		// true = isPinned
		[true]: GENERIC_PINNED_TAB_STYLE_KEY,
		// false = !isPinned
		[false]: GENERIC_TAB_STYLE_KEY,
	},
	// false = !isGeneric
	[false]: {
		// true = isPinned
		[true]: ORG_PINNED_TAB_STYLE_KEY,
		// false = !isPinned
		[false]: ORG_TAB_STYLE_KEY,
	},
};
/**
 * Returns a style key given the specified parameters
 *
 * @param {Object} [param0={}] - an Object used to determine the style key
 * @param {boolean} [param0.isGeneric=true] - Whether the key to find is Generic
 * @param {boolean} [param0.isPinned=false] - Whether the key to find is Pinned
 * @return {string} one of the ALL_STYLE_KEYS
 */
export function getPinnedSpecificKey({
	isGeneric = true,
	isPinned = false,
} = {}) {
	return PINNED_KEY_FINDER[isGeneric][isPinned];
}
const SLDS_ACTIVE_CLASS = `.${SLDS_ACTIVE}`;
const HAS_PIN_TAB = `:has(.${PIN_TAB_CLASS})`;
/**
 * Constructs a CSS selector string based on tab state, type, and optional pseudo-element.
 *
 * @param {boolean} [isInactive=true] - Whether the selector targets inactive tabs.
 * @param {boolean} [isGeneric=true] - Whether the selector targets generic tabs.
 * @param {string} [pseudoElement=""] - Optional pseudo-element or pseudo-class to append.
 * @return {string} The constructed CSS selector.
 */
export function getCssSelector({
	isInactive = true,
	isGeneric = true,
	isPinned = false,
	pseudoElement = "",
} = {}) {
	const activeClass = isInactive
		? `:not(${SLDS_ACTIVE_CLASS})`
		: SLDS_ACTIVE_CLASS;
	const orgTabClass = isGeneric ? `:not(${HAS_ORG_TAB})` : HAS_ORG_TAB;
	const pinTabClass = isPinned ? HAS_PIN_TAB : `:not(${HAS_PIN_TAB})`;
	return `.${EXTENSION_NAME}${activeClass}${orgTabClass}${pinTabClass}${pseudoElement}`;
}
/**
 * Returns a CSS rule string based on the given style ID and optional value.
 *
 * @param {string} styleId - Identifier for the style to generate.
 * @param {string|null} [value=null] - Value to apply in the CSS rule if needed.
 * @return {string} The corresponding CSS rule or an empty string if invalid.
 */
export function getCssRule(styleId, value = null) {
	switch (styleId) {
		case TAB_STYLE_BACKGROUND:
		case TAB_STYLE_HOVER:
		case TAB_STYLE_TOP:
			return `background-color: ${value} !important;`;
		case TAB_STYLE_COLOR:
			return `color: ${value};`;
		case TAB_STYLE_BORDER:
			return `border: 2px solid ${value};`;
		case TAB_STYLE_SHADOW:
			return `text-shadow: 0px 0px 3px ${value};`;
		case TAB_STYLE_BOLD:
			return "font-weight: bold;";
		case TAB_STYLE_ITALIC:
			return "font-style: italic;";
		case TAB_STYLE_UNDERLINE:
			return "text-decoration: underline;";
		case PREVENT_DEFAULT_OVERRIDE:
			return "";
		default:
			console.error(styleId);
			return "";
	}
}
/**
 * Opens the extension's settings page.
 *
 * Uses `runtime.openOptionsPage` if available; otherwise, falls back to opening the settings URL directly.
 */
export function openSettingsPage() {
	if (BROWSER.runtime.openOptionsPage) {
		BROWSER.runtime.openOptionsPage();
	} else {
		open(BROWSER.runtime.getURL("settings/options.html"));
	}
}
/**
 * Uses the permission API to request new optional permissions
 * @param {{}} [permissionObj={}] the object with the new permissions to request
 * @return Promise from browser.permissions.request
 */
function requestPermissions(permissionObj = {}) {
	return BROWSER.permissions.request(permissionObj);
}
/**
 * Requests permissions to download files (used to export the Tabs)
 * @return Promise from browser.permissions.request
 */
export function requestExportPermission() {
	return requestPermissions({
		permissions: ["downloads"],
	});
}
/**
 * Requests permission to access the Salesforce Setup pages without having the user click on the popup on every new visit
 * @return Promise from browser.permissions.request
 */
export function requestFramePatternsPermission() {
	return requestPermissions({
		origins: FRAME_PATTERNS,
	});
}
/**
 * Requests permission to access the user's cookies so that the extension can follow the language in which Salesforce is set
 * @return Promise from browser.permissions.request
 */
export function requestCookiesPermission() {
	return requestPermissions({
		permissions: ["cookies"],
		origins: EXTENSION_OPTIONAL_HOST_PERM,
	});
}
/**
 * Determines whether the current tab is Salesforce Setup.
 * @return {Promise<{ ison: boolean, url: string>}>} whether the user is on Salesforce Setup
 */
export async function isOnSalesforceSetup() {
	const browserTab = await sendExtensionMessage({ what: "browser-tab" });
	return {
		ison: SETUP_LIGHTNING_PATTERN.test(browserTab?.url),
		url: browserTab?.url,
	};
}
/**
 * Checks if the export functionality is allowed for the current user
 * @return {boolean} true if the export functionality was allowed
 */
export function isExportAllowed() {
	return ISSAFARI || BROWSER.downloads != null;
}
/**
 * Checks if the extension can access Salesforce Setup pages without having the user click on the popup on every new visit
 * @return {boolean} true if the extension is allowed
 */
export async function areFramePatternsAllowed() {
	const permissionsAvailable = await BROWSER.permissions.contains({
		origins: FRAME_PATTERNS,
	});
	return permissionsAvailable ||
		localStorage.getItem(DO_NOT_REQUEST_FRAME_PERMISSION) === "true" ||
		new URL(globalThis.location.href).searchParams.get(
				DO_NOT_REQUEST_FRAME_PERMISSION,
			) === "true";
}
/**
 * Calculates the estimated time (in milliseconds) it takes to read a given message.
 *
 * @param {string} message - The message to calculate the reading time for.
 * @return {number} - The estimated reading time in milliseconds.
 */
export function calculateReadingTime(message) {
	const words = message.split(/\s+/).filter((word) => word.length > 0);
	const wordsPerMinute = 200; // Average reading speed
	const readingTimeMinutes = words.length / wordsPerMinute;
	const readingTimeSeconds = Math.ceil(readingTimeMinutes * 60);
	return (readingTimeSeconds + 2) * 1000;
}
export function performLightningRedirect(url = ""){
  postMessage({
    what: "lightningNavigation",
    navigationType: "url",
    url,
    fallbackURL: url,
  }, "*");
}
