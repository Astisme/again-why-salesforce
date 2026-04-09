"use strict";

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
	/**
	 * Displays the export modal when no other modal is open.
	 *
	 * @return {Promise<void>}
	 */
	async function showExportModal() {
		if (documentRef.getElementById(modalId) != null) {
			return showToastFn("error_close_other_modal", toastError);
		}
		const allTabs = await ensureAllTabsAvailabilityFn();
		const {
			modalParent,
			saveButton,
			closeButton,
			getSelectedTabs,
		} = await generateSldsModalWithTabListFn(allTabs, {
			title: "export_tabs",
			saveButtonLabel: "export",
			explainer: "select_tabs_export",
		});
		getModalHangerFn().appendChild(modalParent);
		saveButton.addEventListener("click", (e) => {
			e.preventDefault();
			const { tabs, selectedAll } = getSelectedTabs();
			if (tabs.length === 0) {
				return showToastFn("error_no_tabs_selected", toastWarning);
			}
			closeButton.click();
			const tabCont = tabContainerRef.getThrowawayInstance();
			tabCont.push(tabs);
			tabCont.pinned = selectedAll ? allTabs.pinned : 0;
			sendExtensionMessageFn({
				what: whatExport,
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
			const message = error instanceof Error
				? error.message
				: String(error);
			showToastFn(message, toastError);
		}
	}

	return {
		createExportModal,
	};
}
