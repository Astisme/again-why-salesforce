import { assertEquals } from "@std/testing/asserts";
import { MockElement } from "../action/mock-dom.ts";
import { loadIsolatedModule } from "../load-isolated-module.ts";

type ExportModule = {
	createExportModal: () => Promise<void>;
};

type ExportDependencies = {
	MODAL_ID: string;
	TOAST_ERROR: string;
	TOAST_WARNING: string;
	TabContainer: {
		getThrowawayInstance: () => {
			pinned: number;
			push: (tabs: unknown[]) => void;
			toJSON: () => {
				pinned: number;
				tabs: unknown[];
			};
		};
	};
	WHAT_EXPORT: string;
	document: {
		getElementById: (id: string) => MockElement | null;
	};
	ensureAllTabsAvailability: () => Promise<{ pinned: number }>;
	generateSldsModalWithTabList: (
		allTabs: { pinned: number },
		options: Record<string, string>,
	) => Promise<{
		closeButton: MockElement;
		getSelectedTabs: () => { selectedAll: boolean; tabs: unknown[] };
		modalParent: MockElement;
		saveButton: MockElement;
	}>;
	getModalHanger: () => MockElement;
	sendExtensionMessage: (message: Record<string, unknown>) => void;
	showToast: (message: string, status?: string) => void;
};

/**
 * Loads export.js with isolated dependencies and configurable selection state.
 *
 * @param {Object} options Fixture options.
 * @param {Error | null} [options.generateError=null] Error thrown while generating the modal.
 * @param {boolean} [options.hasExistingModal=false] Whether another modal is already open.
 * @param {number} [options.pinned=0] Pinned tab count on the full tab list.
 * @param {boolean} [options.selectedAll=false] Whether all tabs are selected.
 * @param {unknown[]} [options.selectedTabs=[]] Selected tabs returned by the modal.
 * @return {Promise<{ appended: MockElement[]; closeClicks: { value: number; }; messages: Record<string, unknown>[]; modalOptions: Record<string, string>[]; module: ExportModule; saveButton: MockElement | null; toasts: { message: string; status?: string; }[]; }>} Loaded fixture.
 */
async function loadExportModule({
	generateError = null,
	hasExistingModal = false,
	pinned = 0,
	selectedAll = false,
	selectedTabs = [],
}: {
	generateError?: Error | null;
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

	const { cleanup, module } = await loadIsolatedModule<
		ExportModule,
		ExportDependencies
	>({
		modulePath: new URL("../../src/salesforce/export.js", import.meta.url),
		dependencies: {
			MODAL_ID: "awsf-modal",
			TOAST_ERROR: "error",
			TOAST_WARNING: "warning",
			TabContainer: {
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
			WHAT_EXPORT: "export",
			document: {
				getElementById: () =>
					hasExistingModal ? new MockElement("div") : null,
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					pinned,
				}),
			generateSldsModalWithTabList: (_allTabs, options) => {
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
			getModalHanger: () => modalHanger,
			sendExtensionMessage: (message) => {
				messages.push(message);
			},
			showToast: (message, status) => {
				toasts.push({ message, status });
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"/functions.js",
			"/tabContainer.js",
			"./generator.js",
			"./content.js",
		]),
	});

	return {
		appended,
		cleanup,
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
	const fixture = await loadExportModule({
		hasExistingModal: true,
	});

	try {
		await fixture.module.createExportModal();

		assertEquals(fixture.toasts, [{
			message: "error_close_other_modal",
			status: "error",
		}]);
		assertEquals(fixture.messages, []);
		assertEquals(fixture.appended, []);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("export warns when the user tries to export with no tabs selected", async () => {
	const fixture = await loadExportModule({
		selectedAll: false,
		selectedTabs: [],
	});

	try {
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
	} finally {
		fixture.cleanup();
	}
});

Deno.test("export sends the selected tabs to the background script", async () => {
	const fixture = await loadExportModule({
		pinned: 2,
		selectedAll: true,
		selectedTabs: [{ label: "Accounts", url: "/setup" }],
	});

	try {
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
	} finally {
		fixture.cleanup();
	}
});

Deno.test("export resets pinned count when only part of the tab list is exported", async () => {
	const fixture = await loadExportModule({
		pinned: 2,
		selectedAll: false,
		selectedTabs: [{ label: "Contacts", url: "/contacts" }],
	});

	try {
		await fixture.module.createExportModal();
		fixture.saveButton?.click();

		assertEquals(fixture.messages, [{
			tabs: {
				pinned: 0,
				tabs: [{ label: "Contacts", url: "/contacts" }],
			},
			what: "export",
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("export surfaces modal-generation errors as toast messages", async () => {
	const fixture = await loadExportModule({
		generateError: new Error("boom"),
	});

	try {
		await fixture.module.createExportModal();

		assertEquals(fixture.toasts, [{
			message: "boom",
			status: "error",
		}]);
	} finally {
		fixture.cleanup();
	}
});
