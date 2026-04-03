"use strict";
import {
	EXTENSION_LAST_ACTIVE_DAY,
	EXTENSION_NAME,
} from "../core/constants.js";
import { getSettings, getTodayDateKey } from "../core/functions.js";
import { checkInsertAnalytics } from "./analytics.js";
import { updateExtensionUsageDays } from "./update-settings.js";

const today_key = `${EXTENSION_NAME}-today`;

/**
 * Sets the today_key to today in sessionStorage
 * @param {string} [today=getTodayDateKey()] - the string representing today at midnight
 */
function setToday(today = getTodayDateKey()) {
	sessionStorage.setItem(today_key, today);
}

/**
 * Checks if the function was already called today by looking at the today_key in sessionStorage
 * @param {string} [today=getTodayDateKey()] - the string representing today at midnight
 * @return {boolean} true if the function was called today
 */
function wasCalledToday(today = getTodayDateKey()) {
	return sessionStorage.getItem(today_key) === today;
}

/**
 * Retrieves the extension's last active day from the background
 * @return {Promise<string>} last active date formatted as YYYY-MM-DD
 */
async function getSavedLastActiveDay() {
	const last_active_day = await getSettings(EXTENSION_LAST_ACTIVE_DAY);
	return last_active_day?.enabled;
}

/**
 * Executes the daily functions only once per persisted local day.
 * Session storage mirrors the stored day so repeated calls in the same page
 * can return without another settings lookup.
 *
 * @return {Promise<void>} Resolves once the daily flow has completed.
 */
export async function executeOncePerDay() {
	const today = getTodayDateKey();
	if (wasCalledToday(today)) {
		return;
	}
	const lastActiveDay = await getSavedLastActiveDay();
	if (lastActiveDay === today) {
		setToday(today);
		return;
	}
	await Promise.all([
		updateExtensionUsageDays(),
		checkInsertAnalytics({
			isNewUser: lastActiveDay == null,
		}),
	]);
	setToday(today);
}
