// deno-lint-ignore-file no-window
"use strict";
import Tab from "/tab.js";
import TabContainer from "/tabContainer.js";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
	openSettingsPage,
	FRAME_PATTERNS,
	sendExtensionMessage,
	SETUP_LIGHTNING_PATTERN,
    ISSAFARI,
} from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";

import { handleSwitchColorTheme } from "../themeHandler.js";

const translator = await ensureTranslatorAvailability();
const allTabs = await TabContainer.create();

const html = document.documentElement;
const sun = document.getElementById("sun");
const moon = document.getElementById("moon");

const tabTemplate = document.getElementById("tr_template");
const tabAppendElement = document.getElementById("tabs");

let loggers = [];

/**
 * Initializes the theme SVG elements based on the current theme and updates visibility.
 */
function initThemeSvg() {
	const elementToShow = html.dataset.theme === "light" ? moon : sun;
	const elementToHide = elementToShow === sun ? moon : sun;
	elementToShow.classList.remove("invisible", "hidden");
	elementToHide.classList.add("invisible", "hidden");
}
initThemeSvg();

/**
 * Finds the current tab of the browser then calls the callback, if available. otherwise returns a Promise
 * @param {function|undefined} callback - the function to call when the result is found.
 */
function pop_getCurrentBrowserTab(callback) {
	return sendExtensionMessage({ what: "browser-tab" }, callback);
}

// Get the current tab. If it's not salesforce setup, redirect the popup
pop_getCurrentBrowserTab(async (browserTab) => {
	// is null if the extension cannot access the current tab
	const broswerTabUrl = browserTab?.url;
	if (
		broswerTabUrl == null ||
		!broswerTabUrl.match(SETUP_LIGHTNING_PATTERN)
	) {
		// we're not in Salesforce Setup
		window.location.href = BROWSER.runtime.getURL(
			`action/notSalesforceSetup/notSalesforceSetup.html${
				broswerTabUrl != null ? "?url=" + broswerTabUrl : ""
			}`,
		);
	} else {
		// we're in Salesforce Setup
		// check if we have all the optional permissions available
		const permissionsAvailable = await BROWSER.permissions.contains({
			origins: FRAME_PATTERNS,
		});
		if (
			!permissionsAvailable &&
			localStorage.getItem("noPerm") !== "true" &&
			new URL(globalThis.location.href).searchParams.get("noPerm") !==
				"true"
		) {
			// if we do not have them, redirect to the request permission page
			globalThis.location = await BROWSER.runtime.getURL(
				"action/req_permissions/req_permissions.html?whichid=hostpermissions",
			);
			// nothing else will happen from this file
		}
		await loadTabs(browserTab);
	}
});

/**
 * Switches the theme and updates the SVG elements accordingly.
 */
function switchTheme() {
	const elementToShow = html.dataset.theme === "light" ? sun : moon;
	const elementToHide = elementToShow === sun ? moon : sun;
	elementToHide.classList.add("invisible", "hidden");
	elementToShow.classList.remove("hidden");
	setTimeout(() => {
		elementToShow.classList.remove("invisible");
	}, 200);
	handleSwitchColorTheme();
}

/**
 * Sends a message indicating that data has been saved successfully.
 */
function pop_afterSet() {
	sendExtensionMessage({ what: "saved" });
}

/**
 * Extracts the organization name from the current browser tab's URL.
 * If no browser tab is provided, the function will retrieve the current tab.
 *
 * @param {object|null} browserTab - The browser tab from which to extract the organization name. If not provided, the current tab will be used.
 * @returns {Promise<string>} A promise that resolves to the extracted organization name from the tab's URL.
 */
async function pop_extractOrgName(browserTab = null) {
	browserTab = browserTab ?? await pop_getCurrentBrowserTab();
	return Tab.extractOrgName(browserTab.url);
}

/**
 * Sends a message that will create an import modal in the Salesforce page.
 */
function importHandler() {
	sendExtensionMessage({ what: "add" }, close);
}

/**
 * Sends a message that will start the export procedure.
 */
function pop_exportHandler() {
    if(ISSAFARI || BROWSER.downloads != null){
        sendExtensionMessage({ what: "export" }, close);
        return;
    }
    BROWSER.permissions.request({
        permissions: ["downloads"],
    })
	setTimeout(close, 100);
}

