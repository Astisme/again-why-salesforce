"use strict";
import {
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	CXM_REMOVE_TAB,
	EXTENSION_LABEL,
	EXTENSION_NAME,
	HIDDEN_CLASS,
	SALESFORCE_SETUP_HOME_MINI,
	SKIP_LINK_DETECTION,
	TAB_ADD_FRONT,
	TAB_AS_ORG,
	TOAST_INFO,
	TOAST_WARNING,
	TUTORIAL_EVENT_ACTION_FAVOURITE,
	TUTORIAL_EVENT_ACTION_UNFAVOURITE,
	WHAT_ADD,
	WHAT_GET_COMMANDS,
} from "../../core/constants.js";
import {
	getSettings,
	injectStyle,
	sendExtensionMessage,
} from "../../core/functions.js";
import Tab from "../../core/tab.js";
import { ensureAllTabsAvailability } from "../../core/tabContainer.js";
import { TranslationService } from "../../core/translator.js";
import {
	createFavouriteManagerModule as createFavouriteManagerPureModule,
} from "../module/favourite-manager-module.js";
import {
	getIsCurrentlyOnSavedTab,
	getWasOnSavedTab,
	isOnSavedTab,
	performActionOnTabs,
} from "./content-runtime.js";
import { getCurrentHref } from "./sf-elements-runtime.js";
import { showToast } from "./toast-runtime.js";

/**
 * Creates favourite-manager helpers with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @return {{
 *   FAVOURITE_BUTTON_ID: string;
 *   SLASHED_STAR_ID: string;
 *   STAR_ID: string;
 *   actionFavourite: () => Promise<void>;
 *   addTab: (url: string) => Promise<void>;
 *   createStarSvg: (options?: { alt?: string | null; id?: string | null }, slashed?: boolean) => SVGElement;
 *   generateFavouriteButton: () => Promise<HTMLButtonElement>;
 *   getFavouriteImage: (favouriteId: string | null, button?: HTMLButtonElement | null) => HTMLElement | null;
 *   pageActionTab: (save?: boolean) => void;
 *   showFavouriteButton: (count?: number) => Promise<number | void>;
 *   toggleFavouriteButton: (isSaved?: boolean | null, button?: HTMLButtonElement | null) => void;
 * }} Favourite-manager runtime API.
 */
export function createFavouriteManagerModule(overrides = {}) {
	return createFavouriteManagerPureModule({
		cmdRemoveTab: overrides.cmdRemoveTab ?? CMD_REMOVE_TAB,
		cmdSaveAsTab: overrides.cmdSaveAsTab ?? CMD_SAVE_AS_TAB,
		cxmRemoveTab: overrides.cxmRemoveTab ?? CXM_REMOVE_TAB,
		extensionLabel: overrides.extensionLabel ?? EXTENSION_LABEL,
		extensionName: overrides.extensionName ?? EXTENSION_NAME,
		hiddenClass: overrides.hiddenClass ?? HIDDEN_CLASS,
		salesforceSetupHomeMini: overrides.salesforceSetupHomeMini ??
			SALESFORCE_SETUP_HOME_MINI,
		skipLinkDetection: overrides.skipLinkDetection ?? SKIP_LINK_DETECTION,
		tabAddFront: overrides.tabAddFront ?? TAB_ADD_FRONT,
		tabAsOrg: overrides.tabAsOrg ?? TAB_AS_ORG,
		toastInfo: overrides.toastInfo ?? TOAST_INFO,
		toastWarning: overrides.toastWarning ?? TOAST_WARNING,
		tutorialEventActionFavourite: overrides.tutorialEventActionFavourite ??
			TUTORIAL_EVENT_ACTION_FAVOURITE,
		tutorialEventActionUnfavourite:
			overrides.tutorialEventActionUnfavourite ??
				TUTORIAL_EVENT_ACTION_UNFAVOURITE,
		whatAdd: overrides.whatAdd ?? WHAT_ADD,
		whatGetCommands: overrides.whatGetCommands ?? WHAT_GET_COMMANDS,
		tabRef: overrides.tabRef ?? Tab,
		ensureAllTabsAvailabilityFn: overrides.ensureAllTabsAvailabilityFn ??
			ensureAllTabsAvailability,
		getTranslationsFn: overrides.getTranslationsFn ??
			TranslationService.getTranslations,
		getCurrentHrefFn: overrides.getCurrentHrefFn ?? getCurrentHref,
		getIsCurrentlyOnSavedTabFn: overrides.getIsCurrentlyOnSavedTabFn ??
			getIsCurrentlyOnSavedTab,
		getSettingsFn: overrides.getSettingsFn ?? getSettings,
		getWasOnSavedTabFn: overrides.getWasOnSavedTabFn ??
			getWasOnSavedTab,
		injectStyleFn: overrides.injectStyleFn ?? injectStyle,
		isOnSavedTabFn: overrides.isOnSavedTabFn ?? isOnSavedTab,
		performActionOnTabsFn: overrides.performActionOnTabsFn ??
			performActionOnTabs,
		sendExtensionMessageFn: overrides.sendExtensionMessageFn ??
			sendExtensionMessage,
		showToastFn: overrides.showToastFn ?? showToast,
		documentRef: overrides.documentRef ?? globalThis.document,
		setTimeoutFn: overrides.setTimeoutFn ?? globalThis.setTimeout,
		customEventCtor: overrides.customEventCtor ?? globalThis.CustomEvent,
		consoleRef: overrides.consoleRef ?? console,
	});
}

