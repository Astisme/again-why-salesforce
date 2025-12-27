"use strict";
import {
	BROWSER,
	CHROME_LINK,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
	CXM_MANAGE_TABS,
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
import { ensureAllTabsAvailability } from "/tabContainer.js";
import ensureTranslatorAvailability from "/translator.js";

import { handleSwitchColorTheme } from "../themeHandler.js";

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

/**
 * Initializes the theme SVG elements based on the current theme and updates visibility.
 */
{
	const elementToShow = html.dataset.theme === "light" ? moon : sun;
	const elementToHide = elementToShow === sun ? moon : sun;
	elementToShow.classList.remove("invisible", hiddenClass);
	elementToHide.classList.add("invisible", hiddenClass);
}

/**
 * Finds the current tab of the browser then calls the callback, if available. otherwise returns a Promise
 * @param {function|undefined} callback - the function to call when the result is found.
 * @return {Promise} from sendExtensionMessage
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

document.getElementById("theme-selector").addEventListener(
	"click",
	switchTheme,
);


/**
 * Sends a message that will start the export procedure.
 */
function pop_exportHandler() {
	sendExtensionMessage({
		what: "export-check",
	});
	setTimeout(close, 100);
}

/**
 * Returns the substring of the input string before the first occurrence of the separator used by the translator.
 *
 * @param {string} i18n - The input string containing the separator.
 * @return {string} The substring before the separator, or the whole string if the separator is not found.
 */
function _sliceBeforeSeparator(i18n) {
	return i18n.slice(0, i18n.indexOf(translator.separator));
}
/**
 * Translates and appends a keyboard shortcut hint to a button’s localized text.
 *
 * @param {HTMLElement} button - The button element whose dataset contains the text to translate.
 * @param {string} shortcut - The keyboard shortcut to display in parentheses after the translated text.
 * @return {Promise<string>} A promise that resolves to the translated text combined with the shortcut hint.
 */
async function addShortcutText(button, shortcut) {
	return await translator.translate([
		_sliceBeforeSeparator(button.dataset[translator.translateAttributeDataset]),
		`(${shortcut})`,
	]);
}

const importBtn = document.getElementById("import");
/**
 * Sends a message that will create an import modal in the Salesforce page.
 */
importBtn.addEventListener("click", () => sendExtensionMessage({ what: "add" }, close));
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

const manageTabsBtn = document.getElementById("manage-tabs");
/**
 * Sends a message that will create the manage Tabs modal in the Salesforce page.
 */ 
manageTabsBtn.addEventListener(
	"click",
    () => sendExtensionMessage({ what: CXM_MANAGE_TABS }, close),
);
