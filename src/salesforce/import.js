"use strict";
import {
	BROWSER as _BROWSER,
	EXTENSION_NAME as _EXTENSION_NAME,
	HIDDEN_CLASS as _HIDDEN_CLASS,
	TOAST_ERROR as _TOAST_ERROR,
	TOAST_WARNING as _TOAST_WARNING,
} from "../core/constants.js";
import { injectStyle as _injectStyle } from "../core/functions.js";
import _Tab from "../core/tab.js";
import {
	ensureAllTabsAvailability as _ensureAllTabsAvailability,
	TabContainer as _TabContainer,
} from "../core/tabContainer.js";
import { getTranslations as _getTranslations } from "../core/translator.js";

import {
	generateCheckboxWithLabel as _generateCheckboxWithLabel,
	generateSection as _generateSection,
	generateSldsFileInput as _generateSldsFileInput,
	generateSldsModal as _generateSldsModal,
	generateSldsModalWithTabList as _generateSldsModalWithTabList,
	MODAL_ID as _MODAL_ID,
} from "./generator.js";
import { sf_afterSet as _sf_afterSet } from "./content.js";
import { showToast as _showToast } from "./toast.js";
import {
	getModalHanger as _getModalHanger,
	getSetupTabUl as _getSetupTabUl,
} from "./sf-elements.js";

let BROWSER = _BROWSER;
let EXTENSION_NAME = _EXTENSION_NAME;
let HIDDEN_CLASS = _HIDDEN_CLASS;
let TOAST_ERROR = _TOAST_ERROR;
let TOAST_WARNING = _TOAST_WARNING;
let injectStyle = _injectStyle;
let Tab = _Tab;
let ensureAllTabsAvailability = _ensureAllTabsAvailability;
let TabContainer = _TabContainer;
let getTranslations = _getTranslations;
let generateCheckboxWithLabel = _generateCheckboxWithLabel;
let generateSection = _generateSection;
let generateSldsFileInput = _generateSldsFileInput;
let generateSldsModal = _generateSldsModal;
let generateSldsModalWithTabList = _generateSldsModalWithTabList;
let MODAL_ID = _MODAL_ID;
let sf_afterSet = _sf_afterSet;
let showToast = _showToast;
let getModalHanger = _getModalHanger;
let getSetupTabUl = _getSetupTabUl;

let IMPORT_ID = "";
let IMPORT_FILE_ID = "";
let SELECT_TABS_ID = "";
let METADATA_ID = "";
let OVERWRITE_ID = "";
let OTHER_ORG_ID = "";
let CLOSE_MODAL_ID = "";
let IMPORT_CSS_ID = "";
let IMPORT_CONTAINER_ID = "";
let IMPORT_DUPLICATE_WARNING_CLASS = "";
let IMPORT_DRAG_ACTIVE_CLASS = "";
let inputModalParent;

/**
 * Recomputes derived import IDs from the current extension name.
 *
 * @return {void}
 */
function updateImportIds() {
	IMPORT_ID = `${EXTENSION_NAME}-import`;
	IMPORT_FILE_ID = `${IMPORT_ID}-file`;
	SELECT_TABS_ID = `${IMPORT_ID}-select-tabs`;
	METADATA_ID = `${IMPORT_ID}-metadata`;
	OVERWRITE_ID = `${IMPORT_ID}-overwrite`;
	OTHER_ORG_ID = `${IMPORT_ID}-other-org`;
	CLOSE_MODAL_ID = `${IMPORT_ID}-modal-close`;
	IMPORT_CSS_ID = `${IMPORT_ID}-css`;
	IMPORT_CONTAINER_ID = `${IMPORT_ID}-container`;
	IMPORT_DUPLICATE_WARNING_CLASS = `${IMPORT_ID}-duplicate-warning`;
	IMPORT_DRAG_ACTIVE_CLASS = `${IMPORT_ID}-drag-active`;
}

updateImportIds();

