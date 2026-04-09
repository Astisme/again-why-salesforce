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
} from "../core/constants.js";
import {
	getInnerElementFieldBySelector as _getInnerElementFieldBySelector,
	getSettings as _getSettings,
} from "../core/functions.js";
import { getTranslations as _getTranslations } from "../core/translator.js";
import _Tab from "../core/tab.js";
import { ensureAllTabsAvailability as _ensureAllTabsAvailability } from "../core/tabContainer.js";
import { setupDragForUl as _setupDragForUl } from "./dragHandler.js";

import { showToast as _showToast } from "./toast.js";
import {
	generateRowTemplate as _generateRowTemplate,
	generateStyleFromSettings as _generateStyleFromSettings,
	generateUpdateTabModal as _generateUpdateTabModal,
	MODAL_ID as _MODAL_ID,
} from "./generator.js";
import { createOpenOtherOrgModal as _createOpenOtherOrgModal } from "./openOtherOrg.js";
import { executeOncePerDay as _executeOncePerDay } from "./once-a-day.js";
import {
	findSetupTabUlInSalesforcePage as _findSetupTabUlInSalesforcePage,
	getCurrentHref as _getCurrentHref,
	getModalHanger as _getModalHanger,
	getSetupTabUl as _getSetupTabUl,
} from "./sf-elements.js";

let BROWSER = _BROWSER;
let CXM_EMPTY_GENERIC_TABS = _CXM_EMPTY_GENERIC_TABS;
let CXM_EMPTY_TABS = _CXM_EMPTY_TABS;
let CXM_EMPTY_VISIBLE_TABS = _CXM_EMPTY_VISIBLE_TABS;
let CXM_MANAGE_TABS = _CXM_MANAGE_TABS;
let CXM_MOVE_FIRST = _CXM_MOVE_FIRST;
let CXM_MOVE_LAST = _CXM_MOVE_LAST;
let CXM_MOVE_LEFT = _CXM_MOVE_LEFT;
let CXM_MOVE_RIGHT = _CXM_MOVE_RIGHT;
let CXM_PIN_TAB = _CXM_PIN_TAB;
let CXM_REMOVE_LEFT_TABS = _CXM_REMOVE_LEFT_TABS;
let CXM_REMOVE_OTHER_TABS = _CXM_REMOVE_OTHER_TABS;
let CXM_REMOVE_PIN_TABS = _CXM_REMOVE_PIN_TABS;
let CXM_REMOVE_RIGHT_TABS = _CXM_REMOVE_RIGHT_TABS;
let CXM_REMOVE_TAB = _CXM_REMOVE_TAB;
let CXM_REMOVE_UNPIN_TABS = _CXM_REMOVE_UNPIN_TABS;
let CXM_RESET_DEFAULT_TABS = _CXM_RESET_DEFAULT_TABS;
let CXM_SORT_CLICK_COUNT = _CXM_SORT_CLICK_COUNT;
let CXM_SORT_CLICK_DATE = _CXM_SORT_CLICK_DATE;
let CXM_SORT_LABEL = _CXM_SORT_LABEL;
let CXM_SORT_ORG = _CXM_SORT_ORG;
let CXM_SORT_URL = _CXM_SORT_URL;
let CXM_TMP_HIDE_NON_ORG = _CXM_TMP_HIDE_NON_ORG;
let CXM_TMP_HIDE_ORG = _CXM_TMP_HIDE_ORG;
let CXM_UNPIN_TAB = _CXM_UNPIN_TAB;
let EXTENSION_NAME = _EXTENSION_NAME;
let HAS_ORG_TAB = _HAS_ORG_TAB;
let LINK_NEW_BROWSER = _LINK_NEW_BROWSER;
let SETUP_LIGHTNING = _SETUP_LIGHTNING;
let TAB_ON_LEFT = _TAB_ON_LEFT;
let TOAST_ERROR = _TOAST_ERROR;
let TOAST_WARNING = _TOAST_WARNING;
let TUTORIAL_EVENT_PIN_TAB = _TUTORIAL_EVENT_PIN_TAB;
let USE_LIGHTNING_NAVIGATION = _USE_LIGHTNING_NAVIGATION;
let WHAT_ACTIVATE = _WHAT_ACTIVATE;
let WHAT_ADD = _WHAT_ADD;
let WHAT_EXPORT_FROM_BG = _WHAT_EXPORT_FROM_BG;
let WHAT_FOCUS_CHANGED = _WHAT_FOCUS_CHANGED;
let WHAT_HIGHLIGHTED = _WHAT_HIGHLIGHTED;
let WHAT_INSTALLED = _WHAT_INSTALLED;
let WHAT_PAGE_REMOVE_TAB = _WHAT_PAGE_REMOVE_TAB;
let WHAT_PAGE_SAVE_TAB = _WHAT_PAGE_SAVE_TAB;
let WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP =
	_WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP;
