"use strict";
import {
	BROWSER as _BROWSER,
	CXM_EMPTY_GENERIC_TABS as _CXM_EMPTY_GENERIC_TABS,
	CXM_EMPTY_TABS as _CXM_EMPTY_TABS,
	CXM_EMPTY_VISIBLE_TABS as _CXM_EMPTY_VISIBLE_TABS,
	CXM_MANAGE_TABS as _CXM_MANAGE_TABS,
	CXM_MOVE_FIRST as _CXM_MOVE_FIRST,
	CXM_MOVE_LAST as _CXM_MOVE_LAST,
	CXM_MOVE_LEFT as _CXM_MOVE_LEFT,
	CXM_MOVE_RIGHT as _CXM_MOVE_RIGHT,
	CXM_PIN_TAB as _CXM_PIN_TAB,
	CXM_REMOVE_LEFT_TABS as _CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_OTHER_TABS as _CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_PIN_TABS as _CXM_REMOVE_PIN_TABS,
	CXM_REMOVE_RIGHT_TABS as _CXM_REMOVE_RIGHT_TABS,
	CXM_REMOVE_TAB as _CXM_REMOVE_TAB,
	CXM_REMOVE_UNPIN_TABS as _CXM_REMOVE_UNPIN_TABS,
	CXM_RESET_DEFAULT_TABS as _CXM_RESET_DEFAULT_TABS,
	CXM_SORT_CLICK_COUNT as _CXM_SORT_CLICK_COUNT,
	CXM_SORT_CLICK_DATE as _CXM_SORT_CLICK_DATE,
	CXM_SORT_LABEL as _CXM_SORT_LABEL,
	CXM_SORT_ORG as _CXM_SORT_ORG,
	CXM_SORT_URL as _CXM_SORT_URL,
	CXM_TMP_HIDE_NON_ORG as _CXM_TMP_HIDE_NON_ORG,
	CXM_TMP_HIDE_ORG as _CXM_TMP_HIDE_ORG,
	CXM_UNPIN_TAB as _CXM_UNPIN_TAB,
	EXTENSION_NAME as _EXTENSION_NAME,
	HAS_ORG_TAB as _HAS_ORG_TAB,
	LINK_NEW_BROWSER as _LINK_NEW_BROWSER,
	MODAL_ID as _MODAL_ID,
	SETUP_LIGHTNING as _SETUP_LIGHTNING,
	TAB_ON_LEFT as _TAB_ON_LEFT,
	TOAST_ERROR as _TOAST_ERROR,
	TOAST_WARNING as _TOAST_WARNING,
	TUTORIAL_EVENT_PIN_TAB as _TUTORIAL_EVENT_PIN_TAB,
	USE_LIGHTNING_NAVIGATION as _USE_LIGHTNING_NAVIGATION,
	WHAT_ACTIVATE as _WHAT_ACTIVATE,
	WHAT_ADD as _WHAT_ADD,
	WHAT_EXPORT_FROM_BG as _WHAT_EXPORT_FROM_BG,
	WHAT_FOCUS_CHANGED as _WHAT_FOCUS_CHANGED,
	WHAT_HIGHLIGHTED as _WHAT_HIGHLIGHTED,
	WHAT_INSTALLED as _WHAT_INSTALLED,
	WHAT_PAGE_REMOVE_TAB as _WHAT_PAGE_REMOVE_TAB,
	WHAT_PAGE_SAVE_TAB as _WHAT_PAGE_SAVE_TAB,
	WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP
		as _WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
	WHAT_SAVED as _WHAT_SAVED,
	WHAT_SHOW_EXPORT_MODAL as _WHAT_SHOW_EXPORT_MODAL,
	WHAT_SHOW_IMPORT as _WHAT_SHOW_IMPORT,
	WHAT_SHOW_OPEN_OTHER_ORG as _WHAT_SHOW_OPEN_OTHER_ORG,
	WHAT_START_TUTORIAL as _WHAT_START_TUTORIAL,
	WHAT_STARTUP as _WHAT_STARTUP,
	WHAT_THEME as _WHAT_THEME,
	WHAT_TOGGLE_ORG as _WHAT_TOGGLE_ORG,
	WHAT_UPDATE_EXTENSION as _WHAT_UPDATE_EXTENSION,
	WHAT_UPDATE_TAB as _WHAT_UPDATE_TAB,
} from "../../core/constants.js";
import {
	getInnerElementFieldBySelector as _getInnerElementFieldBySelector,
	getSettings as _getSettings,
} from "../../core/functions.js";
import { getTranslations as _getTranslations } from "../../core/translator.js";
import _Tab from "../../core/tab.js";
import { ensureAllTabsAvailability as _ensureAllTabsAvailability } from "../../core/tabContainer.js";
import { setupDragForUl as _setupDragForUl } from "../dragHandler.js";

import { showToast as _showToast } from "../toast.js";
import {
	generateRowTemplate as _generateRowTemplate,
	generateStyleFromSettings as _generateStyleFromSettings,
	generateUpdateTabModal as _generateUpdateTabModal,
} from "../generator.js";
import { createOpenOtherOrgModal as _createOpenOtherOrgModal } from "../openOtherOrg.js";
import { executeOncePerDay as _executeOncePerDay } from "../once-a-day.js";
import {
	findSetupTabUlInSalesforcePage as _findSetupTabUlInSalesforcePage,
	getCurrentHref as _getCurrentHref,
	getModalHanger as _getModalHanger,
	getSetupTabUl as _getSetupTabUl,
} from "../sf-elements.js";