const favouriteManagerModule = createFavouriteManagerModule();

/**
 * Saves or removes current page as favourite.
 *
 * @return {Promise<void>}
 */
export function actionFavourite() {
	return favouriteManagerModule.actionFavourite();
}

/**
 * Adds current page as saved tab.
 *
 * @param {string} url Minified tab URL.
 * @return {Promise<void>}
 */
export function addTab(url) {
	return favouriteManagerModule.addTab(url);
}

/**
 * Creates star or slashed-star SVG.
 *
 * @param {{ alt?: string | null; id?: string | null }} [options={}] SVG options.
 * @param {boolean} [slashed=false] Whether icon is slashed.
 * @return {SVGElement} SVG icon.
 */
export function createStarSvg(options = {}, slashed = false) {
	return favouriteManagerModule.createStarSvg(options, slashed);
}

/**
 * Generates favourite button with runtime defaults.
 *
 * @return {Promise<HTMLButtonElement>} Created button.
 */
export function generateFavouriteButton() {
	return favouriteManagerModule.generateFavouriteButton();
}

/**
 * Resolves favourite icon element by id.
 *
 * @param {string | null} favouriteId Target element id.
 * @param {HTMLButtonElement | null} [button=null] Optional button scope.
 * @return {HTMLElement | null} Matching element.
 */
export function getFavouriteImage(favouriteId, button = null) {
	return favouriteManagerModule.getFavouriteImage(favouriteId, button);
}

/**
 * Runs page save/remove action based on visible icon.
 *
 * @param {boolean} [save=true] Whether to save or remove.
 * @return {void}
 */
export function pageActionTab(save = true) {
	return favouriteManagerModule.pageActionTab(save);
}

/**
 * Shows or refreshes favourite button in setup header.
 *
 * @param {number} [count=0] Retry counter.
 * @return {Promise<number | void>} Timeout id when retried.
 */
export function showFavouriteButton(count = 0) {
	return favouriteManagerModule.showFavouriteButton(count);
}

/**
 * Toggles favourite icon state on a button.
 *
 * @param {boolean | null} [isSaved=null] Whether tab is saved.
 * @param {HTMLButtonElement | null} [button=null] Optional button scope.
 * @return {void}
 */
export function toggleFavouriteButton(isSaved = null, button = null) {
	return favouriteManagerModule.toggleFavouriteButton(isSaved, button);
}

/**
 * Runtime favourite button id.
 */
export const FAVOURITE_BUTTON_ID = favouriteManagerModule.FAVOURITE_BUTTON_ID;

/**
 * Runtime slashed-star id.
 */
export const SLASHED_STAR_ID = favouriteManagerModule.SLASHED_STAR_ID;

/**
 * Runtime star id.
 */
export const STAR_ID = favouriteManagerModule.STAR_ID;
