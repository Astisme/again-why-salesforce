"use strict";
import {
	BROWSER,
	CMD_OPEN_OTHER_ORG,
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	CMD_TOGGLE_ORG,
	CMD_UPDATE_TAB,
	CXM_EMPTY_GENERIC_TABS,
	CXM_EMPTY_TABS,
	CXM_EMPTY_VISIBLE_TABS,
	CXM_MOVE_FIRST,
	CXM_MOVE_LAST,
	CXM_MOVE_LEFT,
	CXM_MOVE_RIGHT,
	CXM_OPEN_OTHER_ORG,
	CXM_PAGE_REMOVE_TAB,
	CXM_PAGE_SAVE_TAB,
	CXM_PIN_TAB,
	CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_PIN_TABS,
	CXM_REMOVE_RIGHT_TABS,
	CXM_REMOVE_TAB,
	CXM_REMOVE_UNPIN_TABS,
	CXM_RESET_DEFAULT_TABS,
	CXM_SORT_CLICK_COUNT,
	CXM_SORT_CLICK_DATE,
	CXM_SORT_LABEL,
	CXM_SORT_ORG,
	CXM_SORT_URL,
	CXM_TMP_HIDE_NON_ORG,
	CXM_TMP_HIDE_ORG,
	CXM_UNPIN_TAB,
	CXM_UPDATE_ORG,
	CXM_UPDATE_TAB,
	EXTENSION_NAME,
	EXTENSION_VERSION,
	getSettings,
	HAS_ORG_TAB,
	HTTPS,
	LIGHTNING_FORCE_COM,
	LINK_NEW_BROWSER,
	PREVENT_ANALYTICS,
	SALESFORCE_URL_PATTERN,
	sendExtensionMessage,
	SETTINGS_KEY,
	SETUP_LIGHTNING,
	TAB_ON_LEFT,
	USE_LIGHTNING_NAVIGATION,
	WHAT_EXPORT,
	WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
	WHAT_UPDATE_EXTENSION,
} from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";
import Tab from "/tab.js";
import { ensureAllTabsAvailability } from "/tabContainer.js";
import { setupDrag } from "/dragHandler.js";

import { pageActionTab, showFavouriteButton } from "./favourite-manager.js";
import {
	generateOpenOtherOrgModal,
	generateRowTemplate,
	generateSldsToastMessage,
	generateStyleFromSettings,
	generateUpdateTabModal,
	MODAL_ID,
} from "./generator.js";
import { createImportModal } from "./import.js";

/**
 * The main UL on Salesforce Setup
 */
let setupTabUl;
/**
 * Returns the main UL element in Salesforce Setup.
 *
 * @returns {HTMLElement} The main UL element in Salesforce Setup.
 */
export function getSetupTabUl() {
	return setupTabUl;
}

/**
 * Where modals should be inserted in Salesforce Setup
 */
let modalHanger;

/**
 * Contains the current href, always up-to-date
 */
let href = globalThis.location.href;
/**
 * Returns the current href string, always up-to-date.
 *
 * @returns {string} The current page href.
 */
export function getCurrentHref() {
	return href;
}

/**
 * Whether the user was previously on a saved tab.
 */
let wasOnSavedTab;
/**
 * Returns whether the user was previously on a saved tab.
 *
 * @returns {boolean} True if was on a saved tab, false otherwise.
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
 * @returns {boolean} True if currently on a saved tab, false otherwise.
 */
export function getIsCurrentlyOnSavedTab() {
	return isCurrentlyOnSavedTab;
}

/**
 * Wheter the href has been updated right now
 */
let fromHrefUpdate = false;

/**
 * Dynamically injects the Salesforce Lightning Navigation script into the page
 * if relevant settings allow it.
 *
 * @returns {Promise<void>} Resolves when the script is added or skipped.
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
 * @param {string|null} [what=null] - A flag indicating the action that triggered this function. If null or "saved", a toast message is shown.
 * @param {Array<Tab>|null} [tabs=null] - The tabs to reload. If provided, they are passed to `reloadTabs`.
 */