/**
 * Removes the closest tab element from the popup and saves the updated tabs.
 * This function is called by the delete button at the end of each tab.
 */
function deleteTab() {
	this.closest(".tab").remove();
	saveTabs();
}

/**
 * Enables or disables the elements of the last td available in the popup.
 *
 * @param {boolean} [enable=true] - if enabling or disabling the elements in the last td
 */
function updateTabAttributes(enable = true) {
	const tr = tabAppendElement.querySelector("tr:last-child");
	const deleteButton = tr.querySelector("button.delete");
	if (enable) {
		deleteButton.removeAttribute("disabled");
		tr.setAttribute("draggable", "true");
	} else {
		deleteButton.setAttribute("disabled", "true");
		tr.removeAttribute("draggable");
	}
	tr.dataset.draggable = enable;
	tr.querySelector("svg").dataset.draggable = enable;
}

/**
 * Adds a new empty tab at the bottom of the popup and enables the previously last child's delete button.
 */
function addTab() {
	// if list is empty, there's nothing to enable
	if (tabAppendElement.childElementCount >= 1) {
		updateTabAttributes();
	}
	// add a new empty element
	tabAppendElement.append(createElement());
}

/**
 * Removes the last empty tab at the bottom of the popup and disables the newly last child's delete button.
 */
function removeTab() {
	// if list is empty, there's nothing to disable
	if (tabAppendElement.childElementCount >= 2) {
		tabAppendElement.removeChild(tabAppendElement.lastChild);
		loggers.pop();
		updateTabAttributes(false);
	}
}

let focusedIndex = 0;
/**
 * Listens for input changes on the label and URL fields and updates the corresponding values.
 *
 * @param {string} type - The type of input field ("label" or "url").
 */
function inputLabelUrlListener(type) {
	const currentObj = loggers[focusedIndex];
	const element = currentObj[type];
	const value = element.value;
	const inputObj = currentObj.last_input;
	const last_input = inputObj[type] || "";
	const delta = value.length - last_input.length;
	// check if the user copied the url
	if (delta > 2 && type === "url") {
		const url = Tab.minifyURL(value);
		element.value = url;
		// check eventual duplicates
		if (allTabs.exists({ url })) {
			// show warning in salesforce
			sendExtensionMessage({
				what: "warning",
				message: "error_tab_url_saved",
				action: "make-bold",
				url,
			});
			// highlight all duplicated rows and scroll to the first one
			const trs = Array.from(
				tabAppendElement.querySelectorAll("tr input.url"),
			)
				.filter((input) => input.value === url)
				.map((input) => input.closest("tr"));
			trs.forEach((tr) => tr.classList.add("duplicate"));
			trs[0].scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
			setTimeout(
				() => trs.forEach((tr) => tr.classList.remove("duplicate")),
				4000,
			);
		}
	}
	inputObj[type] = value;
	// if the user is on the last td, add a new tab if both fields are non-empty.
	if (focusedIndex === (loggers.length - 1)) {
		if (inputObj.label && inputObj.url) {
			addTab();
		}
	} // if the user is on the previous-to-last td, remove the last tab if either one of the fields are empty
	else if (focusedIndex === (loggers.length - 2)) {
		if (!inputObj.label || !inputObj.url) {
			removeTab();
		}
	}
}

/**
 * Creates a new tab element for the popup and sets up event listeners for label and url input fields.
 *
 * @returns {HTMLElement} The created tab element.
 */
