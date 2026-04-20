"use strict";
import {
	CMD_OPEN_SETTINGS,
	CXM_UNPIN_TAB,
	EXTENSION_GITHUB_LINK,
	HIDDEN_CLASS,
	SALESFORCE_SETUP_HOME_MINI,
	SETUP_LIGHTNING,
	TOAST_WARNING,
	TUTORIAL_CLOSE_EVENT,
	TUTORIAL_EVENT_ACTION_FAVOURITE,
	TUTORIAL_EVENT_ACTION_UNFAVOURITE,
	TUTORIAL_EVENT_CLOSE_MANAGE_TABS,
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
	TUTORIAL_EVENT_PIN_TAB,
	TUTORIAL_EVENT_REORDERED_TABS_TABLE,
	TUTORIAL_KEY,
	WHAT_ADD,
	WHAT_GET,
	WHAT_GET_COMMANDS,
	WHAT_SET,
} from "../../core/constants.js";
import {
	performLightningRedirect,
	sendExtensionMessage,
	sendExtensionMessages,
} from "../../core/functions.js";
import { getTranslations } from "../../core/translator.js";
import Tab from "../../core/tab.js";
import { performActionOnTabs } from "./content-runtime.js";
import { showToast } from "../toast.js";
import { getCurrentHref, getSetupTabUl } from "../sf-elements.js";
import {
	FAVOURITE_BUTTON_ID,
	showFavouriteButton,
} from "../favourite-manager.js";
import {
	generateTutorialElements,
	MODAL_ID,
	sldsConfirm,
} from "../generator.js";
import {
	ensureAllTabsAvailability,
	TabContainer,
} from "../../core/tabContainer.js";
import { handleActionButtonClick } from "../manageTabs.js";
import {
	createTutorialModule as createTutorialPureModule,
} from "../module/tutorial-module.js";

/**
 * Creates tutorial helpers with runtime defaults and optional overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {{
 *   Tutorial: unknown;
 *   checkTutorial: (fromPopup?: boolean) => Promise<void>;
 * }} Tutorial module API.
 */
export function createTutorialModule(overrides = {}) {
	return createTutorialPureModule({
		CMD_OPEN_SETTINGS: overrides.CMD_OPEN_SETTINGS ?? CMD_OPEN_SETTINGS,
		CXM_UNPIN_TAB: overrides.CXM_UNPIN_TAB ?? CXM_UNPIN_TAB,
		EXTENSION_GITHUB_LINK: overrides.EXTENSION_GITHUB_LINK ??
			EXTENSION_GITHUB_LINK,
		FAVOURITE_BUTTON_ID: overrides.FAVOURITE_BUTTON_ID ??
			FAVOURITE_BUTTON_ID,
		HIDDEN_CLASS: overrides.HIDDEN_CLASS ?? HIDDEN_CLASS,
		MODAL_ID: overrides.MODAL_ID ?? MODAL_ID,
		SALESFORCE_SETUP_HOME_MINI: overrides.SALESFORCE_SETUP_HOME_MINI ??
			SALESFORCE_SETUP_HOME_MINI,
		SETUP_LIGHTNING: overrides.SETUP_LIGHTNING ?? SETUP_LIGHTNING,
		TOAST_WARNING: overrides.TOAST_WARNING ?? TOAST_WARNING,
		TUTORIAL_CLOSE_EVENT: overrides.TUTORIAL_CLOSE_EVENT ??
			TUTORIAL_CLOSE_EVENT,
		TUTORIAL_EVENT_ACTION_FAVOURITE:
			overrides.TUTORIAL_EVENT_ACTION_FAVOURITE ??
				TUTORIAL_EVENT_ACTION_FAVOURITE,
		TUTORIAL_EVENT_ACTION_UNFAVOURITE:
			overrides.TUTORIAL_EVENT_ACTION_UNFAVOURITE ??
				TUTORIAL_EVENT_ACTION_UNFAVOURITE,
		TUTORIAL_EVENT_CLOSE_MANAGE_TABS:
			overrides.TUTORIAL_EVENT_CLOSE_MANAGE_TABS ??
				TUTORIAL_EVENT_CLOSE_MANAGE_TABS,
		TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL:
			overrides.TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL ??
				TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
		TUTORIAL_EVENT_PIN_TAB: overrides.TUTORIAL_EVENT_PIN_TAB ??
			TUTORIAL_EVENT_PIN_TAB,
		TUTORIAL_EVENT_REORDERED_TABS_TABLE:
			overrides.TUTORIAL_EVENT_REORDERED_TABS_TABLE ??
				TUTORIAL_EVENT_REORDERED_TABS_TABLE,
		TUTORIAL_KEY: overrides.TUTORIAL_KEY ?? TUTORIAL_KEY,
		Tab: overrides.Tab ?? Tab,
		TabContainer: overrides.TabContainer ?? TabContainer,
		WHAT_ADD: overrides.WHAT_ADD ?? WHAT_ADD,
		WHAT_GET: overrides.WHAT_GET ?? WHAT_GET,
		WHAT_GET_COMMANDS: overrides.WHAT_GET_COMMANDS ?? WHAT_GET_COMMANDS,
		WHAT_SET: overrides.WHAT_SET ?? WHAT_SET,
		document: overrides.document ?? globalThis.document,
		ensureAllTabsAvailability: overrides.ensureAllTabsAvailability ??
			ensureAllTabsAvailability,
		fetch: overrides.fetch ?? globalThis.fetch,
		generateTutorialElements: overrides.generateTutorialElements ??
			generateTutorialElements,
		getCurrentHref: overrides.getCurrentHref ?? getCurrentHref,
		getSetupTabUl: overrides.getSetupTabUl ?? getSetupTabUl,
		getTranslations: overrides.getTranslations ?? getTranslations,
		handleActionButtonClick: overrides.handleActionButtonClick ??
			handleActionButtonClick,
		performActionOnTabs: overrides.performActionOnTabs ??
			performActionOnTabs,
		performLightningRedirect: overrides.performLightningRedirect ??
			performLightningRedirect,
		sendExtensionMessage: overrides.sendExtensionMessage ??
			sendExtensionMessage,
		sendExtensionMessages: overrides.sendExtensionMessages ??
			sendExtensionMessages,
		showFavouriteButton: overrides.showFavouriteButton ??
			showFavouriteButton,
		showToast: overrides.showToast ?? showToast,
		sldsConfirm: overrides.sldsConfirm ?? sldsConfirm,
		window: overrides.window ?? globalThis.window,
	});
}

const tutorialModule = createTutorialModule();

/**
 * Checks if tutorial should run and starts/prompts accordingly.
 *
 * @param {boolean} [fromPopup=false] Whether invocation came from popup.
 * @return {Promise<void>}
 */
export function checkTutorial(fromPopup = false) {
	return tutorialModule.checkTutorial(fromPopup);
}
