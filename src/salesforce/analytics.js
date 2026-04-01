"use strict";
import {
	EXTENSION_VERSION,
	HTTPS,
	ISFIREFOX,
	PERM_CHECK,
	PREVENT_ANALYTICS,
} from "../core/constants.js";
import {
	getSettings,
	sendExtensionMessage,
	setSettings,
} from "../core/functions.js";

const technicalAndInteraction = "technicalAndInteraction";
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
				data_collection: [technicalAndInteraction],
			},
		});
	} catch (e) {
		console.info(e);
		return null;
	}
}

const analyticscdnhost = "simpleanalyticscdn.com";
const queueanalytics = `${HTTPS}queue.${analyticscdnhost}`;
const analyticscdn = `${HTTPS}${analyticscdnhost}`;
/**
 * Adds Simple Analytics to the CSP and adds the ping image to the DOM
 * @param {boolean} [isNewUser=false] - whether the user has just installed the extension
 */
function sendPingToAnalytics(isNewUser = false) {
	const whereToAppend = document.head || document.documentElement;
	const cspMeta = document.querySelector(
		'meta[http-equiv="Content-Security-Policy"]',
	);
	if (cspMeta) {
		const currentCSP = cspMeta.getAttribute("content");
		cspMeta.setAttribute(
			"content",
			currentCSP +
				` ${queueanalytics} ${analyticscdn}`,
		);
	} else {
		const meta = document.createElement("meta");
		meta.setAttribute("http-equiv", "Content-Security-Policy");
		meta.setAttribute(
			"content",
			`default-src 'self'; img-src 'self' ${queueanalytics};`,
		);
		whereToAppend.appendChild(meta);
	}
	const img = document.createElement("img");
	const apiUrl = new URL(`${queueanalytics}/noscript.gif`);
	apiUrl.searchParams.set("hostname", "extension.again.whysalesforce");
	apiUrl.searchParams.set(
		"path",
		isNewUser ? "/new-user" : "/",
	);
	apiUrl.searchParams.set("utm_source", EXTENSION_VERSION);
	img.src = apiUrl;
	img.alt = "";
	img.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
	whereToAppend.appendChild(img);
}

/**
 * Checks user settings and inserts Simple Analytics into the document
 * unless analytics collection is disabled.
 * Modifies Content-Security-Policy meta tag to allow the analytics domains.
 * https://github.com/simpleanalytics
 *
 * @param {Object} [param0={}] an object with the following keys
 * @param {boolean} [param0.isNewUser=false] - whether the user has no persisted active day yet
 * @return {Promise<void>} Resolves once analytics insertion is completed or skipped.
 */
export async function checkInsertAnalytics({
	isNewUser = false,
} = {}) {
	const [preventAnalytics, consentGranted] = await Promise.all(
		[
			getSettings(PREVENT_ANALYTICS),
			getTechnicalAndInteractionConsent(),
		],
	);
	const shouldPreventAnalytics = consentGranted == null
		? preventAnalytics?.enabled === true // the user does not want to send analytics call
		: !consentGranted;
	if (
		ISFIREFOX &&
		consentGranted != null &&
		preventAnalytics?.enabled !== shouldPreventAnalytics
	) {
		// this await is needed to make sure the next one does not race this call
		await setSettings({
			id: PREVENT_ANALYTICS,
			enabled: shouldPreventAnalytics,
		});
	}
	if (shouldPreventAnalytics) {
		return;
	}
	sendPingToAnalytics(isNewUser);
}