const CONSTANTS = {
	BROWSER: _BROWSER,
	CXM_EMPTY_GENERIC_TABS: _CXM_EMPTY_GENERIC_TABS,
	CXM_EMPTY_TABS: _CXM_EMPTY_TABS,
	CXM_EMPTY_VISIBLE_TABS: _CXM_EMPTY_VISIBLE_TABS,
	CXM_MANAGE_TABS: _CXM_MANAGE_TABS,
	CXM_MOVE_FIRST: _CXM_MOVE_FIRST,
	CXM_MOVE_LAST: _CXM_MOVE_LAST,
	CXM_MOVE_LEFT: _CXM_MOVE_LEFT,
	CXM_MOVE_RIGHT: _CXM_MOVE_RIGHT,
	CXM_PIN_TAB: _CXM_PIN_TAB,
	CXM_REMOVE_LEFT_TABS: _CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_OTHER_TABS: _CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_PIN_TABS: _CXM_REMOVE_PIN_TABS,
	CXM_REMOVE_RIGHT_TABS: _CXM_REMOVE_RIGHT_TABS,
	CXM_REMOVE_TAB: _CXM_REMOVE_TAB,
	CXM_REMOVE_UNPIN_TABS: _CXM_REMOVE_UNPIN_TABS,
	CXM_RESET_DEFAULT_TABS: _CXM_RESET_DEFAULT_TABS,
	CXM_SORT_CLICK_COUNT: _CXM_SORT_CLICK_COUNT,
	CXM_SORT_CLICK_DATE: _CXM_SORT_CLICK_DATE,
	CXM_SORT_LABEL: _CXM_SORT_LABEL,
	CXM_SORT_ORG: _CXM_SORT_ORG,
	CXM_SORT_URL: _CXM_SORT_URL,
	CXM_TMP_HIDE_NON_ORG: _CXM_TMP_HIDE_NON_ORG,
	CXM_TMP_HIDE_ORG: _CXM_TMP_HIDE_ORG,
	CXM_UNPIN_TAB: _CXM_UNPIN_TAB,
	EXTENSION_NAME: _EXTENSION_NAME,
	HAS_ORG_TAB: _HAS_ORG_TAB,
	LINK_NEW_BROWSER: _LINK_NEW_BROWSER,
	SETUP_LIGHTNING: _SETUP_LIGHTNING,
	TAB_ON_LEFT: _TAB_ON_LEFT,
	TOAST_ERROR: _TOAST_ERROR,
	TOAST_WARNING: _TOAST_WARNING,
	TUTORIAL_EVENT_PIN_TAB: _TUTORIAL_EVENT_PIN_TAB,
	USE_LIGHTNING_NAVIGATION: _USE_LIGHTNING_NAVIGATION,
	WHAT_ACTIVATE: _WHAT_ACTIVATE,
	WHAT_ADD: _WHAT_ADD,
	WHAT_EXPORT_FROM_BG: _WHAT_EXPORT_FROM_BG,
	WHAT_FOCUS_CHANGED: _WHAT_FOCUS_CHANGED,
	WHAT_HIGHLIGHTED: _WHAT_HIGHLIGHTED,
	WHAT_INSTALLED: _WHAT_INSTALLED,
	WHAT_PAGE_REMOVE_TAB: _WHAT_PAGE_REMOVE_TAB,
	WHAT_PAGE_SAVE_TAB: _WHAT_PAGE_SAVE_TAB,
	WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP:
		_WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
	WHAT_SAVED: _WHAT_SAVED,
	WHAT_SHOW_EXPORT_MODAL: _WHAT_SHOW_EXPORT_MODAL,
	WHAT_SHOW_IMPORT: _WHAT_SHOW_IMPORT,
	WHAT_SHOW_OPEN_OTHER_ORG: _WHAT_SHOW_OPEN_OTHER_ORG,
	WHAT_START_TUTORIAL: _WHAT_START_TUTORIAL,
	WHAT_STARTUP: _WHAT_STARTUP,
	WHAT_THEME: _WHAT_THEME,
	WHAT_TOGGLE_ORG: _WHAT_TOGGLE_ORG,
	WHAT_UPDATE_EXTENSION: _WHAT_UPDATE_EXTENSION,
	WHAT_UPDATE_TAB: _WHAT_UPDATE_TAB,
};

const DEPENDENCIES = {
	Tab: _Tab,
	MODAL_ID: _MODAL_ID,
	createOpenOtherOrgModal: _createOpenOtherOrgModal,
	ensureAllTabsAvailability: _ensureAllTabsAvailability,
	executeOncePerDay: _executeOncePerDay,
	findSetupTabUlInSalesforcePage: _findSetupTabUlInSalesforcePage,
	generateRowTemplate: _generateRowTemplate,
	generateStyleFromSettings: _generateStyleFromSettings,
	generateUpdateTabModal: _generateUpdateTabModal,
	getCurrentHref: _getCurrentHref,
	getInnerElementFieldBySelector: _getInnerElementFieldBySelector,
	getModalHanger: _getModalHanger,
	getSettings: _getSettings,
	getSetupTabUl: _getSetupTabUl,
	getTranslations: _getTranslations,
	setupDragForUl: _setupDragForUl,
	showToast: _showToast,
};

const getInnerElementFieldBySelector = (...args) =>
	DEPENDENCIES.getInnerElementFieldBySelector(...args);
const getSettings = (...args) => DEPENDENCIES.getSettings(...args);
const getTranslations = (...args) => DEPENDENCIES.getTranslations(...args);
const ensureAllTabsAvailability = (...args) =>
	DEPENDENCIES.ensureAllTabsAvailability(...args);
const setupDragForUl = (...args) => DEPENDENCIES.setupDragForUl(...args);
const showToast = (...args) => DEPENDENCIES.showToast(...args);
const generateRowTemplate = (...args) =>
	DEPENDENCIES.generateRowTemplate(...args);
const generateStyleFromSettings = (...args) =>
	DEPENDENCIES.generateStyleFromSettings(...args);
const generateUpdateTabModal = (...args) =>
	DEPENDENCIES.generateUpdateTabModal(...args);
const createOpenOtherOrgModal = (...args) =>
	DEPENDENCIES.createOpenOtherOrgModal(...args);
const executeOncePerDay = (...args) => DEPENDENCIES.executeOncePerDay(...args);
const findSetupTabUlInSalesforcePage = (...args) =>
	DEPENDENCIES.findSetupTabUlInSalesforcePage(...args);
const getCurrentHref = (...args) => DEPENDENCIES.getCurrentHref(...args);
const getModalHanger = (...args) => DEPENDENCIES.getModalHanger(...args);
const getSetupTabUl = (...args) => DEPENDENCIES.getSetupTabUl(...args);
const Tab = new Proxy({}, {
	get(_target, property) {
		return DEPENDENCIES.Tab[property];
	},
});

/**
 * Returns the modal id used by the update-tab modal.
 *
 * @return {string} Runtime modal id.
 */
function getModalId() {
	return DEPENDENCIES.MODAL_ID;
}

/**
 * Assigns only non-null values from a source object into a target object.
 *
 * @param {Record<string, unknown>} target Mutable object receiving overrides.
 * @param {Record<string, unknown>} [source={}] Candidate override values.
 * @return {void}
 */
function applyNonNullOverrides(target, source = {}) {
	for (const [key, value] of Object.entries(source)) {
		if (value != null && key in target) {
			target[key] = value;
		}
	}
}

/**
 * Lazily loads the tutorial module to avoid circular import initialization issues.
 *
 * @param {boolean} [fromPopup=false] Whether tutorial starts from popup action.
 * @return {Promise<void>}
 */
async function defaultCheckTutorial(fromPopup = false) {
	const tutorialModule = await import("../tutorial.js");
	return tutorialModule.checkTutorial(fromPopup);
}

/**
 * Lazily loads and invokes the favourite-tab action handler.
 *
 * @param {boolean} shouldSave Whether tab should be saved.
 * @return {Promise<void>}
 */
async function defaultPageActionTab(shouldSave) {
	const favouriteModule = await import("../favourite-manager.js");
	return favouriteModule.pageActionTab(shouldSave);
}

/**
 * Lazily loads and invokes the favourite-button renderer.
 *
 * @return {Promise<void>}
 */
async function defaultShowFavouriteButton() {
	const favouriteModule = await import("../favourite-manager.js");
	return favouriteModule.showFavouriteButton();
}

/**
 * Lazily loads and invokes the import modal creator.
 *
 * @return {Promise<void>}
 */
async function defaultCreateImportModal() {
	const importModule = await import("../import.js");
	await importModule.createImportModal();
}

/**
 * Lazily loads and invokes the export modal creator.
 *
 * @return {Promise<void>}
 */
