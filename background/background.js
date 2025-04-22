"use strict";
import "./context-menus.js"; // initiate context-menu loop
import { 
    BROWSER,
    LOCALE_KEY,
    SUPPORTED_SALESFORCE_URLS,
    WHY_KEY,
    SETTINGS_KEY,
    LIGHTNING_FORCE_COM,
    MY_SALESFORCE_COM,
    MY_SALESFORCE_SETUP_COM,
} from "/constants.js";
import { bg_getCurrentBrowserTab, bg_notify, exportHandler } from "./utils.js";

/**
 * Retrieves data from the browser"s synced storage and invokes the provided callback with the data.
 *
 * @param {Function} callback - The function to be called once the data is retrieved.
 *                              The retrieved value is passed as an argument to the callback.
 * @throws {Error} If the callback is not provided.
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
    /*
	if (callback == null) {
		throw new Error("error_no_callback");
	}
	BROWSER.storage.sync.get(
		[key],
		(items) => {
			callback(items[key]);
		},
	);
    */
}

async function bg_getSettings(settingKeys = null){
    const settings = await bg_getStorage(null, SETTINGS_KEY);
    if(settingKeys == null || settings == null)
        return settings;
    if(!(settingKeys instanceof Array))
        settingKeys = [settingKeys];
    const requestedSettings = settings.filter(setting => settingKeys.includes(setting.id));
    return settingKeys.length > 1 ? requestedSettings : requestedSettings[0];
}

/**
 * Stores the provided tabs data in the browser"s storage and invokes the callback.
 *
 * @param {Array} tabs - The tabs to store.
 * @param {function} callback - The callback to execute after storing the data.
 */
async function bg_setStorage(tobeset, callback, key = WHY_KEY) {
	const set = {};
    if(key === SETTINGS_KEY){
        // get the settings array
        const settingsArray = await bg_getSettings(); 
        if(settingsArray != null){
            for(const item of tobeset) {
                // check if the item.id is already present
                const existingItems = settingsArray.filter(setting => setting.id === item.id);
                if(existingItems.length > 0)
                    existingItems.forEach(existing => existing.enabled = item.enabled);
                else
                    settingsArray.push(item);
            }
        }
        set[key] = settingsArray ?? tobeset;
    } else {
        set[key] = tobeset;
    }
	BROWSER.storage.sync.set(set, callback(tobeset));
}

// courtesy of derroman/salesforce-user-language-switcher
async function getCurrentUserInfo(currentUrl){
    async function getAPIHostAndHeaders(currentUrl) {
      const url = new URL(currentUrl);
        let origin = url.origin;
      if (SUPPORTED_SALESFORCE_URLS.filter(pattern => origin.includes(pattern)).length === 0) {
          return;
      }
        if(url.origin.includes(LIGHTNING_FORCE_COM))
            origin = url.origin.replace(LIGHTNING_FORCE_COM, MY_SALESFORCE_COM);
        else if(url.origin.includes(MY_SALESFORCE_SETUP_COM))
            origin = url.origin.replace(MY_SALESFORCE_SETUP_COM, MY_SALESFORCE_COM);
    const cookies = await BROWSER.cookies.getAll({
        domain: origin.replace("https:\/\/",""),
        name: "sid",
    });
        if(cookies.length === 0)
            throw new Error("error_no_cookies");
        return [
            origin,
            {
              Authorization: `Bearer ${cookies[0].value}`,
              "Content-Type": "application/json",
            }
        ];
    }
    try {
        const [apiHost, headers] = await getAPIHostAndHeaders(currentUrl);
        const retrievedRows = await fetch(`${apiHost}/services/oauth2/userinfo`, {headers});
        return await retrievedRows.json();
    } catch (error) {
        console.error(error);
        return;
    }
}

export async function bg_getSalesforceLanguage(callback){
    const currentUrl = (await bg_getCurrentBrowserTab())?.url;
    const language = (await getCurrentUserInfo(currentUrl))?.language;
    if(callback == null)
        return language;
    if(language != null)
        bg_setStorage(language, callback, LOCALE_KEY);
    else
        bg_getStorage(callback, LOCALE_KEY);
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
	if (request == null || request.what == null) {
		console.error({ error: "Invalid request", request });
		sendResponse(null);
		return false;
	}
	//let captured = true;
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
			exportHandler(request.tabs);
			sendResponse(null);
			//return false;
			break;
		case "browser-tab":
			bg_getCurrentBrowserTab(sendResponse);
			break;
        case "get-sf-language":
            bg_getSalesforceLanguage(sendResponse);
            break;
        case "get-language":
            bg_getStorage(sendResponse, LOCALE_KEY);
            break;
        case "get-settings":
            sendResponse(bg_getSettings(request.keys));
            break;
		default:
			//captured = ["import"].includes(request.what);
			//if (!captured) {
			if (!["import"].includes(request.what)) {
				console.error({ error: "Unknown request", request });
			}
			break;
	}
	//return captured; // will call sendResponse asynchronously if true
	return true;
});