function createElement() {
	const element = tabTemplate.content.firstElementChild.cloneNode(true);
	// deleteButton
	element.querySelector("button.delete").addEventListener("click", deleteTab);
	const label = element.querySelector(".label");
	const url = element.querySelector(".url");
	/**
	 * Checks if both the label and URL fields are not empty, and if so, calls the `saveTabs` function with `false` as an argument.
	 */
	function checkSaveTab() {
		if (label.value !== "" && url.value !== "") {
			saveTabs(false);
		}
	}
	/**
	 * Sets up event listeners for the provided element to handle drag and focus events.
	 * - Listens for input events to trigger the specified listener.
	 * - Tracks focusin to set the `focusedIndex` based on the element's data attribute.
	 * - Sets a custom data attribute (`data-element_index`) to the current length of the `loggers` array.
	 * - Adds a focusout event listener to call `checkSaveTab` when the element loses focus.
	 *
	 * @param {HTMLElement} element - The DOM element to attach event listeners to.
	 * @param {Function} listener - The function to be called on "input" events for the element.
	 */
	function setInfoForDrag(element, listener) {
		element.addEventListener("input", listener);
		element.addEventListener(
			"focusin",
			(e) => focusedIndex = parseInt(e.target.dataset.element_index),
		);
		element.dataset.element_index = loggers.length;
		element.addEventListener("focusout", checkSaveTab);
	}
	setInfoForDrag(label, () => inputLabelUrlListener("label"));
	setInfoForDrag(url, () => inputLabelUrlListener("url"));
	element.querySelector(".only-org").addEventListener("click", checkSaveTab);
	loggers.push({ label, url, last_input: {} }); // set last_input as an empty object
	return element;
}

/**
 * Loads and displays tabs based on the current state of `allTabs`.
 * - If `allTabs` is empty or null, it calls `addTab()` to add a new tab.
 * - Extracts the organization name using `pop_extractOrgName`.
 * - Loops through all available tabs and only displays those that match the current organization (if applicable).
 * - For each tab, creates an HTML element, sets values for its inputs (label, URL, and organization-specific state), and enables the delete button.
 * - Updates the associated logger for each tab, pushing it back into the `loggers` array.
 * - Appends the element representing the tab to `tabAppendElement`.
 * - Finally, appends a blank element to leave space at the bottom.
 *
 * @param {object|null} browserTab - The browser tab used to extract the organization name. If not provided, the current tab will be used.
 * @returns {Promise<void>} A promise that resolves once all tabs have been processed and displayed.
 */
async function loadTabs(browserTab = null) {
	if (allTabs == null || allTabs.length === 0) {
		return addTab();
	}
	const orgName = await pop_extractOrgName(browserTab);
	for (const tab of allTabs) {
		// Default: hide not-this-org org-specific tabs
		const element = createElement();
		element.querySelector(".label").value = tab.label;
		element.querySelector(".url").value = tab.url;
		element.querySelector(".only-org").checked = tab.org != null;
		element.querySelector(".delete").removeAttribute("disabled");
		if (tab.org != null && tab.org !== orgName) {
			element.querySelector(".org").value = tab.org;
			element.style.display = "none";
		}
		const logger = loggers.pop();
		logger.last_input.label = tab.label;
		logger.last_input.url = tab.url;
		loggers.push(logger);
		tabAppendElement.append(element);
		updateTabAttributes();
	}
	// leave a blank at the bottom
	tabAppendElement.append(createElement());
	translator.updatePageTranslations();
}

/**
 * Clears all existing child elements from `tabAppendElement` and reloads the tabs.
 * - Removes all child elements from `tabAppendElement`.
 * - Resets the `loggers` array to an empty state.
 * - Calls `loadTabs()` to reload and display the tabs.
 *
 * @returns {Promise<void>} A promise that resolves after the tabs have been reloaded.
 */
async function reloadRows() {
	while (tabAppendElement.childElementCount > 0) {
		tabAppendElement.removeChild(tabAppendElement.lastChild);
	}
	loggers = [];
	await loadTabs();
}

/**
 * Finds and returns a list of tabs from the DOM, filtered by the provided organization name.
 * - If no organization name is provided, it will be extracted using `pop_extractOrgName`.
 * - Collects all elements with the class name "tab" and processes them to create `Tab` objects.
 * - For each tab element, the label, URL, and "only-org" checkbox state are retrieved.
 * - If a tab is invalid (missing label or URL), it is ignored.
 * - Tabs that are not organization-specific (when the "only-org" checkbox is not checked) are filtered by checking if the URL contains a Salesforce ID.
 * - All tabs matching the criteria are returned, along with any existing tabs for the specified organization.
 * - If an error occurs during the tab processing, it is logged to the console.
 *
 * @param {string|null} orgName - The organization name to filter tabs by. If null, the organization name will be extracted from the current browser tab.
 * @returns {Promise<Array<Tab>>} A promise that resolves to an array of `Tab` objects that match the given criteria.
 */
