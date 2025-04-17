"use strict";
import { BROWSER, EXTENSION_NAME } from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";

import {
	generateCheckboxWithLabel,
	generateSection,
	generateSldsFileInput,
	generateSldsModal,
	MODAL_ID,
} from "./generator.js";
import {
	ensureAllTabsAvailability,
	getAllTabs,
	getModalHanger,
	getSetupTabUl,
	showToast,
} from "./content.js";

let allTabs;
const interval = setInterval(() => {
	try {
		allTabs = getAllTabs();
		clearInterval(interval);
	} catch (_) {
		// wait next interval
	}
}, 100);

let overwritePick;
let otherOrgPick;
const IMPORT_ID = `${EXTENSION_NAME}-import`;
const IMPORT_FILE_ID = `${IMPORT_ID}-file`;
const OVERWRITE_ID = `${IMPORT_ID}-overwrite`;
const OTHER_ORG_ID = `${IMPORT_ID}-other-org`;
const CLOSE_MODAL_ID = `${EXTENSION_NAME}-modal-close`;

const reader = new FileReader();

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
	const { modalParent, article, saveButton, closeButton } = await generateSldsModal(
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
	duplicateWarning.innerHTML = await translator.translate("import_duplicate_description");
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

reader.onload = async (e) => {
	try {
		const jsonString = e.target.result;
		allTabs = await ensureAllTabsAvailability();
		const importedNum = await allTabs.importTabs(
			jsonString,
			overwritePick,
			otherOrgPick,
		);
		// remove file import
		document.getElementById(CLOSE_MODAL_ID).click();
		showToast(["import_successful", importedNum, "tabs"], true);
		if (jsonString.includes("tabTitle")) {
			// export and toast
			BROWSER.runtime.sendMessage({
				message: { what: "export", tabs: allTabs },
			});
			showToast(
				"warn_deprecated_tab_title",
				false,
				true,
			);
		}
	} catch (error) {
		showToast(
			["error_import", error.message],
			false,
		);
	}
};

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
	/**
	 * Reads the content of a JSON file and processes it. If the file is not of the correct type, shows an error toast.
	 *
	 * @param {File} file - The file to read and validate.
	 * @returns {void}
	 */
	function readFile(file) {
		if (file.type !== "application/json") {
			return showToast(
				"import_invalid_file",
				false,
			);
		}
		overwritePick = modalParent.querySelector(`#${OVERWRITE_ID}`).checked;
		otherOrgPick = modalParent.querySelector(`#${OTHER_ORG_ID}`).checked;
		reader.readAsText(file);
	}
	const dropArea = document.getElementById(IMPORT_ID);
	dropArea.addEventListener("change", function (event) {
		event.preventDefault();
		readFile(event.target.files[0]);
	});
	dropArea.addEventListener("dragover", function (event) {
		event.preventDefault();
		//console.log('dragover')
		//dropArea.classList.add("slds-has-drag-over");
	});
	dropArea.addEventListener("dragleave", function (event) {
		event.preventDefault();
		//console.log('dragleave')
		//dropArea.classList.remove("slds-has-drag-over");
	});
	dropArea.addEventListener("drop", function (event) {
		event.preventDefault();
		Array.from(event.dataTransfer.files).forEach((f) => readFile(f));
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

// listen from saves from the action page
BROWSER.runtime.onMessage.addListener(function (message, _, sendResponse) {
	if (message == null || message.what == null) {
		return;
	}
	if (message.what == "add") {
		sendResponse(null);
        try {
            showFileImport();
        } catch (error) {
            showToast(error, false);
        }
	}
});