/**
 * Generates an SLDS import modal for importing tabs.
 *
 * This function creates a modal dialog by calling generateSldsModal with the title "Import Tabs",
 * and then sets up a section with a full-width, flex container. It appends an SLDS file input component
 * (created by generateSldsFileInput) and three checkboxes with labels for import options:
 * "Overwrite saved tabs." and "Preserve tabs for other orgs."
 * Additionally, it assigns an ID to the close button using CLOSE_MODAL_ID.
 *
 * @return {Promise<{
 *   saveButton: HTMLElement,
 *   closeButton: HTMLElement,
 *   inputContainer: HTMLInputElement
 * }>} An object containing the modal's parent element, the save button, the close button, and the file input element.
 */
async function generateSldsImport() {
	const [modalTitle, dup_desc_0, dup_desc_1] = await getTranslations([
		"import_tabs",
		"import_duplicate_description_0",
		"import_duplicate_description_1",
	]);
	const { modalParent, article, saveButton, closeButton } =
		await generateSldsModal({
			modalTitle,
		});
	inputModalParent = modalParent;
	closeButton.id = CLOSE_MODAL_ID;
	const { section, divParent } = await generateSection();
	divParent.id = IMPORT_CONTAINER_ID;
	article.appendChild(section);
	const { fileInputWrapper, inputContainer } = await generateSldsFileInput(
		IMPORT_ID,
		IMPORT_FILE_ID,
		".json,application/json",
	);
	divParent.appendChild(fileInputWrapper);
	injectStyle(
		IMPORT_CSS_ID,
		{ link: BROWSER.runtime.getURL("/salesforce/css/import.css") },
	);
	const duplicateWarningPart0 = document.createElement("div");
	duplicateWarningPart0.textContent = dup_desc_0;
	duplicateWarningPart0.classList.add(IMPORT_DUPLICATE_WARNING_CLASS);
	divParent.append(duplicateWarningPart0);
	const duplicateWarningPart1 = document.createElement("div");
	duplicateWarningPart1.textContent = dup_desc_1;
	duplicateWarningPart1.classList.add(IMPORT_DUPLICATE_WARNING_CLASS);
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
 * @return {Promise<void>} - nothing
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
	sf_afterSet({
		what: "imported",
		tabs: allTabs,
	});
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
 * @return {Promise<void>} - nothing
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
	saveButton.addEventListener("click", async (e) => {
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
		await launchImport(selectedTabContainer, importConfig);
	});
}

/**
 * Normalizes file-like inputs into a plain array.
 *
 * @param {File|File[]|FileList|null|undefined} files - Input files.
 * @return {File[]} Normalized list of files.
 */
function normalizeFiles(files) {
	if (files == null) {
		return [];
	}
	if (Array.isArray(files)) {
		return files;
	}
	if (typeof files.length === "number") {
		return Array.from(files);
	}
	return [files];
}

/**
 * Returns true when the provided file can be treated as JSON.
 *
 * Firefox/Linux drops can provide empty MIME types, so fallback to extension.
 *
 * @param {File} file - The file to validate.
 * @return {boolean} Whether the file should be accepted as JSON.
 */
function isJsonFile(file) {
	const fileName = file?.name?.toLowerCase?.() ?? "";
	return file?.type === "application/json" || fileName.endsWith(".json");
}

/**
 * Reads and processes JSON files using modern Promise-based API.
 *
 * @param {File|File[]} files - The file(s) to read and validate.
 * @return {Promise<void>}
 */
