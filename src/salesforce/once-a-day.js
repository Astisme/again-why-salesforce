"use strict";
import { EXTENSION_NAME } from "/core/constants.js";
import { checkInsertAnalytics } from "./analytics.js";
import { updateExtensionUsageDays } from "./update-settings.js";

const today_key = `${EXTENSION_NAME}-today`;

/**
 * Builds a stable local date key for comparing one usage day against another.
 * @param {Date} [today=new Date()] - the date to serialize
 * @return {String} local date formatted as YYYY-MM-DD
 */
export function getTodayDateKey(today = new Date()) {
	return [
		today.getFullYear(),
		String(today.getMonth() + 1).padStart(2, "0"),
		String(today.getDate()).padStart(2, "0"),
	].join("-");
}

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
 * Executes the whole function only once a day leveraging sessionStorage
 * @return {undefined} nothing is returned
 */
export function executeOncePerDay() {
	const today = getTodayDateKey();
	if (wasCalledToday(today)) {
		return;
	}
	setToday(today);
	checkInsertAnalytics();
	updateExtensionUsageDays();
}