function sf_afterSet(what = null, tabs = null, shouldReload = true) {
	if (setupTabUl == null) {
		return;
	}
	if (what == null || what === "saved") {
		showToast(["extension_label", "tabs_saved"]);
	}
	if (shouldReload === true) {
		reloadTabs(tabs);
	}
}

/**
 * Calculates the estimated time (in milliseconds) it takes to read a given message.
 *
 * @param {string} message - The message to calculate the reading time for.
 * @returns {number} - The estimated reading time in milliseconds.
 */
function _calculateReadingTime(message) {
	const words = message.split(/\s+/).filter((word) => word.length > 0);
	const wordsPerMinute = 200; // Average reading speed
	const readingTimeMinutes = words.length / wordsPerMinute;
	const readingTimeSeconds = Math.ceil(readingTimeMinutes * 60);
	return (readingTimeSeconds + 2) * 1000;
}
/**
 * Displays a toast message on the UI with the provided message and styling options.
 * - The toast message is appended to the DOM and automatically removed after an estimated reading time.
 * - The message is logged to the console with an appropriate log level based on success, warning, or error.
 *
 * @param {string} message - The message to display in the toast.
 * @param {boolean} [isSuccess=true] - Indicates if the message is a success. Defaults to `true`.
 * @param {boolean} [isWarning=false] - Indicates if the message is a warning. Defaults to `false`.
 */
