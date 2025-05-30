"use strict";
import {
	EXTENSION_LABEL,
	HTTPS,
	LIGHTNING_FORCE_COM,
	SETUP_LIGHTNING,
} from "/constants.js";
import { pageActionTab, showFavouriteButton } from "./favourite-manager.js";
import { setupDrag } from "/dragHandler.js";
import {
	generateOpenOtherOrgModal,
	generateRowTemplate,
	generateSldsToastMessage,
	MODAL_ID,
} from "./generator.js";
import { SALESFORCE_URL_PATTERN } from "../constants.js";
import Tab from "/tab.js";
import TabContainer from "/tabContainer.js";

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
		throw new Error("allTabs was not yet initialized");
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
{
	const script = document.createElement("script");
	script.src = chrome.runtime.getURL("salesforce/lightning-navigation.js");
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
function sf_afterSet(what = null, tabs = null) {
	if (setupTabUl == null) {
		return;
	}
	if (what == null || what === "saved") {
		showToast(`"${EXTENSION_LABEL}" tabs saved.`);
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
export function showToast(message, isSuccess = true, isWarning = false) {
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
	const toastElement = generateSldsToastMessage(
		message,
		isSuccess,
		isWarning,
	);
	hanger.appendChild(toastElement);
	setTimeout(() => {
		hanger.removeChild(document.getElementById(toastElement.id));
	}, calculateReadingTime(message));
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
		console.error("Why Salesforce - failed to find setup tab.");
		return setTimeout(delayLoadSetupTabs(), 5000);
	}
	setupTabUl = document.querySelector("ul.pinnedItems.slds-grid") ??
		document.getElementsByClassName("pinnedItems slds-grid")?.[0];
	if (setupTabUl == null) {
		return setTimeout(() => delayLoadSetupTabs(count + 1), 500);
	}
	// move setupTabUl after ObjectManager
	setupTabUl.parentElement.insertAdjacentElement("beforeend", setupTabUl);
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
				// if standard tab, uses span; otherwise if org tab, uses b
				const span = a.querySelector("span");
				const b = a.querySelector("b");
				if (span == null && b == null) {
					return null;
				}
				const isOrgTab = span == null && b != null;
				const labelFrom = !isOrgTab ? span : b;
				const label = labelFrom.innerText ?? null;
				const aHref = a.href ?? null;
				if (label == null || aHref == null) {
					return null;
				}
				try {
					if (!isOrgTab) {
						return Tab.create(label, aHref);
					}
					const org = b.dataset.org;
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
		return showToast("Close the other modal first!", false);
	}
	if (Tab.containsSalesforceId(url)) {
		showToast(
			"This page could not exist in another Org, because it contains an Id!",
			false,
			true,
		);
	}
	allTabs = await ensureAllTabsAvailability();
	const { modalParent, saveButton, closeButton, inputContainer } =
		generateOpenOtherOrgModal(
			url, // if the url is "", we may still open the link in another Org without any issue
			label ??
				allTabs.getTabsByData({ url })[0]?.label ??
				"Where to?",
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
	saveButton.addEventListener("click", (e) => {
		e.preventDefault();
		const inputVal = inputContainer.value;
		if (inputVal == null || inputVal === "") {
			return showToast("Insert another org link.", false, true);
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
			return showToast(`Please insert a valid Org!\n${newTarget}`, false);
		}
		if (newTarget === Tab.extractOrgName(getCurrentHref())) {
			return showToast(
				"The inserted Org is the current one!\nPlease insert another Org.",
				false,
			);
		}
		const targetUrl = new URL(
			`${HTTPS}${newTarget}${LIGHTNING_FORCE_COM}${
				!url.startsWith("/") ? SETUP_LIGHTNING : ""
			}${url}`,
		);
		if (confirm(`Are you sure you want to open\n${targetUrl}?`)) {
			closeButton.click();
			open(targetUrl, "_blank");
		}
	});
}

/**
 * Performs a specified action on a given tab, such as moving, removing, or adding it, with additional options.
 * - This function ensures all tabs are available before performing the action.
 * - It handles various actions including moving, removing, adding, and clearing tabs, with the option to filter by organization.
 * - After the action is performed, it triggers the `sf_afterSet` function to finalize the process.
 * - If an error occurs during the action, it logs a warning and displays a toast with the error message.
 *
 * @param {string} action - The action to perform on the tab. Possible values: "move", "remove-this", "remove-other", "add", "remove-no-org-tabs", "remove-all".
 * @param {Tab} tab - The tab on which the action should be performed.
 * @param {Object} options - Options that influence the behavior of the action (e.g., filters or specific conditions).
 */
export async function performActionOnTabs(action, tab, options) {
	try {
		allTabs = await ensureAllTabsAvailability();
		switch (action) {
			case "move":
				await allTabs.moveTab(tab, options);
				break;
			case "remove-this":
				await allTabs.remove(tab, options);
				break;
			case "remove-other":
				await allTabs.removeOtherTabs(tab, options);
				break;
			case "add":
				await allTabs.addTab(tab);
				break;
			case "remove-no-org-tabs":
				await allTabs.replaceTabs();
				break;
			case "remove-all":
				await allTabs.replaceTabs([], { removeOrgTabs: true });
				break;
			default:
				return console.error("Did not match any action", action);
		}
		sf_afterSet();
	} catch (error) {
		console.warn({ action, tab, options });
		showToast(error.message, false);
	}
}

// listen from saves from the action / background page
chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
	if (message == null || message.what == null) {
		return;
	}
	sendResponse(null);
	allTabs = await ensureAllTabsAvailability();
	switch (message.what) {
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
			// context-menus
		case "open-other-org": {
			const label = message.linkTabLabel;
			const url = message.linkTabUrl ?? message.pageTabUrl;
			showModalOpenOtherOrg({ label, url });
			break;
		}
		case "move-first":
			await performActionOnTabs("move", {
				label: message.label,
				url: message.tabUrl,
			}, { moveBefore: true, fullMovement: true });
			break;
		case "move-left":
			await performActionOnTabs("move", {
				label: message.label,
				url: message.tabUrl,
			}, { moveBefore: true, fullMovement: false });
			break;
		case "move-right":
			await performActionOnTabs("move", {
				label: message.label,
				url: message.tabUrl,
			}, { moveBefore: false, fullMovement: false });
			break;
		case "move-last":
			await performActionOnTabs("move", {
				label: message.label,
				url: message.tabUrl,
			}, { moveBefore: false, fullMovement: true });
			break;
		case "remove-tab":
			await performActionOnTabs("remove-this", {
				label: message.label,
				url: message.tabUrl,
			});
			break;
		case "remove-other-tabs":
			await performActionOnTabs("remove-other", {
				label: message.label,
				url: message.tabUrl,
			});
			break;
		case "remove-left-tabs":
			await performActionOnTabs("remove-other", {
				label: message.label,
				url: message.tabUrl,
			}, { removeBefore: true });
			break;
		case "remove-right-tabs":
			await performActionOnTabs("remove-other", {
				label: message.label,
				url: message.tabUrl,
			}, { removeBefore: false });
			break;
		case "empty-no-org-tabs":
			await performActionOnTabs("remove-no-org-tabs");
			break;
		case "empty-tabs":
			await performActionOnTabs("remove-all");
			break;
		case "page-save-tab":
			pageActionTab(true);
			break;
		case "page-remove-tab":
			pageActionTab(false);
			break;
			/*
		case "update-org":

			break;
        */
		default:
			break;
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
