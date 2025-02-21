"use strict";
import { Tab } from "/tab.js";
import { TabContainer } from "/tabContainer.js";
export const allTabs = await TabContainer.create();
import { 
    SETUP_LIGHTNING,
    HTTPS,
    LIGHTNING_FORCE_COM,
} from "/constants.js";
import {
    showFavouriteButton,
} from "./favourite-manager.js";
import {
    setupDrag,
} from "/dragHandler.js";
import {
    generateRowTemplate,
    generateSldsToastMessage,
    generateOpenOtherOrgModal,
} from "./generator.js";

let setupTabUl; // This is a UL on Salesforce Setup
let objectManagerLi; // This is the standard last LI of setupTabUl
let modalHanger; // This is where modals should be inserted in Salesforce Setup
let href = globalThis.location.href;

let _minifiedURL;
let _expandedURL;

let wasOnSavedTab;
let isCurrentlyOnSavedTab;
let fromHrefUpdate;

// add lightning-navigation to the page in order to use it
{
	const script = document.createElement("script");
	script.src = chrome.runtime.getURL("salesforce/lightning-navigation.js");
	(document.head || document.documentElement).appendChild(script);
}

export function getIsCurrentlyOnSavedTab(){
    return isCurrentlyOnSavedTab;
}

export function getLastMinifiedUrl(){
    return _minifiedURL;
}
export function setLastMinifiedUrl(url){
    _minifiedURL = url;
}
export function setLastExpandedUrl(url){
    _expandedURL = url;
}
export function getWasOnSavedTab(){
    return wasOnSavedTab;
}
export function getCurrentHref(){
    return href;
}

/**
 * Sends a message to the background script with the current URL.
 *
 * @param {Object} message - The message object to send.
 * @param {Function} callback - The callback function to execute after sending the message.
 */
export function sf_sendMessage(message, callback) {
	return chrome.runtime.sendMessage(
		{ message, url: location.href },
		callback,
	);
}

/**
 * Reloads the saved tabs and shows a success toast message when storage is set.
 */
function sf_afterSet(what = null) {
	reloadTabs();
	what == null && showToast(`"Again, Why Salesforce" tabs saved.`);
}

/**
 * Minifies a URL by the domain and removing Salesforce-specific parts.
 *
 * @param {string} url - The URL to minify.
 * @returns {Promise} A promise containing the minified URL.
 *
 * These links would all collapse into "SetupOneHome/home".
 * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
 * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
 * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
 * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
 * /lightning/setup/SetupOneHome/home/
 * /lightning/setup/SetupOneHome/home
 * lightning/setup/SetupOneHome/home/
 * lightning/setup/SetupOneHome/home
 * /SetupOneHome/home/
 * /SetupOneHome/home
 * SetupOneHome/home/
 * SetupOneHome/home
 */
export async function sf_minifyURL(url = globalThis.location.href) {
	const miniURL = await sf_sendMessage({ what: "minify", url });
    _minifiedURL = miniURL;
    return miniURL;
}

/**
 * Extracts the Org name out of the url passed as input.
 *
 * @param {string} url - The URL from which the Org name has to be extracted
 */
export function sf_extractOrgName(url = location.href) {
	return sf_sendMessage({ what: "extract-org", url });
}

/**
 * Displays a toast message in the UI.
 *
 * @param {string} message - The message to display in the toast.
 * @param {boolean} [isSuccess=true] - Whether the toast message is a success (default is true).
 * @param {boolean} [isWarning=false] - Whether the toast message is a warning (default is false).
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
}

/**
 * Initializes and sets up the storage for the tabs with default data or from the stored data.
 *
 * @param {Array<Object>} items - The items retrieved from storage. If no data is found, the default tabs will be initialized.
 * @param {string} items.key - The key used to fetch the stored data.
 * @param {Array<Object>} items[key] - The array of tab data retrieved from storage or the default tabs.
 */
async function init() {
    console.log(allTabs,allTabs.length)
    if(allTabs.length === 0) // Default: when nothing is inserted, set the default tabs
        await allTabs.setDefaultTabs();

	if (allTabs.length > 0) {
		const orgName = await sf_extractOrgName();

        allTabs.forEach(async (row) => {
            // hide org-specific but not-this-org tabs
            if (row.org == null || row.org === orgName) { // TODO add option to hide or show org-specific but not-this-org tabs
                const element = await generateRowTemplate(row);
                setupTabUl.appendChild(element);
            }
        })
	}
	isOnSavedTab();
	showFavouriteButton();
}

