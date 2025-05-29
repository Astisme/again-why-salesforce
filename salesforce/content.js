"use strict";
import {
	BROWSER,
	CMD_OPEN_OTHER_ORG,
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	CMD_TOGGLE_ORG,
	CMD_UPDATE_TAB,
	CXM_EMPTY_NO_ORG_TABS,
	CXM_EMPTY_TABS,
	CXM_MOVE_FIRST,
	CXM_MOVE_LAST,
	CXM_MOVE_LEFT,
	CXM_MOVE_RIGHT,
	CXM_OPEN_OTHER_ORG,
	CXM_PAGE_REMOVE_TAB,
	CXM_PAGE_SAVE_TAB,
	CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_RIGHT_TABS,
	CXM_REMOVE_TAB,
	CXM_UPDATE_ORG,
	CXM_UPDATE_TAB,
	getSettings,
	HTTPS,
	LIGHTNING_FORCE_COM,
	LINK_NEW_BROWSER,
	SALESFORCE_URL_PATTERN,
	SETUP_LIGHTNING,
	TAB_ON_LEFT,
	USE_LIGHTNING_NAVIGATION,
	WHAT_UPDATE_EXTENSION,
} from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";
import Tab from "/tab.js";
import TabContainer from "/tabContainer.js";
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

let allTabs;
async function getAllTabs_async() {
	if (allTabs == null) {
		allTabs = await TabContainer.create();
	} else await allTabs;
	return allTabs;
}
getAllTabs_async();
export function getAllTabs() {
	if (allTabs == null || allTabs instanceof Promise) {
		throw new Error(["allTabs", "error_not_initilized"]);
	}
	return allTabs;
}
export async function ensureAllTabsAvailability() {
	try {
		return getAllTabs();
	} catch (_) {
		return await getAllTabs_async();
	}
}

/**
 * The main UL on Salesforce Setup
 */
let setupTabUl;
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
export function getCurrentHref() {
	return href;
}

let wasOnSavedTab;
export function getWasOnSavedTab() {
	return wasOnSavedTab;
}

let isCurrentlyOnSavedTab;
export function getIsCurrentlyOnSavedTab() {
	return isCurrentlyOnSavedTab;
}

/**
 * Wheter the href has been updated right now
 */
let fromHrefUpdate = false;

// add lightning-navigation to the page in order to use it
async function checkAddLightningNavigation() {
	const settings = await getSettings([
		LINK_NEW_BROWSER,
		USE_LIGHTNING_NAVIGATION,
	]);
	if (
		settings != null &&
		settings.some((setting) => setting.enabled)
	) {
		return;
	}
	const script = document.createElement("script");
	script.src = BROWSER.runtime.getURL("salesforce/lightning-navigation.js");
	(document.head || document.documentElement).appendChild(script);
}
checkAddLightningNavigation();

/**
 * Handles post-save actions after setting Salesforce tabs.
 * - Displays a toast message indicating that the Salesforce tabs have been saved.
 * - Reloads the tabs by calling `reloadTabs` with the provided tabs.
 *
 * @param {string|null} [what=null] - A flag indicating the action that triggered this function. If null or "saved", a toast message is shown.
 * @param {Array<Tab>|null} [tabs=null] - The tabs to reload. If provided, they are passed to `reloadTabs`.
 */
