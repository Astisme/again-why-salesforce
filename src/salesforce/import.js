"use strict";
import { EXTENSION_NAME, HIDDEN_CLASS, TOAST_ERROR, TOAST_WARNING } from "/constants.js";
import Tab from "/tab.js";
import { ensureAllTabsAvailability, TabContainer } from "/tabContainer.js";
import ensureTranslatorAvailability from "/translator.js";

import {
	generateCheckboxWithLabel,
	generateSection,
	generateSldsFileInput,
	generateSldsModal,
	generateSldsModalWithTabList,
	MODAL_ID,
} from "./generator.js";
import { getModalHanger, getSetupTabUl, showToast } from "./content.js";

const IMPORT_ID = `${EXTENSION_NAME}-import`;
const IMPORT_FILE_ID = `${IMPORT_ID}-file`;
const SELECT_TABS_ID = `${IMPORT_ID}-select-tabs`;
const METADATA_ID = `${IMPORT_ID}-metadata`;
const OVERWRITE_ID = `${IMPORT_ID}-overwrite`;
const OTHER_ORG_ID = `${IMPORT_ID}-other-org`;
const CLOSE_MODAL_ID = `${EXTENSION_NAME}-modal-close`;
let inputModalParent;

/**
 * Generates an SLDS import modal for importing tabs.
 *
 * This function creates a modal dialog by calling generateSldsModal with the title "Import Tabs",
 * and then sets up a section with a full-width, flex container. It appends an SLDS file input component
 * (created by generateSldsFileInput) and three checkboxes with labels for import options:
 * "Overwrite saved tabs." and "Preserve tabs for other orgs."
 * Additionally, it assigns an ID to the close button using CLOSE_MODAL_ID.
 *
 * @return {{
 *   saveButton: HTMLElement,
 *   closeButton: HTMLElement,
 *   inputContainer: HTMLInputElement
 * }} An object containing the modal's parent element, the save button, the close button, and the file input element.
 */
async function generateSldsImport() {
	const translator = await ensureTranslatorAvailability();
	const { modalParent, article, saveButton, closeButton } =
		await generateSldsModal({
			modalTitle: await translator.translate("import_tabs"),
		});
	inputModalParent = modalParent;
	closeButton.id = CLOSE_MODAL_ID;
	const { section, divParent } = await generateSection();
	divParent.style.width = "100%"; // makes the elements inside have full width
	divParent.style.display = "flex";
	divParent.style.alignItems = "center";
	divParent.style.flexDirection = "column";
	article.appendChild(section);
	const { fileInputWrapper, inputContainer } = await generateSldsFileInput(
		IMPORT_ID,
		IMPORT_FILE_ID,
		".json,application/json",
	);
	fileInputWrapper.style.marginBottom = "1rem";
	divParent.appendChild(fileInputWrapper);
	const style = document.createElement("style");
	style.textContent = `.${HIDDEN_CLASS} { display: none; }`;
	divParent.appendChild(style);
	const duplicateWarningPart0 = document.createElement("div");
	duplicateWarningPart0.textContent = await translator.translate(
		"import_duplicate_description_0",
	);
	duplicateWarningPart0.style.textAlign = "center";
	divParent.append(duplicateWarningPart0);
	const duplicateWarningPart1 = document.createElement("div");
	duplicateWarningPart1.textContent = await translator.translate(
		"import_duplicate_description_1",
	);
	duplicateWarningPart1.style.textAlign = "center";
	divParent.append(duplicateWarningPart1);
	const selectTabsCheckbox = await generateCheckboxWithLabel(
		SELECT_TABS_ID,
		"select_tabs_import",
		false,
	);
	divParent.appendChild(selectTabsCheckbox);
	const importMetadataCheckbox = await generateCheckboxWithLabel(
		METADATA_ID,
		"import_metadata",
		false,
	);
	divParent.appendChild(importMetadataCheckbox);
	const overwriteCheckbox = await generateCheckboxWithLabel(
		OVERWRITE_ID,
		"overwrite_tabs",
		false,
	);
	divParent.appendChild(overwriteCheckbox);
	const otherOrgCheckbox = await generateCheckboxWithLabel(
		OTHER_ORG_ID,
		"preserve_org_tabs",
		true,
	);
	otherOrgCheckbox.classList.add(HIDDEN_CLASS);
	divParent.appendChild(otherOrgCheckbox);
	overwriteCheckbox.addEventListener(
		"change",
		() => otherOrgCheckbox.classList.toggle(HIDDEN_CLASS),
	);
	return { saveButton, closeButton, inputContainer };
}

/**
 * Imports the given Tabs
 * @param {any[]} [tabs=[]] the Tabs to be imported either in a TabContainer or in a File[]
 * @param {Object} [importConfig={}] an Object with the following keys
 * @param {boolean} [importConfig.resetTabs=false] whether to reset the Tabs with the ones imported
 * @param {boolean} [importConfig.preserveOtherOrg=false] whether to preserve the Tabs used in other Orgs
 * @param {boolean} [importConfig.importMetadata=false] whether to import the metadata from the file
 * @return undefined - nothing
 */
