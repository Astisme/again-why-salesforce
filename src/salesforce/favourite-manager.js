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
} from "../core/constants.js";
import {
	getSettings,
	injectStyle,
	sendExtensionMessage,
} from "../core/functions.js";
import Tab from "../core/tab.js";
import { ensureAllTabsAvailability } from "../core/tabContainer.js";
import { getTranslations } from "../core/translator.js";
import {
	getIsCurrentlyOnSavedTab,
	getWasOnSavedTab,
	isOnSavedTab,
	performActionOnTabs,
} from "./content-runtime.js";
import { getCurrentHref } from "./sf-elements.js";
import { showToast } from "./toast.js";
import { createFavouriteManagerModule } from "./favourite-manager-runtime.js";

const moduleRef = createFavouriteManagerModule({
	cmdRemoveTab: CMD_REMOVE_TAB,
	cmdSaveAsTab: CMD_SAVE_AS_TAB,
	cxmRemoveTab: CXM_REMOVE_TAB,
	extensionLabel: EXTENSION_LABEL,
	extensionName: EXTENSION_NAME,
	hiddenClass: HIDDEN_CLASS,
	salesforceSetupHomeMini: SALESFORCE_SETUP_HOME_MINI,
	skipLinkDetection: SKIP_LINK_DETECTION,
	tabAddFront: TAB_ADD_FRONT,
	tabAsOrg: TAB_AS_ORG,
	toastInfo: TOAST_INFO,
	toastWarning: TOAST_WARNING,
	tutorialEventActionFavourite: TUTORIAL_EVENT_ACTION_FAVOURITE,
	tutorialEventActionUnfavourite: TUTORIAL_EVENT_ACTION_UNFAVOURITE,
	whatAdd: WHAT_ADD,
	whatGetCommands: WHAT_GET_COMMANDS,
	tabRef: Tab,
	ensureAllTabsAvailabilityFn: ensureAllTabsAvailability,
	getTranslationsFn: getTranslations,
	getCurrentHrefFn: getCurrentHref,
	getIsCurrentlyOnSavedTabFn: getIsCurrentlyOnSavedTab,
	getSettingsFn: getSettings,
	getWasOnSavedTabFn: getWasOnSavedTab,
	injectStyleFn: injectStyle,
	isOnSavedTabFn: isOnSavedTab,
	performActionOnTabsFn: performActionOnTabs,
	sendExtensionMessageFn: sendExtensionMessage,
	showToastFn: showToast,
	documentRef: document,
	setTimeoutFn: setTimeout,
	customEventCtor: CustomEvent,
});

export const FAVOURITE_BUTTON_ID = moduleRef.FAVOURITE_BUTTON_ID;
export const STAR_ID = moduleRef.STAR_ID;
export const SLASHED_STAR_ID = moduleRef.SLASHED_STAR_ID;
export const showFavouriteButton = moduleRef.showFavouriteButton;
export const pageActionTab = moduleRef.pageActionTab;