let WHAT_SAVED = _WHAT_SAVED;
let WHAT_SHOW_EXPORT_MODAL = _WHAT_SHOW_EXPORT_MODAL;
let WHAT_SHOW_IMPORT = _WHAT_SHOW_IMPORT;
let WHAT_SHOW_OPEN_OTHER_ORG = _WHAT_SHOW_OPEN_OTHER_ORG;
let WHAT_START_TUTORIAL = _WHAT_START_TUTORIAL;
let WHAT_STARTUP = _WHAT_STARTUP;
let WHAT_THEME = _WHAT_THEME;
let WHAT_TOGGLE_ORG = _WHAT_TOGGLE_ORG;
let WHAT_UPDATE_EXTENSION = _WHAT_UPDATE_EXTENSION;
let WHAT_UPDATE_TAB = _WHAT_UPDATE_TAB;
let getInnerElementFieldBySelector = _getInnerElementFieldBySelector;
let getSettings = _getSettings;
let getTranslations = _getTranslations;
let Tab = _Tab;
let ensureAllTabsAvailability = _ensureAllTabsAvailability;
let setupDragForUl = _setupDragForUl;
let showToast = _showToast;
let generateRowTemplate = _generateRowTemplate;
let generateStyleFromSettings = _generateStyleFromSettings;
let generateUpdateTabModal = _generateUpdateTabModal;
let MODAL_ID = _MODAL_ID;
let createOpenOtherOrgModal = _createOpenOtherOrgModal;
let executeOncePerDay = _executeOncePerDay;
let findSetupTabUlInSalesforcePage = _findSetupTabUlInSalesforcePage;
let getCurrentHref = _getCurrentHref;
let getModalHanger = _getModalHanger;
let getSetupTabUl = _getSetupTabUl;

/**
 * Lazily loads the tutorial module to avoid circular import initialization issues.
 *
 * @param {boolean} [fromPopup=false] Whether tutorial starts from popup action.
 * @return {Promise<void>}
 */
async function defaultCheckTutorial(fromPopup = false) {
	const tutorialModule = await import("./tutorial.js");
	await tutorialModule.checkTutorial(fromPopup);
}

/**
 * Lazily loads and invokes the favourite-tab action handler.
 *
 * @param {boolean} shouldSave Whether tab should be saved.
 * @return {Promise<void>}
 */
async function defaultPageActionTab(shouldSave) {
	const favouriteModule = await import("./favourite-manager.js");
	await favouriteModule.pageActionTab(shouldSave);
}

/**
 * Lazily loads and invokes the favourite-button renderer.
 *
 * @return {Promise<void>}
 */
async function defaultShowFavouriteButton() {
	const favouriteModule = await import("./favourite-manager.js");
	await favouriteModule.showFavouriteButton();
}

/**
 * Lazily loads and invokes the import modal creator.
 *
 * @return {Promise<void>}
 */
async function defaultCreateImportModal() {
	const importModule = await import("./import.js");
	await importModule.createImportModal();
}

/**
 * Lazily loads and invokes the export modal creator.
 *
 * @return {Promise<void>}
 */
async function defaultCreateExportModal() {
	const exportModule = await import("./export.js");
	await exportModule.createExportModal();
}

/**
 * Lazily loads and invokes the manage-tabs modal creator.
 *
 * @return {Promise<void>}
 */
async function defaultCreateManageTabsModal() {
	const manageTabsModule = await import("./manageTabs.js");
	await manageTabsModule.createManageTabsModal();
}

let pageActionTab = defaultPageActionTab;
let showFavouriteButton = defaultShowFavouriteButton;
let createImportModal = defaultCreateImportModal;
let createExportModal = defaultCreateExportModal;
let createManageTabsModal = defaultCreateManageTabsModal;
let checkTutorial = defaultCheckTutorial;

/**
 * Abort controller for the latest reload operation.
 */
let reloadController = null;

/**
 * Contains the current href, always up-to-date
 */
let href = getCurrentHref();

/**
 * Whether the user was previously on a saved tab.
 */