async function defaultCreateExportModal() {
	const exportModule = await import("../export.js");
	await exportModule.createExportModal();
}

/**
 * Lazily loads and invokes the manage-tabs modal creator.
 *
 * @return {Promise<void>}
 */
async function defaultCreateManageTabsModal() {
	const manageTabsModule = await import("../manageTabs.js");
	await manageTabsModule.createManageTabsModal();
}

const ACTION_HANDLERS = {
	checkTutorial: defaultCheckTutorial,
	createExportModal: defaultCreateExportModal,
	createImportModal: defaultCreateImportModal,
	createManageTabsModal: defaultCreateManageTabsModal,
	pageActionTab: defaultPageActionTab,
	showFavouriteButton: defaultShowFavouriteButton,
};

const pageActionTab = (...args) => ACTION_HANDLERS.pageActionTab(...args);
const showFavouriteButton = (...args) =>
	ACTION_HANDLERS.showFavouriteButton(...args);
const createImportModal = (...args) =>
	ACTION_HANDLERS.createImportModal(...args);
const createExportModal = (...args) =>
	ACTION_HANDLERS.createExportModal(...args);
const createManageTabsModal = (...args) =>
	ACTION_HANDLERS.createManageTabsModal(...args);
const checkTutorial = (...args) => ACTION_HANDLERS.checkTutorial(...args);

/**
 * Abort controller for the latest reload operation.
 */
const STATE = {
	backgroundMessageQueue: Promise.resolve(),
	fromHrefUpdate: false,
	href: getCurrentHref(),
	isCurrentlyOnSavedTab: undefined,
	reloadController: null,
	wasOnSavedTab: undefined,
};

/**
 * Returns whether the user was previously on a saved tab.
 *
 * @return {boolean} True if was on a saved tab, false otherwise.
 */
function getWasOnSavedTab() {
	return STATE.wasOnSavedTab;
}

/**
 * Returns whether the user is currently on a saved tab.
 *
 * @return {boolean} True if currently on a saved tab, false otherwise.
 */
function getIsCurrentlyOnSavedTab() {
	return STATE.isCurrentlyOnSavedTab;
}

/**
 * Tracks asynchronous tasks when tests provide a global tracker.
 *
 * @template T
 * @param {Promise<T> | T} task Task or value to track.
 * @return {Promise<T> | T} The tracked task/value.
 */
function trackContentTask(task) {
	if (typeof globalThis.__trackContentTask === "function") {
		return globalThis.__trackContentTask(task);
	}
	return task;
}

/**
 * Dynamically injects the Salesforce Lightning Navigation script into the page
 * if relevant settings allow it.
 *
 * @return {Promise<void>} Resolves when the script is added or skipped.
 */
async function checkAddLightningNavigation() {
	const settings = await getSettings([
		CONSTANTS.LINK_NEW_BROWSER,
		CONSTANTS.USE_LIGHTNING_NAVIGATION,
	]);
	if (
		settings?.some((setting) => setting.enabled)
	) {
		return;
	}
	const script = document.createElement("script");
	script.src = CONSTANTS.BROWSER.runtime.getURL(
		"salesforce/lightning-navigation.js",
	);
	(document.head || document.documentElement).appendChild(script);
}

/**
 * Handles post-save actions after setting Salesforce tabs.
 * - Displays a toast message indicating that the Salesforce tabs have been saved.
 * - Reloads the tabs by calling `reloadTabs` with the provided tabs.
 *
 * @param {Object} [param0] an object containing the following keys
 * @param {string} [param0.what=CONSTANTS.WHAT_SAVED] - A flag indicating the action that triggered this function. If null or CONSTANTS.WHAT_SAVED, a toast message is shown.
 * @param {Array<Tab>|null} [param0.tabs=null] - The tabs to reload. If provided, they are passed to `reloadTabs`.
 * @param {boolean} [param0.shouldReload=true] - If the Tabs should be reloaded from scratch
 */
function sf_afterSet({
	what = CONSTANTS.WHAT_SAVED,
	tabs = null,
	shouldReload = true,
} = {}) {
	if (getSetupTabUl() == null) {
		return;
	}
	if (what === CONSTANTS.WHAT_SAVED) {
		showToast(["extension_label", "tabs_saved"]);
	}
	if (shouldReload) {
		trackContentTask(reloadTabs(tabs));
	}
}

/**
 * Initializes the tab setup by ensuring all tabs are available and processing them accordingly.
 * - If no `tabs` are provided, it fetches the saved tabs using `allTabs.getSavedTabs`.
 * - If `tabs` are provided, it replaces the current tabs with the new set using `allTabs.replaceTabs` while applying various filters.
 * - After processing, it iterates through `allTabs` and appends rows to the DOM for the tabs that match the current organization or are not organization-specific.
 * - It also ensures the presence of a "favourite" button and checks if the current view is for saved tabs.
 *
 * @param {Array<Tab>|null} [tabs=null] - The tabs to initialize. If null, the saved tabs will be fetched.
 * @param {AbortSignal|null} [signal=null] - Signal used to stop stale reload work.
 * @return {Promise<void>} A promise that resolves after the initialization process is completed, including tab setup and UI updates.
 */
async function init(tabs = null, signal = null) {
	if (shouldAbortReload(signal)) {
		return;
	}
	const orgName = Tab.extractOrgName(STATE.href);
	const allTabs = await ensureAllTabsAvailability();
	if (shouldAbortReload(signal)) {
		return;
	}
	if (tabs == null) {
		await allTabs.getSavedTabs(true);
	} else {
		await allTabs.replaceTabs(tabs, {
			resetTabs: true,
			removeOrgTabs: true,
			sync: false,
			keepTabsNotThisOrg: orgName,
			updatePinnedTabs: false,
		});
	}
	if (shouldAbortReload(signal)) {
		return;
	}
	if (allTabs.length > 0) {
		const frag = document.createDocumentFragment();
		const pinnedItems = allTabs.pinned;
		for (const i in allTabs) {
			if (shouldAbortReload(signal)) {
				return;
			}
			const row = allTabs[i];
			// hide not-this-org tabs
			frag.appendChild(
				generateRowTemplate(
					row,
					{
						hide: !(row.org == null || row.org === orgName),
						isPinned: i < pinnedItems,
						index: i,
					},
				),
			);
		}
		if (shouldAbortReload(signal)) {
			return;
		}
		getSetupTabUl().replaceChildren(frag);
	}
	await isOnSavedTab();
	if (shouldAbortReload(signal)) {
		return;
	}
	await checkKeepTabsOnLeft();
	if (shouldAbortReload(signal)) {
		return;
	}
	await showFavouriteButton();
}

/**
 * Returns whether the current reload should stop because a newer one started.
 *
 * @param {AbortSignal|null} [signal=null] - Signal for the current reload.
 * @return {boolean} True when the reload should stop, false otherwise.
 */
function shouldAbortReload(signal = null) {
	return signal?.aborted === true;
}

/**
 * Aborts the previous reload and returns a signal for the current one.
 *
 * @return {AbortSignal} The signal bound to the latest reload.
 */
