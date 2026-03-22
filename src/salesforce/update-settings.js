"use strict";
import {
	EXTENSION_LAST_ACTIVE_DAY,
	EXTENSION_USAGE_DAYS,
	SETTINGS_KEY,
} from "/core/constants.js";
import { getSettings, sendExtensionMessage } from "/core/functions.js";
import { getTodayDateKey } from "./once-a-day.js";

/**
 * Builds the object that will be saved in settings
 *
 * @param {Object} [param0={}] - an object with the following keys
 * @param {number} [param0.usageDays=0] the number of days the extension has been actively used
 * @param {string} [param0.today=getTodayDateKey()] - current day in local YYYY-MM-DD form
 * @return {Array} the set array to save in the settings
 */
function getSetArrayForUsageDays({
	usageDays = 0,
	today = getTodayDateKey(),
} = {}) {
	return [
		{ id: EXTENSION_USAGE_DAYS, enabled: usageDays },
		{ id: EXTENSION_LAST_ACTIVE_DAY, enabled: today },
	];
}

/**
 * Determines whether today's extension use should update the persisted usage-day tracker.
 * @param {Object[]|Object|null} [settings=[]] - retrieved settings entries for the usage tracker
 * @param {string} [today=getTodayDateKey()] - local date formatted as YYYY-MM-DD
 * @return {{usageDays: number, set: Object[]|null}} the effective usage-day count and pending settings updates
 * @exports for tests
 */
export function getUsageDaysUpdate(
	settings = [],
	today = getTodayDateKey(),
) {
	if (!Array.isArray(settings)) {
		settings = settings == null ? [] : [settings];
	}
	const settingsMap = new Map(
		settings
			.filter(Boolean)
			.map((setting) => [setting.id, setting]),
	);
	const usageDays = Number(
		settingsMap.get(EXTENSION_USAGE_DAYS)?.enabled ?? 0,
	);
	const lastActiveDay = settingsMap.get(EXTENSION_LAST_ACTIVE_DAY)
		?.enabled;
	let updatedUsageDays = usageDays;
	let set = null;
	if (
		!settingsMap.has(EXTENSION_USAGE_DAYS) ||
		lastActiveDay == null
	) {
		set = getSetArrayForUsageDays({ usageDays, today });
	} else if (lastActiveDay !== today) {
		updatedUsageDays += 1;
		set = getSetArrayForUsageDays({ usageDays: updatedUsageDays, today });
	}
	return { usageDays: updatedUsageDays, set };
}

/**
 * Loads and updates the persisted extension usage-day tracker.
 * @return {Promise<number>} the number of distinct days the user has used the extension
 */
export async function updateExtensionUsageDays() {
	const usageSettings = await getSettings([
		EXTENSION_USAGE_DAYS,
		EXTENSION_LAST_ACTIVE_DAY,
	]);
	const { usageDays, set } = getUsageDaysUpdate(usageSettings);
	if (set != null) {
		await sendExtensionMessage({
			what: "set",
			key: SETTINGS_KEY,
			set,
		});
	}
	return usageDays;
}
