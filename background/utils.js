"use strict";
import {
    BROWSER,
	LIGHTNING_FORCE_COM,
	MY_SALESFORCE_SETUP_COM,
	HTTPS,
	SETUP_LIGHTNING,
} from "./constants.js";
import { bg_getStorage } from "./background.js";
import { TabContainer } from "../tabContainer.js";


export function bg_getCurrentBrowserTab(callback, fromPopup = false){
    async function queryTabs(callback, count = 0){
        const queryParams = { active: true, currentWindow: true };
        (fromPopup == true || count > 0) && delete queryParams.currentWindow;
        console.log(count,queryParams);
        const browserTabs = await BROWSER.tabs.query(queryParams);
        if (BROWSER.runtime.lastError || browserTabs == null || browserTabs[0] == null){
            console.trace();
            console.log(BROWSER.runtime.lastError,browserTabs,browserTabs[0]);
            if(count > 5)
                throw new Error("Could not find current tab.");
            queryTabs(callback, count + 1);
        } else callback(browserTabs[0]);
    }

	if (callback == null) {
        return new Promise(async (resolve, reject) => {
            try {
                await queryTabs(resolve);
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
    } catch(error) {
        console.trace();
        if(error == null || error.message === "")
            setTimeout(() => bg_notify(count + 1), 500);
    }
}

/**
 * Minifies a URL by the domain and removing Salesforce-specific parts.
 *
 * @param {string} url - The URL to minify.
 * @returns {string} The minified URL.
 *
 * These links would all collapse into "SetupOneHome/home".
 * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
 * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
 * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
 * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
 * /lightning/setup/SetupOneHome/home/
 * /lightning/setup/SetupOneHome/home
 * lightning/setup/SetupOneHome/home/
 * lightning/setup/SetupOneHome/home
 * /SetupOneHome/home/
 * /SetupOneHome/home
 * SetupOneHome/home/
 * SetupOneHome/home
 */
export function bg_minifyURL(url) {
	if (url == null || url == "") {
		return null;
	}

	// remove org-specific url
	if (url.includes(LIGHTNING_FORCE_COM)) {
		url = url.slice(
			url.indexOf(LIGHTNING_FORCE_COM) +
				LIGHTNING_FORCE_COM.length,
		);
	} else if (url.includes(MY_SALESFORCE_SETUP_COM)) {
		url = url.slice(
			url.indexOf(MY_SALESFORCE_SETUP_COM) +
				MY_SALESFORCE_SETUP_COM.length,
		);
	}

	if (url.includes(SETUP_LIGHTNING)) {
		url = url.slice(
			url.indexOf(SETUP_LIGHTNING) +
				SETUP_LIGHTNING.length,
		);
	}

	if (url.endsWith("/")) {
		url = url.slice(0, url.length - 1);
	}

	if (url.length === 0) {
		url = "/";
	}

	return url;
}

/**
 * Expands a URL by adding the domain and the Salesforce setup parts.
 * This function undoes what bg_minifyURL did to a URL.
 *
 * @param {string} url - The URL to expand.
 * @returns {string} The expanded URL.
 *
 * These links would all collapse into "https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/".
 * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
 * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
 * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
 * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
 * lightning/setup/SetupOneHome/home/
 * lightning/setup/SetupOneHome/home
 * SetupOneHome/home/
 * SetupOneHome/home
 */
export function bg_expandURL(message) {
	if (message == null || message.url == null || message.baseUrl == null) {
		return null;
	}
	const { url, baseUrl } = message;
	if (url == null || url === "" || url.startsWith(HTTPS)) {
		return url;
	}
	const isSetupLink = !url.startsWith("/") && url.length > 0;
	return `${baseUrl}${isSetupLink ? SETUP_LIGHTNING : ""}${url}`;
}

/**
 * Handles the export functionality by downloading the current tabs as a JSON file.
 */
function _exportHandler(tabs) {
	// Convert JSON string to Blob
	const blob = new Blob(TabContainer.toString(tabs), {
		type: "application/json",
	});

	// Create a download link
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "again-why-salesforce.json";

	// Append the link to the body and trigger the download
	document.body.appendChild(link);
	link.click();

	// Cleanup
	document.body.removeChild(link);
}

/**
 * Exposes a function wrapper for the actual exportHandler due to the need for getting the currently saved tabs.
 *
 * @param [Array] tabs - the currently saved tabs. if null, the tabs are retrieved automatically
 */
export function exportHandler(tabs = null) {
	if (tabs == null) {
		return bg_getStorage(_exportHandler);
	}
	_exportHandler(tabs);
}
