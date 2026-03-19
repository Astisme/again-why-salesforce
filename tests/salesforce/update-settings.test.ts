import "../mocks.ts";
import { assertEquals } from "@std/testing/asserts";
import { SETTINGS_KEY } from "/constants.js";
import { getTodayDateKey } from "/salesforce/once-a-day.js";
import {
	getUsageDaysUpdate,
	updateExtensionUsageDays,
} from "/salesforce/update-settings.js";
import { mockStorage } from "../mocks.ts";

const today = "2026-03-11";
const yesterday = "2026-03-10";

/**
 * Returns a deep clone of the current mocked settings array.
 *
 * @return {object[]} A cloned copy of the stored settings.
 */
function cloneSettings() {
	return structuredClone(mockStorage[SETTINGS_KEY]);
}

Deno.test("getUsageDaysUpdate initializes missing usage tracking at zero", () => {
	assertEquals(
		getUsageDaysUpdate([], today),
		{
			usageDays: 0,
			set: [
				{ id: "extension_usage_days", enabled: 0 },
				{ id: "extension_last_active_day", enabled: today },
			],
		},
	);
});

Deno.test("getUsageDaysUpdate does not increment twice on the same day", () => {
	assertEquals(
		getUsageDaysUpdate([
			{ id: "extension_usage_days", enabled: 7 },
			{ id: "extension_last_active_day", enabled: today },
		], today),
		{
			usageDays: 7,
			set: null,
		},
	);
});

Deno.test("getUsageDaysUpdate increments usage days on a new day", () => {
	assertEquals(
		getUsageDaysUpdate([
			{ id: "extension_usage_days", enabled: 7 },
			{ id: "extension_last_active_day", enabled: yesterday },
		], today),
		{
			usageDays: 8,
			set: [
				{ id: "extension_usage_days", enabled: 8 },
				{ id: "extension_last_active_day", enabled: today },
			],
		},
	);
});

Deno.test("getUsageDaysUpdate normalizes non-array settings input", () => {
	assertEquals(
		getUsageDaysUpdate(
			{ id: "extension_usage_days", enabled: 2 },
			today,
		),
		{
			usageDays: 2,
			set: [
				{ id: "extension_usage_days", enabled: 2 },
				{ id: "extension_last_active_day", enabled: today },
			],
		},
	);
});

Deno.test("getUsageDaysUpdate handles null settings input", () => {
	assertEquals(
		getUsageDaysUpdate(null, today),
		{
			usageDays: 0,
			set: [
				{ id: "extension_usage_days", enabled: 0 },
				{ id: "extension_last_active_day", enabled: today },
			],
		},
	);
});

Deno.test("updateExtensionUsageDays persists the usage settings", async () => {
	const originalSettings = cloneSettings();
	try {
		mockStorage[SETTINGS_KEY] = [];
		const usageDays = await updateExtensionUsageDays();
		assertEquals(usageDays, 0);
		assertEquals(mockStorage[SETTINGS_KEY], [
			{ id: "extension_usage_days", enabled: 0 },
			{
				id: "extension_last_active_day",
				enabled: getTodayDateKey(),
			},
		]);
	} finally {
		mockStorage[SETTINGS_KEY] = originalSettings;
	}
});