function startReloadSignal() {
	STATE.reloadController?.abort();
	STATE.reloadController = new AbortController();
	return STATE.reloadController.signal;
}

/**
 * Checks if the current tab corresponds to a saved tab and executes a callback if specified.
 * - If `isFromHrefUpdate` is `true`, it triggers the provided callback with the current saved tab status.
 * - The function updates the `fromHrefUpdate` flag to track whether the check is triggered by a URL update.
 * - It ensures all tabs are available by calling `ensureAllTabsAvailability`, and checks if the current URL exists in `allTabs`.
 *
 * @param {boolean} [isFromHrefUpdate=false] - A flag indicating if the check is triggered by a URL update.
 * @param {Function} [callback] - A callback function to be invoked with the result of the saved tab check.
 * @return {Promise<void>} A promise that resolves after checking if the current tab is saved and executing the callback if provided.
 */
async function isOnSavedTab(isFromHrefUpdate = false, callback = null) {
	if (STATE.fromHrefUpdate && !isFromHrefUpdate) {
		STATE.fromHrefUpdate = false;
		return;
	}
	STATE.fromHrefUpdate = isFromHrefUpdate;
	const url = Tab.minifyURL(STATE.href);
	STATE.wasOnSavedTab = STATE.isCurrentlyOnSavedTab;
	const allTabs = await ensureAllTabsAvailability();
	STATE.isCurrentlyOnSavedTab = allTabs.existsWithOrWithoutOrg({
		org: STATE.href,
		url,
	});
	if (isFromHrefUpdate) {
		callback(STATE.isCurrentlyOnSavedTab);
	}
}

/**
 * If the user has moved to or from a saved tab, they'll be reloaded to update the highlighted one.
 * otherwise, the favourite button is shown
 *
 * @param {boolean} isCurrentlyOnSavedTab - Whether the currently displayed page is a saved Tab
 */
async function _afterHrefUpdate(isCurrentlyOnSavedTab) {
	if (isCurrentlyOnSavedTab || STATE.wasOnSavedTab) {
		await trackContentTask(reloadTabs());
		return;
	}
	await showFavouriteButton();
}
/**
 * Handles the update of the current URL, reloading tabs if necessary.
 */
function onHrefUpdate() {
	const newRef = getCurrentHref();
	if (newRef === STATE.href) {
		return;
	}
	STATE.href = newRef;
	trackContentTask(isOnSavedTab(true, _afterHrefUpdate));
}

/**
 * Checks the user setting for keeping tabs on the left side and moves the setupTabUl element accordingly.
 * If the setting is disabled or not found, moves setupTabUl after the ObjectManager element.
 * Otherwise, moves setupTabUl before the Home element.
 *
 * @return {Promise<void>} Resolves after repositioning the setupTabUl element based on user preference.
 */
async function checkKeepTabsOnLeft() {
	const keep_tabs_on_left = await getSettings(CONSTANTS.TAB_ON_LEFT);
	const beforeOrAfter = keep_tabs_on_left?.enabled
		? "afterbegin"
		: "beforeend";
	const setupTabUl = getSetupTabUl();
	setupTabUl.parentElement.insertAdjacentElement(
		beforeOrAfter,
		setupTabUl,
	);
}

/**
 * Attempts to find and set up the tab elements, retrying up to 5 times if the necessary elements are not found.
 * - If the setup tab elements are not found within 5 attempts, it logs an error and retries after 5 seconds.
 * - Once found, it initializes the DOM elements and applies various behaviors, such as observing URL changes, adding scroll behavior, and enabling mouse wheel scrolling.
 * - It also sets up event listeners for drag behavior and reloads the tabs.
 *
 * @param {number} [count=0] - The number of retry attempts made so far. Defaults to 0.
 * @return undefined
 */
function delayLoadSetupTabs(count = 0) {
	if (count > 5) {
		// write error in the console
		trackContentTask((async () => {
			const [label, fail] = await getTranslations([
				"extension_label",
				"error_no_setup_tab",
			]);
			console.error(`${label} - ${fail}`);
			setTimeout(delayLoadSetupTabs, 5000);
		})());
		return;
	}
	if (!findSetupTabUlInSalesforcePage()) {
		return setTimeout(() => delayLoadSetupTabs(count + 1), 500);
	}
	trackContentTask(checkKeepTabsOnLeft());
	// Start observing changes to the DOM to then check for URL change
	// when URL changes, show the favourite button
	new MutationObserver(() => setTimeout(onHrefUpdate, 500))
		.observe(document.querySelector(".tabsetBody"), {
			childList: true,
			subtree: true,
		});
	// initialize
	setupDragForUl(reorderTabsUl);
	trackContentTask(reloadTabs());
	trackContentTask(checkTutorial());
}

/**
 * Reloads the tabs by checking if the setup tab list is correctly populated and removing any existing tabs before reinitializing.
 * - Ensures that duplicate tabs are not created when refocusing on the setup window/tab.
 * - If the tabs are not properly loaded or if it's the first run, it retries after 500ms.
 * - Removes all tabs in the setup tab list (except for hidden ones, "Home", and "Object Manager") and then calls the `init` function to load the new tabs.
 *
 * @param {Array<Tab>|null} [tabs=null] - The tabs to initialize. If null, the tabs will be fetched again.
 * @return {Promise<void>} Promise resolved after the latest reload work settles.
 */
function reloadTabs(tabs = null) {
	trackContentTask(generateStyleFromSettings());
	return trackContentTask(init(tabs, startReloadSignal()));
}

/**
 * Reorders the tabs based on the current setup tab list, extracting information from each tab and updating the stored tabs.
 * - Loops through the children of `setupTabUl` (ignoring Salesforce's default tabs) and extracts relevant tab information (e.g., label and URL).
 * - Creates `Tab` objects for valid tabs and attempts to store them using `allTabs.replaceTabs`.
 * - If any errors occur during the process, they are caught and displayed using `showToast`.
 *
 * @return {Promise<void>} A promise that resolves once the tabs have been reordered and updated in `allTabs`.
 */
async function reorderTabsUl() {
	try {
		const setupTabUl = getSetupTabUl();
		// Get the list of tabs
		const tabs = [];
		for (const li of setupTabUl?.querySelectorAll("li") ?? []) {
			tabs.push(Tab.create({
				label: getInnerElementFieldBySelector({
					parentElement: li,
					field: "innerText",
					selector: "a > span",
				}),
				url: getInnerElementFieldBySelector({
					parentElement: li,
					field: "href",
					selector: "a",
				}),
				org: getInnerElementFieldBySelector({
					parentElement: li,
					field: "dataset.org",
					selector: "a > span",
				}),
			}));
		}
		// persist the Tabs
		const allTabs = await ensureAllTabsAvailability();
		await allTabs.replaceTabs(tabs, {
			resetTabs: true,
			removeOrgTabs: true,
			updatePinnedTabs: false,
			invalidateSort: true,
		});
		sf_afterSet({
			tabs,
			shouldReload: false,
		});
	} catch (error) {
		showToast(error.message, CONSTANTS.TOAST_ERROR);
	}
}

