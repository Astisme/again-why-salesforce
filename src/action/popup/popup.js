"use strict";
import Tab from "/tab.js";
import { ensureAllTabsAvailability } from "/tabContainer.js";
import {
	BROWSER,
	CHROME_LINK,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
	EDGE_LINK,
	FIREFOX_LINK,
	FRAME_PATTERNS,
	ISCHROME,
	ISEDGE,
	ISFIREFOX,
	ISSAFARI,
	openSettingsPage,
	sendExtensionMessage,
	SETUP_LIGHTNING_PATTERN,
	SPONSOR_LINK_EN,
	SPONSOR_LINK_IT,
} from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";
import { setupDrag } from "/dragHandler.js";
import { handleSwitchColorTheme } from "../themeHandler.js";

setupDrag();
const translator = await ensureTranslatorAvailability();
const allTabs = await ensureAllTabsAvailability();

const hiddenClass = "hidden";
if (allTabs.length >= 8) {
	if (!ISSAFARI) {
		const reviewSvg = document.getElementById("review");
		reviewSvg?.classList.remove(hiddenClass);
		reviewSvg?.addEventListener("click", () => {
			if (ISEDGE) {
				return open(EDGE_LINK);
			}
			if (ISCHROME) {
				return open(CHROME_LINK);
			}
			if (ISFIREFOX) {
				return open(FIREFOX_LINK);
			}
		});
	}
	if (allTabs.length >= 16) {
		const sponsorSvg = document.getElementById("sponsor");
		sponsorSvg?.classList.remove(hiddenClass);
		sponsorSvg?.addEventListener("click", () => {
			open(
				translator.currentLanguage === "it"
					? SPONSOR_LINK_IT
					: SPONSOR_LINK_EN,
			);
		});
	}
}

const html = document.documentElement;
const sun = document.getElementById("sun");
const moon = document.getElementById("moon");

const tabTemplate = document.getElementById("tr_template");
const tabAppendElement = document.getElementById("tabs");

const loggers = [];

/**
 * Initializes the theme SVG elements based on the current theme and updates visibility.
 */
function initThemeSvg() {
	const elementToShow = html.dataset.theme === "light" ? moon : sun;
	const elementToHide = elementToShow === sun ? moon : sun;
	elementToShow.classList.remove("invisible", hiddenClass);
	elementToHide.classList.add("invisible", hiddenClass);
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
	const browserTabUrl = browserTab?.url;
	if (
		browserTabUrl?.match(SETUP_LIGHTNING_PATTERN)
	) {
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
	} else {
		// we're not in Salesforce Setup
		globalThis.location.href = BROWSER.runtime.getURL(
			`action/notSalesforceSetup/notSalesforceSetup.html${
				browserTabUrl == null ? "" : "?url=" + browserTabUrl
			}`,
		);
	}
});

/**
 * Switches the theme and updates the SVG elements accordingly.
 */