export async function showToast(message, isSuccess = true, isWarning = false) {
	const hanger = document.getElementsByClassName(
		"oneConsoleTabset navexConsoleTabset",
	)[0];
	const toastElement = await generateSldsToastMessage(
		Array.isArray(message) ? message : [message],
		isSuccess,
		isWarning,
	);
	hanger.appendChild(toastElement);
	setTimeout(() => {
		toastElement.remove();
	}, _calculateReadingTime(toastElement.textContent));
	if (isSuccess) {
		if (isWarning) {
			console.info(message);
		} else {
			console.log(message);
		}
	} else {
		console.trace();
		if (isWarning) {
			console.warn(message);
		} else {
			console.error(message);
		}
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
 * @returns {Promise<void>} A promise that resolves after the initialization process is completed, including tab setup and UI updates.
 */
async function init(tabs = null) {
	const orgName = Tab.extractOrgName(href);
	const allTabs = await ensureAllTabsAvailability();
	if (tabs == null) {
		await allTabs.getSavedTabs(true);
	} else {
		await allTabs.replaceTabs(tabs, {
			resetTabs: true,
			removeOrgTabs: true,
			sync: false,
			keepTabsNotThisOrg: orgName,
		});
	}
	if (allTabs.length > 0) {
		const frag = document.createDocumentFragment();
		const pinnedItems = allTabs.pinned;
		for (const i in allTabs) {
			const row = allTabs[i];
			// hide not-this-org tabs
			frag.appendChild(
				generateRowTemplate(
					row,
					{
						hide: !(row.org == null || row.org === orgName),
						isPinned: i < pinnedItems,
					},
				),
			);
		}
		setupTabUl.appendChild(frag);
	}
	isOnSavedTab();
	checkKeepTabsOnLeft();
	showFavouriteButton();
}

/**
 * Checks if the current tab corresponds to a saved tab and executes a callback if specified.
 * - If `isFromHrefUpdate` is `true`, it triggers the provided callback with the current saved tab status.
 * - The function updates the `fromHrefUpdate` flag to track whether the check is triggered by a URL update.
 * - It ensures all tabs are available by calling `ensureAllTabsAvailability`, and checks if the current URL exists in `allTabs`.
 *
 * @param {boolean} [isFromHrefUpdate=false] - A flag indicating if the check is triggered by a URL update.
 * @param {Function} [callback] - A callback function to be invoked with the result of the saved tab check.
 * @returns {Promise<void>} A promise that resolves after checking if the current tab is saved and executing the callback if provided.
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
 */
async function _afterHrefUpdate(isCurrentlyOnSavedTab) {
	if (isCurrentlyOnSavedTab || wasOnSavedTab) reloadTabs();
	else await showFavouriteButton();
}
/**
 * Handles the update of the current URL, reloading tabs if necessary.
 */
function onHrefUpdate() {
	const newRef = globalThis.location.href;
	if (newRef === href) {
		return;
	}
	href = newRef;
	isOnSavedTab(true, _afterHrefUpdate);
}

/**
 * Checks the user setting for keeping tabs on the left side and moves the setupTabUl element accordingly.
 * If the setting is disabled or not found, moves setupTabUl after the ObjectManager element.
 * Otherwise, moves setupTabUl before the Home element.
 *
 * @returns {Promise<void>} Resolves after repositioning the setupTabUl element based on user preference.
 */
async function checkKeepTabsOnLeft() {
	const keep_tabs_on_left = await getSettings(TAB_ON_LEFT);
	const beforeOrAfter = keep_tabs_on_left?.enabled
		? "afterbegin"
		: "beforeend";
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
 */
function delayLoadSetupTabs(count = 0) {
	if (count > 5) {
		// write error in the console
		(async () => {
			const translator = await ensureTranslatorAvailability();
			const label = await translator.translate("extension_label");
			const fail = await translator.translate("error_no_setup_tab");
			console.error(`${label} - ${fail}`);
			setTimeout(delayLoadSetupTabs, 5000);
		})();
		return;
	}
	const parentOfSetupTabUl =
		(document.querySelector("ul.pinnedItems.slds-grid") ??
			document.getElementsByClassName("pinnedItems slds-grid")?.[0])
			?.parentElement;
	if (parentOfSetupTabUl == null) {
		return setTimeout(() => delayLoadSetupTabs(count + 1), 500);
	}
	setupTabUl = parentOfSetupTabUl.querySelector(`#${EXTENSION_NAME}`);
	if (setupTabUl == null) {
		setupTabUl = document.createElement("ul");
		setupTabUl.id = EXTENSION_NAME;
		setupTabUl.classList.add("tabBarItems", "slds-grid");
		parentOfSetupTabUl.appendChild(setupTabUl);
	}
	checkKeepTabsOnLeft();
	// Start observing changes to the DOM to then check for URL change
	// when URL changes, show the favourite button
	new MutationObserver(() => setTimeout(onHrefUpdate, 500))
		.observe(document.querySelector(".tabsetBody"), {
			childList: true,
			subtree: true,
		});
	// Add overflow scroll behavior only if not already present
	if (!setupTabUl.style.overflowX.includes("auto")) {
		setupTabUl.setAttribute(
			"style",
			`overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; ${
				setupTabUl.getAttribute("style") ?? ""
			}`,
		);
	}
	// Listen to mouse wheel to easily move left & right
	if (!setupTabUl.dataset.wheelListenerApplied) {
		setupTabUl.addEventListener("wheel", (e) => {
			e.preventDefault();
			setupTabUl.scrollLeft += e.deltaY;
		});
		setupTabUl.dataset.wheelListenerApplied = true;
	}
	// initialize
	setupDrag();
	reloadTabs();
}

/**
 * Reloads the tabs by checking if the setup tab list is correctly populated and removing any existing tabs before reinitializing.
 * - Ensures that duplicate tabs are not created when refocusing on the setup window/tab.
 * - If the tabs are not properly loaded or if it's the first run, it retries after 500ms.
 * - Removes all tabs in the setup tab list (except for hidden ones, "Home", and "Object Manager") and then calls the `init` function to load the new tabs.
 *
 * @param {Array<Tab>|null} [tabs=null] - The tabs to initialize. If null, the tabs will be fetched again.
 * @returns {void} This function does not return anything, but it reinitializes the tab list as needed.
 */
function reloadTabs(tabs = null) {
	// remove the tabs that are already in the page
	if (setupTabUl.childElementCount > 0) {
		setupTabUl.innerHTML = null;
	}
	generateStyleFromSettings();
	init(tabs);
}

/**
 * Reorders the tabs based on the current setup tab list, extracting information from each tab and updating the stored tabs.
 * - Loops through the children of `setupTabUl` (ignoring Salesforce's default tabs) and extracts relevant tab information (e.g., label and URL).
 * - Creates `Tab` objects for valid tabs and attempts to store them using `allTabs.replaceTabs`.
 * - If any errors occur during the process, they are caught and displayed using `showToast`.
 *
 * @returns {Promise<void>} A promise that resolves once the tabs have been reordered and updated in `allTabs`.
 */
async function reorderTabs() {
	try {
		// Get the list of tabs
		const tabs = Array.from(setupTabUl.children)
			.map((tab) => {
				const a = tab.querySelector("a");
				if (a == null) {
					return null;
				}
				const span = a.querySelector("span");
				if (span == null) {
					return null;
				}
				const isOrgTab = span.dataset.org != null;
				const label = span.innerText;
				const aHref = a.href;
				if (label == null || aHref == null) {
					return null;
				}
				try {
					if (!isOrgTab) {
						return Tab.create(label, aHref);
					}
					const org = span.dataset.org;
					return Tab.create(
						label,
						aHref,
						org == null || org === "" ? getCurrentHref() : org,
					);
				} catch (error) {
					console.error(error);
					return null;
				}
			})
			.filter((tab) => tab != null);
		const allTabs = await ensureAllTabsAvailability();
		await allTabs.replaceTabs(tabs, {
			resetTabs: true,
			removeOrgTabs: true,
			//keepTabsNotThisOrg: Tab.extractOrgName(href),
		});
		sf_afterSet(undefined, tabs, false);
	} catch (error) {
		showToast(error.message, false);
	}
}

/**
 * @param {Array[HTMLElement] duplicatetabs - the tabs which are duplicated and need to be highlighted
 * For each duplicatetabs, toggles the slds-theme--warning class
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
	const duplicatetabs = setupTabUl.querySelectorAll(`a[title="${miniURL}"]`);
	if (duplicatetabs == null) {
		return;
	}
	_toggleWarning(duplicatetabs);
	setTimeout(
		() => _toggleWarning(duplicatetabs),
		4000,
	);
}

/**
 * Retrieves the modal hanger element, caching it for future use.
 * - If the `modalHanger` is already set, it returns the cached value.
 * - Otherwise, it finds it in the page.
 *
 * @returns {HTMLElement|null} The modal hanger element if found, otherwise null.
 */
export function getModalHanger() {
	if (modalHanger != null) {
		return modalHanger;
	}
	modalHanger = document.querySelector("div.DESKTOP.uiContainerManager");
	return modalHanger;
}

/**
 * Displays a modal for opening a page in another Salesforce organization.
 * - If a modal is already open, shows a toast to prompt the user to close the existing modal first.
 * - If the current page contains a Salesforce ID, shows a warning toast indicating the page cannot exist in another Org.
 * - Generates the modal with an input field for the user to specify the organization URL.
 * - If the user enters a valid Salesforce Org URL, the modal provides a confirmation prompt before opening the page in a new tab.
 * - The modal includes event listeners for user input and for saving the new organization link.
 *
 * @param {Object} options - An object containing optional parameters:
 * @param {string|null} [options.label=null] - The label for the modal. Defaults to a label fetched from saved tabs if not provided.
 * @param {string|null} [options.url=null] - The URL for the page to open in another organization.
 * @param {string|null} [options.org=null] - The org of the current page.
 * @returns {Promise<void>} A promise that resolves once the modal has been displayed and the user interacts with it.
 */
async function showModalOpenOtherOrg(
	{ label = null, url = null, org = null } = {},
) {
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", false);
	}
	const allTabs = await ensureAllTabsAvailability();
	const href = getCurrentHref();
	if (label == null && url == null) {
		const minyURL = Tab.minifyURL(href);
		try {
			const matchingTab = allTabs.getSingleTabByData({ url: minyURL });
			label = matchingTab.label;
			url = matchingTab.url;
		} catch (e) {
			console.info(e);
			url = minyURL;
		}
	}
	if (org == null) {
		org = Tab.extractOrgName(href);
	}
	const skip_link_detection = await getSettings("skip_link_detection");
	if (
		skip_link_detection != null && !skip_link_detection.enabled &&
		Tab.containsSalesforceId(url)
	) {
		showToast(
			"error_link_with_id",
			false,
			true,
		);
	}
	const translator = await ensureTranslatorAvailability();
	const whereTo = await translator.translate("where_to");
	const {
		modalParent,
		saveButton,
		closeButton,
		inputContainer,
		getSelectedRadioButtonValue,
	} = await generateOpenOtherOrgModal({
		label: label ?? whereTo,
		url, // if the url is "", we may still open the link in another Org without any issue
		org,
	});
	getModalHanger().appendChild(modalParent);
	let lastInput = "";
	inputContainer.addEventListener("input", (e) => {
		const target = e.target;
		const value = target.value;
		const delta = value.length - lastInput.length;
		if (delta > 2) {
			const newTarget = Tab.extractOrgName(value);
			if (newTarget != null && newTarget !== value) {
				target.value = newTarget;
				lastInput = newTarget;
			}
			return;
		}
		lastInput = value;
	});
	let lastExtracted = null;
	saveButton.addEventListener("click", async (e) => {
		e.preventDefault();
		const linkTarget = getSelectedRadioButtonValue();
		const inputVal = inputContainer.value;
		if (inputVal == null || inputVal === "") {
			return showToast(["insert_another", "org_link"], false, true);
		}
		const newTarget = Tab.extractOrgName(inputVal);
		if (lastExtracted === newTarget) return; // could be called more than once
		lastExtracted = newTarget;
		if (
			!newTarget.match(
				SALESFORCE_URL_PATTERN,
			)
		) {
			return showToast(["insert_valid_org", newTarget], false);
		}
		if (newTarget === Tab.extractOrgName(getCurrentHref())) {
			return showToast(
				"insert_another_org",
				false,
			);
		}
		const targetUrl = new URL(
			`${HTTPS}${newTarget}${LIGHTNING_FORCE_COM}${
				url.startsWith("/") ? "" : SETUP_LIGHTNING
			}${url}`,
		);
		const confirm_msg = await translator.translate([
			"confirm_another_org",
			targetUrl,
		], "\n");
		if (confirm(confirm_msg)) {
			closeButton.click();
			open(targetUrl, linkTarget ?? "_blank");
		}
	});
}

const ACTION_MOVE = "move";
export const ACTION_REMOVE_THIS = "remove-this";
const ACTION_REMOVE_OTHER = "remove-other";
export const ACTION_ADD = "add";
const ACTION_TOGGLE_ORG = "toggle-org";
const ACTION_SORT = "sort";
const ACTION_TMP_HIDE = "tmp-hide";

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
			case ACTION_REMOVE_THIS:
				if (!await allTabs.remove(tab, options)) {
					throw new Error("error_removing_tab", tab);
				}
				break;
			case ACTION_REMOVE_OTHER:
				if (!await allTabs.removeOtherTabs(tab, options)) {
					throw new Error("error_removing_other_tabs", tab);
				}
				break;
			case ACTION_ADD:
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
			case ACTION_TOGGLE_ORG:
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
			case ACTION_TMP_HIDE: {
				const allowedActions = [CXM_TMP_HIDE_ORG, CXM_TMP_HIDE_NON_ORG];
				if (!allowedActions.includes(options)) {
					throw new Error("error_internal", options);
				}
				hideTabs(options === CXM_TMP_HIDE_ORG);
				return;
			}
			case CXM_PIN_TAB:
				if (!await allTabs.pinOrUnpin(tab, true)) {
					throw new Error("error_pin_tab", tab);
				}
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
			default: {
				const translator = await ensureTranslatorAvailability();
				const noMatch = await translator.translate("no_match");
				return console.error(noMatch, action);
			}
		}
		sf_afterSet(undefined, allTabs);
	} catch (error) {
		console.warn({ action, tab, options });
		showToast(error.message, false);
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
	const tabsToHide = setupTabUl.querySelectorAll(selector);
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
	const inputTab = { label, url, org };
	if (inputTab.url == null) {
		inputTab.url = Tab.minifyURL(getCurrentHref());
	}
	if (inputTab.org == null) {
		inputTab.org = Tab.extractOrgName(getCurrentHref());
	}
	const allTabs = await ensureAllTabsAvailability();
	const matchingTab = allTabs.getSingleTabByData(inputTab);
	matchingTab.update({
		org: matchingTab.org == null ? getCurrentHref() : "",
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
 */
async function showModalUpdateTab(
	{ label = null, url = null, org = null } = {},
) {
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", false);
	}
	const tab = { label, url, org };
	const tabIsEmpty = tab.label == null && tab.url == null && tab.org == null;
	const allTabs = await ensureAllTabsAvailability();
	let matchingTab = null;
	try {
		matchingTab = allTabs.getSingleTabByData(
			tabIsEmpty
				? {
					url: Tab.minifyURL(getCurrentHref()),
					org: Tab.extractOrgName(getCurrentHref()),
				}
				: tab,
		);
	} catch (e) {
		showToast(e.message, false, false);
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
 * @returns {Promise<void>} Resolves after the prompt and possible navigation.
 */
async function promptUpdateExtension({ version, link, oldversion } = {}) {
	const translator = await ensureTranslatorAvailability();
	const confirm_msg = await translator.translate([
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
 * Listens for messages from the background page and routes commands to appropriate handlers.
 * Supports tab management, notifications, modal dialogs, extension update prompts, and more.
 * Catches errors and displays them as toast notifications.
 */
function listenToBackgroundPage() {
	BROWSER.runtime.onMessage.addListener(async (message, _, sendResponse) => {
		if (message?.what == null) {
			return;
		}
		sendResponse(null);
		const allTabs = await ensureAllTabsAvailability();
		try {
			switch (message.what) {
				// hot reload (from context-menus.js)
				case "saved":
				case "focused":
				case "startup":
				case "installed":
				case "activate":
				case "highlighted":
				case "focuschanged":
					sf_afterSet(message.what, message.tabs);
					break;
				case "warning":
					showToast(message.message, false, true);
					if (message.action === "make-bold") {
						makeDuplicatesBold(message.url);
					}
					break;
				case "error":
					showToast(message.message, false);
					break;
				case ACTION_ADD:
					createImportModal();
					break;
				case CXM_OPEN_OTHER_ORG:
				case CMD_OPEN_OTHER_ORG:
					showModalOpenOtherOrg({
						label: message.linkTabLabel,
						url: message.linkTabUrl ?? message.pageTabUrl ??
							message.url,
						org: message.org,
					});
					break;
				case CXM_MOVE_FIRST:
					await performActionOnTabs(ACTION_MOVE, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					}, { moveBefore: true, fullMovement: true });
					break;
				case CXM_MOVE_LEFT:
					await performActionOnTabs(ACTION_MOVE, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					}, { moveBefore: true, fullMovement: false });
					break;
				case CXM_MOVE_RIGHT:
					await performActionOnTabs(ACTION_MOVE, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					}, { moveBefore: false, fullMovement: false });
					break;
				case CXM_MOVE_LAST:
					await performActionOnTabs(ACTION_MOVE, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					}, { moveBefore: false, fullMovement: true });
					break;
				case CXM_REMOVE_TAB:
					await performActionOnTabs(ACTION_REMOVE_THIS, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					});
					break;
				case CXM_REMOVE_OTHER_TABS:
					await performActionOnTabs(ACTION_REMOVE_OTHER, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					});
					break;
				case CXM_REMOVE_LEFT_TABS:
					await performActionOnTabs(ACTION_REMOVE_OTHER, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					}, { removeBefore: true });
					break;
				case CXM_REMOVE_RIGHT_TABS:
					await performActionOnTabs(ACTION_REMOVE_OTHER, {
						label: message.label,
						url: message.tabUrl,
						org: message.org,
					}, { removeBefore: false });
					break;
				case CXM_REMOVE_PIN_TABS:
				case CXM_REMOVE_UNPIN_TABS:
				case CXM_EMPTY_GENERIC_TABS:
				case CXM_EMPTY_TABS:
				case CXM_EMPTY_VISIBLE_TABS:
				case CXM_RESET_DEFAULT_TABS:
					await performActionOnTabs(message.what);
					break;
				case CXM_PAGE_SAVE_TAB:
				case CMD_SAVE_AS_TAB:
					pageActionTab(true);
					break;
				case CXM_PAGE_REMOVE_TAB:
				case CMD_REMOVE_TAB:
					pageActionTab(false);
					break;
				case CXM_UPDATE_ORG:
				case CMD_TOGGLE_ORG:
					await performActionOnTabs(ACTION_TOGGLE_ORG, {
						label: message.label,
						url: message.tabUrl ?? message.url,
						org: message.org,
					});
					break;
				case CXM_UPDATE_TAB:
				case CMD_UPDATE_TAB:
					showModalUpdateTab({
						label: message.label,
						url: message.tabUrl ?? message.url,
						org: message.org,
					});
					break;
				case CXM_SORT_LABEL:
					await performActionOnTabs(ACTION_SORT, undefined, {
						sortBy: "label",
						sortAsc: allTabs.isSortedBy !== "label" ||
							!allTabs.isSortedAsc,
					});
					break;
				case CXM_SORT_URL:
					await performActionOnTabs(ACTION_SORT, undefined, {
						sortBy: "url",
						sortAsc: allTabs.isSortedBy !== "url" ||
							!allTabs.isSortedAsc,
					});
					break;
				case CXM_SORT_ORG:
					await performActionOnTabs(ACTION_SORT, undefined, {
						sortBy: "org",
						sortAsc: allTabs.isSortedBy !== "org" ||
							!allTabs.isSortedAsc,
					});
					break;
				case CXM_SORT_CLICK_COUNT:
					await performActionOnTabs(ACTION_SORT, undefined, {
						sortBy: "click-count",
						sortAsc: allTabs.isSortedBy === "click-count" &&
							!allTabs.isSortedAsc,
					});
					break;
				case CXM_SORT_CLICK_DATE:
					await performActionOnTabs(ACTION_SORT, undefined, {
						sortBy: "click-date",
						sortAsc: allTabs.isSortedBy === "click-date" &&
							!allTabs.isSortedAsc,
					});
					break;
				case CXM_TMP_HIDE_ORG:
				case CXM_TMP_HIDE_NON_ORG:
					await performActionOnTabs(
						ACTION_TMP_HIDE,
						undefined,
						message.what,
					);
					break;
				case CXM_PIN_TAB:
				case CXM_UNPIN_TAB:
					await performActionOnTabs(
						message.what,
						{
							label: message.label,
							url: message.tabUrl ?? message.url,
							org: message.org,
						},
					);
					break;
				case WHAT_UPDATE_EXTENSION:
					promptUpdateExtension(message);
					break;
				case WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP:
					if (message.ok) {
						showToast(
							"req_downloads_open_popup",
							true,
							true,
						);
					} else {
						showToast(
							"error_req_downloads",
							false,
							false,
						);
					}
					break;
				case WHAT_EXPORT:
					launchDownload(message);
					break;
				default:
					if (message.what != "theme") {
						showToast(
							[
								"error_unknown_message",
								message.what,
							],
							false,
							true,
						);
					}
					break;
			}
		} catch (error) {
			showToast(error.message, false);
		}
	});
}

