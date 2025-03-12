"use strict";
import { BROWSER, EXTENSION_NAME } from "/constants.js";
import { bg_getStorage } from "./background.js";
import { ISCHROME } from "../constants.js";

/**
 * Retrieves the current active browser tab based on the given parameters.
 * If the callback is provided, it will be invoked with the current tab object.
 * If the callback is not provided, it will return a promise that resolves with the current tab object.
 * The function attempts to find the tab multiple times (up to 5 retries) in case of failure.
 *
 * @param {Function} [callback] - A callback function to handle the retrieved tab. If not provided, a promise is returned.
 * @param {boolean} [fromPopup=false] - A flag indicating whether the function was called from a popup. If true, queries all tabs in the current window.
 * @throws {Error} Throws an error if the current tab cannot be found after 5 retries.
 * @returns {Promise|undefined} A promise that resolves to the current tab if no callback is provided; undefined if a callback is provided.
 */
export function bg_getCurrentBrowserTab(callback) {
	/**
	 * Queries the browser for the current active tab in the current window.
	 * If the tab is not found or an error occurs, the function will retry up to 5 times before throwing an error.
	 * The `callback` function will be called with the first tab object found.
	 *
	 * @param {Function} callback - A function to handle the retrieved tab once it is found.
	 * @param {number} [count=0] - A counter used to track the number of retries. Defaults to 0.
	 * @throws {Error} Throws an error if the current tab cannot be found after 5 retries.
	 */
	async function queryTabs(callback, count = 0) {
		const queryParams = { active: true, currentWindow: true };
		if (count > 0) {
			delete queryParams.currentWindow;
		}
		const browserTabs = await BROWSER.tabs.query(queryParams);
		if (
			BROWSER.runtime.lastError || browserTabs == null ||
			browserTabs[0] == null
		) {
			if (count > 5) {
				throw new Error("Could not find current tab.");
			}
			queryTabs(callback, count + 1);
		} else callback(browserTabs[0]);
	}
	if (callback == null) {
		return new Promise((resolve, reject) => {
			try {
				queryTabs(resolve)
					.then((q) => resolve(q))
					.catch((e) => reject(e));
			} catch (error) {
				reject(error);
			}
		});
	}
	queryTabs(callback);
}
/**
 * Sends the same message back to other parts of the extension.
 *
 * @param {JSONObject} message - the message to be sent
 * @param {int} count = 0 - how many times the function has been called
 */
export async function bg_notify(message, count = 0) {
	try {
		const browserTab = await bg_getCurrentBrowserTab();
		BROWSER.tabs.sendMessage(browserTab.id, message);
	} catch (error) {
		console.trace();
		if (error == null || error.message === "") {
			setTimeout(() => bg_notify(count + 1), 500);
		}
	}
}

/**
 * Handles the export of tab data by converting it into a JSON file and triggering a download.
 * The JSON file will be named "again-why-salesforce.json".
 *
 * @param {Array} tabs - An array of tab objects to be exported as a JSON file.
 */
function _exportHandler(tabs) {
	const jsonData = JSON.stringify(tabs);
    if (!ISCHROME) {
        // Firefox implementation
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        BROWSER.downloads.download({
            url,
            filename: `${EXTENSION_NAME}.json`,
        }).then(() => {
            BROWSER.downloads.onChanged.addListener(e => {
                if(e.state.current === "complete")
                    URL.revokeObjectURL(url);
            });
        });
    } else {
        // Chrome implementation
        const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(jsonData);
        chrome.downloads.download({
            url: dataStr,
            filename: `${EXTENSION_NAME}.json`,
        });
    }
}

/**
 * Exports tab data as a JSON file. If no tab data is provided, it retrieves the data from storage.
 *
 * @param {Array|null} tabs - An array of tab objects to be exported as a JSON file. If null, the function fetches the tab data from storage.
 */
export function exportHandler(tabs = null) {
	if (tabs == null) {
		return bg_getStorage(_exportHandler);
	}
	_exportHandler(tabs);
}