async function launchImport(tabs = [], importConfig = {}) {
	const allTabs = await ensureAllTabsAvailability();
	let importedNum = 0;
	if (tabs instanceof TabContainer) {
		importedNum = await allTabs.importTabs(
			tabs.toString(),
			importConfig,
		);
	} else {
		for (const file of tabs) {
			const jsonString = await file.text();
			importedNum += await allTabs.importTabs(
				jsonString,
				importConfig,
			);
		}
	}
	// remove file import modal
	document.getElementById(CLOSE_MODAL_ID)?.click();
	showToast(["import_successful", importedNum, "tabs"]);
}

/**
 * From the given Tabs, maps the objects to valid Tab objects based on the mapping passed in the second argument
 * @param {Array} [tabs=[]] - the Tabs to be mapped
 * @param {Object} [mapping={}] - an object with the following keys
 * @param {string} [mapping.label="label"] - the label mapping
 * @param {string} [mapping.url="url"] - the url mapping
 * @param {string} [mapping.org="org"] - the org mapping
 * @return {Array} the Tabs passed as input, mapped to be a TabContainer
 */
function makeValidTabs(tabs = [], {
	label = "label",
	url = "url",
	org = "org",
} = {}) {
	return tabs?.map((tab) => ({
		label: tab[label],
		url: tab[url],
		org: tab[org],
	})) ?? [];
}

/**
 * Finds and validates Tabs from extensions that use different key structures
 * @param {Array} [tabs=[]] - the Tabs which have to be validated
 * @param {Function} validator - the validation function to check Tab structure
 * @param {Object} mapping - the key mapping for makeValidTabs
 * @return {Array} with only the valid Tabs
 */
function getTabsFromExtensions(tabs, validator, mapping) {
	return Array.isArray(tabs) && tabs.length > 0 && tabs.every(validator)
		? makeValidTabs(tabs, mapping)
		: [];
}

/**
 * Checks if a tab is from WhySalesforce extension
 * @param {Object} tab - the tab to validate
 * @return {boolean} true if the tab is from Why Salesforce
 */
function isWhySalesforceTab(tab) {
	return tab?.label == null && tab?.tabTitle != null;
}

/**
 * Checks if a tab is from Salesforce Easy Navigator extension
 * @param {Object} tab - the tab to validate
 * @return {boolean} true if the tab is from Salesforce Easy Navigator
 */
function isSalesforceEasyNavigatorTab(tab) {
	return tab?.label == null && tab?.title != null;
}

/**
 * Removes all the Tabs with unexpected keys
 * @param {Array} [tabs=null] - the Array to be filtered
 * @return {Array} with only the valid Tabs
 */
function filterForUnexpectedTabKeys(tabs = null) {
	return tabs
		?.filter((tab) => !Tab.hasUnexpectedKeys(tab)) ??
		[];
}

/**
 * Extract the Tabs from the given JSON object, taking care of checking if the user is importing the Tabs from other extensions
 * @param {Object} [jsonWithTabs=null] - the JSON object in which the Tabs are located
 * @return {Array} the valid Tabs found in the given object
 */
function getTabsFromJSON(jsonWithTabs = null) {
	if (jsonWithTabs == null) {
		return [];
	}
	const tabs = jsonWithTabs[TabContainer.keyTabs];
	// first of all, check if the Tabs are from this extension
	if (tabs != null) {
		const validTabs0 = filterForUnexpectedTabKeys(tabs);
		return validTabs0.length === tabs.length
			? validTabs0 // none were excluded (from this extension or a compatible one)
			: getTabsFromExtensions(tabs, isWhySalesforceTab, {
				label: "tabTitle",
			}); // some of the Tabs had unexpected keys
	}
	// tabs == null
	const bookmarks = jsonWithTabs.bookmarks;
	if (bookmarks != null) {
		return getTabsFromExtensions(bookmarks, isSalesforceEasyNavigatorTab, {
			label: "title",
		});
	}
	// bookmarks == null
	return [];
}

/**
 * Did not find a match for any supported extensions
 */
function showToastBrokenImportFile() {
	showToast("error_unknown_file_structure", TOAST_ERROR);
}

/**
 * Presents all the Tabs which are about to be imported so the user may pick which ones to actually import, then runs the import with the selected Tabs
 * @param {File|File[]} files - The file(s) to read and validate.
 * @param {Object} [importConfig={}] an Object with the following keys
 * @param {boolean} [importConfig.resetTabs=false] whether to reset the Tabs with the ones imported
 * @param {boolean} [importConfig.preserveOtherOrg=false] whether to preserve the Tabs used in other Orgs
 * @param {boolean} [importConfig.importMetadata=false] whether to import the metadata from the file
 * @return undefined - nothing
 */
