"use strict";
import {
	ANALYTICS_BEACON_PATH,
	ANALYTICS_CDN_HOST,
	ANALYTICS_EVENT_NAME_NEW_USER,
	ANALYTICS_EVENT_NAME_RETURNING_USER,
	ANALYTICS_EVENT_PATH_NEW_USER,
	ANALYTICS_EVENT_PATH_RETURNING_USER,
	ANALYTICS_EVENT_TYPE_INSTALL,
	ANALYTICS_EVENT_TYPE_USAGE,
	ANALYTICS_EXTENSION_HOSTNAME,
	ANALYTICS_QUERY_PARAM_EVENT_NAME,
	ANALYTICS_QUERY_PARAM_EVENT_TYPE,
	ANALYTICS_QUERY_PARAM_HOSTNAME,
	ANALYTICS_QUERY_PARAM_PATH,
	ANALYTICS_QUERY_PARAM_UTM_SOURCE,
	ANALYTICS_QUEUE_SUBDOMAIN,
} from "/constants.js";

/**
 * Builds the analytics queue endpoint URL.
 *
 * @param {string} httpsPrefix - The secure protocol prefix.
 * @return {string} Fully qualified queue endpoint base URL.
 */
function buildQueueEndpoint(httpsPrefix) {
	return `${httpsPrefix}${ANALYTICS_QUEUE_SUBDOMAIN}.${ANALYTICS_CDN_HOST}`;
}

/**
 * Builds the analytics CDN endpoint URL.
 *
 * @param {string} httpsPrefix - The secure protocol prefix.
 * @return {string} Fully qualified CDN endpoint base URL.
 */
function buildCdnEndpoint(httpsPrefix) {
	return `${httpsPrefix}${ANALYTICS_CDN_HOST}`;
}

/**
 * Picks the normalized event name for the current user lifecycle.
 *
 * @param {boolean} isNewUser - Whether the extension identifies the user as newly onboarded.
 * @return {string} Canonical taxonomy event name.
 */
function getEventName(isNewUser) {
	return isNewUser
		? ANALYTICS_EVENT_NAME_NEW_USER
		: ANALYTICS_EVENT_NAME_RETURNING_USER;
}

/**
 * Picks the backward-compatible beacon path for the user lifecycle.
 *
 * @param {boolean} isNewUser - Whether the extension identifies the user as newly onboarded.
 * @return {string} The beacon `path` query value.
 */
function getEventPath(isNewUser) {
	return isNewUser
		? ANALYTICS_EVENT_PATH_NEW_USER
		: ANALYTICS_EVENT_PATH_RETURNING_USER;
}

/**
 * Picks the normalized event type for the current user lifecycle.
 *
 * @param {boolean} isNewUser - Whether the extension identifies the user as newly onboarded.
 * @return {string} Canonical taxonomy event type.
 */
function getEventType(isNewUser) {
	return isNewUser
		? ANALYTICS_EVENT_TYPE_INSTALL
		: ANALYTICS_EVENT_TYPE_USAGE;
}

/**
 * Builds the normalized analytics event contract consumed by `analytics.js`.
 *
 * @param {{
 *   httpsPrefix: string,
 *   extensionVersion: string,
 *   isNewUser: boolean
 * }} input - Runtime values needed to construct the event payload.
 * @return {{
 *   eventName: string,
 *   eventType: string,
 *   eventPath: string,
 *   queueEndpoint: string,
 *   cspSources: string,
 *   cspMetaContent: string,
 *   beaconUrl: string,
 *   queryParams: {
 *     hostname: string,
 *     path: string,
 *     utm_source: string,
 *     eventName: string,
 *     eventType: string
 *   }
 * }} Normalized analytics transport contract.
 */
export function buildAnalyticsBeaconContract(
	{ httpsPrefix, extensionVersion, isNewUser },
) {
	const queueEndpoint = buildQueueEndpoint(httpsPrefix);
	const cdnEndpoint = buildCdnEndpoint(httpsPrefix);
	const eventName = getEventName(isNewUser);
	const eventType = getEventType(isNewUser);
	const eventPath = getEventPath(isNewUser);

	return {
		eventName,
		eventType,
		eventPath,
		queueEndpoint,
		cspSources: `${queueEndpoint} ${cdnEndpoint}`,
		cspMetaContent: `default-src 'self'; img-src 'self' ${queueEndpoint};`,
		beaconUrl: `${queueEndpoint}${ANALYTICS_BEACON_PATH}`,
		queryParams: {
			[ANALYTICS_QUERY_PARAM_HOSTNAME]: ANALYTICS_EXTENSION_HOSTNAME,
			[ANALYTICS_QUERY_PARAM_PATH]: eventPath,
			[ANALYTICS_QUERY_PARAM_UTM_SOURCE]: extensionVersion,
			[ANALYTICS_QUERY_PARAM_EVENT_NAME]: eventName,
			[ANALYTICS_QUERY_PARAM_EVENT_TYPE]: eventType,
		},
	};
}