function switchTheme() {
	const elementToShow = html.dataset.theme === "light" ? sun : moon;
	const elementToHide = elementToShow === sun ? moon : sun;
	elementToHide.classList.add("invisible", hiddenClass);
	elementToShow.classList.remove(hiddenClass);
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
	if (ISSAFARI || BROWSER.downloads != null) {
		sendExtensionMessage({ what: "export" }, close);
		return;
	}
	BROWSER.permissions.request({
		permissions: ["downloads"],
	});
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
 * @param {HTMLElement} [tr] - the tr to which the function has to work. default to the last element on the tabAppendElement
 */
function updateTabAttributes(
	enable = true,
	tr = tabAppendElement.querySelector("tr:last-child"),
) {
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
		tabAppendElement.lastChild.remove();
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
		if (allTabs.existsWithOrWithoutOrg({ url, org: value })) {
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
				.map((input) => {
					const tr = input.closest("tr");
					tr.classList.add("duplicate");
					return tr;
				});
			trs[0].scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
			setTimeout(
				() => {
					for (const tr of trs) {
						tr.classList.remove("duplicate");
					}
				},
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
 * Checks if both the label and URL fields are not empty, and if so, calls the `saveTabs` function with `false` as an argument.
 */
function _checkSaveTab(e) {
	const parentTr = e.target.closest("tr");
	const labelEl = parentTr.querySelector(".label");
	const urlEl = parentTr.querySelector(".url");
	if (labelEl.value !== "" && urlEl.value !== "") {
		saveTabs(false);
	}
}
/**
 * Sets up event listeners for the provided element to handle drag and focus events.
 * - Listens for input events to trigger the specified listener.
 * - Tracks focusin to set the `focusedIndex` based on the element's data attribute.
 * - Sets a custom data attribute (`data-element_index`) to the current length of the `loggers` array.
 * - Adds a focusout event listener to call `_checkSaveTab` when the element loses focus.
 *
 * @param {HTMLElement} element - The DOM element to attach event listeners to.
 * @param {Function} listener - The function to be called on "input" events for the element.
 */
function _setInfoForDrag(element, listener) {
	element.addEventListener("input", listener);
	element.addEventListener(
		"focusin",
		(e) => focusedIndex = Number.parseInt(e.target.dataset.element_index),
	);
	element.dataset.element_index = loggers.length;
	element.addEventListener("focusout", _checkSaveTab);
}
/**
 * Creates a new tab element for the popup and sets up event listeners for label and url input fields.
 *
 * @param {string} label - The label of the tab used for the element
 * @param {string} url - The url of the tab used for the element
 * @param {string} org - The org of the tab used for the element
 * @param {boolean} isDisabled - If the element should be disabled (true)
 * @param {boolean} isThisOrgTab - If the element has an org which is the current one
 * @returns {HTMLElement} The created tab element.
 */
function createElement(
	{ label = null, url = null, org = null } = {},
	isDisabled = true,
	isThisOrgTab = false,
) {
	const element = tabTemplate.content.firstElementChild.cloneNode(true);
	const labelEl = element.querySelector(".label");
	labelEl.value = label;
	const urlEl = element.querySelector(".url");
	urlEl.value = url;
	const onlyOrgEl = element.querySelector(".only-org");
	onlyOrgEl.checked = org != null;
	onlyOrgEl.addEventListener("click", _checkSaveTab);
	const deleteButton = element.querySelector("button.delete");
	deleteButton.addEventListener("click", deleteTab);
	if (!isDisabled) {
		deleteButton.removeAttribute("disabled");
		if (!isThisOrgTab) {
			element.querySelector(".org").value = org;
			element.style.display = "none";
		}
	}
	_setInfoForDrag(labelEl, () => inputLabelUrlListener("label"));
	_setInfoForDrag(urlEl, () => inputLabelUrlListener("url"));
	const logger = { label: labelEl, url: urlEl, last_input: { label, url } };
	loggers.push(logger);
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
	const frag = document.createDocumentFragment();
	for (const tab of allTabs) {
		// Default: hide not-this-org org-specific tabs
		const element = createElement(
			tab,
			false,
			tab.org == null || tab.org === orgName,
		);
		frag.append(element);
		updateTabAttributes(undefined, element);
	}
	// leave a blank at the bottom
	frag.append(createElement());
	tabAppendElement.append(frag);
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
	if (tabAppendElement.childElementCount > 0) {
		tabAppendElement.innerHTML = null;
	}
	loggers.length = 0;
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
 * Saves the Tabs by replacing the current Tabs with the provided or found Tabs, and optionally reloads the rows.
 * - If no valid `tabs` are provided, it retrieves the Tabs from the DOM using `findTabsFromRows`.
 * - Replaces the current Tabs in `allTabs` with the new set of Tabs, applying filters to remove organization-specific Tabs and keep non-matching organization Tabs.
 * - If `doReload` is true, reloads the Tab rows by calling `reloadRows` and then performs post-save actions via `pop_afterSet`.
 *
 * @param {boolean} [doReload=true] - Whether to reload the rows after saving the Tabs. Defaults to true.
 * @param {boolean} [findTabs=true] - Whether to find the current Tabs from the DOM. Defaults to true.
 * @returns {Promise<void>} A promise that resolves once the Tabs have been saved and optionally rows reloaded.
 */
async function saveTabs(doReload = true, findTabs = true) {
	if (findTabs) {
		tabs = await findTabsFromRows();
	}
	await allTabs.replaceTabs(tabs, {
		removeOrgTabs: true,
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
	saveTabs(true, false);
}

// listen to possible updates from tableDragHandler
addEventListener("message", (e) => {
	e.source == globalThis && e.data.what === "order" && saveTabs();
});

document.getElementById("theme-selector").addEventListener(
	"click",
	switchTheme,
);
document.getElementById("delete-all").addEventListener("click", emptyTabs);

const translatorSeparator = translator.separator;
const datasetAttribute = translator.translateAttributeDataset;
/**
 * Returns the substring of the input string before the first occurrence of the separator used by the translator.
 *
 * @param {string} i18n - The input string containing the separator.
 * @returns {string} The substring before the separator, or the whole string if the separator is not found.
 */
function _sliceBeforeSeparator(i18n) {
	return i18n.slice(0, i18n.indexOf(translatorSeparator));
}
/**
 * Translates and appends a keyboard shortcut hint to a button’s localized text.
 *
 * @param {HTMLElement} button - The button element whose dataset contains the text to translate.
 * @param {string} shortcut - The keyboard shortcut to display in parentheses after the translated text.
 * @returns {Promise<string>} A promise that resolves to the translated text combined with the shortcut hint.
 */
async function addShortcutText(button, shortcut) {
	return await translator.translate([
		_sliceBeforeSeparator(button.dataset[datasetAttribute]),
		`(${shortcut})`,
	]);
}

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
for (const ac of availableCommands) {
	switch (ac.name) {
		case CMD_EXPORT_ALL:
			exportBtn.title = await addShortcutText(exportBtn, ac.shortcut);
			break;
		case CMD_IMPORT:
			importBtn.title = await addShortcutText(importBtn, ac.shortcut);
			break;
		case CMD_OPEN_SETTINGS:
			settingsBtn.title = await addShortcutText(settingsBtn, ac.shortcut);
			break;
		default:
			break;
	}
}
