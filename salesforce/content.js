"use strict";

let setupTabUl; // This is on Salesforce Setup
let objectManagerLi; // This is the standard last li of setupTabUl
let modalHanger; // This is where modals should be inserted in Salesforce Setup
let href = globalThis.location.href;
let _minifiedURL;
let _expandedURL;
const setupLightning = "/lightning/setup/";
/**
 * tabForCurrentTabs = {
 *      tabTitle: "string", // this is the label for the URL
 *      url: "string", // this is the URL in its minified version
 *      org: "string | undefined", // this is the Org name where this tab is active in
 * }
 */
const sf_currentTabs = [];

let wasOnSavedTab;
let isCurrentlyOnSavedTab;
let fromHrefUpdate;

{
	const script = document.createElement("script");
	script.src = chrome.runtime.getURL("salesforce/lightning-navigation.js");
	(document.head || document.documentElement).appendChild(script);
}

/**
 * Sends a message to the background script with the current URL.
 *
 * @param {Object} message - The message object to send.
 * @param {Function} callback - The callback function to execute after sending the message.
 */
function sf_sendMessage(message, callback) {
	return chrome.runtime.sendMessage(
		{ message, url: location.href },
		callback,
	);
}

/**
 * Retrieves saved tab data from storage.
 *
 * @param {Function} callback - The callback function to handle the retrieved data.
 */
function sf_getStorage(callback) {
	sf_sendMessage({ what: "get" }, callback);
}

/**
 * Reloads the saved tabs and shows a success toast message when storage is set.
 */
function sf_afterSet(what = null) {
	reloadTabs();
	what == null && showToast(`"Again, Why Salesforce" tabs saved.`);
}

/**
 * Saves the current tabs to storage.
 *
 * @param {Array} tabs - The array of tabs to save.
 */
function sf_setStorage(tabs) {
	tabs = tabs ?? sf_currentTabs;
	sf_sendMessage({ what: "set", tabs }, sf_afterSet);
}

/**
 * Overwrites the `sf_currentTabs` array with new tabs, with an option to reset the tabs (replacing all of them with the newTabs) and another one to remove non-org-specific tabs.
 *
 * @param {Array<Object> | Object} newTabsOrOptions - An array of new tab objects to be added to `sf_currentTabs` OR An object containing the parameters for key-based function calling.
 * @param {boolean} [resetTabs=true] - If `true`, resets `sf_currentTabs`.
 * @param {boolean} [removeOrgSpecificTabs=false] - If `true`, removes all Org specific tabs; otherwise, only non-org-specific tabs (tabs with `org == null`) are removed, retaining org-specific tabs.
 * @param {boolean} [setStorage=true] - If `true`, calls `sf_setStorage` to save the `sf_currentTabs` array.
 *
 * @example
 * // Remove all tabs
 * sf_overwriteCurrentTabs(null, true, true);
 * sf_overwriteCurrentTabs([], true, true);
 *
 * @example
 * // Remove all org-specific tabs
 * sf_overwriteCurrentTabs(null, false, true);
 * sf_overwriteCurrentTabs([], false, true);
 *
 * @example
 * // DEFAULT: Keep only org-specific tabs
 * sf_overwriteCurrentTabs();
 * sf_overwriteCurrentTabs(null);
 * sf_overwriteCurrentTabs([]);
 * sf_overwriteCurrentTabs(null, true);
 * sf_overwriteCurrentTabs([], true);
 * sf_overwriteCurrentTabs(null, true, false);
 * sf_overwriteCurrentTabs([], true, false);
 *
 * @example
 * // Remove all tabs and add new ones
 * sf_overwriteCurrentTabs([{ tabTitle: "a", url: "a", org: "OrgA" }], true, true);
 *
 * @example
 * // DEFAULT: Keep org-specific tabs and add new ones
 * sf_overwriteCurrentTabs([{ tabTitle: "a", url: "a", org: "OrgA" }, { tabTitle: "b", url: "b" }]);
 * sf_overwriteCurrentTabs([{ tabTitle: "a", url: "a", org: "OrgA" }, { tabTitle: "b", url: "b" }], true);
 * sf_overwriteCurrentTabs([{ tabTitle: "a", url: "a", org: "OrgA" }, { tabTitle: "b", url: "b" }], true, false);
 *
 * @example
 * // Keep all tabs and add new ones
 * sf_overwriteCurrentTabs([{ tabTitle: "a", url: "a", org: "OrgA" }], false);
 * sf_overwriteCurrentTabs([{ tabTitle: "a", url: "a", org: "OrgA" }], false, false);
 *
 * @example
 * // Remove org-specific tabs and add new ones
 * sf_overwriteCurrentTabs([{ tabTitle: "a", url: "a", org: "OrgA" }], false, true);
 */