async function findTabsFromRows(orgName = null) {
	// Get the list of tabs
	if (orgName == null) {
		orgName = await pop_extractOrgName();
	}
	try {
		//return [
		// add all the Tabs from the popup
		return Array.from(document.getElementsByClassName("tab"))
			.map((tab) => {
				const label = tab.querySelector(".label").value;
				const url = tab.querySelector(".url").value;
				const onlyOrgChecked = tab.querySelector(".only-org").checked;
				if (
					label == null || url == null ||
					label === "" || url === ""
				) {
					return null; // Return null for invalid tabs
				}
				// the user has not checked the onlyOrgChecked checkbox &&
				// the link does not contain a Salesforce Id
				if (!onlyOrgChecked && !Tab.containsSalesforceId(url)) {
					return Tab.create(label, url);
				}
				const org = tab.querySelector(".org").value;
				if (org == null || org === "") {
					return Tab.create(label, url, orgName);
				}
				return Tab.create(label, url, org);
			})
			.filter((tab) => tab != null);
		// add all the hidden not-this-org tabs
		// only needed when not rendering these tabs
		//...allTabs.getTabsByOrg(orgName, false),
	} catch (err) {
		console.error("error_processing_tabs", err);
		return [];
	}
}

/**
 * Saves the tabs by replacing the current tabs with the provided or found tabs, and optionally reloads the rows.
 * - If no valid `tabs` are provided, it retrieves the tabs from the DOM using `findTabsFromRows`.
 * - Replaces the current tabs in `allTabs` with the new set of tabs, applying filters to remove organization-specific tabs and keep non-matching organization tabs.
 * - If `doReload` is true, reloads the tab rows by calling `reloadRows` and then performs post-save actions via `pop_afterSet`.
 *
 * @param {boolean} [doReload=true] - Whether to reload the rows after saving the tabs. Defaults to true.
 * @param {Array<Tab>|null} [tabs=null] - The array of tabs to save. If null, the tabs will be fetched using `findTabsFromRows`.
 * @returns {Promise<void>} A promise that resolves once the tabs have been saved and optionally rows reloaded.
 */
async function saveTabs(doReload = true, tabs = null) {
	//const orgName = await pop_extractOrgName();
	if (!TabContainer.isValid(tabs)) {
		//tabs = await findTabsFromRows(orgName);
		tabs = await findTabsFromRows();
	}
	await allTabs.replaceTabs(tabs, {
		removeOrgTabs: true,
		//keepTabsNotThisOrg: orgName,
	});
	if (doReload) {
		await reloadRows();
	}
	pop_afterSet();
}

/**
 * Clears all saved tabs and saves the empty list.
 */
function emptyTabs() {
	saveTabs(true, []);
}

// listen to possible updates from tableDragHandler
addEventListener("message", (e) => {
	e.source == window && e.data.what === "order" && saveTabs();
});

document.getElementById("theme-selector").addEventListener(
	"click",
	switchTheme,
);
document.getElementById("delete-all").addEventListener("click", emptyTabs);

const importBtn = document.getElementById("import");
importBtn.addEventListener("click", importHandler);
const exportBtn = document.getElementById("export");
exportBtn.addEventListener("click", pop_exportHandler);
const settingsBtn = document.getElementById("open-settings");
settingsBtn.addEventListener(
	"click",
	openSettingsPage,
);

const availableCommands = await sendExtensionMessage({
	what: "get-commands",
	commands: [
		CMD_EXPORT_ALL,
		CMD_IMPORT,
		CMD_OPEN_SETTINGS,
	],
});
function sliceBeforeSeparator(i18n) {
	return i18n.slice(0, i18n.indexOf("+-+"));
}
availableCommands.forEach(async (ac) => {
	switch (ac.name) {
		case CMD_EXPORT_ALL:
			exportBtn.title = await translator.translate([
				sliceBeforeSeparator(exportBtn.dataset.i18n),
				`(${ac.shortcut})`,
			]);
			break;
		case CMD_IMPORT:
			importBtn.title = await translator.translate([
				sliceBeforeSeparator(importBtn.dataset.i18n),
				`(${ac.shortcut})`,
			]);
			break;
		case CMD_OPEN_SETTINGS:
			settingsBtn.title = await translator.translate([
				sliceBeforeSeparator(settingsBtn.dataset.i18n),
				`(${ac.shortcut})`,
			]);
			break;
		default:
			break;
	}
});