/**
 * For each duplicatetabs, toggles the slds-theme--warning class
 *
 * @param {Array[HTMLElement]} [duplicatetabs=[]] - the tabs which are duplicated and need to be highlighted
 */
function _toggleWarning(duplicatetabs = []) {
	for (const tab of duplicatetabs) {
		tab.classList.toggle("slds-theme--warning");
	}
}
/**
 * Highlights duplicate tabs by toggling a warning style on tabs with the specified `miniURL`.
 * - Searches for all anchor elements (`<a>`) in `setupTabUl` with a matching `label` attribute that equals the provided `miniURL`.
 * - Toggles a warning class (`slds-theme--warning`) on all matching tabs to make them bold (styled as duplicates).
 * - The warning is toggled twice: once immediately and again after 4 seconds to visually highlight the duplicates.
 *
 * @param {string} miniURL - The URL (or part of it) used to identify duplicate tabs.
 */
function makeDuplicatesBold(miniURL) {
	const setupTabUl = getSetupTabUl();
	const duplicatetabs = setupTabUl?.querySelectorAll(`a[title="${miniURL}"]`);
	if (duplicatetabs == null) {
		return;
	}
	_toggleWarning(duplicatetabs);
	setTimeout(
		() => _toggleWarning(duplicatetabs),
		4000,
	);
}

const ACTION_MOVE = "move";
const ACTION_REMOVE_OTHER = "remove-other";
const ACTION_SORT = "sort";
const ACTION_RESULT_SYNC = "do-sync";
const ACTION_RESULT_NO_SYNC = "no-sync";

/**
 * Throws a translated action error when an action result is falsy.
 *
 * @param {boolean} actionResult Action result to validate.
 * @param {string} errorMessage Translatable error key.
 * @throws {Error} Throws when the action result is falsy.
 */
function assertActionResult(actionResult, errorMessage) {
	if (!actionResult) {
		throw new Error(errorMessage);
	}
}

/**
 * Executes a tab action and returns whether `sf_afterSet` should run.
 *
 * @param {{
 *   action: string;
 *   allTabs: {
 *     addTab: (tab: unknown, options: { addInFront?: boolean }) => Promise<boolean>;
 *     moveTab: (tab: unknown, options?: unknown) => Promise<void>;
 *     pinOrUnpin: (tab: unknown, shouldPin: boolean) => Promise<boolean>;
 *     remove: (tab: unknown, options?: unknown) => Promise<boolean>;
 *     removeOtherTabs: (tab: unknown, options?: unknown) => Promise<boolean>;
 *     removePinned: (removePinnedTabs: boolean) => Promise<boolean>;
 *     replaceTabs: (tabs?: unknown[], options?: Record<string, unknown>) => Promise<boolean>;
 *     setDefaultTabs: () => Promise<boolean>;
 *     sort: (options?: unknown) => Promise<boolean>;
 *   };
 *   tab: unknown;
 *   options: unknown;
 * }} options Action context.
 * @return {Promise<boolean | null>} Sync flag (`null` means no action matched).
 */