function sf_afterSet(what = null, tabs = null) {
	if (setupTabUl == null) {
		return;
	}
	if (what == null || what === "saved") {
		showToast(["extension_label", "tabs_saved"]);
	}
	reloadTabs(tabs);
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
	/**
	 * Calculates the estimated time (in milliseconds) it takes to read a given message.
	 *
	 * @param {string} message - The message to calculate the reading time for.
	 * @returns {number} - The estimated reading time in milliseconds.
	 */
	function calculateReadingTime(message) {
		const words = message.split(/\s+/).filter((word) => word.length > 0);
		const wordsPerMinute = 200; // Average reading speed
		const readingTimeMinutes = words.length / wordsPerMinute;
		const readingTimeSeconds = Math.ceil(readingTimeMinutes * 60);
		return (readingTimeSeconds + 2) * 1000;
	}
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
		hanger.removeChild(document.getElementById(toastElement.id));
	}, calculateReadingTime(toastElement.textContent));
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
	let orgName = null;
	allTabs = await ensureAllTabsAvailability();
	if (tabs == null) {
		await allTabs.getSavedTabs(true);
	} else {
		orgName = Tab.extractOrgName(href);
		await allTabs.replaceTabs(tabs, {
			resetTabs: true,
			removeOrgTabs: true,
			sync: false,
			keepTabsNotThisOrg: orgName,
		});
	}
	if (allTabs.length > 0) {
		if (orgName == null) {
			orgName = Tab.extractOrgName(href);
		}
		allTabs.forEach((row) => {
			// TODO add option to hide or show not-this-org tabs
			// hide not-this-org tabs
			setupTabUl.appendChild(
				generateRowTemplate(
					row,
					!(row.org == null || row.org === orgName),
				),
			);
		});
	}
	isOnSavedTab();
	checkKeepTabsOnLeft();
	await showFavouriteButton();
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
export async function isOnSavedTab(isFromHrefUpdate = false, callback) {
	if (fromHrefUpdate && !isFromHrefUpdate) {
		fromHrefUpdate = false;
		return;
	}
	fromHrefUpdate = isFromHrefUpdate;
	const url = Tab.minifyURL(href);
	wasOnSavedTab = isCurrentlyOnSavedTab;
	allTabs = await ensureAllTabsAvailability();
	isCurrentlyOnSavedTab = allTabs.exists({ url });
	if (isFromHrefUpdate) {
		callback(isCurrentlyOnSavedTab);
	}
}

/**
 * Handles the update of the current URL, reloading tabs if necessary.
 */
function onHrefUpdate() {
	/**
	 * If the user has moved to or from a saved tab, they'll be reloaded to update the highlighted one.
	 * otherwise, the favourite button is shown
	 */
	async function afterHrefUpdate(isCurrentlyOnSavedTab) {
		if (isCurrentlyOnSavedTab || wasOnSavedTab) reloadTabs();
		else await showFavouriteButton();
	}
	const newRef = globalThis.location.href;
	if (newRef === href) {
		return;
	}
	href = newRef;
	isOnSavedTab(true, afterHrefUpdate);
}

async function checkKeepTabsOnLeft() {
	const keep_tabs_on_left = await getSettings(TAB_ON_LEFT);
	if (keep_tabs_on_left == null || !keep_tabs_on_left.enabled) {
		// move setupTabUl after ObjectManager
		setupTabUl.parentElement.insertAdjacentElement("beforeend", setupTabUl);
	} else {
		// move setupTabUl before Home
		setupTabUl.parentElement.insertAdjacentElement(
			"afterbegin",
			setupTabUl,
		);
	}
}

/**
 * Attempts to find and set up the tab elements, retrying up to 5 times if the necessary elements are not found.
 * - If the setup tab elements are not found within 5 attempts, it logs an error and retries after 5 seconds.
 * - Once found, it initializes the DOM elements and applies various behaviors, such as observing URL changes, adding scroll behavior, and enabling mouse wheel scrolling.
 * - It also sets up event listeners for drag behavior and reloads the tabs.
 *
 * @param {number} [count=0] - The number of retry attempts made so far. Defaults to 0.
 */
