"use strict";
import {
	BROWSER,
	DECORATION_COLORS,
	LOCALE_KEY,
	SETTINGS_KEY,
	STYLE_KEYS,
	TUTORIAL_CLOSE_EVENT,
	TUTORIAL_KEY,
	WHY_KEY,
} from "/core/constants.js";
import cssColorNames from "./css-color-names.json" with { type: "json" };

/**
 * Invoke the runtime to send the message
 *
 * @param {string|string[]} key - the key (or keys) for which we should retrieve the persisted data.
 * @param {function} callback - The callback to execute after sending the message.
 * @return {Promise} containing the requested info for the given key.
 */
function _getFromStorage(key, callback) {
	return BROWSER.storage.sync.get(
		Array.isArray(key) ? key : [key],
		(items) => callback(Array.isArray(key) ? items : items[key]),
	);
}

/**
 * Retrieves data from browser storage under the specified key.
 * Supports both callback and Promise-based usage.
 *
 * @param {function} [callback] - Optional callback to handle the retrieved data.
 * @param {string} [key=WHY_KEY] - The storage key to retrieve data from.
 * @return {Promise<any>|void} Returns a Promise if no callback is provided, otherwise void.
 */
export function bg_getStorage(callback, key = WHY_KEY) {
	if (callback == null) {
		return new Promise((resolve, reject) => {
			_getFromStorage(
				key,
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
	_getFromStorage(key, callback);
}

/**
 * Retrieves settings from background storage based on specified keys.
 * If `settingKeys` is null, returns all settings.
 * Supports optional callback usage or returns a Promise with the result.
 *
 * @param {string|string[]|null} [settingKeys=null] - Single key or array of keys to retrieve. If null, all settings are returned.
 * @param {string|string[]} [key=SETTINGS_KEY] - The storage key namespace to retrieve settings from.
 * @param {Function|null} [callback=null] - Optional callback to handle the retrieved settings.
 * @return {Promise<Object|Object[]>|void} A Promise resolving to the requested settings, or void if a callback is provided.
 */
export async function bg_getSettings(
	settingKeys = null,
	key = SETTINGS_KEY,
	callback = null,
) {
	const settings = await bg_getStorage(null, key);
	if (settingKeys == null || settings == null) {
		if (callback == null) {
			return settings;
		}
		return callback(settings);
	}
	if (!Array.isArray(settingKeys)) {
		settingKeys = [settingKeys];
	}
	const requestedSettings = settings.filter((setting) =>
		settingKeys.includes(setting.id)
	);
	const response = settingKeys.length === 1 && key === SETTINGS_KEY
		? requestedSettings[0]
		: requestedSettings;
	if (callback == null) {
		return response;
	}
	callback(response);
}

/**
 * Checks that the value of every style setting is in Hexadecimal (#FFFFFF) format.
 * If a style is found with a non-compliant value, it is updated to Hexadecimal.
 *
 * @param {string|string[]} styleKey - the key related to the current style settings.
 * @param {Array|Object<string,Array>} styleSettings - the result from bg_getSettings (for style settings).
 * @return {Promise} styleSettings, updated with Hexadecimal values.
 */
async function checkStyleSettingsHex(styleKey, styleSettings) {
	if (styleKey == null || styleSettings == null) {
		return styleSettings;
	}
	if (!Array.isArray(styleKey)) {
		styleKey = [styleKey];
	}
	const wasArray = Array.isArray(styleSettings);
	if (wasArray) {
		styleSettings = Object.fromEntries(
			styleKey.map(
				(key) => [key, styleSettings],
			),
		);
	}
	const updateKeys = new Map();
	for (const [key, styleArray] of Object.entries(styleSettings)) {
		for (
			const styleByKey of styleArray
				.filter(({ id, value }) =>
					DECORATION_COLORS.has(id) &&
					cssColorNames[value.toLowerCase()] != null
				)
		) {
			styleByKey.value = cssColorNames[styleByKey.value.toLowerCase()];
			if (!updateKeys.has(key)) {
				updateKeys.set(key, []);
			}
			updateKeys.get(key).push(styleByKey);
		}
	}
	if (updateKeys.size > 0) {
		await Promise.all(
			Array.from(
				updateKeys,
				([key, value]) => bg_setStorage(value, undefined, key),
			),
		);
	}
	return wasArray ? Object.values(styleSettings).flat() : styleSettings;
}

/**
 * Finds the style settings currently persisted, given a key. If no key is requested, returns all available styles.
 *
 * @param {String} [key=null] - the key for which to find the persisted styles.
 * @param {Function} [callback=null] - a callback to call when the styles have been retrieved.
 * @return {Promise<Object>} the style settings for the requested key.
 */
export async function bg_getStyleSettings(
	key = null,
	callback = null,
) {
	if (key == null) {
		key = [
			...STYLE_KEYS,
		];
	}
	let settings = await bg_getSettings(
		undefined,
		key,
	);
	if (
		settings == null ||
		Object.values(settings).every(
			(sett) =>
				sett == null ||
				!Object.values(sett).some(Boolean),
		)
	) {
		settings = null;
	} else {
		settings = await checkStyleSettingsHex(key, settings);
	}
	if (callback != null) {
		return callback(settings);
	}
	return settings;
}

/**
 * Returns whether a stored setting matches a candidate item,
 * delegating to {@link isSameStyleItem} for style keys.
 * @param {Object} setting - An existing setting from the stored array.
 * @param {Object} item - The new setting item to match against.
 * @param {boolean} isStyleKey - Whether the current settings key is a style key.
 * @return {boolean}
 */
function isSameItem(setting, item, isStyleKey) {
	return setting.id === item.id &&
		(
			!isStyleKey ||
			(
				setting.forActive == null ||
				item.forActive == null ||
				setting.forActive === item.forActive
			)
		);
}

/**
 * Applies a new setting item onto each matched existing item in the array.
 * For style keys, updates or removes based on value; otherwise merges all fields.
 * @param {Array} settingsArray - The full settings array, mutated in place.
 * @param {Object[]} existingItems - The subset of items that matched the new item.
 * @param {Object} item - The new setting to merge in.
 * @param {boolean} isStyleKey - Whether the current settings key is a style key.
 * @return {void}
 */
function mergeExistingItems(settingsArray, existingItems, item, isStyleKey) {
	for (const existing of existingItems) {
		if (isStyleKey) {
			if (item.value == null || item.value === "") {
        // the item has been removed
				const index = settingsArray.indexOf(existing);
				if (index >= 0) settingsArray.splice(index, 1);
			} else {
        // the item has been updated
				existing.value = item.value;
			}
		} else {
      // update the object reference (inside the settingsArray)
			Object.assign(existing, item);
		}
	}
}

/**
 * Finds the already stored settings and merges them with the new ones passed as input by matching them with the id field.
 *
 * @param {Array} newsettings - The settings to be stored.
 * @param {string} [key=SETTINGS_KEY]  - The key of the settings where to merge and store the newsettings array.
 * @return {Promise<Array>} the merged settings.
 */
async function mergeSettings(newsettings, key = SETTINGS_KEY) {
	const isStyleKey = STYLE_KEYS.has(key);
  // get the settings array
	const settingsArray = await bg_getSettings(
		...(isStyleKey ? [null, key] : []),
	);
	if (settingsArray == null) return newsettings;
	for (const item of newsettings) {
    // check if the item.id is already present
		const existingItems = settingsArray.filter((s) =>
			isSameItem(s, item, isStyleKey)
		);
		if (existingItems.length <= 0) {
      // add the new setting
			settingsArray.push(item);
			continue;
		}
		mergeExistingItems(settingsArray, existingItems, item, isStyleKey);
	}
	return settingsArray;
}

const directKeys = new Set([
	WHY_KEY,
	LOCALE_KEY,
	TUTORIAL_KEY,
	TUTORIAL_CLOSE_EVENT,
]);
/**
 * Stores the provided tabs data in the browser's storage and invokes the callback.
 *
 * @param {Array|Object|string} tobeset - The data to be stored.
 * @param {function|null} [callback=null] - The callback to execute after storing the data.
 * @param {string} [key=WHY_KEY] - The key of the map where to store the tobeset array.
 * @return {Promise} the promise from BROWSER.storage.sync.set.
 */
export async function bg_setStorage(tobeset, callback = null, key = WHY_KEY) {
	const set = {};
	if (key === SETTINGS_KEY || STYLE_KEYS.has(key)) {
		tobeset = await mergeSettings(
			Array.isArray(tobeset) ? tobeset : [tobeset],
			key,
		);
	} else if (!directKeys.has(key)) {
		throw new Error("error_unknown_request", key);
	}
	set[key] = tobeset;
	if (callback == null) {
		return BROWSER.storage.sync.set(set);
	}
	return BROWSER.storage.sync.set(set, () => callback(set[key]));
}
