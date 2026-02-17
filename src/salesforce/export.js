"use strict";
import { WHAT_EXPORT } from "/constants.js";
import { sendExtensionMessage } from "/functions.js";
import { ensureAllTabsAvailability, TabContainer } from "/tabContainer.js";
import { generateSldsModalWithTabList, MODAL_ID } from "./generator.js";
import { getModalHanger, showToast } from "./content.js";

/**
 * Displays the export modal if there are no other open modals.
 * If a modal is already open, shows a toast notification to close the other modal first.
 * @return undefined
 */
async function showExportModal() {
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", { isError: true });
	}
	const allTabs = await ensureAllTabsAvailability();
	const {
		modalParent,
		saveButton,
		closeButton,
		getSelectedTabs,
	} = await generateSldsModalWithTabList(allTabs, {
		title: "export_tabs",
		saveButtonLabel: "export",
		explainer: "select_tabs_export",
	});
	getModalHanger().appendChild(modalParent);
	saveButton.addEventListener("click", (e) => {
		e.preventDefault();
		const { tabs, selectedAll } = getSelectedTabs();
		if (tabs.length === 0) {
			return showToast("error_no_tabs_selected", { isWarning: true });
		}
		closeButton.click();
		// Send message to background script to handle export
		const tabCont = TabContainer.getThrowawayInstance();
		tabCont.push(tabs);
		tabCont.pinned = selectedAll ? allTabs.pinned : 0;
		sendExtensionMessage({
			what: WHAT_EXPORT,
			tabs: tabCont.toJSON(),
		});
	});
}

/**
 * Displays the export modal to the user.
 * If an error occurs during the display, shows an error toast notification.
 *
 * @async
 * @return {Promise<void>}
 */
export async function createExportModal() {
	try {
		await showExportModal();
	} catch (error) {
		showToast(error.message, { isError: true });
	}
}