function executeTabAction({
	action,
	allTabs,
	tab,
	options,
} = {}) {
	/** @type {Record<string, () => Promise<boolean>>} */
	const actionHandlers = {
		[ACTION_MOVE]: async () => {
			await allTabs.moveTab(tab, options);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_REMOVE_TAB]: async () => {
			assertActionResult(
				await allTabs.remove(tab, options),
				"error_removing_tab",
			);
			return ACTION_RESULT_SYNC;
		},
		[ACTION_REMOVE_OTHER]: async () => {
			assertActionResult(
				await allTabs.removeOtherTabs(tab, options),
				"error_removing_other_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.WHAT_ADD]: async () => {
			assertActionResult(
				await allTabs.addTab(
					tab,
					{
						addInFront: options?.addInFront,
					},
				),
				"error_adding_tab",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_EMPTY_GENERIC_TABS]: async () => {
			assertActionResult(
				await allTabs.replaceTabs(),
				"error_removing_generic_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_EMPTY_TABS]: async () => {
			assertActionResult(
				await allTabs.replaceTabs([], { removeOrgTabs: true }),
				"error_removing_all_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.WHAT_TOGGLE_ORG]: async () => {
			await toggleOrg(tab);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_EMPTY_VISIBLE_TABS]: async () => {
			const thisOrg = Tab.extractOrgName(STATE.href);
			assertActionResult(
				await allTabs.replaceTabs([], {
					removeOrgTabs: true,
					removeThisOrgTabs: thisOrg,
				}),
				"error_removing_visible_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_RESET_DEFAULT_TABS]: async () => {
			assertActionResult(
				await allTabs.setDefaultTabs(),
				"error_resetting_default_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[ACTION_SORT]: async () => {
			assertActionResult(
				await allTabs.sort(options),
				"error_sorting_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_TMP_HIDE_ORG]: () => {
			hideTabs(true);
			return ACTION_RESULT_NO_SYNC;
		},
		[CONSTANTS.CXM_TMP_HIDE_NON_ORG]: () => {
			hideTabs(false);
			return ACTION_RESULT_NO_SYNC;
		},
		[CONSTANTS.CXM_PIN_TAB]: async () => {
			assertActionResult(
				await allTabs.pinOrUnpin(tab, true),
				"error_pin_tab",
			);
			document.dispatchEvent(
				new CustomEvent(CONSTANTS.TUTORIAL_EVENT_PIN_TAB),
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_UNPIN_TAB]: async () => {
			assertActionResult(
				await allTabs.pinOrUnpin(tab, false),
				"error_unpin_tab",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_REMOVE_PIN_TABS]: async () => {
			assertActionResult(
				await allTabs.removePinned(true),
				"error_removing_pin_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.CXM_REMOVE_UNPIN_TABS]: async () => {
			assertActionResult(
				await allTabs.removePinned(false),
				"error_removing_unpin_tabs",
			);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.WHAT_PAGE_SAVE_TAB]: async () => {
			await pageActionTab(true);
			return ACTION_RESULT_SYNC;
		},
		[CONSTANTS.WHAT_PAGE_REMOVE_TAB]: async () => {
			await pageActionTab(false);
			return ACTION_RESULT_SYNC;
		},
	};
	const actionHandler = actionHandlers[action];
	if (typeof actionHandler !== "function") {
		return null;
	}
	return actionHandler();
}

/**
 * Performs a specified action on a given tab, such as moving, removing, or adding it, with additional options.
 * - This function ensures all tabs are available before performing the action.
 * - It handles various actions including moving, removing, adding, and clearing tabs, with the option to filter by organization.
 * - After the action is performed, it triggers the `sf_afterSet` function to finalize the process.
 * - If an error occurs during the action, it logs a warning and displays a toast with the error message.
 *
 * @param {string} action - The action to perform on the tab.
 * @param {Tab} tab - The tab on which the action should be performed.
 * @param {Object} options - Options that influence the behavior of the action (e.g., filters or specific conditions).
 * @return {Promise<void>}
 */
async function performActionOnTabs(
	action,
	tab = undefined,
	options = undefined,
) {
	try {
		const allTabs = await ensureAllTabsAvailability();
		const shouldSyncTabs = await executeTabAction({
			action,
			allTabs,
			tab,
			options,
		});
		if (shouldSyncTabs == null) {
			const noMatch = await getTranslations("no_match");
			console.error(noMatch, action);
			return;
		}
		if (shouldSyncTabs === ACTION_RESULT_SYNC) {
			sf_afterSet({ tabs: allTabs });
		}
	} catch (error) {
		console.warn({ action, tab, options });
		showToast(error.message, CONSTANTS.TOAST_ERROR);
	}
}

/**
 * From setupTabUl hides all the specified Tabs (Org Tabs by default)
 * @param {boolean} [hideOrgTabs=true] - If the Tabs to be hidden are the Org Tabs (default) or the generic ones
 */
function hideTabs(hideOrgTabs = true) {
	const selector = hideOrgTabs
		? `li${CONSTANTS.HAS_ORG_TAB}`
		: `li:not(${CONSTANTS.HAS_ORG_TAB})`;
	const setupTabUl = getSetupTabUl();
	const tabsToHide = setupTabUl?.querySelectorAll(selector) ?? [];
	for (const tth of tabsToHide) {
		tth.style.display = "none";
	}
}

/**
 * Retrieves a Tab from the saved ones and either removes the Org value (if it has one) OR sets it as the current Org.
 * @param {Object} [param0={}] - An Object containing the data used to identify a Tab
 * @param {string} param0.label - The label of the Tab to find
 * @param {string} param0.url - The Url of the Tab to find
 * @param {string} param0.org - The Org of the Tab to find
 * @throws when it fails to sync the Tabs.
 */
async function toggleOrg({ label = null, url = null, org = null } = {}) {
	const allTabs = await ensureAllTabsAvailability();
	const inputTab = { label, url, org };
	const currentHref = getCurrentHref();
	if (inputTab.url == null) {
		inputTab.url = Tab.minifyURL(currentHref);
	}
	if (inputTab.org == null) {
		inputTab.org = Tab.extractOrgName(currentHref);
	}
	const matchingTab = allTabs.getSingleTabByData(inputTab);
	matchingTab.update({
		org: matchingTab.org == null ? currentHref : "",
	});
	if (!await allTabs.syncTabs()) {
		throw new Error("error_failed_sync");
	}
}

/**
 * Shows on-screen a new Modal used for fine updates to a single Tab
 * @param {Object} [tab={}] - An Object containing the data used to identify a Tab
 * @param {string} tab.label - The label of the Tab to update
 * @param {string} tab.url - The Url of the Tab to update
 * @param {string} tab.org - The Org of the Tab to update
 * @return {Promise<void>}
 */
async function showModalUpdateTab(
	{ label = null, url = null, org = null } = {},
) {
	if (document.getElementById(getModalId()) != null) {
		return showToast("error_close_other_modal", CONSTANTS.TOAST_ERROR);
	}
	const tab = { label, url, org };
	const tabIsEmpty = tab.label == null && tab.url == null && tab.org == null;
	const allTabs = await ensureAllTabsAvailability();
	let matchingTab = null;
	try {
		const currentHref = getCurrentHref();
		matchingTab = allTabs.getSingleTabByData(
			tabIsEmpty
				? {
					url: Tab.minifyURL(currentHref),
					org: Tab.extractOrgName(currentHref),
				}
				: tab,
		);
	} catch (e) {
		showToast(e.message, CONSTANTS.TOAST_ERROR);
		return;
	}
	const {
		modalParent,
		saveButton,
		closeButton,
		labelContainer,
		urlContainer,
		orgContainer,
	} = await generateUpdateTabModal(
		matchingTab.label,
		matchingTab.url,
		matchingTab.org,
	);
	getModalHanger().appendChild(modalParent);
	let lastUrlLength = 0;
	urlContainer.addEventListener("input", () => {
		if (urlContainer.value.length - lastUrlLength > 2) {
			urlContainer.value = Tab.minifyURL(urlContainer.value);
		}
		lastUrlLength = urlContainer.value.length;
	});
	let lastOrgLength = 0;
	orgContainer.addEventListener("input", () => {
		if (orgContainer.value.length - lastOrgLength > 2) {
			orgContainer.value = Tab.extractOrgName(orgContainer.value);
		}
		lastOrgLength = orgContainer.value.length;
	});
	saveButton.addEventListener("click", async (e) => {
		e.preventDefault();
		await allTabs.updateTab(matchingTab, {
			label: labelContainer.value,
			url: urlContainer.value,
			org: orgContainer.value,
		});
		sf_afterSet();
		closeButton.click();
	});
}

/**
 * Prompts the user with a confirmation dialog to update the extension to a new version.
 * Displays a translated message including the old and new version and a link.
 *
 * @param {Object} options - Options for the update prompt.
 * @param {string} options.version - The new version of the extension.
 * @param {string} options.link - The URL to the update or release notes.
 * @param {string} options.oldversion - The current installed version before update.
 * @return {Promise<void>} Resolves after the prompt and possible navigation.
 */
async function promptUpdateExtension({ version, link, oldversion } = {}) {
	const confirm_msg = await getTranslations([
		`${oldversion} → ${version}`,
		"confirm_update_extension",
		link,
	], "\n");
	if (confirm(confirm_msg)) {
		open(link, "_blank");
	}
}

/**
 * Initiates a download of a JSON file with the given content and filename.
 *
 * @param {Object} message - Message containing the data for download.
 * @param {string} message.payload - The JSON string content to download.
 * @param {string} [message.filename="download.json"] - The filename for the download.
 */
function launchDownload(message) {
	const jsonText = message.payload;
	const filename = message.filename || "download.json";
	// Create a Blob & object URL
	const blob = new Blob([jsonText], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	// Build <a> and “click” it
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	// Cleanup
	a.remove();
	URL.revokeObjectURL(url);
}

/**
 * Enqueues a background message task so tasks are executed in receive order.
 * The queue recovers from failures to avoid blocking following tasks.
 *
 * @param {() => Promise<void>} taskFactory Function that performs one message task.
 * @return {Promise<void>} Promise that resolves when the queued task completes.
 */
function enqueueBackgroundMessageTask(taskFactory) {
	const queuedTask = STATE.backgroundMessageQueue.then(taskFactory);
	STATE.backgroundMessageQueue = queuedTask.catch(() => {});
	return queuedTask;
}

const isQueuableBackgroundMessage = new Set([
	CONSTANTS.CXM_MOVE_RIGHT,
	CONSTANTS.CXM_MOVE_LAST,
	CONSTANTS.CXM_MOVE_LEFT,
	CONSTANTS.CXM_MOVE_FIRST,
	CONSTANTS.CXM_REMOVE_OTHER_TABS,
	CONSTANTS.CXM_REMOVE_LEFT_TABS,
	CONSTANTS.CXM_REMOVE_RIGHT_TABS,
	CONSTANTS.CXM_SORT_LABEL,
	CONSTANTS.CXM_SORT_URL,
	CONSTANTS.CXM_SORT_ORG,
	CONSTANTS.CXM_SORT_CLICK_COUNT,
	CONSTANTS.CXM_SORT_CLICK_DATE,
	CONSTANTS.CXM_REMOVE_PIN_TABS,
	CONSTANTS.CXM_REMOVE_UNPIN_TABS,
	CONSTANTS.CXM_EMPTY_GENERIC_TABS,
	CONSTANTS.CXM_EMPTY_TABS,
	CONSTANTS.CXM_EMPTY_VISIBLE_TABS,
	CONSTANTS.CXM_RESET_DEFAULT_TABS,
	CONSTANTS.WHAT_TOGGLE_ORG,
	CONSTANTS.CXM_PIN_TAB,
	CONSTANTS.CXM_UNPIN_TAB,
	CONSTANTS.CXM_REMOVE_TAB,
	CONSTANTS.CXM_TMP_HIDE_ORG,
	CONSTANTS.CXM_TMP_HIDE_NON_ORG,
	CONSTANTS.WHAT_PAGE_SAVE_TAB,
	CONSTANTS.WHAT_PAGE_REMOVE_TAB,
]);
/**
 * Returns whether a background message should be handled through the serialized queue.
 *
 * @param {string} messageType Message type sent by the background script.
 * @return {boolean} True when the message mutates or reorders tabs.
 */
function shouldQueueBackgroundMessage(messageType) {
	return isQueuableBackgroundMessage.has(messageType);
}

/**
 * Routes a single background message to the matching content-side action.
 *
 * @param {Object} message Message from background page.
 * @return {Promise<void>} Resolves when message handling completes.
 */
async function routeBackgroundMessage(message) {
	const messageTab = {
		label: message.label,
		url: message.tabUrl ?? message.url,
		org: message.org,
	};
	try {
		switch (message.what) {
			// hot reload (from context-menus.js)
			case CONSTANTS.WHAT_SAVED:
			case CONSTANTS.WHAT_STARTUP:
			case CONSTANTS.WHAT_INSTALLED:
			case CONSTANTS.WHAT_ACTIVATE:
			case CONSTANTS.WHAT_HIGHLIGHTED:
			case CONSTANTS.WHAT_FOCUS_CHANGED:
				sf_afterSet(message);
				break;
			case CONSTANTS.TOAST_WARNING:
			case CONSTANTS.TOAST_ERROR:
				showToast(message.message, message.what);
				break;
			case CONSTANTS.WHAT_SHOW_IMPORT:
				await createImportModal();
				break;
			case CONSTANTS.CXM_MANAGE_TABS:
				await createManageTabsModal();
				break;
			case CONSTANTS.WHAT_START_TUTORIAL:
				await checkTutorial(true);
				break;
			case CONSTANTS.WHAT_SHOW_EXPORT_MODAL:
				await createExportModal();
				break;
			case CONSTANTS.WHAT_SHOW_OPEN_OTHER_ORG:
				messageTab.url = message.linkTabUrl ?? messageTab.url;
				await createOpenOtherOrgModal(messageTab);
				break;
			case CONSTANTS.WHAT_UPDATE_TAB:
				await showModalUpdateTab(messageTab);
				break;
			case CONSTANTS.WHAT_UPDATE_EXTENSION:
				await promptUpdateExtension(message);
				break;
			case CONSTANTS.WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP:
				if (message.ok) {
					showToast(
						"req_downloads_open_popup",
					);
				} else {
					showToast(
						"error_req_downloads",
						CONSTANTS.TOAST_ERROR,
					);
				}
				break;
			case CONSTANTS.WHAT_EXPORT_FROM_BG:
				launchDownload(message);
				break;
			case CONSTANTS.CXM_MOVE_RIGHT:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: false,
					fullMovement: false,
				});
				break;
			case CONSTANTS.CXM_MOVE_LAST:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: false,
					fullMovement: true,
				});
				break;
			case CONSTANTS.CXM_MOVE_LEFT:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: true,
					fullMovement: false,
				});
				break;
			case CONSTANTS.CXM_MOVE_FIRST:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: true,
					fullMovement: true,
				});
				break;
			case CONSTANTS.CXM_REMOVE_OTHER_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, messageTab);
				break;
			case CONSTANTS.CXM_REMOVE_LEFT_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, messageTab, {
					removeBefore: true,
				});
				break;
			case CONSTANTS.CXM_REMOVE_RIGHT_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, messageTab, {
					removeBefore: false,
				});
				break;
			case CONSTANTS.CXM_SORT_LABEL:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: "label",
					}),
				);
				break;
			case CONSTANTS.CXM_SORT_URL:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: "url",
					}),
				);
				break;
			case CONSTANTS.CXM_SORT_ORG:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: "org",
					}),
				);
				break;
			case CONSTANTS.CXM_SORT_CLICK_COUNT:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: Tab.keyClickCount,
						standardSort: false,
					}),
				);
				break;
			case CONSTANTS.CXM_SORT_CLICK_DATE:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: Tab.keyClickDate,
						standardSort: false,
					}),
				);
				break;
			case CONSTANTS.CXM_REMOVE_PIN_TABS:
			case CONSTANTS.CXM_REMOVE_UNPIN_TABS:
			case CONSTANTS.CXM_EMPTY_GENERIC_TABS:
			case CONSTANTS.CXM_EMPTY_TABS:
			case CONSTANTS.CXM_EMPTY_VISIBLE_TABS:
			case CONSTANTS.CXM_RESET_DEFAULT_TABS:
			case CONSTANTS.WHAT_TOGGLE_ORG:
			case CONSTANTS.CXM_PIN_TAB:
			case CONSTANTS.CXM_UNPIN_TAB:
			case CONSTANTS.CXM_REMOVE_TAB:
			case CONSTANTS.CXM_TMP_HIDE_ORG:
			case CONSTANTS.CXM_TMP_HIDE_NON_ORG:
			case CONSTANTS.WHAT_PAGE_SAVE_TAB:
			case CONSTANTS.WHAT_PAGE_REMOVE_TAB:
				await performActionOnTabs(message.what, messageTab);
				break;
			default:
				if (message.what !== CONSTANTS.WHAT_THEME) {
					showToast(
						[
							"error_unknown_message",
							message.what,
						],
						CONSTANTS.TOAST_WARNING,
					);
				}
				break;
		}
	} catch (error) {
		showToast(error.message, CONSTANTS.TOAST_ERROR);
	}
}