async function showTabSelectThenImport(files = [], importConfig = {}) {
	if (document.getElementById(MODAL_ID) != null) {
		document.getElementById(CLOSE_MODAL_ID).click();
	}
	const fileTabs = await Promise.all(
		files
			.map(async (f) => JSON.parse(await f.text())),
	);
	const fileTabsIsArray = Array.isArray(fileTabs) && fileTabs.length > 1;
	const availableTabs = [];
	for (const ft of fileTabs) {
		const tabs = Array.isArray(ft)
			? getTabsFromJSON({ [TabContainer.keyTabs]: ft })
			: getTabsFromJSON(ft);
		if (tabs.length === 0) {
			showToastBrokenImportFile();
		} else {
			availableTabs.push(...tabs);
		}
	}
	// the user wants to select which Tabs to import
	const importTabs = TabContainer.getThrowawayInstance({
		tabs: availableTabs,
	}); // ensure no duplicates
	importTabs.sort({ sortBy: "url" }, false); // sort by url asc without sync
	const {
		modalParent,
		saveButton,
		closeButton,
		getSelectedTabs,
	} = await generateSldsModalWithTabList(
		importTabs,
		{
			title: "import_tabs",
			saveButtonLabel: "import",
			explainer: "select_tabs_import",
		},
	);
	getModalHanger().appendChild(modalParent);
	saveButton.addEventListener("click", (e) => {
		e.preventDefault();
		const { tabs: pickedTabs, selectedAll } = getSelectedTabs();
		if (pickedTabs.length === 0) {
			return showToast("error_no_tabs_selected", TOAST_WARNING);
		}
		closeButton.click();
		const selectedTabContainer = TabContainer.getThrowawayInstance({
			tabs: pickedTabs,
			pinned: fileTabsIsArray || !selectedAll
				? 0
				: fileTabs[0][TabContainer.keyPinnedTabsNo],
		});
		launchImport(selectedTabContainer, importConfig);
	});
}

/**
 * Reads and processes JSON files using modern Promise-based API.
 *
 * @param {File|File[]} files - The file(s) to read and validate.
 * @return {Promise<void>}
 */
async function readFile(files) {
	const fileArray = Array.isArray(files) || files.length > 0
		? files
		: [files];
	const validFileArray = [];
	// Validate all files first
	for (const file of fileArray) {
		if (file.type === "application/json") {
			validFileArray.push(file);
		} else {
			showToast("import_invalid_file", TOAST_ERROR);
		}
	}
	try {
		const selectTabsPick =
			inputModalParent.querySelector(`#${SELECT_TABS_ID}`).checked;
		const metadataPick =
			inputModalParent.querySelector(`#${METADATA_ID}`).checked;
		const overwritePick =
			inputModalParent.querySelector(`#${OVERWRITE_ID}`).checked;
		const otherOrgPick =
			inputModalParent.querySelector(`#${OTHER_ORG_ID}`).checked;
		const importConfig = {
			resetTabs: overwritePick,
			preserveOtherOrg: otherOrgPick,
			importMetadata: metadataPick,
		};
		if (selectTabsPick) {
			return await showTabSelectThenImport(validFileArray, importConfig);
		}
		return await launchImport(validFileArray, importConfig);
	} catch (error) {
		showToast(["error_import", error.message], TOAST_ERROR);
	}
}

/**
 * Handles file selection via input change event.
 * Prevents default behavior and reads the first selected file.
 *
 * @param {Event} event - The change event triggered by the file input.
 */
function readChangeFiles(event) {
	event.preventDefault();
	readFile(event.target.files);
}
/**
 * Handles the drop event of files onto the drop area.
 * Prevents default behavior and reads all dropped files.
 *
 * @param {DragEvent} event - The drop event containing the dropped files.
 */
function readDropFiles(event) {
	event.preventDefault();
	readFile(Array.from(event.dataTransfer.files));
}
/**
 * Attaches event listeners to handle file uploads via both file selection and drag-and-drop.
 *
 * This function sets up listeners on the file input element (identified by the global `IMPORT_ID`)
 * within the modal. It handles the "change" event for file selection and "dragover", "dragleave",
 * and "drop" events for drag-and-drop actions. When a file is uploaded, it validates that the file
 * type is "application/json", retrieves import options (overwrite and other org picks)
 * from checkboxes within the modal, and reads the file as text using a FileReader.
 */
function listenToFileUpload() {
	const dropArea = document.getElementById(IMPORT_ID);
	dropArea.addEventListener("change", readChangeFiles);
	dropArea.addEventListener("drop", readDropFiles);
}

/**
 * Displays the file import modal if there are no other open modals.
 * If a modal is already open, shows a toast notification to close the other modal first.
 * @return undefined
 */
async function showFileImport() {
	if (
		getSetupTabUl().querySelector(`#${IMPORT_ID}`) != null ||
		document.getElementById(MODAL_ID) != null
	) {
		return showToast("error_close_other_modal", TOAST_ERROR);
	}
	const { saveButton } = await generateSldsImport();
	saveButton.remove();
	if (inputModalParent == null) {
		return await showFileImport();
	}
	getModalHanger().appendChild(inputModalParent);
	listenToFileUpload();
}

/**
 * Displays the file import modal to the user.
 * If an error occurs during the display, shows an error toast notification.
 *
 * @async
 * @return {Promise<void>}
 */
export async function createImportModal() {
	try {
		await showFileImport();
	} catch (error) {
		showToast(error, TOAST_ERROR);
	}
}