/**
 * Determines if the current tab is a saved tab or not based on the URL.
 *
 * @param {boolean} [isFromHrefUpdate=false] - A flag to determine if the check is due to a URL update.
 * @returns {boolean} - True if the current tab is a saved tab, otherwise false.
 */
export async function isOnSavedTab(isFromHrefUpdate = false, callback) {
	if (fromHrefUpdate && !isFromHrefUpdate) {
		fromHrefUpdate = false;
		return;
	}
	fromHrefUpdate = isFromHrefUpdate;

	const loc = await sf_minifyURL(href)
    _minifiedURL = loc;

    wasOnSavedTab = isCurrentlyOnSavedTab;
    isCurrentlyOnSavedTab = allTabs.exists({url:loc});

    isFromHrefUpdate && callback(isCurrentlyOnSavedTab);
}

/**
 * Handles the update of the current URL, reloading tabs if necessary.
 */
function onHrefUpdate() {
    /**
     * If the user has moved to or from a saved tab, they'll be reloaded to update the highlighted one.
     * otherwise, the favourite button is shown
     */
    function afterHrefUpdate(isCurrentlyOnSavedTab) {
        if (isCurrentlyOnSavedTab || wasOnSavedTab) reloadTabs();
        else showFavouriteButton();
    }

	const newRef = globalThis.location.href;
	if (newRef === href) {
		return;
	}
	href = newRef;
	isOnSavedTab(true, afterHrefUpdate);
}

/**
 * Delays the loading of setup tabs until the relevant DOM elements are available.
 *
 * @param {number} [count=0] - A counter to limit the number of retry attempts.
 */
