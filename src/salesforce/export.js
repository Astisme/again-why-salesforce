"use strict";
import {
	MODAL_ID,
	TOAST_ERROR,
	TOAST_WARNING,
	WHAT_EXPORT,
} from "../core/constants.js";
import { sendExtensionMessage } from "../core/functions.js";
import {
	ensureAllTabsAvailability,
	TabContainer,
} from "../core/tabContainer.js";
import { generateSldsModalWithTabList } from "./generator.js";
import { showToast } from "./toast.js";
import { getModalHanger } from "./sf-elements.js";
import { createExportModule } from "./runtime/export-runtime.js";

let exportModule;

/**
 * Returns the lazily-created export module singleton.
 *
 * @return {{ createExportModal: () => Promise<void> }} Export module API.
 */
export function getModule() {
	exportModule ??= createExportModule({
		modalId: MODAL_ID,
		toastError: TOAST_ERROR,
		toastWarning: TOAST_WARNING,
		whatExport: WHAT_EXPORT,
		documentRef: document,
		ensureAllTabsAvailability,
		generateSldsModalWithTabList,
		getModalHanger,
		tabContainerRef: TabContainer,
		sendExtensionMessage,
		showToast,
	});
	return exportModule;
}

/**
 * Test-only controls for the export module lifecycle.
 */
export const __testHooks = {
	getModule,
	resetModule() {
		exportModule = undefined;
	},
	setModule(module) {
		exportModule = module;
	},
};

/**
 * Shows the export modal.
 *
 * @return {Promise<void>}
 */
export function createExportModal() {
	return getModule().createExportModal();
}
