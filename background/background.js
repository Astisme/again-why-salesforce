"use strict";
import "./context-menus.js"; // initiate context-menu loop
import { BROWSER, WHY_KEY } from "../constants.js";
import { bg_getCurrentBrowserTab, bg_notify, exportHandler } from "./utils.js";

/**
 * Retrieves data from the browser's synced storage and invokes the provided callback with the data.
 *
 * @param {Function} callback - The function to be called once the data is retrieved.
 *                              The retrieved value is passed as an argument to the callback.
 * @throws {Error} If the callback is not provided.
 */
export function bg_getStorage(callback) {
	if (callback == null) {
		throw new Error("Please provide a callback");
	}
	BROWSER.storage.sync.get(
		[WHY_KEY],
		(items) => {
			callback(items[WHY_KEY]);
		},
	);
}

/**
 * Stores the provided tabs data in the browser's storage and invokes the callback.
 *
 * @param {Array} tabs - The tabs to store.
 * @param {function} callback - The callback to execute after storing the data.
function bg_setStorage(tabs, callback) {
	const set = {};
	set[WHY_KEY] = tabs;
	BROWSER.storage.sync.set(set, callback(null));
}
 */

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
            /*
		case "get":
			bg_getStorage(sendResponse);
			break;
		case "set":
			bg_setStorage(message.tabs, sendResponse);
			break;
            */
		case "saved":
		case "add":
		case "theme":
		case "error":
		case "warning":
			sendResponse(null);
			setTimeout(() => bg_notify(message), 250); // delay the notification to prevent accidental removal (for "add")
			//return false; // we won't call sendResponse
			break;
		case "export":
			exportHandler(message.tabs);
			sendResponse(null);
			//return false;
			break;
		case "browser-tab":
			bg_getCurrentBrowserTab(sendResponse);
			break;
		default:
			//captured = ["import"].includes(message.what);
			//if (!captured) {
			if (!["import"].includes(message.what)) {
				console.error({ "error": "Unknown message", message, request });
			}
			break;
	}
	//return captured; // will call sendResponse asynchronously if true
	return true;
});