async function readFile(files) {
	const fileArray = normalizeFiles(files);
	const validFileArray = [];
	// Validate all files first
	for (const file of fileArray) {
		if (isJsonFile(file)) {
			validFileArray.push(file);
		} else {
			showToast("import_invalid_file", TOAST_ERROR);
		}
	}
	if (validFileArray.length === 0) {
		return;
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
 * Extracts files from a change or drop event.
 *
 * @param {Event} event - The source event.
 * @return {File[]} Collected files from all supported event shapes.
 */
function getFilesFromChangeOrDropEvent(event) {
	const targetFiles = normalizeFiles(
		event.target?.files ?? event.dataTransfer?.files,
	);
	if (targetFiles.length > 0) {
		return targetFiles;
	}
	const transferItems = normalizeFiles(event.dataTransfer?.items);
	return transferItems
		.map((item) => item?.getAsFile?.())
		.filter((file) => file != null);
}

/**
 * Handles file selection via input change event.
 * Handles the drop event of files onto the drop area.
 * Prevents default behavior and reads the first selected file.
 *
 * @param {Event} event - The change event triggered by the file input.
 * @return {Promise<void>} Promise resolved when the import flow settles.
 */
function readChangeOrDropFiles(event) {
	event.preventDefault();
	return readFile(getFilesFromChangeOrDropEvent(event));
}

/**
 * Prevents default drag-and-drop browser behavior.
 *
 * @param {Event} event - Drag event to neutralize.
 * @return {void}
 */
function preventDragDefaults(event) {
	event.preventDefault?.();
	event.stopPropagation?.();
}

/**
 * Marks the import drop area as active while files are dragged over it.
 *
 * @param {HTMLElement|null} dropArea - The file input wrapper/drop area.
 * @return {void}
 */
function markDropAreaAsActive(dropArea) {
	dropArea?.classList.add(IMPORT_DRAG_ACTIVE_CLASS);
}

/**
 * Removes the active drag state from the import drop area.
 *
 * @param {HTMLElement|null} dropArea - The file input wrapper/drop area.
 * @return {void}
 */
function clearDropAreaActiveState(dropArea) {
	dropArea?.classList.remove(IMPORT_DRAG_ACTIVE_CLASS);
}

/**
 * Handles drag-enter events on the import drop area.
 *
 * @param {Event} event - Drag event to handle.
 * @param {HTMLElement|null} dropArea - The file input wrapper/drop area.
 * @return {void}
 */
function handleDropAreaDragEnter(event, dropArea) {
	preventDragDefaults(event);
	markDropAreaAsActive(dropArea);
}

/**
 * Handles drag-over events on the import drop area.
 *
 * @param {Event} event - Drag event to handle.
 * @param {HTMLElement|null} dropArea - The file input wrapper/drop area.
 * @return {void}
 */
function handleDropAreaDragOver(event, dropArea) {
	preventDragDefaults(event);
	markDropAreaAsActive(dropArea);
}

/**
 * Handles drag-leave events on the import drop area.
 *
 * @param {Event} event - Drag event to handle.
 * @param {HTMLElement|null} dropArea - The file input wrapper/drop area.
 * @return {void}
 */
function handleDropAreaDragLeave(event, dropArea) {
	preventDragDefaults(event);
	clearDropAreaActiveState(dropArea);
}

/**
 * Handles dropped files and clears the drop-area active state.
 *
 * @param {Event} event - Drop event triggered on the drop area.
 * @param {HTMLElement|null} dropArea - The file input wrapper/drop area.
 * @return {Promise<void>} Promise resolved when the import flow settles.
 */
function handleDropAreaDrop(event, dropArea) {
	preventDragDefaults(event);
	clearDropAreaActiveState(dropArea);
	return readFile(getFilesFromChangeOrDropEvent(event));
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
	dropArea.addEventListener("change", readChangeOrDropFiles);
	dropArea.addEventListener(
		"dragenter",
		(event) => handleDropAreaDragEnter(event, dropArea),
	);
	dropArea.addEventListener(
		"dragover",
		(event) => handleDropAreaDragOver(event, dropArea),
	);
	dropArea.addEventListener(
		"dragleave",
		(event) => handleDropAreaDragLeave(event, dropArea),
	);
	dropArea.addEventListener(
		"drop",
		(event) => handleDropAreaDrop(event, dropArea),
	);
}

/**
 * Displays the file import modal if there are no other open modals.
 * If a modal is already open, shows a toast notification to close the other modal first.
 * @return {Promise<void>}
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
 * Creates the import module API with optional dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {{
 *   __getInputModalParent: () => unknown;
 *   __setInputModalParent: (value: unknown) => void;
 *   createImportModal: () => Promise<void>;
 *   filterForUnexpectedTabKeys: (tabs?: Record<string, unknown>[] | null) => unknown[];
 *   generateSldsImport: () => Promise<{
 *     closeButton: HTMLElement;
 *     inputContainer: HTMLInputElement;
 *     saveButton: HTMLElement;
 *   }>;
 *   getTabsFromJSON: (jsonWithTabs?: Record<string, unknown> | null) => unknown[];
 *   makeValidTabs: (
 *     tabs?: Record<string, unknown>[] | null,
 *     mapping?: { label?: string; org?: string; url?: string },
 *   ) => unknown[];
 *   readChangeOrDropFiles: (event: Event) => Promise<void>;
 *   readFile: (files: FileList | File[] | File) => Promise<void>;
 *   showFileImport: () => Promise<void>;
 *   showTabSelectThenImport: (files?: File[], importConfig?: Record<string, boolean>) => Promise<void>;
 * }} Import module API.
 */
export function createImportModule(overrides = {}) {
	if (overrides.BROWSER != null) BROWSER = overrides.BROWSER;
	if (overrides.EXTENSION_NAME != null) {
		EXTENSION_NAME = overrides.EXTENSION_NAME;
		updateImportIds();
	}
	if (overrides.HIDDEN_CLASS != null) HIDDEN_CLASS = overrides.HIDDEN_CLASS;
	if (overrides.MODAL_ID != null) MODAL_ID = overrides.MODAL_ID;
	if (overrides.TOAST_ERROR != null) TOAST_ERROR = overrides.TOAST_ERROR;
	if (overrides.TOAST_WARNING != null) {
		TOAST_WARNING = overrides.TOAST_WARNING;
	}
	if (overrides.Tab != null) Tab = overrides.Tab;
	if (overrides.TabContainer != null) TabContainer = overrides.TabContainer;
	if (overrides.ensureAllTabsAvailability != null) {
		ensureAllTabsAvailability = overrides.ensureAllTabsAvailability;
	}
	if (overrides.getTranslations != null) {
		getTranslations = overrides.getTranslations;
	}
	if (overrides.generateCheckboxWithLabel != null) {
		generateCheckboxWithLabel = overrides.generateCheckboxWithLabel;
	}
	if (overrides.generateSection != null) {
		generateSection = overrides.generateSection;
	}
	if (overrides.generateSldsFileInput != null) {
		generateSldsFileInput = overrides.generateSldsFileInput;
	}
	if (overrides.generateSldsModal != null) {
		generateSldsModal = overrides.generateSldsModal;
	}
	if (overrides.generateSldsModalWithTabList != null) {
		generateSldsModalWithTabList = overrides.generateSldsModalWithTabList;
	}
	if (overrides.getModalHanger != null) {
		getModalHanger = overrides.getModalHanger;
	}
	if (overrides.getSetupTabUl != null) {
		getSetupTabUl = overrides.getSetupTabUl;
	}
	if (overrides.injectStyle != null) injectStyle = overrides.injectStyle;
	if (overrides.sf_afterSet != null) sf_afterSet = overrides.sf_afterSet;
	if (overrides.showToast != null) showToast = overrides.showToast;
	inputModalParent = undefined;

	return {
		__getInputModalParent: () => inputModalParent,
		__setInputModalParent: (value) => {
			inputModalParent = value;
		},
		createImportModal,
		filterForUnexpectedTabKeys,
		generateSldsImport,
		getTabsFromJSON,
		makeValidTabs,
		readChangeOrDropFiles,
		readFile,
		showFileImport,
		showTabSelectThenImport,
	};
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