let wasOnSavedTab;
/**
 * Returns whether the user was previously on a saved tab.
 *
 * @return {boolean} True if was on a saved tab, false otherwise.
 */
export function getWasOnSavedTab() {
	return wasOnSavedTab;
}

/**
 * Whether the user is currently on a saved tab.
 */
let isCurrentlyOnSavedTab;
/**
 * Returns whether the user is currently on a saved tab.
 *
 * @return {boolean} True if currently on a saved tab, false otherwise.
 */
export function getIsCurrentlyOnSavedTab() {
	return isCurrentlyOnSavedTab;
}

/**
 * Wheter the href has been updated right now
 */
let fromHrefUpdate = false;

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
		LINK_NEW_BROWSER,
		USE_LIGHTNING_NAVIGATION,
	]);
	if (
		settings?.some((setting) => setting.enabled)
	) {
		return;
	}
	const script = document.createElement("script");
	script.src = BROWSER.runtime.getURL("salesforce/lightning-navigation.js");
	(document.head || document.documentElement).appendChild(script);
}

/**
 * Handles post-save actions after setting Salesforce tabs.
 * - Displays a toast message indicating that the Salesforce tabs have been saved.
 * - Reloads the tabs by calling `reloadTabs` with the provided tabs.
 *
 * @param {Object} [param0] an object containing the following keys
 * @param {string} [param0.what=WHAT_SAVED] - A flag indicating the action that triggered this function. If null or WHAT_SAVED, a toast message is shown.
 * @param {Array<Tab>|null} [param0.tabs=null] - The tabs to reload. If provided, they are passed to `reloadTabs`.
 * @param {boolean} [param0.shouldReload=true] - If the Tabs should be reloaded from scratch
 */
