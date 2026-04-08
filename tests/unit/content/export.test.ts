import { assertEquals } from "@std/testing/asserts";
import { MockElement } from "../ui/mock-dom.test.ts";
import { createExportModule } from "../../../src/salesforce/export-runtime.js";

type ExportModule = {
	createExportModal: () => Promise<void>;
};

/**
 * Loads export.js with isolated dependencies and configurable selection state.
 *
 * @param {Object} options Fixture options.
 * @param {unknown} [options.generateError=null] Error thrown while generating the modal.
 * @param {boolean} [options.hasExistingModal=false] Whether another modal is already open.
 * @param {number} [options.pinned=0] Pinned tab count on the full tab list.
 * @param {boolean} [options.selectedAll=false] Whether all tabs are selected.
 * @param {unknown[]} [options.selectedTabs=[]] Selected tabs returned by the modal.
 * @return {Promise<{ appended: MockElement[]; closeClicks: { value: number; }; messages: Record<string, unknown>[]; modalOptions: Record<string, string>[]; module: ExportModule; saveButton: MockElement | null; toasts: { message: string; status?: string; }[]; }>} Loaded fixture.
 */
function loadExportModule({
	generateError = null,
	hasExistingModal = false,
	pinned = 0,
	selectedAll = false,
	selectedTabs = [],
}: {
		generateError?: unknown;
	hasExistingModal?: boolean;
	pinned?: number;
	selectedAll?: boolean;
	selectedTabs?: unknown[];
}) {
	const modalParent = new MockElement("div");
	const saveButton = new MockElement("button");
	const closeButton = new MockElement("button");
	const modalHanger = new MockElement("div");
	const appended: MockElement[] = [];
	const messages: Record<string, unknown>[] = [];
	const modalOptions: Record<string, string>[] = [];
	const toasts: { message: string; status?: string }[] = [];
	const closeClicks = { value: 0 };
	let pushedTabs: unknown[] = [];
	closeButton.click = () => {
		closeClicks.value++;
		return undefined;
	};
	modalHanger.appendChild = (child) => {
		appended.push(child);
		return child;
	};
	const module = createExportModule({
		modalId: "awsf-modal",
		toastError: "error",
		toastWarning: "warning",
		whatExport: "export",
		documentRef: {
			getElementById: () =>
				hasExistingModal ? new MockElement("div") : null,
		},
		ensureAllTabsAvailabilityFn: () =>
			Promise.resolve({
				pinned,
			}),
		generateSldsModalWithTabListFn: (_allTabs, options) => {
			if (generateError != null) {
				throw generateError;
			}
			modalOptions.push(options);
			return Promise.resolve({
				closeButton,
				getSelectedTabs: () => ({
					selectedAll,
					tabs: selectedTabs,
				}),
				modalParent,
				saveButton,
			});
		},
		getModalHangerFn: () => modalHanger as never,
		tabContainerRef: {
			getThrowawayInstance: () => ({
				pinned: 0,
				push: (tabs) => {
					pushedTabs = tabs;
				},
				toJSON: function () {
					return {
						pinned: this.pinned,
						tabs: pushedTabs,
					};
				},
			}),
		},
		sendExtensionMessageFn: (message) => {
			messages.push(message);
		},
		showToastFn: (message, status) => {
			toasts.push({ message, status });
		},
	});

	return {
		appended,
		closeClicks,
		messages,
		modalOptions,
		module,
		saveButton: generateError == null && !hasExistingModal
			? saveButton
			: null,
		toasts,
	};
}

Deno.test("export blocks opening a second modal and shows an error toast", async () => {
	const fixture = loadExportModule({
		hasExistingModal: true,
	});
	await fixture.module.createExportModal();

	assertEquals(fixture.toasts, [{
		message: "error_close_other_modal",
		status: "error",
	}]);
	assertEquals(fixture.messages, []);
	assertEquals(fixture.appended, []);
});

Deno.test("export warns when the user tries to export with no tabs selected", async () => {
	const fixture = loadExportModule({
		selectedAll: false,
		selectedTabs: [],
	});
	await fixture.module.createExportModal();
	fixture.saveButton?.click();

	assertEquals(fixture.modalOptions, [{
		explainer: "select_tabs_export",
		saveButtonLabel: "export",
		title: "export_tabs",
	}]);
	assertEquals(fixture.appended.length, 1);
	assertEquals(fixture.toasts, [{
		message: "error_no_tabs_selected",
		status: "warning",
	}]);
	assertEquals(fixture.messages, []);
});

Deno.test("export sends the selected tabs to the background script", async () => {
	const fixture = loadExportModule({
		pinned: 2,
		selectedAll: true,
		selectedTabs: [{ label: "Accounts", url: "/setup" }],
	});
	await fixture.module.createExportModal();
	fixture.saveButton?.click();

	assertEquals(fixture.closeClicks.value, 1);
	assertEquals(fixture.messages, [{
		tabs: {
			pinned: 2,
			tabs: [{ label: "Accounts", url: "/setup" }],
		},
		what: "export",
	}]);
	assertEquals(fixture.toasts, []);
});

Deno.test("export resets pinned count when only part of the tab list is exported", async () => {
	const fixture = loadExportModule({
		pinned: 2,
		selectedAll: false,
		selectedTabs: [{ label: "Contacts", url: "/contacts" }],
	});
	await fixture.module.createExportModal();
	fixture.saveButton?.click();

	assertEquals(fixture.messages, [{
		tabs: {
			pinned: 0,
			tabs: [{ label: "Contacts", url: "/contacts" }],
		},
		what: "export",
	}]);
});

Deno.test("export surfaces modal-generation errors as toast messages", async () => {
	const fixture = loadExportModule({
		generateError: new Error("boom"),
	});
	await fixture.module.createExportModal();

	assertEquals(fixture.toasts, [{
		message: "boom",
		status: "error",
	}]);
});

Deno.test("export stringifies non-error failures before showing error toast", async () => {
	const fixture = loadExportModule({
		generateError: "boom-string",
	});

	await fixture.module.createExportModal();

	assertEquals(fixture.toasts, [{
		message: "boom-string",
		status: "error",
	}]);
});
