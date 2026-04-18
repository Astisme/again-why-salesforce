"use strict";
let modalIdRuntime;
let toastErrorRuntime;
let toastWarningRuntime;
let whatExportRuntime;
let documentRuntime;
let ensureAllTabsAvailabilityRuntime;
let generateSldsModalWithTabListRuntime;
let getModalHangerRuntime;
let tabContainerRuntime;
let sendExtensionMessageRuntime;
let showToastRuntime;

/**
 * Displays the export modal when no other modal is open.
 *
 * @return {Promise<void>}
 */
async function showExportModal() {
	if (documentRuntime.getElementById(modalIdRuntime) != null) {
		return showToastRuntime("error_close_other_modal", toastErrorRuntime);
	}
	const allTabs = await ensureAllTabsAvailabilityRuntime();
	const {
		modalParent,
		saveButton,
		closeButton,
		getSelectedTabs,
	} = await generateSldsModalWithTabListRuntime(allTabs, {
		title: "export_tabs",
		saveButtonLabel: "export",
		explainer: "select_tabs_export",
	});
	getModalHangerRuntime().appendChild(modalParent);
	saveButton.addEventListener("click", (e) => {
		e.preventDefault();
		const { tabs, selectedAll } = getSelectedTabs();
		if (tabs.length === 0) {
			return showToastRuntime(
				"error_no_tabs_selected",
				toastWarningRuntime,
			);
		}
		closeButton.click();
		const tabCont = tabContainerRuntime.getThrowawayInstance();
		tabCont.push(tabs);
		tabCont.pinned = selectedAll ? allTabs.pinned : 0;
		sendExtensionMessageRuntime({
			what: whatExportRuntime,
			tabs: tabCont.toJSON(),
		});
	});
}

/**
 * Displays the export modal and gracefully reports failures.
 *
 * @return {Promise<void>}
 */
async function createExportModal() {
	try {
		await showExportModal();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		showToastRuntime(message, toastErrorRuntime);
	}
}

/**
 * Creates export-modal behavior with injected runtime dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {string} options.modalId Modal id used to detect existing dialogs.
 * @param {string} options.toastError Error toast type.
 * @param {string} options.toastWarning Warning toast type.
 * @param {string} options.whatExport Message reason for export.
 * @param {{ getElementById: (id: string) => unknown }} options.documentRef Document wrapper.
 * @param {() => Promise<{ pinned: number }>} options.ensureAllTabsAvailabilityFn Tabs resolver.
 * @param {(allTabs: { pinned: number }, options: { title: string; saveButtonLabel: string; explainer: string }) => Promise<{
 *   modalParent: unknown;
 *   saveButton: { addEventListener: (type: string, listener: (event: Event) => void) => void };
 *   closeButton: { click: () => void };
 *   getSelectedTabs: () => { tabs: unknown[]; selectedAll: boolean };
 * }>} options.generateSldsModalWithTabListFn Modal generator.
 * @param {() => { appendChild: (child: unknown) => unknown }} options.getModalHangerFn Modal hanger resolver.
 * @param {{ getThrowawayInstance: () => {
 *   pinned: number;
 *   push: (tabs: unknown[]) => void;
 *   toJSON: () => unknown;
 * } }} options.tabContainerRef TabContainer wrapper.
 * @param {(message: Record<string, unknown>) => void} options.sendExtensionMessageFn Message sender.
 * @param {(message: string, status?: string) => void} options.showToastFn Toast renderer.
 * @return {{ createExportModal: () => Promise<void> }} Export module API.
 */
export function createExportModule({
	modalId,
	toastError,
	toastWarning,
	whatExport,
	documentRef,
	ensureAllTabsAvailabilityFn,
	generateSldsModalWithTabListFn,
	getModalHangerFn,
	tabContainerRef,
	sendExtensionMessageFn,
	showToastFn,
}) {
	modalIdRuntime = modalId;
	toastErrorRuntime = toastError;
	toastWarningRuntime = toastWarning;
	whatExportRuntime = whatExport;
	documentRuntime = documentRef;
	ensureAllTabsAvailabilityRuntime = ensureAllTabsAvailabilityFn;
	generateSldsModalWithTabListRuntime = generateSldsModalWithTabListFn;
	getModalHangerRuntime = getModalHangerFn;
	tabContainerRuntime = tabContainerRef;
	sendExtensionMessageRuntime = sendExtensionMessageFn;
	showToastRuntime = showToastFn;

	return {
		createExportModal,
	};
}