function delayLoadSetupTabs(count = 0) {
	if (count > 5) {
		console.error("Why Salesforce - failed to find setup tab.");
		return setTimeout(delayLoadSetupTabs(), 5000);
	}

	setupTabUl = document.getElementsByClassName("tabBarItems slds-grid")[0];
	if (setupTabUl == null || setupTabUl.lastElementChild == null) {
		return setTimeout(() => delayLoadSetupTabs(count + 1), 500);
	}
	objectManagerLi = setupTabUl.childNodes[2];

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

let firstRun = true;
/**
 * Reloads the tabs by clearing the current list and fetching the updated data from storage.
 */
async function reloadTabs() {
	// prevent creating duplicate tabs when refocusing on the setup window/tab
	// only needed after the first run of this function
	if (
		setupTabUl.childElementCount === 0 ||
		(!firstRun && setupTabUl.childElementCount <= 3 &&
			document.getElementsByClassName("tabBarItems slds-grid")[0]
					?.lastElementChild === objectManagerLi)
	) {
		return setTimeout(reloadTabs, 500);
	}
	firstRun = false;

	// remove the tabs that are already in the page
	while (setupTabUl.childElementCount > 3) { // hidden li + Home + Object Manager
		setupTabUl.removeChild(setupTabUl.lastChild);
	}
    init();
}

/**
 * Reorders the tabs based on their new order in the DOM and saves the updated list to storage.
 */
async function reorderTabs() {
	// Get the list of tabs
	const tabPromises = Array.from(setupTabUl.children)
		.slice(3)
		.map(async (tab) => {
			const label = tab.querySelector("a > span").innerText;
			const href = tab.querySelector("a").href;

			if (label && url) {
                try {
                    return await Tab.create(label, href);
                } catch (error) {
                    console.error(error);
                    return null;   
                }
			}
			return null; // Return null for invalid tabs
		});

    try {
        const tabs = await Promise.all(tabPromises).filter((tab) => tab != null);
        const orgName = await sf_extractOrgName();
        allTabs.replaceTabs(tabs, {resetTabs: true, keepTabsNotThisOrg: orgName});
    } catch (error) {
        console.error("Error processing tabs:", error);
        showToast(error.message, false);
    }
}

/**
 * Find tabs with the given URL and change their background-color
 */
function makeDuplicatesBold(miniURL) {
	const duplicatetabs = setupTabUl.querySelectorAll(`a[title="${miniURL}"]`);
	if (duplicatetabs == null) {
		return;
	}
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
 * Find the div to where to add a modal
 */
export function getModalHanger() {
    if(modalHanger != null)
        return modalHanger;
	modalHanger = document.querySelector("div.DESKTOP.uiContainerManager");
    return modalHanger;
}

/**
 * Shows a modal to ask the user into which org they want to open the given URL.
 *
 * @param {string} miniURL - the minified URL for which the user has engaged this action.
 * @param {string} tabTitle - the name of the URL for which the user has engaged this action. If not found, we try to find the name through the saved tabs; otherwise a default text is shown.
 */
async function showModalOpenOtherOrg({label = null, url = null} = {}) {
	if (document.getElementById(modalId) != null) {
		return showToast("Close the other modal first!", false);
	}

	const containsSfId = await sf_containsSalesforceId()
    if (containsSfId) {
        showToast(
            "This page could not exist in another Org, because it contains an Id!",
            false,
            true,
        );
    }

    const { modalParent, saveButton, closeButton, inputContainer } =
        generateOpenOtherOrgModal(
            url,
            label ??
                allTabs.getTabsByData({url})[0]?.label ??
                "Where to?",
        );
    modalHanger = getModalHanger();
    modalHanger.appendChild(modalParent);

    let lastInput = "";
    inputContainer.addEventListener("input", async (e) => {
        const target = e.target;
        const value = target.value;
        const delta = value.length - lastInput.length;

        if (delta > 2) {
            let newTarget = await sf_extractOrgName(value);
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
        const inputVal = inputContainer.value;
        if (inputVal == null || inputVal === "") {
            return showToast("Insert another org link.", false, true);
        }

        let alreadyExtracted = false;
        const newTarget = await sf_extractOrgName(inputVal)
        if (alreadyExtracted) return; // could be called more than once
        alreadyExtracted = true;
        if (
            !newTarget.match(
                /^[a-zA-Z0-9\-]+(--[a-zA-Z0-9]+\.sandbox)?(\.develop)?$/g,
            )
        ) {
            return showToast(`Please insert a valid Org!\n${newTarget}`, false);
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
 * Performs the specified action for the current page, adding or removing from the tab list.
 *
 * @param {boolean} [save=true] - whether the current page should be added or removed as tab
 */
function pageActionTab(save = true) {
	const favourite = getFavouriteImage(save ? starId : slashedStarId);
	if (!favourite.classList.contains("hidden")) favourite.click();
	else {
		const message = save
			? "Cannot save:\nThis page has already been saved!"
			: "Cannot remove:\nCannot remove a page that has not been saved before";
		showToast(message, true, true);
	}
}

/**
 *
 */
export async function performActionOnTabs(action, tab, options){
    try {
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

            default:
                return console.error("Did not match any action",action);
        }
        sf_afterSet();
    } catch (error) {
        showToast(error.message, false);
    }
}

// listen from saves from the action / background page
chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
	if (message == null || message.what == null) {
		return;
	}
	sendResponse(null);
	switch (message.what) {
		case "saved":
		case "focused":
			sf_afterSet(message.what);
			break;
		case "warning":
			showToast(message.message, false, true);
			if (message.action === "make-bold") {
				makeDuplicatesBold(message.url);
			}
			break;
        // context-menus
		case "open-other-org": {
			const label = message.linkTabLabel;
			const url = message.linkTabUrl ?? message.pageTabUrl;
			//const expURL = message.linkUrl ?? message.pageUrl
			showModalOpenOtherOrg({label, url});
			break;
		}
		case "move-first":
			await performActionOnTabs("move",{label:message.label, url:message.tabUrl}, {moveBefore:true, fullMovement:true});
			break;
		case "move-left":
			await performActionOnTabs("move",{label:message.label, url:message.tabUrl}, {moveBefore:true, fullMovement:false});
			break;
		case "move-right":
			await performActionOnTabs("move",{label:message.label, url:message.tabUrl}, {moveBefore:false, fullMovement:false});
			break;
		case "move-last":
			await performActionOnTabs("move",{label:message.label, url:message.tabUrl}, {moveBefore:false, fullMovement:true});
			break;
		case "remove-tab":
			await performActionOnTabs("remove-this",{label: message.label, url: message.tabUrl});
			break;
		case "remove-other-tabs":
            await performActionOnTabs("remove-other",{label: message.label, url: message.tabUrl});
			break;
		case "remove-left-tabs":
            await performActionOnTabs("remove-other",{label: message.label, url: message.tabUrl},{removeBefore: true});
			break;
		case "remove-right-tabs":
            await performActionOnTabs("remove-other",{label: message.label, url: message.tabUrl},{removeBefore: false});
			break;
		case "empty-no-org-tabs":
            await allTabs.replaceTabs();
			break;
		case "empty-tabs":
            allTabs.replaceTabs([],{removeOrgTabs: true});
			break;
		case "page-save-tab":
			pageActionTab(true);
			break;
		case "page-remove-tab":
			pageActionTab(false);
			break;

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
	//else if(what === "saved")
});

// queries the currently active tab of the current active window
// this prevents showing the tabs when not in a setup page (like Sales or Service Console)
if (href.includes(SETUP_LIGHTNING)) {
	delayLoadSetupTabs();
}
