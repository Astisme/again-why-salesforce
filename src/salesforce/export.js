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

export const { createExportModal } = createExportModule({
	modalId: MODAL_ID,
	toastError: TOAST_ERROR,
	toastWarning: TOAST_WARNING,
	whatExport: WHAT_EXPORT,
	documentRef: document,
	ensureAllTabsAvailabilityFn: ensureAllTabsAvailability,
	generateSldsModalWithTabListFn: generateSldsModalWithTabList,
	getModalHangerFn: getModalHanger,
	tabContainerRef: TabContainer,
	sendExtensionMessageFn: sendExtensionMessage,
	showToastFn: showToast,
});
