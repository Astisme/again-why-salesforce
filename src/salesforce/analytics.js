"use strict";
import {
	DATA_COLLECTION_TECHNICAL_AND_INTERACTION,
	EXTENSION_VERSION,
	HTTPS,
	ISFIREFOX,
	PERM_CHECK,
	PREVENT_ANALYTICS,
	SETTINGS_KEY,
	WHAT_SET,
} from "/constants.js";
import { getSettings, sendExtensionMessage } from "/functions.js";
import { buildAnalyticsBeaconContract } from "./event-taxonomy.js";

/**
 * Determines whether the analytics beacon has already been sent today.
 *
 * @param {string | undefined} date - the date of the last time a ping was sent
 * @return {boolean} Whether the analytics beacon has already been sent today.
 */
function hasSentAnalyticsToday(date) {
	return date != null &&
		Math.floor(
				(Date.now() - new Date(date)) /
					(1000 * 60 * 60 * 24),
			) <= 0; // the date difference is less than a day
}

/**
 * Persists analytics settings without waiting for storage to finish.
 *
 * @param {{ id: string, enabled?: boolean, date?: string }} setting - The setting payload to store.
 * @return {Promise} the same from sendExtensionMessage
 */
function syncAnalyticsSetting(setting) {
	return sendExtensionMessage({
		what: WHAT_SET,
		key: SETTINGS_KEY,
		set: [setting],
	});
}

/**
 * Retrieves Firefox's built-in consent state for technical and interaction data.
 *
 * @return {Promise<boolean|null>} Whether consent is granted, or null if unavailable.
 */
async function getTechnicalAndInteractionConsent() {
	if (!ISFIREFOX) {
		return null;
	}
	try {
		return await sendExtensionMessage({
			what: PERM_CHECK,
			contains: {
				data_collection: [DATA_COLLECTION_TECHNICAL_AND_INTERACTION],
			},
		});
	} catch (e) {
		console.info(e);
		return null;
	}
}

/**
 * Updates the PREVENT_ANALYTICS setting to today as the last successful ping
 */
function setDateForPingToday() {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	syncAnalyticsSetting({
		id: PREVENT_ANALYTICS,
		date: today.toJSON(),
	});
}

/**
 * Applies normalized analytics query parameters to a beacon URL.
 *
 * @param {URL} apiUrl - Beacon URL object to populate.
 * @param {{ [key: string]: string }} queryParams - Query parameter map.
 */
function applyAnalyticsQueryParams(apiUrl, queryParams) {
	for (const [key, value] of Object.entries(queryParams)) {
		apiUrl.searchParams.set(key, value);
	}
}

/**
 * Adds Simple Analytics to the CSP and adds the ping image to the DOM
 * @param {boolean} isNewUser - whether the user has just installed the extension
 */
function sendPingToAnalytics(isNewUser) {
	const analyticsEvent = buildAnalyticsBeaconContract({
		httpsPrefix: HTTPS,
		extensionVersion: EXTENSION_VERSION,
		isNewUser,
	});
	const whereToAppend = document.head || document.documentElement;
	const cspMeta = document.querySelector(
		'meta[http-equiv="Content-Security-Policy"]',
	);
	if (cspMeta) {
		const currentCSP = cspMeta.getAttribute("content");
		cspMeta.setAttribute(
			"content",
			`${currentCSP} ${analyticsEvent.cspSources}`,
		);
	} else {
		const meta = document.createElement("meta");
		meta.setAttribute("http-equiv", "Content-Security-Policy");
		meta.setAttribute(
			"content",
			analyticsEvent.cspMetaContent,
		);
		whereToAppend.appendChild(meta);
	}
	const img = document.createElement("img");
	const apiUrl = new URL(analyticsEvent.beaconUrl);
	applyAnalyticsQueryParams(apiUrl, analyticsEvent.queryParams);
	img.src = apiUrl;
	img.alt = "";
	img.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
	whereToAppend.appendChild(img);
	setDateForPingToday();
}

/**
 * Checks user settings and inserts Simple Analytics into the document
 * unless analytics collection is disabled.
 * Modifies Content-Security-Policy meta tag to allow the analytics domains.
 * https://github.com/simpleanalytics
 *
 * @return {Promise<void>} Resolves once analytics insertion is completed or skipped.
 */
export async function checkInsertAnalytics() {
	const preventAnalytics = await getSettings(PREVENT_ANALYTICS);
	const isNewUser = preventAnalytics?.date == null;
	const consentGranted = await getTechnicalAndInteractionConsent();
	const shouldPreventAnalytics = consentGranted == null
		? preventAnalytics?.enabled === true // the user does not want to send analytics call
		: !consentGranted;
	if (
		ISFIREFOX &&
		consentGranted != null &&
		preventAnalytics?.enabled !== shouldPreventAnalytics
	) {
		// this await is needed to make sure the next one does not race this call
		await syncAnalyticsSetting({
			id: PREVENT_ANALYTICS,
			enabled: shouldPreventAnalytics,
		});
	}
	if (
		shouldPreventAnalytics ||
		hasSentAnalyticsToday(preventAnalytics?.date)
	) {
		return;
	}
	sendPingToAnalytics(isNewUser);
}
