"use strict";
import {
	LIGHTNING_FORCE_COM,
	LOCALE_KEY,
	MY_SALESFORCE_COM,
	MY_SALESFORCE_SETUP_COM,
} from "/core/constants.js";
import { isSalesforceHostname } from "/core/functions.js";
import { bg_getCurrentBrowserTab } from "./utils.js";
import { bg_getStorage, bg_setStorage } from "./storage.js";

/**
 * Determines the Salesforce API host and constructs authorization headers based on the current URL.
 * - Validates the URL against supported Salesforce domains.
 * - Normalizes certain Salesforce subdomains to the main domain.
 * - Retrieves the session ID cookie ("sid") for authentication.
 * - Returns the API host origin and headers needed for authorized requests.
 *
 * @param {Object} browserApi - Browser API reference.
 * @param {string} currentUrl - The current Salesforce URL.
 * @return {Promise<[string, Object]>|undefined} A promise resolving to a tuple of the API host origin and headers, or undefined if URL is unsupported.
 * @throws {Error} Throws if required authentication cookies are not found.
 */
async function _getAPIHostAndHeaders(browserApi, currentUrl) {
	const url = new URL(currentUrl);
	let origin = url.origin;
	if (!isSalesforceHostname(url)) {
		return;
	}
	if (url.hostname.endsWith(LIGHTNING_FORCE_COM)) {
		origin = url.origin.replace(LIGHTNING_FORCE_COM, MY_SALESFORCE_COM);
	} else if (url.hostname.endsWith(MY_SALESFORCE_SETUP_COM)) {
		origin = url.origin.replace(
			MY_SALESFORCE_SETUP_COM,
			MY_SALESFORCE_COM,
		);
	}
	const cookies = await browserApi.cookies?.getAll({
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
 *
 * @param {Object} browserApi - Browser API reference.
 * @param {string} currentUrl - The current Salesforce URL.
 * @return {Promise<Object|undefined>} A promise resolving to the user info object or undefined on error.
 */
async function getCurrentUserInfo(browserApi, currentUrl) {
	try {
		const apiHostAndHeaders = await _getAPIHostAndHeaders(
			browserApi,
			currentUrl,
		);
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
 * @param {Object} browserApi - Browser API reference.
 * @param {Function|null} [callback=null] - Optional callback to receive the language.
 * @return {Promise<string|any>|void} The language code or nothing if callback is provided.
 */
export async function bg_getSalesforceLanguage(
	browserApi,
	callback = null,
) {
	const currentUrl = (await bg_getCurrentBrowserTab())?.url;
	const language = (await getCurrentUserInfo(browserApi, currentUrl))
		?.language;
	if (language == null) {
		return bg_getStorage(callback, LOCALE_KEY);
	}
	bg_setStorage(language, callback, LOCALE_KEY);
	return language;
}