async function delayLoadSetupTabs(count = 0) {
	if (count > 5) {
		const translator = await ensureTranslatorAvailability();
		const label = await translator.translate("extension_label");
		const fail = await translator.translate("error_no_setup_tab");
		console.error(`${label} - ${fail}`);
		return setTimeout(delayLoadSetupTabs, 5000);
	}
	setupTabUl = document.querySelector("ul.pinnedItems.slds-grid") ??
		document.getElementsByClassName("pinnedItems slds-grid")?.[0];
	if (setupTabUl == null) {
		return setTimeout(() => delayLoadSetupTabs(count + 1), 500);
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
	while (setupTabUl.childElementCount > 0) {
		setupTabUl.removeChild(setupTabUl.lastChild);
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
			.slice(3) // remove Salesforce's tabs
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
		allTabs = await ensureAllTabsAvailability();
		await allTabs.replaceTabs(tabs, {
			resetTabs: true,
			removeOrgTabs: true,
			//keepTabsNotThisOrg: Tab.extractOrgName(href),
		});
		sf_afterSet();
	} catch (error) {
		showToast(error.message, false);
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
	/**
	 * For each duplicatetabs, toggles the slds-theme--warning class
	 */
	function toggleWarning() {
		duplicatetabs.forEach((tab) =>
			tab.classList.toggle("slds-theme--warning")
		);
	}
	toggleWarning();
	setTimeout(
		() => toggleWarning(),
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
 * @returns {Promise<void>} A promise that resolves once the modal has been displayed and the user interacts with it.
 */
async function showModalOpenOtherOrg({ label = null, url = null } = {}) {
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", false);
	}
	allTabs = await ensureAllTabsAvailability();
	if (label == null && url == null) {
		const minyURL = Tab.minifyURL(getCurrentHref());
		try {
			const matchingTab = allTabs.getSingleTabByData({ url: minyURL });
			label = matchingTab.label;
			url = matchingTab.url;
		} catch (_) {
			url = minyURL;
		}
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
	} = await generateOpenOtherOrgModal(
		url, // if the url is "", we may still open the link in another Org without any issue
		label ??
			allTabs.getTabsByData({ url })[0]?.label ??
			whereTo,
	);
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
	saveButton.addEventListener("click", async (e) => {
		e.preventDefault();
		const linkTarget = getSelectedRadioButtonValue();
		const inputVal = inputContainer.value;
		if (inputVal == null || inputVal === "") {
			return showToast(["insert_another", "org_link"], false, true);
		}
		let alreadyExtracted = false;
		const newTarget = Tab.extractOrgName(inputVal);
		if (alreadyExtracted) return; // could be called more than once
		alreadyExtracted = true;
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
				!url.startsWith("/") ? SETUP_LIGHTNING : ""
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
const ACTION_REMOVE_NO_ORG_TABS = "remove-no-org-tabs";
const ACTION_REMOVE_ALL = "remove-all";
const ACTION_TOGGLE_ORG = "toggle-org";

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
export async function performActionOnTabs(action, tab = null, options = null) {
	try {
		allTabs = await ensureAllTabsAvailability();
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
				if (!await allTabs.addTab(tab)) {
					throw new Error("error_adding_tab");
				}
				break;
			case ACTION_REMOVE_NO_ORG_TABS:
				if (!await allTabs.replaceTabs()) {
					throw new Error("error_removing_generic_tabs");
				}
				break;
			case ACTION_REMOVE_ALL:
				if (!await allTabs.replaceTabs([], { removeOrgTabs: true })) {
					throw new Error("error_removing_all_tabs");
				}
				break;
			case ACTION_TOGGLE_ORG:
				await toggleOrg(tab);
				break;
			default: {
				const translator = await ensureTranslatorAvailability();
				const noMatch = await translator.translate("no_match");
				return console.error(noMatch, action);
			}
		}
		sf_afterSet();
	} catch (error) {
		console.warn({ action, tab, options });
		showToast(error.message, false);
	}
}

/**
 * Retrieves a Tab from the saved ones and either removes the Org value (if it has one) OR sets it as the current Org.
 * @param {Object} [param0={}] - An Object containing the data used to identify a Tab
 * @param {string} param0.label - The label of the Tab to find
 * @param {string} param0.url - The Url of the Tab to find
 * @throws when it fails to sync the Tabs.
 */
async function toggleOrg({ label, url } = {}) {
	if (label == null && url == null) {
		url = Tab.minifyURL(getCurrentHref());
	}
	allTabs = await ensureAllTabsAvailability();
	const matchingTab = allTabs.getSingleTabByData({ label, url });
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
async function showModalUpdateTab(tab = { label: null, url: null, org: null }) {
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", false);
	}
	if (tab.label == null && tab.url == null && tab.org == null) {
		tab = allTabs.getSingleTabByData({
			url: Tab.minifyURL(getCurrentHref()),
		});
	}
	allTabs = await ensureAllTabsAvailability();
	const matchingTab = allTabs.getSingleTabByData(tab);
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
		matchingTab.update({
			label: labelContainer.value !== ""
				? labelContainer.value
				: matchingTab.label,
			url: urlContainer.value !== ""
				? urlContainer.value
				: matchingTab.url,
			org: orgContainer.value,
		});
		if (!await allTabs.syncTabs()) {
			throw new Error("error_failed_sync");
		}
		sf_afterSet();
		closeButton.click();
	});
}

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

// listen from saves from the action / background page
BROWSER.runtime.onMessage.addListener(async (message, _, sendResponse) => {
	if (message == null || message.what == null) {
		return;
	}
	sendResponse(null);
	allTabs = await ensureAllTabsAvailability();
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
			case "add":
				createImportModal();
				break;
			case CXM_OPEN_OTHER_ORG:
			case CMD_OPEN_OTHER_ORG: {
				const label = message.linkTabLabel;
				const url = message.linkTabUrl ?? message.pageTabUrl;
				showModalOpenOtherOrg({ label, url });
				break;
			}
			case CXM_MOVE_FIRST:
				await performActionOnTabs(ACTION_MOVE, {
					label: message.label,
					url: message.tabUrl,
				}, { moveBefore: true, fullMovement: true });
				break;
			case CXM_MOVE_LEFT:
				await performActionOnTabs(ACTION_MOVE, {
					label: message.label,
					url: message.tabUrl,
				}, { moveBefore: true, fullMovement: false });
				break;
			case CXM_MOVE_RIGHT:
				await performActionOnTabs(ACTION_MOVE, {
					label: message.label,
					url: message.tabUrl,
				}, { moveBefore: false, fullMovement: false });
				break;
			case CXM_MOVE_LAST:
				await performActionOnTabs(ACTION_MOVE, {
					label: message.label,
					url: message.tabUrl,
				}, { moveBefore: false, fullMovement: true });
				break;
			case CXM_REMOVE_TAB:
				await performActionOnTabs(ACTION_REMOVE_THIS, {
					label: message.label,
					url: message.tabUrl,
				});
				break;
			case CXM_REMOVE_OTHER_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, {
					label: message.label,
					url: message.tabUrl,
				});
				break;
			case CXM_REMOVE_LEFT_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, {
					label: message.label,
					url: message.tabUrl,
				}, { removeBefore: true });
				break;
			case CXM_REMOVE_RIGHT_TABS:
				await performActionOnTabs(ACTION_REMOVE_OTHER, {
					label: message.label,
					url: message.tabUrl,
				}, { removeBefore: false });
				break;
			case CXM_EMPTY_NO_ORG_TABS:
				await performActionOnTabs(ACTION_REMOVE_NO_ORG_TABS);
				break;
			case CXM_EMPTY_TABS:
				await performActionOnTabs(ACTION_REMOVE_ALL);
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
					url: message.tabUrl,
				});
				break;
			case CXM_UPDATE_TAB:
			case CMD_UPDATE_TAB:
				showModalUpdateTab({
					label: message.label,
					url: message.tabUrl,
				});
				break;
			case WHAT_UPDATE_EXTENSION:
				promptUpdateExtension(message);
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

// listen to possible updates from other modules
addEventListener("message", (e) => {
	if (e.source != window) {
		return;
	}
	const what = e.data.what;
	if (what === "order") {
		reorderTabs();
	}
});

// queries the currently active tab of the current active window
// this prevents showing the tabs when not in a setup page (like Sales or Service Console)
if (href.includes(SETUP_LIGHTNING)) {
	delayLoadSetupTabs();
}
