"use strict";
import { ensureAllTabsAvailability } from "/tabContainer.js";
import { EXTENSION_NAME } from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";

import {
	generateCheckboxWithLabel,
	generateSection,
	generateSldsFileInput,
	generateSldsModal,
	MODAL_ID,
} from "./generator.js";
import { getModalHanger, getSetupTabUl, showToast } from "./content.js";

const IMPORT_ID = `${EXTENSION_NAME}-import`;
const IMPORT_FILE_ID = `${IMPORT_ID}-file`;
const OVERWRITE_ID = `${IMPORT_ID}-overwrite`;
const OTHER_ORG_ID = `${IMPORT_ID}-other-org`;
const CLOSE_MODAL_ID = `${EXTENSION_NAME}-modal-close`;

/**
 * Generates an SLDS import modal for importing tabs.
 *
 * This function creates a modal dialog by calling generateSldsModal with the title "Import Tabs",
 * and then sets up a section with a full-width, flex container. It appends an SLDS file input component
 * (created by generateSldsFileInput) and three checkboxes with labels for import options:
 * "Overwrite saved tabs." and "Preserve tabs for other orgs."
 * Additionally, it assigns an ID to the close button using CLOSE_MODAL_ID.
 *
 * @returns {{
 *   modalParent: HTMLElement,
 *   saveButton: HTMLElement,
 *   closeButton: HTMLElement,
 *   inputContainer: HTMLInputElement
 * }} An object containing the modal's parent element, the save button, the close button, and the file input element.
 */
async function generateSldsImport() {
	const translator = await ensureTranslatorAvailability();
	const { modalParent, article, saveButton, closeButton } =
		await generateSldsModal(
			await translator.translate("import_tabs"),
		);
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
	style.textContent = ".hidden { display: none; }";
	divParent.appendChild(style);
	const duplicateWarning = document.createElement("span");
	duplicateWarning.textContent = await translator.translate(
		"import_duplicate_description",
	);
	duplicateWarning.style.textAlign = "center";
	divParent.append(duplicateWarning);
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
	otherOrgCheckbox.classList.add("hidden");
	divParent.appendChild(otherOrgCheckbox);
	overwriteCheckbox.addEventListener(
		"change",
		() => otherOrgCheckbox.classList.toggle("hidden"),
	);
	return { modalParent, saveButton, closeButton, inputContainer };
}

/**
 * Reads and processes JSON files using modern Promise-based API.
 *
 * @param {File|File[]} files - The file(s) to read and validate.
 * @param {HTMLElement} modalParent - The parent element of the modal containing option checkboxes.
 * @returns {Promise<void>}
 */
async function readFile(files, modalParent) {
	const fileArray = Array.isArray(files) ? files : [files];
	const validFileArray = [];
	// Validate all files first
	for (const file of fileArray) {
		if (file.type === "application/json") {
			validFileArray.push(file);
		} else {
			showToast("import_invalid_file", false);
		}
	}

	try {
		const overwritePick =
			modalParent.querySelector(`#${OVERWRITE_ID}`).checked;
		const otherOrgPick =
			modalParent.querySelector(`#${OTHER_ORG_ID}`).checked;
		const allTabs = await ensureAllTabsAvailability();
		const oldTabsLength = allTabs.length;
		for (const file of validFileArray) {
			const jsonString = await file.text();
			await allTabs.importTabs(
				jsonString,
				overwritePick,
				otherOrgPick,
			);
		}
		const totalImported = allTabs.length - oldTabsLength;
		// remove file import
		document.getElementById(CLOSE_MODAL_ID).click();
		showToast(["import_successful", totalImported, "tabs"], true);
	} catch (error) {
		showToast(["error_import", error.message], false);
	}
}

/**
 * Attaches event listeners to handle file uploads via both file selection and drag-and-drop.
 *
 * This function sets up listeners on the file input element (identified by the global `IMPORT_ID`)
 * within the modal. It handles the "change" event for file selection and "dragover", "dragleave",
 * and "drop" events for drag-and-drop actions. When a file is uploaded, it validates that the file
 * type is "application/json", retrieves import options (overwrite and other org picks)
 * from checkboxes within the modal, and reads the file as text using a FileReader.
 *
 * @param {HTMLElement} modalParent - The parent element of the modal that contains the file input and option checkboxes.
 */
function listenToFileUpload(modalParent) {
	const dropArea = document.getElementById(IMPORT_ID);
	/**
	 * Handles file selection via input change event.
	 * Prevents default behavior and reads the first selected file.
	 *
	 * @param {Event} event - The change event triggered by the file input.
	 */
	dropArea.addEventListener("change", function (event) {
		event.preventDefault();
		readFile(event.target.files[0], modalParent);
	});
	/**
	 * Handles the dragover event to allow file drop.
	 * Prevents default behavior to enable dropping files on the drop area.
	 *
	 * @param {DragEvent} event - The dragover event triggered when dragging files over the drop area.
	 */
	dropArea.addEventListener("dragover", function (event) {
		event.preventDefault();
	});
	/**
	 * Handles the dragleave event when dragged files leave the drop area.
	 * Prevents default behavior and can be used to update UI (e.g., remove highlight).
	 *
	 * @param {DragEvent} event - The dragleave event triggered when dragging files leaves the drop area.
	 */
	dropArea.addEventListener("dragleave", function (event) {
		event.preventDefault();
	});
	/**
	 * Handles the drop event of files onto the drop area.
	 * Prevents default behavior and reads all dropped files.
	 *
	 * @param {DragEvent} event - The drop event containing the dropped files.
	 */
	dropArea.addEventListener("drop", function (event) {
		event.preventDefault();
		readFile(Array.from(event.dataTransfer.files), modalParent);
	});
}

/**
 * Displays the file import modal if there are no other open modals.
 * If a modal is already open, shows a toast notification to close the other modal first.
 */
async function showFileImport() {
	if (
		getSetupTabUl().querySelector(`#${IMPORT_ID}`) != null ||
		document.getElementById(MODAL_ID) != null
	) {
		return showToast("error_close_other_modal", false);
	}

	const { modalParent, saveButton } = await generateSldsImport();

	getModalHanger().appendChild(modalParent);

	saveButton.remove();
	listenToFileUpload(modalParent);
}

/**
 * Displays the file import modal to the user.
 * If an error occurs during the display, shows an error toast notification.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function createImportModal() {
	try {
		await showFileImport();
	} catch (error) {
		showToast(error, false);
	}
}