export function sf_afterSet({
	what = WHAT_SAVED,
	tabs = null,
	shouldReload = true,
} = {}) {
	if (getSetupTabUl() == null) {
		return;
	}
	if (what === WHAT_SAVED) {
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
	const orgName = Tab.extractOrgName(href);
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
	reloadController?.abort();
	reloadController = new AbortController();
	return reloadController.signal;
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
export async function isOnSavedTab(isFromHrefUpdate = false, callback = null) {
	if (fromHrefUpdate && !isFromHrefUpdate) {
		fromHrefUpdate = false;
		return;
	}
	fromHrefUpdate = isFromHrefUpdate;
	const url = Tab.minifyURL(href);
	wasOnSavedTab = isCurrentlyOnSavedTab;
	const allTabs = await ensureAllTabsAvailability();
	isCurrentlyOnSavedTab = allTabs.existsWithOrWithoutOrg({ url, org: href });
	if (isFromHrefUpdate) {
		callback(isCurrentlyOnSavedTab);
	}
}

/**
 * If the user has moved to or from a saved tab, they'll be reloaded to update the highlighted one.
 * otherwise, the favourite button is shown
 *
 * @param {boolean} isCurrentlyOnSavedTab - Whether the currently displayed page is a saved Tab
 */
async function _afterHrefUpdate(isCurrentlyOnSavedTab) {
	if (isCurrentlyOnSavedTab || wasOnSavedTab) {
		await Promise.resolve(trackContentTask(reloadTabs()));
		return;
	}
	await showFavouriteButton();
}
/**
 * Handles the update of the current URL, reloading tabs if necessary.
 */
function onHrefUpdate() {
	const newRef = getCurrentHref();
	if (newRef === href) {
		return;
	}
	href = newRef;
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
	const keep_tabs_on_left = await getSettings(TAB_ON_LEFT);
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
	trackContentTask(Promise.resolve(checkTutorial()));
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
	trackContentTask(Promise.resolve(generateStyleFromSettings()));
	return Promise.resolve(
		trackContentTask(init(tabs, startReloadSignal())),
	);
}

/**
 * Reorders the tabs based on the current setup tab list, extracting information from each tab and updating the stored tabs.
 * - Loops through the children of `setupTabUl` (ignoring Salesforce's default tabs) and extracts relevant tab information (e.g., label and URL).
 * - Creates `Tab` objects for valid tabs and attempts to store them using `allTabs.replaceTabs`.
 * - If any errors occur during the process, they are caught and displayed using `showToast`.
 *
 * @return {Promise<void>} A promise that resolves once the tabs have been reordered and updated in `allTabs`.
 */
export async function reorderTabsUl() {
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
		showToast(error.message, TOAST_ERROR);
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
export function makeDuplicatesBold(miniURL) {
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
export async function performActionOnTabs(
	action,
	tab = undefined,
	options = undefined,
) {
	try {
		const allTabs = await ensureAllTabsAvailability();
		switch (action) {
			case ACTION_MOVE:
				await allTabs.moveTab(tab, options);
				break;
			case CXM_REMOVE_TAB:
				if (!await allTabs.remove(tab, options)) {
					throw new Error("error_removing_tab", tab);
				}
				break;
			case ACTION_REMOVE_OTHER:
				if (!await allTabs.removeOtherTabs(tab, options)) {
					throw new Error("error_removing_other_tabs", tab);
				}
				break;
			case WHAT_ADD:
				if (
					!await allTabs.addTab(
						tab,
						{
							addInFront: options?.addInFront,
						},
					)
				) {
					throw new Error("error_adding_tab");
				}
				break;
			case CXM_EMPTY_GENERIC_TABS:
				if (!await allTabs.replaceTabs()) {
					throw new Error("error_removing_generic_tabs");
				}
				break;
			case CXM_EMPTY_TABS:
				if (!await allTabs.replaceTabs([], { removeOrgTabs: true })) {
					throw new Error("error_removing_all_tabs");
				}
				break;
			case WHAT_TOGGLE_ORG:
				await toggleOrg(tab);
				break;
			case CXM_EMPTY_VISIBLE_TABS: {
				// The visible Tabs are all the generic ones + the org-specific Tabs for the current Org
				const thisOrg = Tab.extractOrgName(href);
				if (
					!await allTabs.replaceTabs([], {
						removeOrgTabs: true,
						removeThisOrgTabs: thisOrg,
					})
				) {
					throw new Error("error_removing_visible_tabs");
				}
				break;
			}
			case CXM_RESET_DEFAULT_TABS:
				if (!await allTabs.setDefaultTabs()) {
					throw new Error("error_resetting_default_tabs");
				}
				break;
			case ACTION_SORT:
				if (!await allTabs.sort(options)) {
					throw new Error("error_sorting_tabs", options);
				}
				break;
			case CXM_TMP_HIDE_ORG:
			case CXM_TMP_HIDE_NON_ORG:
				hideTabs(action === CXM_TMP_HIDE_ORG);
				return;
			case CXM_PIN_TAB:
				if (!await allTabs.pinOrUnpin(tab, true)) {
					throw new Error("error_pin_tab", tab);
				}
				document.dispatchEvent(new CustomEvent(TUTORIAL_EVENT_PIN_TAB));
				break;
			case CXM_UNPIN_TAB:
				if (!await allTabs.pinOrUnpin(tab, false)) {
					throw new Error("error_unpin_tab", tab);
				}
				break;
			case CXM_REMOVE_PIN_TABS:
				if (!await allTabs.removePinned(true)) {
					throw new Error("error_removing_pin_tabs");
				}
				break;
			case CXM_REMOVE_UNPIN_TABS:
				if (!await allTabs.removePinned(false)) {
					throw new Error("error_removing_unpin_tabs");
				}
				break;
			case WHAT_PAGE_SAVE_TAB:
			case WHAT_PAGE_REMOVE_TAB:
				await pageActionTab(action === WHAT_PAGE_SAVE_TAB);
				break;
			default: {
				const noMatch = await getTranslations("no_match");
				return console.error(noMatch, action);
			}
		}
		sf_afterSet({ tabs: allTabs });
	} catch (error) {
		console.warn({ action, tab, options });
		showToast(error.message, TOAST_ERROR);
	}
}

/**
 * From setupTabUl hides all the specified Tabs (Org Tabs by default)
 * @param {boolean} [hideOrgTabs=true] - If the Tabs to be hidden are the Org Tabs (default) or the generic ones
 */
function hideTabs(hideOrgTabs = true) {
	const selector = hideOrgTabs
		? `li${HAS_ORG_TAB}`
		: `li:not(${HAS_ORG_TAB})`;
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
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", TOAST_ERROR);
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
		showToast(e.message, TOAST_ERROR);
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
 * Promise chain that serializes background message handling.
 */
let backgroundMessageQueue = Promise.resolve();

/**
 * Enqueues a background message task so tasks are executed in receive order.
 * The queue recovers from failures to avoid blocking following tasks.
 *
 * @param {() => Promise<void>} taskFactory Function that performs one message task.
 * @return {Promise<void>} Promise that resolves when the queued task completes.
 */
function enqueueBackgroundMessageTask(taskFactory) {
	const queuedTask = backgroundMessageQueue.then(taskFactory);
	backgroundMessageQueue = queuedTask.catch(() => {});
	return queuedTask;
}

const isQueuableBackgroundMessage = new Set([
	CXM_MOVE_RIGHT,
	CXM_MOVE_LAST,
	CXM_MOVE_LEFT,
	CXM_MOVE_FIRST,
	CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_RIGHT_TABS,
	CXM_SORT_LABEL,
	CXM_SORT_URL,
	CXM_SORT_ORG,
	CXM_SORT_CLICK_COUNT,
	CXM_SORT_CLICK_DATE,
	CXM_REMOVE_PIN_TABS,
	CXM_REMOVE_UNPIN_TABS,
	CXM_EMPTY_GENERIC_TABS,
	CXM_EMPTY_TABS,
	CXM_EMPTY_VISIBLE_TABS,
	CXM_RESET_DEFAULT_TABS,
	WHAT_TOGGLE_ORG,
	CXM_PIN_TAB,
	CXM_UNPIN_TAB,
	CXM_REMOVE_TAB,
	CXM_TMP_HIDE_ORG,
	CXM_TMP_HIDE_NON_ORG,
	WHAT_PAGE_SAVE_TAB,
	WHAT_PAGE_REMOVE_TAB,
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
			case WHAT_SAVED:
			case WHAT_STARTUP:
			case WHAT_INSTALLED:
			case WHAT_ACTIVATE:
			case WHAT_HIGHLIGHTED:
			case WHAT_FOCUS_CHANGED:
				sf_afterSet(message);
				break;
			case TOAST_WARNING:
			case TOAST_ERROR:
				showToast(message.message, message.what);
				break;
			case WHAT_SHOW_IMPORT:
				await createImportModal();
				break;
			case CXM_MANAGE_TABS:
				await createManageTabsModal();
				break;
			case WHAT_START_TUTORIAL:
				await checkTutorial(true);
				break;
			case WHAT_SHOW_EXPORT_MODAL:
				await createExportModal();
				break;
			case WHAT_SHOW_OPEN_OTHER_ORG:
				messageTab.url = message.linkTabUrl ?? messageTab.url;
				await createOpenOtherOrgModal(messageTab);
				break;
			case WHAT_UPDATE_TAB:
				await showModalUpdateTab(messageTab);
				break;
			case WHAT_UPDATE_EXTENSION:
				await promptUpdateExtension(message);
				break;
			case WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP:
				if (message.ok) {
					showToast(
						"req_downloads_open_popup",
					);
				} else {
					showToast(
						"error_req_downloads",
						TOAST_ERROR,
					);
				}
				break;
			case WHAT_EXPORT_FROM_BG:
				launchDownload(message);
				break;
			case CXM_MOVE_RIGHT:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: false,
					fullMovement: false,
				});
				break;
			case CXM_MOVE_LAST:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: false,
					fullMovement: true,
				});
				break;
			case CXM_MOVE_LEFT:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: true,
					fullMovement: false,
				});
				break;
			case CXM_MOVE_FIRST:
				await performActionOnTabs(ACTION_MOVE, messageTab, {
					moveBefore: true,
					fullMovement: true,
				});
				break;
			case CXM_REMOVE_OTHER_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, messageTab);
				break;
			case CXM_REMOVE_LEFT_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, messageTab, {
					removeBefore: true,
				});
				break;
			case CXM_REMOVE_RIGHT_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, messageTab, {
					removeBefore: false,
				});
				break;
			case CXM_SORT_LABEL:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: "label",
					}),
				);
				break;
			case CXM_SORT_URL:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: "url",
					}),
				);
				break;
			case CXM_SORT_ORG:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: "org",
					}),
				);
				break;
			case CXM_SORT_CLICK_COUNT:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: Tab.keyClickCount,
						standardSort: false,
					}),
				);
				break;
			case CXM_SORT_CLICK_DATE:
				await performActionOnTabs(
					ACTION_SORT,
					undefined,
					(await ensureAllTabsAvailability()).getSortOptions({
						sortBy: Tab.keyClickDate,
						standardSort: false,
					}),
				);
				break;
			case CXM_REMOVE_PIN_TABS:
			case CXM_REMOVE_UNPIN_TABS:
			case CXM_EMPTY_GENERIC_TABS:
			case CXM_EMPTY_TABS:
			case CXM_EMPTY_VISIBLE_TABS:
			case CXM_RESET_DEFAULT_TABS:
			case WHAT_TOGGLE_ORG:
			case CXM_PIN_TAB:
			case CXM_UNPIN_TAB:
			case CXM_REMOVE_TAB:
			case CXM_TMP_HIDE_ORG:
			case CXM_TMP_HIDE_NON_ORG:
			case WHAT_PAGE_SAVE_TAB:
			case WHAT_PAGE_REMOVE_TAB:
				await performActionOnTabs(message.what, messageTab);
				break;
			default:
				if (message.what !== WHAT_THEME) {
					showToast(
						[
							"error_unknown_message",
							message.what,
						],
						TOAST_WARNING,
					);
				}
				break;
		}
	} catch (error) {
		showToast(error.message, TOAST_ERROR);
	}
}