function sf_overwriteCurrentTabs(
	newTabsOrOptions,
	resetTabs = true,
	removeOrgSpecificTabs = false,
	setStorage = true,
) {
	let newTabs;
	if (
		typeof newTabsOrOptions === "object" && !Array.isArray(newTabsOrOptions)
	) {
		const {
			newTabs: nt,
			resetTabs: rt = true,
			removeOrgSpecificTabs: ro = false,
			setStorage: ss = true,
		} = newTabsOrOptions;
		newTabs = nt;
		resetTabs = rt;
		removeOrgSpecificTabs = ro;
		setStorage = ss;
	} else {
		newTabs = newTabsOrOptions;
	}

	/**
	 * Filters the current tabs based on whether they are org-specific.
	 *
	 * @param {boolean} keepOrgTabs - If `true`, keeps org-specific tabs (tabs with `org != null`); otherwise, keeps non-org-specific tabs (tabs with `org == null`).
	 * @returns {Array<Object>} - The filtered array of tabs.
	 */
	function filterOrgSpecificTabs(isOrgTab = true) {
		return sf_currentTabs.filter((tab) =>
			(isOrgTab && tab.org != null) || (!isOrgTab && tab.org == null)
		);
	}

	if (resetTabs) {
		if (removeOrgSpecificTabs) {
			sf_currentTabs.length = 0;
		} else {
			// prevent accidental deletion of tabs that are not for "this" current Org
			const orgSpecificTabs = filterOrgSpecificTabs();
			sf_currentTabs.length = 0;
			sf_currentTabs.push(...orgSpecificTabs);
		}
	} else if (removeOrgSpecificTabs) {
		const non_orgSpecificTabs = filterOrgSpecificTabs(false);
		sf_currentTabs.length = 0;
		sf_currentTabs.push(...non_orgSpecificTabs);
	}

	function removeDuplicates(array) {
		const unique = new Map();
		array.forEach((item) => {
			const normalized = JSON.stringify(Object.entries(item).sort());
			unique.set(normalized, item);
		});
		return Array.from(unique.values());
	}

	// needed due to org-specific tabs (don't know why)
	const tabsNoDuplicates = removeDuplicates([
		...sf_currentTabs,
		...(newTabs ?? []),
	]);
	sf_currentTabs.length = 0;
	sf_currentTabs.push(...tabsNoDuplicates);
	setStorage && sf_setStorage();
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
function sf_minifyURL(url) {
	return sf_sendMessage({ what: "minify", url });
}

/**
 * Extracts the Org name out of the url passed as input.
 *
 * @param {string} url - The URL from which the Org name has to be extracted
 */
function sf_extractOrgName(url = location.href) {
	return sf_sendMessage({ what: "extract-org", url });
}
/**
 * Displays a toast message in the UI.
 *
 * @param {string} message - The message to display in the toast.
 * @param {boolean} [isSuccess=true] - Whether the toast message is a success (default is true).
 * @param {boolean} [isWarning=false] - Whether the toast message is a warning (default is false).
 */
function showToast(message, isSuccess = true, isWarning = false) {
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
	const toastElement = _generateSldsToastMessage(
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
function init(items) {
	/**
	 * Initializes the default tabs and saves them to storage.
	 *
	 * @returns {Array} - The list of initialized tabs.
	 */
	function getDefaultTabs() {
		return [
			{ tabTitle: "⚡", url: "/lightning" },
			{ tabTitle: "Flows", url: "/lightning/app/standard__FlowsApp" },
			{ tabTitle: "Users", url: "ManageUsers/home" },
		];
	}

	//call getDefaultTabs if we did not find data inside storage
	const rowObj = (items == null)
		? getDefaultTabs()
		: items[items.key];

	if (rowObj.length > 0) {
		sf_extractOrgName()
			.then((orgName) =>
				rowObj.forEach((row) => {
					// hide org-specific but not-this-org tabs
					if (row.org == null || row.org === orgName) { // TODO add option to hide or show org-specific but not-this-org tabs
						_generateRowTemplate(row)
							.then((r) => setupTabUl.appendChild(r));
					}
				})
			);
		sf_overwriteCurrentTabs({ newTabs: rowObj, setStorage: false });
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
function isOnSavedTab(isFromHrefUpdate = false, callback) {
	if (fromHrefUpdate && !isFromHrefUpdate) {
		fromHrefUpdate = false;
		return;
	}
	fromHrefUpdate = isFromHrefUpdate;

	sf_minifyURL(href)
		.then((loc) => {
			_minifiedURL = loc;

			wasOnSavedTab = isCurrentlyOnSavedTab;
			isCurrentlyOnSavedTab = sf_currentTabs.some((tabdef) =>
				tabdef.url.includes(loc)
			);

			isFromHrefUpdate && callback(isCurrentlyOnSavedTab);
		});
}

/**
 * If the user has moved to or from a saved tab, they'll be reloaded to update the highlighted one.
 * otherwise, the favourite button is shown
 */
function afterHrefUpdate(isCurrentlyOnSavedTab) {
	if (isCurrentlyOnSavedTab || wasOnSavedTab) reloadTabs();
	else showFavouriteButton();
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
function reloadTabs() {
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
	sf_getStorage(init);
}

/**
 * Reorders the tabs based on their new order in the DOM and saves the updated list to storage.
 */
function reorderTabs() {
	// Get the list of tabs
	const tabPromises = Array.from(setupTabUl.children)
		.slice(3)
		.map(async (tab) => {
			const tabTitle = tab.querySelector("a > span").innerText;
			const href = tab.querySelector("a").href;
			const url = await sf_minifyURL(href);

			if (tabTitle && url) {
				return { tabTitle, url };
			}
			return null; // Return null for invalid tabs
		});

	Promise.all(tabPromises)
		.then((tabs) => sf_setStorage(tabs.filter((tab) => tab != null)))
		.catch((err) => console.error("Error processing tabs:", err));
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
 * Removes the tab with the given url and title.
 *
 * @param {string} url - the minified URL of the tab to remove
 * @param {string} title - the label of the tab to remove. if null, all tabs with the given URL will be removed
 */
function removeTab(url, title = null) {
	const filteredTabs = sf_currentTabs.filter((tabdef) =>
		!(tabdef.url === url && (title == null || tabdef.tabTitle == title))
	);
	if (sf_currentTabs.length === filteredTabs.length) {
		return showToast("This tab was not found.", false, true);
	}
	sf_overwriteCurrentTabs(filteredTabs, true, true);
}

function getModalHanger() {
	return modalHanger ??
		document.querySelector("div.DESKTOP.uiContainerManager");
}
/**
 * Shows a modal to ask the user into which org they want to open the given URL.
 *
 * @param {string} miniURL - the minified URL for which the user has engaged this action.
 * @param {string} tabTitle - the name of the URL for which the user has engaged this action. If not found, we try to find the name through the saved tabs; otherwise a default text is shown.
 */
function showModalOpenOtherOrg(miniURL, tabTitle) {
	if (document.getElementById(modalId) != null) {
		return showToast("Close the other modal first!", false);
	}

	sf_containsSalesforceId()
		.then((containsSfId) => {
			if (containsSfId) {
				showToast(
					"This page could not exist in another Org, because it contains an Id!",
					false,
					true,
				);
			}

			const { modalParent, saveButton, closeButton, inputContainer } =
				_generateOpenOtherOrgModal(
					miniURL,
					tabTitle ??
						sf_currentTabs.find((current) =>
							current.url === miniURL
						)
							?.tabTitle ??
						"Where to?",
				);
			modalHanger = getModalHanger();
			modalHanger.appendChild(modalParent);

			const https = "https://";
			const lightningForceCom = ".lightning.force.com";

			let lastInput = "";
			inputContainer.addEventListener("input", (e) => {
				const target = e.target;
				const value = target.value;
				const delta = value.length - lastInput.length;
				let newTarget;

				if (delta > 2) {
					sf_extractOrgName(value)
						.then((newT) => {
							newTarget = newT;
							if (newTarget != null && newTarget !== value) {
								target.value = newTarget;
							}

							lastInput = newTarget;
						});
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
				sf_extractOrgName(inputVal).then((newTarget) => {
					if (alreadyExtracted) return; // could be called more than once
					alreadyExtracted = true;
					if (
						!newTarget.match(
							/^[a-zA-Z0-9\-]+(--[a-zA-Z0-9]+\.sandbox)?(\.develop)?$/g,
						)
					) {
						return showToast("Please insert a valid Org!", false);
					}

					const url = new URL(
						`${https}${newTarget}${lightningForceCom}${
							!miniURL.startsWith("/") ? setupLightning : ""
						}${miniURL}`,
					);
					if (confirm(`Are you sure you want to open\n${url}?`)) {
						closeButton.click();
						open(url, "_blank");
					}
				});
			});
		});
}

/**
 * Moves a tab to the specified spot and then reloads.
 *
 * @param {string} miniURL - the minified URL of the tab to keep
 * @param {string} tabTitle - the title of the tab to keep
 * @param {boolean} [moveBefore=true] - whether the tab should be moved one space before in the array
 * @param {boolean} [fullMovement=false] - whether the tab should be moved at the begin or end of the array instead of moving it only one space
 *
 * @example
 * for this example, we'll collapse miniURL and tabTitle into a single string and simply look at tabs as strings.
 * tabs = ["a", "b", "c", "d", "e"]
 *
 * moveTab("c") || moveTab("c",true) || moveTab("c",true,false)
 * ==> tabs = ["a", "c", "b", "d", "e"]
 *
 * moveTab("c",false) || moveTab("c",false,false)
 * ==> tabs = ["a", "b", "d", "c", "e"]
 *
 * moveTab("c",true,true)
 * ==> tabs = ["c", "a", "b", "d", "e"]
 *
 * moveTab("c",false,true)
 * ==> tabs = ["a", "b", "d", "e", "c"]
 */
function moveTab(miniURL, tabTitle, moveBefore = true, fullMovement = false) {
	if (tabTitle == null) {
		tabTitle = sf_currentTabs.find((current) =>
			current.url === miniURL
		).tabTitle;
	}
	const index = sf_currentTabs.findIndex((tab) =>
		tab.url === miniURL && tab.tabTitle === tabTitle
	);
	if (index === -1) {
		return showToast("This tab was not found.", false, true);
	}

	const [tab] = sf_currentTabs.splice(index, 1);

	if (fullMovement) {
		moveBefore ? sf_currentTabs.unshift(tab) : sf_currentTabs.push(tab);
	} else {
		const newIndex = moveBefore
			? Math.max(0, index - 1)
			: Math.min(sf_currentTabs.length, index + 1);
		sf_currentTabs.splice(newIndex, 0, tab);
	}

	sf_setStorage();
}

/**
 * Removes the other saved tabs and then reloads.
 *
 * @param {string} miniURL - the minified URL of the tab to keep
 * @param {string} tabTitle - the title of the tab to keep
 * @param {boolean || null} [removeBefore=null] - special value to change the behaviour of the function. When not passed, the specified tab will be the only one kept. When true, only the tabs before it will be removed. When false, only the tabs after it will be removed.
 *
 * @example
 * for this example, we'll collapse miniURL and tabTitle into a single string and simply look at tabs as strings.
 * tabs = ["a", "b", "c"]
 *
 * removeOtherTabs("b") || removeOtherTabs("b",null) ==> tabs = ["b"]
 * removeOtherTabs("b",true) ==> tabs = ["b", "c"]
 * removeOtherTabs("b",false) ==> tabs = ["a", "b"]
 */
function removeOtherTabs(miniURL, tabTitle, removeBefore = null) {
	if (tabTitle == null) {
		tabTitle = sf_currentTabs.find((current) =>
			current.url === miniURL
		).tabTitle;
	}
	function isSpecifiedTab(favTab) {
		return favTab.url === miniURL && favTab.tabTitle === tabTitle;
	}
	// check if the clicked tab is not one of the favourited ones
	if (
		!sf_currentTabs.some(isSpecifiedTab)
	) {
		return showToast("This is not a saved tab!", false, true);
	}
	if (removeBefore == null) {
		// using filter, if the user picks an org-specific tab, the org info is kept intact
		return sf_setStorage(sf_currentTabs.filter(isSpecifiedTab));
	}
	const index = sf_currentTabs.findIndex((tab) =>
		tab.url === miniURL && tab.tabTitle === tabTitle
	);
	if (index === -1) return showToast("The tab could not be found.", false, true);

	sf_setStorage(
		removeBefore
			? sf_currentTabs.slice(index)
			: sf_currentTabs.slice(0, index + 1),
	);
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

// listen from saves from the action / background page
chrome.runtime.onMessage.addListener(function (message, _, sendResponse) {
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
		case "open-other-org": {
			const miniURL = message.linkTabUrl ?? message.pageTabUrl;
			const tabTitle = message.linkTabTitle;
			//const expURL = message.linkUrl ?? message.pageUrl
			showModalOpenOtherOrg(miniURL, tabTitle);
			break;
		}
		case "move-first":
			moveTab(message.tabUrl, message.tabTitle, true, true);
			break;
		case "move-left":
			moveTab(message.tabUrl, message.tabTitle, true, false);
			break;
		case "move-right":
			moveTab(message.tabUrl, message.tabTitle, false, false);
			break;
		case "move-last":
			moveTab(message.tabUrl, message.tabTitle, false, true);
			break;
		case "remove-tab":
			removeTab(message.tabUrl, message.tabTitle);
			break;
		case "remove-other-tabs":
			removeOtherTabs(message.tabUrl, message.tabTitle);
			break;
		case "remove-left-tabs":
			removeOtherTabs(message.tabUrl, message.tabTitle, true);
			break;
		case "remove-right-tabs":
			removeOtherTabs(message.tabUrl, message.tabTitle, false);
			break;
		case "empty-no-org-tabs":
			sf_overwriteCurrentTabs();
			break;
		case "empty-tabs":
			sf_setStorage([]);
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
if (href.includes(setupLightning)) {
	delayLoadSetupTabs();
}
