// deno-lint-ignore-file no-window
"use strict";
import { handleSwitchColorTheme, initTheme } from "../themeHandler.js";
import { Tab } from "/tab.js"
import { TabContainer } from "/tabContainer.js"
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
	initTheme();
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
    return pop_sendMessage({what: "browser-tab", popup: true}, callback); 
}

// Get the current tab. If it's not salesforce setup, redirect the popup
pop_getCurrentBrowserTab(async (browserTab) => {
	// is null if the extension cannot access the current tab
    const broswerTabUrl = browserTab?.url;
	if (broswerTabUrl == null || !broswerTabUrl.match(".*\/lightning\/setup\/.*")) {
		window.location.href = chrome.runtime.getURL(
			`action/notSalesforceSetup/notSalesforceSetup.html${
				broswerTabUrl != null ? "?url=" + broswerTabUrl : ""
			}`,
		);
	} else {
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
 * Sends a message to the background script with the specified message and the current URL.
 *
 * @param {Object} message - The message to send.
 * @param {function} callback - The callback to execute after sending the message.
 */
function pop_sendMessage(message, callback) {
    /**
     * Invoke the runtime to send the message
     *
     * @param {Object} message - The message to send
     * @param {function} callback - The callback to execute after sending the message
     */
    function sendMessage(message, callback){
        return chrome.runtime.sendMessage(
            { message, url: location.href },
            callback,
        );
    }

	if (callback == null)
        return new Promise((resolve, reject) => {
            sendMessage(
                message,
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                },
            );
        });
    sendMessage(message, callback);
}

/**
 * Sends a message indicating that data has been saved successfully.
 */
function pop_afterSet() {
	pop_sendMessage({ what: "saved" });
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
function pop_minifyURL(url) {
	return pop_sendMessage({ what: "minify", url });
}

/**
 * Extracts the Org name out of the url passed as input.
 *
 * @param {string} url - The URL from which the Org name has to be extracted
 */
async function pop_extractOrgName(browserTab = null) {
	browserTab = browserTab ?? await pop_getCurrentBrowserTab();
	return pop_sendMessage({ what: "extract-org", url: browserTab.url });
}

/**
 * Checks if the url passed as input contains a Salesforce Id.
 *
 * @param {string} url - The URL to be checked.
 */
function pop_containsSalesforceId(url) {
	return pop_sendMessage({ what: "contains-sf-id", url });
}

/**
 * Handles the import functionality by sending a message that will be used as signal to create an import modal in the Salesforce page.
 */
function importHandler() {
	pop_sendMessage({ what: "add" }, close);
}

/**
 * Handles the export functionality by downloading the current tabs as a JSON file.
 */
function pop_exportHandler() {
	pop_sendMessage({ what: "export", tabs: allTabs }, close);
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
	if (tabAppendElement.childElementCount >= 1) { // if list is empty, there's nothing to disable
		updateTabAttributes();
	}
	// add a new empty element
	tabAppendElement.append(createElement());
}
/**
 * Removes the last empty tab at the bottom of the popup and disables the newly last child's delete button.
 */
function removeTab() {
	if (tabAppendElement.childElementCount >= 2) { // if list is empty, there's nothing to disable
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
async function inputLabelUrlListener(type) {
	const currentObj = loggers[focusedIndex];
	const element = currentObj[type];
	const value = element.value;
	const inputObj = currentObj.last_input;
	const last_input = inputObj[type] || "";
	const delta = value.length - last_input.length;

	// check if the user copied the url
	if (delta > 2 && type === "url") {
		const v = await pop_minifyURL(value)
        element.value = v;
        // check eventual duplicates
        if (allTabs.tabExistsByData({url: v})) {
            // show warning in salesforce
            pop_sendMessage({
                what: "warning",
                message: "A tab with this URL has already been saved!",
                action: "make-bold",
                url: v,
            });

            // highlight all duplicated rows and scroll to the first one
            const trs = Array.from(
                tabAppendElement.querySelectorAll("tr input.url"),
            )
            .filter((input) => input.value === v)
            .map((input) => input.closest("tr"));

            trs.forEach((tr) => tr.classList.add("duplicate"));
            trs[0].scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            setTimeout(
                () =>
                    trs.forEach((tr) =>
                        tr.classList.remove("duplicate")
                    ),
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
 * Focus listener to track the currently focused tab index.
 *
 * @param {Event} e - The focus event.
 */
function focusListener(e) {
	focusedIndex = parseInt(e.target.dataset.element_index);
	saveTabs(false);
}

/**
 * Creates a new tab element for the popup and sets up event listeners for label and url input fields.
 *
 * @returns {HTMLElement} The created tab element.
 */
function createElement() {
	const element = tabTemplate.content.firstElementChild.cloneNode(true);
	const deleteButton = element.querySelector("button.delete");
	deleteButton.addEventListener("click", deleteTab);

	function setInfoForDrag(element, listener) {
		element.addEventListener("input", listener);
		element.addEventListener("focus", focusListener);
		element.dataset.element_index = loggers.length;
	}
	const label = element.querySelector(".label");
	setInfoForDrag(label, async () => await inputLabelUrlListener("label"));
	const url = element.querySelector(".url");
	setInfoForDrag(url, async () => await inputLabelUrlListener("url"));

	element.querySelector(".only-org").addEventListener("click", () => {
		saveTabs(false);
	});

	loggers.push({ label, url, last_input: {} }); // set last_input as an empty object
	return element;
}

/**
 * Loads stored tab data and populates the tab elements in the popup.
 *
 * @param {Object} items - The stored tab data.
 */
async function loadTabs(browserTab = null) {
    console.log('lll',allTabs,allTabs == null,allTabs.length);
	if (allTabs == null) {
		return addTab();
	}

	const orgName = await pop_extractOrgName(browserTab);
    console.log('lll',orgName,allTabs.length);
    for (const tab of allTabs) {
        console.log('lll',tab.org,tab.org != null && tab.org !== orgName)
        if (tab.org != null && tab.org !== orgName) {
            continue; // default hide not-this-org org-specific tabs
        }
        const element = createElement();
        element.querySelector(".label").value = tab.label;
        element.querySelector(".url").value = tab.url;
        element.querySelector(".only-org").checked = tab.org != null;
        element.querySelector(".delete").removeAttribute("disabled");
        const logger = loggers.pop();
        logger.last_input.label = tab.label;
        logger.last_input.url = tab.url;

        loggers.push(logger);
        tabAppendElement.append(element);
        updateTabAttributes();
    }
    tabAppendElement.append(createElement()); // leave a blank at the bottom
    pop_afterSet();
}

/**
 * Reloads the tab elements in the popup based on the provided tab data.
 *
 * @param {Object} items - The tab data to reload.
 */
async function reloadRows() {
	while (tabAppendElement.childElementCount > 0) {
		tabAppendElement.removeChild(tabAppendElement.lastChild);
	}
	loggers = [];
	await loadTabs();
}

/**
 * Finds and returns all the tabs in the popup with valid label and url.
 */
async function findTabsFromRows() {
	const tabElements = document.getElementsByClassName("tab");
	// Get the list of tabs
	const orgName = await pop_extractOrgName();
	const tabPromises = Array.from(tabElements)
		.map(async (tab) => {
			const label = tab.querySelector(".label").value;
			const url = tab.querySelector(".url").value;
			const onlyOrgChecked = tab.querySelector(".only-org").checked;

            console.log({label,url})
			if (label != null && url != null
                && label !== "" && url !== "") {
				// the user has not checked the onlyOrgChecked checkbox &&
				// the link does not contain a Salesforce Id
				const containsSalesforceId = await pop_containsSalesforceId(
					url,
				);
                console.log({label,url,onlyOrgChecked,containsSalesforceId});
				if (!onlyOrgChecked && !containsSalesforceId) {
					return await Tab.create(label, url);
				}
				return await Tab.create(label, url, orgName);
			}
			return null; // Return null for invalid tabs
		});

	let availableTabs;
	try {
		// Wait for all promises to resolve and filter out null values
		const resolvedTabs = await Promise.all(tabPromises);
		availableTabs = resolvedTabs.filter((tab) => tab !== null);
		// add all the hidden not-this-org tabs
        /*
		availableTabs.push(
			...allTabs.getTabsByOrg(orgName, false)
        );
        */
	} catch (err) {
		console.error("Error processing tabs:", err);
		availableTabs = [];
	}

    return availableTabs;
}

/**
 * Saves the current tabs to storage and optionally reloads the tab rows.
 *
 * @param {boolean} doReload - Whether to reload the tab rows after saving.
 * @param {Array} tabs - The tabs to save.
 */
async function saveTabs(doReload = true, tabs = null) {
	if (!await TabContainer.isValid(tabs)) {
		tabs = await findTabsFromRows(doReload);
	}
    console.warn('lllsavetabs',tabs,doReload);
    await allTabs.replaceTabs(tabs, {
        removeOrgTabs: true,
        keepTabsNotThisOrg: await pop_extractOrgName(),
    });
	if(doReload)
        await reloadRows();
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
document.getElementById("import").addEventListener("click", importHandler);
document.getElementById("export").addEventListener("click", pop_exportHandler);
document.getElementById("delete-all").addEventListener("click", emptyTabs);