/**
 * Listens for messages from the background page and routes commands to appropriate handlers.
 * Supports tab management, notifications, modal dialogs, extension update prompts, and more.
 * Catches errors and displays them as toast notifications.
 */
function listenToBackgroundPage() {
	BROWSER.runtime.onMessage.addListener((message, _, sendResponse) => {
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
		backgroundMessageQueue = backgroundMessageQueue
			.then(() => nonQueuedTask)
			.catch(() => {});
		return nonQueuedTask;
	});
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
	trackContentTask(Promise.resolve(ensureAllTabsAvailability()));
	trackContentTask(checkAddLightningNavigation());
	listenToBackgroundPage();
	trackContentTask(Promise.resolve(delayLoadSetupTabs()));
	trackContentTask(Promise.resolve(executeOncePerDay()));
}

/**
 * Resets mutable content state before bootstrapping.
 */
function resetContentState() {
	reloadController = null;
	href = getCurrentHref();
	wasOnSavedTab = undefined;
	isCurrentlyOnSavedTab = undefined;
	fromHrefUpdate = false;
	backgroundMessageQueue = Promise.resolve();
}

/**
 * Boots the module when the current page is a setup page and the page has not been initialized.
 *
 * @return {boolean} True when bootstrapping started.
 */
function bootstrapIfNeeded() {
	if (
		href?.includes(SETUP_LIGHTNING) &&
		!globalThis[`hasLoaded${EXTENSION_NAME}`]
	) {
		globalThis[`hasLoaded${EXTENSION_NAME}`] = true;
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

	if (constants.BROWSER != null) BROWSER = constants.BROWSER;
	if (constants.CXM_EMPTY_GENERIC_TABS != null) {
		CXM_EMPTY_GENERIC_TABS = constants.CXM_EMPTY_GENERIC_TABS;
	}
	if (constants.CXM_EMPTY_TABS != null) {
		CXM_EMPTY_TABS = constants.CXM_EMPTY_TABS;
	}
	if (constants.CXM_EMPTY_VISIBLE_TABS != null) {
		CXM_EMPTY_VISIBLE_TABS = constants.CXM_EMPTY_VISIBLE_TABS;
	}
	if (constants.CXM_MANAGE_TABS != null) {
		CXM_MANAGE_TABS = constants.CXM_MANAGE_TABS;
	}
	if (constants.CXM_MOVE_FIRST != null) {
		CXM_MOVE_FIRST = constants.CXM_MOVE_FIRST;
	}
	if (constants.CXM_MOVE_LAST != null) {
		CXM_MOVE_LAST = constants.CXM_MOVE_LAST;
	}
	if (constants.CXM_MOVE_LEFT != null) {
		CXM_MOVE_LEFT = constants.CXM_MOVE_LEFT;
	}
	if (constants.CXM_MOVE_RIGHT != null) {
		CXM_MOVE_RIGHT = constants.CXM_MOVE_RIGHT;
	}
	if (constants.CXM_PIN_TAB != null) CXM_PIN_TAB = constants.CXM_PIN_TAB;
	if (constants.CXM_REMOVE_LEFT_TABS != null) {
		CXM_REMOVE_LEFT_TABS = constants.CXM_REMOVE_LEFT_TABS;
	}
	if (constants.CXM_REMOVE_OTHER_TABS != null) {
		CXM_REMOVE_OTHER_TABS = constants.CXM_REMOVE_OTHER_TABS;
	}
	if (constants.CXM_REMOVE_PIN_TABS != null) {
		CXM_REMOVE_PIN_TABS = constants.CXM_REMOVE_PIN_TABS;
	}
	if (constants.CXM_REMOVE_RIGHT_TABS != null) {
		CXM_REMOVE_RIGHT_TABS = constants.CXM_REMOVE_RIGHT_TABS;
	}
	if (constants.CXM_REMOVE_TAB != null) {
		CXM_REMOVE_TAB = constants.CXM_REMOVE_TAB;
	}
	if (constants.CXM_REMOVE_UNPIN_TABS != null) {
		CXM_REMOVE_UNPIN_TABS = constants.CXM_REMOVE_UNPIN_TABS;
	}
	if (constants.CXM_RESET_DEFAULT_TABS != null) {
		CXM_RESET_DEFAULT_TABS = constants.CXM_RESET_DEFAULT_TABS;
	}
	if (constants.CXM_SORT_CLICK_COUNT != null) {
		CXM_SORT_CLICK_COUNT = constants.CXM_SORT_CLICK_COUNT;
	}
	if (constants.CXM_SORT_CLICK_DATE != null) {
		CXM_SORT_CLICK_DATE = constants.CXM_SORT_CLICK_DATE;
	}
	if (constants.CXM_SORT_LABEL != null) {
		CXM_SORT_LABEL = constants.CXM_SORT_LABEL;
	}
	if (constants.CXM_SORT_ORG != null) CXM_SORT_ORG = constants.CXM_SORT_ORG;
	if (constants.CXM_SORT_URL != null) CXM_SORT_URL = constants.CXM_SORT_URL;
	if (constants.CXM_TMP_HIDE_NON_ORG != null) {
		CXM_TMP_HIDE_NON_ORG = constants.CXM_TMP_HIDE_NON_ORG;
	}
	if (constants.CXM_TMP_HIDE_ORG != null) {
		CXM_TMP_HIDE_ORG = constants.CXM_TMP_HIDE_ORG;
	}
	if (constants.CXM_UNPIN_TAB != null) {
		CXM_UNPIN_TAB = constants.CXM_UNPIN_TAB;
	}
	if (constants.EXTENSION_NAME != null) {
		EXTENSION_NAME = constants.EXTENSION_NAME;
	}
	if (constants.HAS_ORG_TAB != null) HAS_ORG_TAB = constants.HAS_ORG_TAB;
	if (constants.LINK_NEW_BROWSER != null) {
		LINK_NEW_BROWSER = constants.LINK_NEW_BROWSER;
	}
	if (constants.SETUP_LIGHTNING != null) {
		SETUP_LIGHTNING = constants.SETUP_LIGHTNING;
	}
	if (constants.TAB_ON_LEFT != null) TAB_ON_LEFT = constants.TAB_ON_LEFT;
	if (constants.TOAST_ERROR != null) TOAST_ERROR = constants.TOAST_ERROR;
	if (constants.TOAST_WARNING != null) {
		TOAST_WARNING = constants.TOAST_WARNING;
	}
	if (constants.TUTORIAL_EVENT_PIN_TAB != null) {
		TUTORIAL_EVENT_PIN_TAB = constants.TUTORIAL_EVENT_PIN_TAB;
	}
	if (constants.USE_LIGHTNING_NAVIGATION != null) {
		USE_LIGHTNING_NAVIGATION = constants.USE_LIGHTNING_NAVIGATION;
	}
	if (constants.WHAT_ACTIVATE != null) {
		WHAT_ACTIVATE = constants.WHAT_ACTIVATE;
	}
	if (constants.WHAT_ADD != null) WHAT_ADD = constants.WHAT_ADD;
	if (constants.WHAT_EXPORT_FROM_BG != null) {
		WHAT_EXPORT_FROM_BG = constants.WHAT_EXPORT_FROM_BG;
	}
	if (constants.WHAT_FOCUS_CHANGED != null) {
		WHAT_FOCUS_CHANGED = constants.WHAT_FOCUS_CHANGED;
	}
	if (constants.WHAT_HIGHLIGHTED != null) {
		WHAT_HIGHLIGHTED = constants.WHAT_HIGHLIGHTED;
	}
	if (constants.WHAT_INSTALLED != null) {
		WHAT_INSTALLED = constants.WHAT_INSTALLED;
	}
	if (constants.WHAT_PAGE_REMOVE_TAB != null) {
		WHAT_PAGE_REMOVE_TAB = constants.WHAT_PAGE_REMOVE_TAB;
	}
	if (constants.WHAT_PAGE_SAVE_TAB != null) {
		WHAT_PAGE_SAVE_TAB = constants.WHAT_PAGE_SAVE_TAB;
	}
	if (constants.WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP != null) {
		WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP =
			constants.WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP;
	}
	if (constants.WHAT_SAVED != null) WHAT_SAVED = constants.WHAT_SAVED;
	if (constants.WHAT_SHOW_EXPORT_MODAL != null) {
		WHAT_SHOW_EXPORT_MODAL = constants.WHAT_SHOW_EXPORT_MODAL;
	}
	if (constants.WHAT_SHOW_IMPORT != null) {
		WHAT_SHOW_IMPORT = constants.WHAT_SHOW_IMPORT;
	}
	if (constants.WHAT_SHOW_OPEN_OTHER_ORG != null) {
		WHAT_SHOW_OPEN_OTHER_ORG = constants.WHAT_SHOW_OPEN_OTHER_ORG;
	}
	if (constants.WHAT_START_TUTORIAL != null) {
		WHAT_START_TUTORIAL = constants.WHAT_START_TUTORIAL;
	}
	if (constants.WHAT_STARTUP != null) WHAT_STARTUP = constants.WHAT_STARTUP;
	if (constants.WHAT_THEME != null) WHAT_THEME = constants.WHAT_THEME;
	if (constants.WHAT_TOGGLE_ORG != null) {
		WHAT_TOGGLE_ORG = constants.WHAT_TOGGLE_ORG;
	}
	if (constants.WHAT_UPDATE_EXTENSION != null) {
		WHAT_UPDATE_EXTENSION = constants.WHAT_UPDATE_EXTENSION;
	}
	if (constants.WHAT_UPDATE_TAB != null) {
		WHAT_UPDATE_TAB = constants.WHAT_UPDATE_TAB;
	}

	if (functions.getInnerElementFieldBySelector != null) {
		getInnerElementFieldBySelector =
			functions.getInnerElementFieldBySelector;
	}
	if (functions.getSettings != null) getSettings = functions.getSettings;
	if (overrides.getTranslations != null) {
		getTranslations = overrides.getTranslations;
	}
	if (overrides.Tab != null) Tab = overrides.Tab;
	if (tabContainer.ensureAllTabsAvailability != null) {
		ensureAllTabsAvailability = tabContainer.ensureAllTabsAvailability;
	}
	if (dragHandler.setupDragForUl != null) {
		setupDragForUl = dragHandler.setupDragForUl;
	}
	if (toast.showToast != null) showToast = toast.showToast;
	if (favouriteManager.pageActionTab != null) {
		pageActionTab = favouriteManager.pageActionTab;
	}
	if (favouriteManager.showFavouriteButton != null) {
		showFavouriteButton = favouriteManager.showFavouriteButton;
	}
	if (generator.generateRowTemplate != null) {
		generateRowTemplate = generator.generateRowTemplate;
	}
	if (generator.generateStyleFromSettings != null) {
		generateStyleFromSettings = generator.generateStyleFromSettings;
	}
	if (generator.generateUpdateTabModal != null) {
		generateUpdateTabModal = generator.generateUpdateTabModal;
	}
	if (generator.MODAL_ID != null) MODAL_ID = generator.MODAL_ID;
	if (importModule.createImportModal != null) {
		createImportModal = importModule.createImportModal;
	}
	if (exportModule.createExportModal != null) {
		createExportModal = exportModule.createExportModal;
	}
	if (manageTabs.createManageTabsModal != null) {
		createManageTabsModal = manageTabs.createManageTabsModal;
	}
	if (openOtherOrg.createOpenOtherOrgModal != null) {
		createOpenOtherOrgModal = openOtherOrg.createOpenOtherOrgModal;
	}
	if (tutorial.checkTutorial != null) checkTutorial = tutorial.checkTutorial;
	if (onceADay.executeOncePerDay != null) {
		executeOncePerDay = onceADay.executeOncePerDay;
	}
	if (sfElements.findSetupTabUlInSalesforcePage != null) {
		findSetupTabUlInSalesforcePage =
			sfElements.findSetupTabUlInSalesforcePage;
	}
	if (sfElements.getCurrentHref != null) {
		getCurrentHref = sfElements.getCurrentHref;
	}
	if (sfElements.getModalHanger != null) {
		getModalHanger = sfElements.getModalHanger;
	}
	if (sfElements.getSetupTabUl != null) {
		getSetupTabUl = sfElements.getSetupTabUl;
	}

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

// queries the currently active tab of the current active window
// this prevents showing the tabs when not in a setup page (like Sales or Service Console)
if (globalThis.__AWSF_SKIP_CONTENT_AUTO_BOOTSTRAP__ !== true) {
	bootstrapIfNeeded();
}
