"use strict";
import {
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	PREVENT_DEFAULT_OVERRIDE,
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_BOLD,
} from "/core/constants.js";
import { bg_getStyleSettings, bg_setStorage } from "./storage.js";

/**
 * Persists the styles for the given key.
 *
 * @param {string} [key=ORG_TAB_STYLE_KEY] - the key for which we want to create the style.
 * @param {...Array<Object>} styles - the new styles to apply for the key.
 * @return {Promise<Array<Object>>} the created styles.
 */
async function _createDefaultStyle(key = ORG_TAB_STYLE_KEY, ...styles) {
	await bg_setStorage(
		styles.filter(Boolean),
		undefined,
		key,
	);
	return styles;
}

/**
 * Wrapper function for _createDefaultStyle; filters the availableStyles before calling it.
 *
 * @param {Object} availableStyles - the currently saved styles which are in use.
 * @param {string} [key=ORG_TAB_STYLE_KEY] - the key for which the function should inherit the styles from.
 * @param {string} [newKey=ORG_PINNED_TAB_STYLE_KEY] - the key for which we want to create the style.
 * @param {...Array<Object>} styles - the new styles to apply for the newKey.
 * @return {Promise<Array<Object>>} the created styles.
 */
async function _createDefaultStyleWrapper(
	availableStyles,
	key = ORG_TAB_STYLE_KEY,
	newKey = ORG_PINNED_TAB_STYLE_KEY,
	...styles
) {
	const filteredStyles = availableStyles[key]
		?.filter((el) =>
			el.id !== PREVENT_DEFAULT_OVERRIDE &&
			// override user-set background
			el.id !== TAB_STYLE_BACKGROUND
		) ?? [];
	return await _createDefaultStyle(
		newKey,
		...filteredStyles,
		...styles,
	);
}

/**
 * Ensures default organizational style settings exist;
 * if none are found, creates and saves default styles for org-specific tabs.
 *
 * @return {Promise<void>} Resolves after defaults are guaranteed.
 */
export async function setDefaultOrgStyle() {
	const availableStyles = (await bg_getStyleSettings()) ?? {};
	// if no style settings have been found,
	// create the default style for org-specific Tabs & send it to the background.
	// same goes for org-specific pinned Tabs
	const boldStyle = [
		{ id: TAB_STYLE_BOLD, forActive: false, value: TAB_STYLE_BOLD },
		{ id: TAB_STYLE_BOLD, forActive: true, value: TAB_STYLE_BOLD },
	];
	if (availableStyles[ORG_TAB_STYLE_KEY] == null) {
		availableStyles[ORG_TAB_STYLE_KEY] = await _createDefaultStyle(
			ORG_TAB_STYLE_KEY,
			...boldStyle,
		);
	}
	// for pinned Tabs, assign the same current styles used for the unpinned counterparts
	// but change the color of the background to the default one
	const pinnedStyles = [
		{ id: TAB_STYLE_BACKGROUND, forActive: false, value: "#FFE4E1" },
		{ id: TAB_STYLE_BACKGROUND, forActive: true, value: "#FFE4E1" },
	];
	if (availableStyles[ORG_PINNED_TAB_STYLE_KEY] == null) {
		availableStyles[ORG_PINNED_TAB_STYLE_KEY] =
			await _createDefaultStyleWrapper(
				availableStyles,
				ORG_TAB_STYLE_KEY,
				ORG_PINNED_TAB_STYLE_KEY,
				...pinnedStyles,
			);
	}
	if (availableStyles[GENERIC_PINNED_TAB_STYLE_KEY] == null) {
		availableStyles[GENERIC_PINNED_TAB_STYLE_KEY] =
			await _createDefaultStyleWrapper(
				availableStyles,
				GENERIC_TAB_STYLE_KEY,
				GENERIC_PINNED_TAB_STYLE_KEY,
				...pinnedStyles,
			);
	}
}
