"use strict";
import "./context-menus.js"; // initiate context-menu loop
import {
    BROWSER,
	HTTPS,
	LIGHTNING_FORCE_COM,
	MY_SALESFORCE_COM,
	MY_SALESFORCE_SETUP_COM,
	SALESFORCE_ID_PATTERN,
	WHY_KEY,
} from "../constants.js";
import {
	bg_expandURL,
	bg_minifyURL,
	bg_notify,
	exportHandler,
    bg_getCurrentBrowserTab,
} from "./utils.js";
import { TabContainer } from "../tabContainer.js";

/**
 * Retrieves stored data from the browser's storage and invokes the provided callback.
 *
 * @param {function} callback - The callback to invoke with the retrieved data.
 */
export function bg_getStorage(callback) {
	BROWSER.storage.sync.get(
		[WHY_KEY],
		async (items) => {
            callback(items[WHY_KEY]);
        }
	);
}

/**
 * Stores the provided tabs data in the browser's storage and invokes the callback.
 *
 * @param {Array} tabs - The tabs to store.
 * @param {function} callback - The callback to execute after storing the data.
 */
async function bg_setStorage(tabs, callback) {
	const set = {};
    //tabs = await TabContainer.removeDuplicates(tabs);
    tabs = TabContainer.removeDuplicates(tabs);
	set[WHY_KEY] = tabs;
	BROWSER.storage.sync.set(set, () => callback(null));
    bg_getStorage((_ => {}));
}

/**
 * Extracts the Org name from the url passed as input.
 *
 * @param {string} url - The URL from which the Org name has to be extracted.
 * @returns string | undefined - The Org name OR nothing if an error occurs
 */
function bg_extractOrgName(url) {
	if (url == null) {
		return bg_getCurrentBrowserTab(browserTab => bg_extractOrgName(browserTab.url))
	}
	let host = new URL(
		url.startsWith(HTTPS) ? url : `${HTTPS}${url}`,
	).host;

	if (host.endsWith(LIGHTNING_FORCE_COM)) {
		host = host.slice(0, host.indexOf(LIGHTNING_FORCE_COM));
	}

	if (host.endsWith(MY_SALESFORCE_SETUP_COM)) {
		host = host.slice(0, host.indexOf(MY_SALESFORCE_SETUP_COM));
	}

	if (host.endsWith(MY_SALESFORCE_COM)) {
		host = host.slice(0, host.indexOf(MY_SALESFORCE_COM));
	}

	return host;
}

/**
 * Checks if a given URL contains a valid Salesforce ID.
 *
 * A Salesforce ID is either 15 or 18 alphanumeric characters, typically found
 * in URL paths or query parameters. The function also handles encoded URLs
 * (e.g., `%2F` becomes `/`) by decoding them before matching.
 *
 * @param {string} url - The URL to check for a Salesforce ID.
 * @returns {boolean} - Returns `true` if the URL contains a Salesforce ID, otherwise `false`.
 */
function bg_containsSalesforceId(url) {
	return SALESFORCE_ID_PATTERN.test(decodeURIComponent(url));
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
BROWSER.runtime.onMessage.addListener((request, _, sendResponse) => {
	const message = request.message;
	if (message == null || message.what == null) {
		console.error({ error: "Invalid message", message, request });
		sendResponse(null);
		return false;
	}
	//let captured = true;

	switch (message.what) {
		case "get":
			bg_getStorage(sendResponse);
			break;
		case "set":
			bg_setStorage(message.tabs, sendResponse);
			break;
		case "saved":
		case "add":
		case "theme":
		case "error":
		case "warning":
			sendResponse(null);
			setTimeout(() => bg_notify(message), 250); // delay the notification to prevent accidental removal (for "add")
			//return false; // we won't call sendResponse
			break;
		case "minify":
			sendResponse(bg_minifyURL(message.url));
			//return false; // we won't call sendResponse
			break;
		case "extract-org":
			sendResponse(bg_extractOrgName(message.url));
			//return false; // we won't call sendResponse
			break;
		case "expand":
			sendResponse(bg_expandURL(message));
			//return false; // we won't call sendResponse
			break;
		case "contains-sf-id":
			sendResponse(bg_containsSalesforceId(message.url));
			//return false; // we won't call sendResponse
			break;
		case "export":
			exportHandler(message.tabs);
			sendResponse(null);
			//return false;
			break;
        case "browser-tab":
            bg_getCurrentBrowserTab(sendResponse, message.popup);
            break;

		default:
			//captured = ["import"].includes(message.what);
			//if (!captured) {
            if(!["import"].includes(message.what)){
				console.error({ "error": "Unknown message", message, request });
			}
			break;
	}

	//return captured; // will call sendResponse asynchronously if true
    return true;
});