/**
 * Listens for "order" messages posted from the window to reorder tabs accordingly.
 * Ignores messages not originating from the current window context.
 */
function listenToReorderedTabs() {
	addEventListener("message", (e) => {
		if (e.source.location != globalThis.location) {
			return;
		}
		const what = e.data.what;
		if (what === "order") {
			reorderTabs();
		}
	});
}

/**
 * Checks user settings and inserts Simple Analytics script into the document
 * unless analytics collection is explicitly disabled.
 * Modifies Content-Security-Policy meta tag to allow the analytics domains.
 * https://github.com/simpleanalytics
 *
 * @returns {Promise<void>} Resolves once analytics script is injected or skipped.
 */
async function checkInsertAnalytics() {
	const prevent_analytics = await getSettings(PREVENT_ANALYTICS);
	const isNewUser = prevent_analytics?.date == null;
	if (
		prevent_analytics != null &&
		(
			prevent_analytics.enabled === true || // the user does not want to send analytics call
			(
				!isNewUser &&
				Math.floor(
						(Date.now() - new Date(prevent_analytics.date)) /
							(1000 * 60 * 60 * 24),
					) <= 0 // the date difference is less than a day
			)
		)
	) {
		return;
	}
	{
		// set last date saved as today (no need to wait for promise fullfillment)
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);
		sendExtensionMessage({
			what: "set",
			key: SETTINGS_KEY,
			set: [{
				id: PREVENT_ANALYTICS,
				date: today.toJSON(),
			}],
		});
	}
	const whereToAppend = document.head || document.documentElement;
	const cspMeta = document.querySelector(
		'meta[http-equiv="Content-Security-Policy"]',
	);
	if (cspMeta) {
		const currentCSP = cspMeta.getAttribute("content");
		cspMeta.setAttribute(
			"content",
			currentCSP +
				" https://queue.simpleanalyticscdn.com https://simpleanalyticscdn.com",
		);
	} else {
		const meta = document.createElement("meta");
		meta.setAttribute("http-equiv", "Content-Security-Policy");
		meta.setAttribute(
			"content",
			"default-src 'self'; img-src 'self' https://queue.simpleanalyticscdn.com;",
		);
		whereToAppend.appendChild(meta);
	}
	const img = document.createElement("img");
	img.src =
		`https://queue.simpleanalyticscdn.com/noscript.gif?hostname=extension.again.whysalesforce&path=%2F${EXTENSION_VERSION}${
			isNewUser ? "/new-user" : ""
		}`;
	img.alt = "";
	img.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
	whereToAppend.appendChild(img);
}

/**
 * Main bootstrap function that initializes the extension:
 * - Loads all tabs asynchronously.
 * - Injects Lightning navigation script if needed.
 * - Sets up message listeners.
 * - Sets up reordered tab listener.
 * - Loads Salesforce setup tabs with delay.
 * - Inserts analytics script.
 */
function main() {
	ensureAllTabsAvailability();
	checkAddLightningNavigation();
	listenToBackgroundPage();
	listenToReorderedTabs();
	delayLoadSetupTabs();
	checkInsertAnalytics();
}

// queries the currently active tab of the current active window
// this prevents showing the tabs when not in a setup page (like Sales or Service Console)
if (
	href.includes(SETUP_LIGHTNING) && !globalThis[`hasLoaded${EXTENSION_NAME}`]
) {
	globalThis[`hasLoaded${EXTENSION_NAME}`] = true;
	main();
}