/**
 * Listens for messages from the background page and routes commands to appropriate handlers.
 * Supports tab management, notifications, modal dialogs, extension update prompts, and more.
 * Catches errors and displays them as toast notifications.
 */
function listenToBackgroundPage() {
	CONSTANTS.BROWSER.runtime.onMessage.addListener(
		(message, _, sendResponse) => {
			if (message?.what == null) {
				return;
			}
			sendResponse(null);
			if (shouldQueueBackgroundMessage(message.what)) {
				return enqueueBackgroundMessageTask(() =>
					routeBackgroundMessage(message)
				);
			}
			// this will ensure that new messages which need to be queued (above) will wait for this task to complete (less parallelism and speed)
			const nonQueuedTask = routeBackgroundMessage(message);
			STATE.backgroundMessageQueue = STATE.backgroundMessageQueue
				.then(() => nonQueuedTask)
				.catch(() => {});
			return nonQueuedTask;
		},
	);
}

/**
 * Main bootstrap function that initializes the extension:
 * - Loads all tabs asynchronously.
 * - Injects Lightning navigation script if needed.
 * - Sets up message listeners.
 * - Loads Salesforce setup tabs with delay.
 * - Inserts analytics script.
 */
function main() {
	trackContentTask(ensureAllTabsAvailability());
	trackContentTask(checkAddLightningNavigation());
	listenToBackgroundPage();
	trackContentTask(delayLoadSetupTabs());
	trackContentTask(executeOncePerDay());
}

