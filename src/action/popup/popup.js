"use strict";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
	CXM_MANAGE_TABS,
} from "/constants.js";
import {
	areFramePatternsAllowed,
	isOnSalesforceSetup,
	openSettingsPage,
	sendExtensionMessage,
} from "/functions.js";
import ensureTranslatorAvailability from "/translator.js";
import "/components/theme-selector/theme-selector.js";

{
	// Get the current tab. If it's not salesforce setup, redirect the popup
	const isonSFsetup = await isOnSalesforceSetup();
	if (isonSFsetup.ison) {
		// we're in Salesforce Setup
		// check if we can access the Salesforce Setup without requiring the user to click on the extension
		if (!(await areFramePatternsAllowed())) {
			// if we do not have them, redirect to the request permission page
			globalThis.location.href = BROWSER.runtime.getURL(
				"action/req_permissions/req_permissions.html?whichid=hostpermissions",
			);
			// nothing else will happen from this file
		}
	} else {
		// we're not in Salesforce Setup
		globalThis.location.href = BROWSER.runtime.getURL(
			`action/notSalesforceSetup/notSalesforceSetup.html${
				isonSFsetup.url == null ? "" : "?url=" + isonSFsetup.url
			}`,
		);
	}
}

const translator = await ensureTranslatorAvailability();

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
		_sliceBeforeSeparator(
			button.dataset[translator.translateAttributeDataset],
		),
		`(${shortcut})`,
	]);
}

const importBtn = document.getElementById("import");
/**
 * Sends a message that will create an import modal in the Salesforce page.
 */
importBtn.addEventListener(
	"click",
	() => sendExtensionMessage({ what: "add" }, close),
);
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
