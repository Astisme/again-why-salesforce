"use strict";

import * as favouriteManagerRuntime from "./runtime/favourite-manager-runtime.js";

/**
 * Creates favourite-manager helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {Record<string, unknown>} Favourite-manager module API.
 */
export function createFavouriteManagerModule(overrides = {}) {
	return favouriteManagerRuntime.createFavouriteManagerModule(overrides);
}

/**
 * Saves or removes current page as favourite.
 *
 * @param {boolean} [save=true] Whether to save or remove.
 * @return {void}
 */
export function pageActionTab(save = true) {
	return favouriteManagerRuntime.pageActionTab(save);
}

/**
 * Shows or refreshes favourite button in setup header.
 *
 * @param {number} [count=0] Retry counter.
 * @return {Promise<number | void>} Timeout id when retried.
 */
export function showFavouriteButton(count = 0) {
	return favouriteManagerRuntime.showFavouriteButton(count);
}

/**
 * Runtime favourite button id.
 */
export const FAVOURITE_BUTTON_ID = favouriteManagerRuntime.FAVOURITE_BUTTON_ID;

/**
 * Runtime slashed-star id.
 */
export const SLASHED_STAR_ID = favouriteManagerRuntime.SLASHED_STAR_ID;

/**
 * Runtime star id.
 */
export const STAR_ID = favouriteManagerRuntime.STAR_ID;
