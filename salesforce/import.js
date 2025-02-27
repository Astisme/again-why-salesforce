"use strict";
import {
	EXTENSION_NAME,
} from "/constants.js"
import {
    generateSldsFileInput,
    generateSldsModal,
    generateCheckboxWithLabel,
    MODAL_ID,
    generateSection,
} from "./generator.js"
import {
    // functions
    showToast,
    getModalHanger,
    getAllTabs,
    ensureAllTabsAvailability,
    getSetupTabUl,
} from "./content.js"

let allTabs;
const interval = setInterval(() => {
    try {
        allTabs = getAllTabs();
        clearInterval(interval);
    } catch (error) {
    }
}, 100)

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
function generateSldsImport() {
	const { modalParent, article, saveButton, closeButton } = generateSldsModal(
		"Import Tabs",
	);
	closeButton.id = CLOSE_MODAL_ID;
	const { section, divParent } = generateSection();
	divParent.style.width = "100%"; // makes the elements inside have full width
	divParent.style.display = "flex";
	divParent.style.alignItems = "center";
	divParent.style.flexDirection = "column";
	article.appendChild(section);
	const { fileInputWrapper, inputContainer } = generateSldsFileInput(
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
	duplicateWarning.innerHTML =
		"Duplicate tabs will be ignored.<br />Two tabs are considered duplicates if they have the same URL.";
	duplicateWarning.style.textAlign = "center";
	divParent.append(duplicateWarning);
	const overwriteCheckbox = generateCheckboxWithLabel(
		OVERWRITE_ID,
		"Overwrite saved tabs.",
		false,
	);
	divParent.appendChild(overwriteCheckbox);
	const otherOrgCheckbox = generateCheckboxWithLabel(
		OTHER_ORG_ID,
		"Preserve tabs for other orgs.",
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
        await ensureAllTabsAvailability();
        const importedNum = await allTabs.importTabs(jsonString, overwritePick, otherOrgPick);
        // remove file import
        document.getElementById(CLOSE_MODAL_ID).click();
        showToast(`Successfully imported ${importedNum} tabs.`,true);
        if(jsonString.includes("tabTitle")){
            // export and toast
            chrome.runtime.sendMessage({message: { what: "export", tabs: JSON.parse(jsonString) }});
            showToast(
                "You've imported using the deprecated 'tabTitle'!\nThe download of the updated file has begun.\nFrom now on, use the newly downloaded file please.\nThe use of such file will be discontinued with a later release.",
                false,
                true,
            );
        }
	} catch (error) {
		showToast(
			`Error during import:\n${error.message}`,
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
	function readFile(file) {
		if (file.type !== "application/json") {
			return showToast(
				`Invalid file type: ${file.type}.\nOnly JSON files are supported.`,
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
 * Displays the import modal for uploading tab data.
 */
function showFileImport() {
	if (
		getSetupTabUl().querySelector(`#${IMPORT_ID}`) != null ||
		document.getElementById(MODAL_ID) != null
	) {
		return showToast("Close the other modal first!", false);
	}

	const { modalParent, saveButton } = generateSldsImport();

	getModalHanger().appendChild(modalParent);

	saveButton.remove();
	listenToFileUpload(modalParent);
}

// listen from saves from the action page
chrome.runtime.onMessage.addListener(function (message, _, sendResponse) {
	if (message == null || message.what == null) {
		return;
	}
	if (message.what == "add") {
		sendResponse(null);
		showFileImport();
	}
});