/**
 * Resets mutable content state before bootstrapping.
 */
function resetContentState() {
	STATE.reloadController = null;
	STATE.href = getCurrentHref();
	STATE.wasOnSavedTab = undefined;
	STATE.isCurrentlyOnSavedTab = undefined;
	STATE.fromHrefUpdate = false;
	STATE.backgroundMessageQueue = Promise.resolve();
}

/**
 * Boots the module when the current page is a setup page and the page has not been initialized.
 *
 * @return {boolean} True when bootstrapping started.
 */
function bootstrapIfNeeded() {
	if (
		STATE.href?.includes(CONSTANTS.SETUP_LIGHTNING) &&
		!globalThis[`hasLoaded${CONSTANTS.EXTENSION_NAME}`]
	) {
		globalThis[`hasLoaded${CONSTANTS.EXTENSION_NAME}`] = true;
		main();
		return true;
	}
	return false;
}

/**
 * Creates content-module helpers with optional dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {{
 *   __testHooks: {
 *     _afterHrefUpdate: (isCurrentlyOnSavedTab: boolean) => Promise<void>;
 *     checkAddLightningNavigation: () => Promise<void>;
 *     checkKeepTabsOnLeft: () => Promise<void>;
 *     delayLoadSetupTabs: (count?: number) => number | undefined;
 *     getCurrentHref: () => string;
 *     getModalHanger: () => HTMLElement | null;
 *     getSetupTabUl: () => HTMLElement | null;
 *     hideTabs: (hideOrgTabs?: boolean) => void;
 *     init: (tabs?: unknown[] | null, signal?: AbortSignal | null) => Promise<void>;
 *     launchDownload: (message: { payload: string; filename?: string }) => void;
 *     main: () => void;
 *     onHrefUpdate: () => void;
 *     promptUpdateExtension: (options?: Record<string, string>) => Promise<void>;
 *     reloadTabs: (tabs?: unknown[] | null) => Promise<void>;
 *     showModalOpenOtherOrg: (options?: Record<string, unknown>) => Promise<void> | void;
 *     showModalUpdateTab: (options?: Record<string, unknown>) => Promise<void>;
 *     showToast: (message: string | string[], status?: string) => Promise<void> | void;
 *     toggleOrg: (options?: Record<string, string | null>) => Promise<void>;
 *   };
 *   bootstrapIfNeeded: () => boolean;
 *   getCurrentHref: () => string;
 *   getIsCurrentlyOnSavedTab: () => boolean | undefined;
 *   getModalHanger: () => HTMLElement | null;
 *   getSetupTabUl: () => HTMLElement | null;
 *   getWasOnSavedTab: () => boolean | undefined;
 *   isOnSavedTab: (isFromHrefUpdate?: boolean, callback?: ((isSaved: boolean) => void) | null) => Promise<void>;
 *   makeDuplicatesBold: (miniURL: string) => void;
 *   performActionOnTabs: (action: string, tab?: unknown, options?: unknown) => Promise<void>;
 *   reorderTabsUl: () => Promise<void>;
 *   sf_afterSet: (options?: Record<string, unknown>) => void;
 *   showToast: (message: string | string[], status?: string) => Promise<void> | void;
 * }} Content module API.
 */
export function createContentModule(overrides = {}) {
	const constants = overrides.constants ?? {};
	const functions = overrides.functions ?? {};
	const tabContainer = overrides.tabContainer ?? {};
	const dragHandler = overrides.dragHandler ?? {};
	const favouriteManager = overrides.favouriteManager ?? {};
	const generator = overrides.generator ?? {};
	const importModule = overrides.importModule ?? {};
	const exportModule = overrides.exportModule ?? {};
	const manageTabs = overrides.manageTabs ?? {};
	const openOtherOrg = overrides.openOtherOrg ?? {};
	const sfElements = overrides.sfElements ?? {};
	const tutorial = overrides.tutorial ?? {};
	const onceADay = overrides.onceADay ?? {};
	const toast = overrides.toast ?? {};

	applyNonNullOverrides(CONSTANTS, constants);

	applyNonNullOverrides(DEPENDENCIES, {
		Tab: overrides.Tab,
		MODAL_ID: generator.MODAL_ID,
		createOpenOtherOrgModal: openOtherOrg.createOpenOtherOrgModal,
		ensureAllTabsAvailability: tabContainer.ensureAllTabsAvailability,
		executeOncePerDay: onceADay.executeOncePerDay,
		findSetupTabUlInSalesforcePage:
			sfElements.findSetupTabUlInSalesforcePage,
		generateRowTemplate: generator.generateRowTemplate,
		generateStyleFromSettings: generator.generateStyleFromSettings,
		generateUpdateTabModal: generator.generateUpdateTabModal,
		getCurrentHref: sfElements.getCurrentHref,
		getInnerElementFieldBySelector:
			functions.getInnerElementFieldBySelector,
		getModalHanger: sfElements.getModalHanger,
		getSettings: functions.getSettings,
		getSetupTabUl: sfElements.getSetupTabUl,
		getTranslations: overrides.getTranslations,
		setupDragForUl: dragHandler.setupDragForUl,
		showToast: toast.showToast,
	});

	applyNonNullOverrides(ACTION_HANDLERS, {
		checkTutorial: tutorial.checkTutorial,
		createExportModal: exportModule.createExportModal,
		createImportModal: importModule.createImportModal,
		createManageTabsModal: manageTabs.createManageTabsModal,
		pageActionTab: favouriteManager.pageActionTab,
		showFavouriteButton: favouriteManager.showFavouriteButton,
	});

	resetContentState();

	return {
		__testHooks: {
			_afterHrefUpdate,
			checkAddLightningNavigation,
			checkKeepTabsOnLeft,
			delayLoadSetupTabs,
			getCurrentHref,
			getModalHanger,
			getSetupTabUl,
			hideTabs,
			init,
			launchDownload,
			main,
			onHrefUpdate,
			promptUpdateExtension,
			reloadTabs,
			showModalOpenOtherOrg: createOpenOtherOrgModal,
			showModalUpdateTab,
			showToast,
			toggleOrg,
		},
		bootstrapIfNeeded,
		getCurrentHref,
		getIsCurrentlyOnSavedTab,
		getModalHanger,
		getSetupTabUl,
		getWasOnSavedTab,
		isOnSavedTab,
		makeDuplicatesBold,
		performActionOnTabs,
		reorderTabsUl,
		sf_afterSet,
		showToast,
	};
}
