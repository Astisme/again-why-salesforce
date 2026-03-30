import { assertEquals } from "@std/testing/asserts";
import { MockElement } from "../ui/mock-dom.test.ts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

type ImportModule = {
	__getInputModalParent: () => MockElement | null | undefined;
	__setInputModalParent: (value: MockElement | null) => void;
	createImportModal: () => Promise<void>;
	filterForUnexpectedTabKeys: (
		tabs?: Record<string, unknown>[] | null,
	) => unknown[];
	generateSldsImport: () => Promise<{
		closeButton: MockElement;
		inputContainer: MockElement;
		saveButton: MockElement;
	}>;
	getTabsFromJSON: (
		jsonWithTabs?: Record<string, unknown> | null,
	) => unknown[];
	makeValidTabs: (
		tabs?: Record<string, unknown>[] | null,
		mapping?: { label?: string; org?: string; url?: string },
	) => unknown[];
	readFile: (files: FileLike[] | FileLike) => Promise<void>;
	readChangeOrDropFiles: (event: {
		dataTransfer?: {
			files?: FileLike[];
			items?: { getAsFile: () => FileLike | null }[];
		};
		preventDefault: () => void;
		target?: { files?: FileLike[] };
	}) => Promise<void>;
	showFileImport: () => Promise<void>;
	showTabSelectThenImport: (
		files?: FileLike[],
		importConfig?: Record<string, boolean>,
	) => Promise<void>;
};

type FileLike = {
	name?: string;
	text: () => Promise<string>;
	type: string;
};

type ImportDependencies = {
	BROWSER: {
		runtime: {
			getURL: (path: string) => string;
		};
	};
	EXTENSION_NAME: string;
	HIDDEN_CLASS: string;
	MODAL_ID: string;
	TOAST_ERROR: string;
	TOAST_WARNING: string;
	Tab: {
		hasUnexpectedKeys: (tab: Record<string, unknown>) => boolean;
	};
	TabContainer: {
		getThrowawayInstance: (options?: {
			pinned?: number;
			tabs?: unknown[];
		}) => {
			pinned: number;
			push?: (tabs: unknown[]) => void;
			sort: (options: { sortBy: string }, sync: boolean) => void;
			toString: () => string;
		};
		keyPinnedTabsNo: string;
		keyTabs: string;
	};
	document: {
		createElement: (tagName: string) => MockElement;
		getElementById: (id: string) => MockElement | null;
	};
	ensureAllTabsAvailability: () => Promise<{
		importTabs: (
			json: string,
			config: Record<string, boolean>,
		) => Promise<number>;
	}>;
	ensureTranslatorAvailability: () => Promise<{
		translate: (message: string) => Promise<string>;
	}>;
	generateCheckboxWithLabel: (
		id: string,
		label: string,
		checked: boolean,
	) => Promise<MockElement>;
	generateSection: () => Promise<{
		divParent: MockElement;
		section: MockElement;
	}>;
	generateSldsFileInput: (
		importId: string,
		fileId: string,
		accept: string,
	) => Promise<{
		fileInputWrapper: MockElement;
		inputContainer: MockElement;
	}>;
	generateSldsModal: (options: {
		modalTitle: string;
	}) => Promise<{
		article: MockElement;
		closeButton: MockElement;
		modalParent: MockElement & {
			querySelector: (selector: string) => MockElement | null;
		};
		saveButton: MockElement & { remove: () => void };
	}>;
	generateSldsModalWithTabList: (
		tabs: unknown,
		options: Record<string, string>,
	) => Promise<{
		closeButton: MockElement;
		getSelectedTabs: () => { selectedAll: boolean; tabs: unknown[] };
		modalParent: MockElement;
		saveButton: MockElement;
	}>;
	getModalHanger: () => MockElement;
	getSetupTabUl: () => {
		querySelector: (selector: string) => MockElement | null;
	};
	injectStyle: (
		id: string,
		options: { css?: string; link?: string },
	) => MockElement;
	showToast: (message: string | unknown[], status?: string) => void;
	sf_afterSet: (message: SfAfterSetPayload) => void;
};

type SfAfterSetPayload = {
	shouldReload?: boolean;
	tabs?: {
		importTabs: (
			json: string,
			config: Record<string, boolean>,
		) => Promise<number>;
	} | null;
	what?: string;
};

type ImportFixture = {
	appendCount: { value: number };
	changeTarget: MockElement;
	cleanup: () => void;
	closeClicks: { value: number };
	fileCheckboxes: Record<string, MockElement>;
	hangerChildren: MockElement[];
	importCalls: { config: Record<string, boolean>; json: string }[];
	injectStyleCalls: {
		id: string;
		options: { css?: string; link?: string };
	}[];
	modalListCalls: Record<string, string>[];
	module: ImportModule;
	modalBuildCount: { value: number };
	saveButton: MockElement;
	selectedSaveButton: MockElement;
	setModalPresent: (value: boolean) => void;
	setSetupImportPresent: (value: boolean) => void;
	toasts: { message: string | unknown[]; status?: string }[];
};

/**
 * Minimal TabContainer replacement supporting the import flow's `instanceof` checks.
 */
class MockTabContainer {
	static keyPinnedTabsNo = "pinnedTabsNo";
	static keyTabs = "tabs";
	pinned: number;
	#tabs: unknown[];

	/**
	 * Creates a throwaway tab container.
	 *
	 * @param {{ pinned?: number; tabs?: unknown[]; }} [options={}] Initial state.
	 */
	constructor(
		{ pinned = 0, tabs = [] }: { pinned?: number; tabs?: unknown[] } = {},
	) {
		this.pinned = pinned;
		this.#tabs = [...tabs];
	}

	/**
	 * Creates a container instance matching the real static helper.
	 *
	 * @param {{ pinned?: number; tabs?: unknown[]; }} [options={}] Initial state.
	 * @return {MockTabContainer} Container instance.
	 */
	static getThrowawayInstance(
		options: { pinned?: number; tabs?: unknown[] } = {},
	) {
		return new MockTabContainer(options);
	}

	/**
	 * Pushes tabs into the container.
	 *
	 * @param {unknown[]} tabs Tabs to append.
	 * @return {void}
	 */
	push(tabs: unknown[]) {
		this.#tabs.push(...tabs);
	}

	/**
	 * Sorts tabs by URL, matching the behavior the test relies on.
	 *
	 * @param {{ sortBy: string; }} _options Sort options.
	 * @param {boolean} _sync Sync flag.
	 * @return {void}
	 */
	sort(_options: { sortBy: string }, _sync: boolean) {
		this.#tabs = [...this.#tabs].sort((a, b) =>
			String((a as Record<string, unknown>).url ?? "").localeCompare(
				String((b as Record<string, unknown>).url ?? ""),
			)
		);
	}

	/**
	 * Serializes the container.
	 *
	 * @return {string} JSON payload.
	 */
	toString() {
		return JSON.stringify({ pinned: this.pinned, tabs: this.#tabs });
	}
}

/**
 * Creates a JSON-like file stub.
 *
 * @param {string} type Mime type.
 * @param {string} contents File contents.
 * @param {string} [name=""] Optional file name.
 * @return {FileLike} File stub.
 */
function createFile(type: string, contents: string, name = ""): FileLike {
	return {
		name,
		text: () => Promise.resolve(contents),
		type,
	};
}

/**
 * Loads import.js with configurable selection and file-import behavior.
 *
 * @param {Object} options Fixture options.
 * @param {Record<string, boolean>} [options.checkboxState={}] Initial checkbox state.
 * @param {Error | null} [options.generateModalError=null] Error thrown while creating the input modal.
 * @param {boolean} [options.hasExistingModal=false] Whether another modal is already open.
 * @param {number} [options.importCount=2] Count returned by importTabs.
 * @param {boolean} [options.clearInputModalParentOnRemove=false] Whether removing the save button clears the module modal parent.
 * @param {boolean} [options.missingModalParentOnce=false] Whether the first modal generation returns a null parent.
 * @param {boolean} [options.selectedAll=false] Whether all tabs were selected in the pick modal.
 * @param {unknown[]} [options.selectedTabs=[]] Tabs selected in the pick modal.
 * @return {Promise<ImportFixture>} Loaded fixture.
 */
async function loadImportModule({
	checkboxState = {},
	clearInputModalParentOnRemove = false,
	generateModalError = null,
	hasExistingModal = false,
	importCount = 2,
	missingModalParentOnce = false,
	selectedAll = false,
	selectedTabs = [],
}: {
	checkboxState?: Record<string, boolean>;
	clearInputModalParentOnRemove?: boolean;
	generateModalError?: Error | null;
	hasExistingModal?: boolean;
	importCount?: number;
	missingModalParentOnce?: boolean;
	selectedAll?: boolean;
	selectedTabs?: unknown[];
}) {
	const importId = "again-why-salesforce-import";
	const selectTabsId = `${importId}-select-tabs`;
	const metadataId = `${importId}-metadata`;
	const overwriteId = `${importId}-overwrite`;
	const otherOrgId = `${importId}-other-org`;
	const closeModalId = `${importId}-modal-close`;
	const fileCheckboxes: Record<string, MockElement> = {};
	const modalParent = new MockElement("div") as MockElement & {
		querySelector: (selector: string) => MockElement | null;
	};
	const article = new MockElement("article");
	const saveButton = new MockElement("button") as MockElement & {
		remove: () => void;
	};
	const closeButton = new MockElement("button");
	const fileInputWrapper = new MockElement("div");
	const inputContainer = new MockElement("input");
	const selectedModalParent = new MockElement("div");
	const selectedSaveButton = new MockElement("button");
	const selectedCloseButton = new MockElement("button");
	const modalHanger = new MockElement("div");
	const changeTarget = new MockElement("div");
	const toasts: { message: string | unknown[]; status?: string }[] = [];
	const afterSetCalls: SfAfterSetPayload[] = [];
	const importCalls: { config: Record<string, boolean>; json: string }[] = [];
	const hangerChildren: MockElement[] = [];
	const appendCount = { value: 0 };
	const closeClicks = { value: 0 };
	const modalListCalls: Record<string, string>[] = [];
	const injectStyleCalls: {
		id: string;
		options: { css?: string; link?: string };
	}[] = [];
	let modalPresent = false;
	let modalBuildCount = 0;
	let clearedInputModalParent = false;
	let setInputModalParent: ((value: MockElement | null) => void) | null =
		null;
	let setupImportPresent = false;

	saveButton.remove = () => {
		if (clearInputModalParentOnRemove && !clearedInputModalParent) {
			clearedInputModalParent = true;
			modalPresent = false;
			setInputModalParent?.(null);
		}
		appendCount.value++;
	};
	closeButton.click = () => {
		modalPresent = false;
		closeClicks.value++;
		return undefined;
	};
	selectedCloseButton.click = () => {
		closeClicks.value++;
		return undefined;
	};
	modalHanger.appendChild = (child) => {
		hangerChildren.push(child);
		return child;
	};
	changeTarget.addEventListener = MockElement.prototype.addEventListener.bind(
		changeTarget,
	);
	modalParent.querySelector = (selector: string) => {
		const id = selector.slice(1);
		return fileCheckboxes[id] ?? null;
	};
	for (
		const [id, checked] of Object.entries({
			[selectTabsId]: false,
			[metadataId]: false,
			[overwriteId]: false,
			[otherOrgId]: false,
			...checkboxState,
		})
	) {
		const checkbox = new MockElement("input");
		checkbox.id = id;
		checkbox.checked = checked;
		fileCheckboxes[id] = checkbox;
	}

	const { cleanup, module } = await loadIsolatedModule<
		ImportModule,
		ImportDependencies
	>({
		modulePath: new URL("../../../src/salesforce/import.js", import.meta.url),
		additionalExports: [
			"__setInputModalParent",
			"__getInputModalParent",
			"filterForUnexpectedTabKeys",
			"generateSldsImport",
			"getTabsFromJSON",
			"makeValidTabs",
			"readFile",
			"readChangeOrDropFiles",
			"showFileImport",
			"showTabSelectThenImport",
		],
		extraSource: `
function __setInputModalParent(value) { inputModalParent = value; }
function __getInputModalParent() { return inputModalParent; }`,
		dependencies: {
			BROWSER: {
				runtime: {
					getURL: (path) => `chrome-extension://unit${path}`,
				},
			},
			EXTENSION_NAME: "again-why-salesforce",
			HIDDEN_CLASS: "hidden",
			MODAL_ID: "awsf-modal",
			TOAST_ERROR: "error",
			TOAST_WARNING: "warning",
			Tab: {
				hasUnexpectedKeys: (tab) =>
					Object.keys(tab).some((key) =>
						!["label", "url", "org", "tabTitle", "title"].includes(
							key,
						)
					),
			},
			TabContainer: MockTabContainer,
			document: {
				createElement: () => new MockElement("div"),
				getElementById: (id) => {
					if (id === importId) {
						return changeTarget;
					}
					if (id === closeModalId) {
						return closeButton;
					}
					if (id === "awsf-modal") {
						return modalPresent || hasExistingModal
							? modalParent
							: null;
					}
					return null;
				},
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					importTabs: (json, config) => {
						importCalls.push({ config, json });
						return Promise.resolve(importCount);
					},
				}),
			ensureTranslatorAvailability: () =>
				Promise.resolve({
					translate: (message) =>
						Promise.resolve(`translated:${message}`),
				}),
			generateCheckboxWithLabel: (id, _label, checked) => {
				const existingCheckbox = fileCheckboxes[id];
				if (existingCheckbox != null) {
					return Promise.resolve(existingCheckbox);
				}
				const checkbox = new MockElement("input");
				checkbox.id = id;
				checkbox.checked = checked;
				fileCheckboxes[id] = checkbox;
				return Promise.resolve(checkbox);
			},
			generateSection: () =>
				Promise.resolve({
					divParent: new MockElement("div"),
					section: new MockElement("section"),
				}),
			generateSldsFileInput: () =>
				Promise.resolve({
					fileInputWrapper,
					inputContainer,
				}),
			generateSldsModal: () =>
				Promise.resolve({
					...(generateModalError == null ? {} : (() => {
						throw generateModalError;
					})()),
					article,
					closeButton,
					modalParent: (() => {
						const currentBuildCount = modalBuildCount;
						modalBuildCount += 1;
						modalPresent = true;
						return missingModalParentOnce && currentBuildCount === 0
							? null as unknown as MockElement & {
								querySelector: (
									selector: string,
								) => MockElement | null;
							}
							: modalParent;
					})(),
					saveButton,
				}),
			generateSldsModalWithTabList: (_tabs, options) => {
				modalListCalls.push(options);
				return Promise.resolve({
					closeButton: selectedCloseButton,
					getSelectedTabs: () => ({
						selectedAll,
						tabs: selectedTabs,
					}),
					modalParent: selectedModalParent,
					saveButton: selectedSaveButton,
				});
			},
			getModalHanger: () => modalHanger,
			getSetupTabUl: () => ({
				querySelector: () =>
					setupImportPresent ? new MockElement("div") : null,
			}),
			injectStyle: (id, options) => {
				injectStyleCalls.push({ id, options });
				return new MockElement("style");
			},
			showToast: (message, status) => {
				toasts.push({ message, status });
			},
			sf_afterSet: (message) => {
				afterSetCalls.push(message);
			},
		},
		importsToReplace: new Set([
			"/core/constants.js",
			"/core/functions.js",
			"/core/tab.js",
			"/core/tabContainer.js",
			"/core/translator.js",
			"./generator.js",
			"./content.js",
		]),
	});
	setInputModalParent = module.__setInputModalParent;

	return {
		appendCount,
		changeTarget,
		cleanup,
		closeClicks,
		fileCheckboxes,
		hangerChildren,
		importCalls,
		injectStyleCalls,
		modalListCalls,
		module,
		modalBuildCount: {
			get value() {
				return modalBuildCount;
			},
		},
		saveButton,
		selectedSaveButton,
		setModalPresent: (value: boolean) => {
			modalPresent = value;
		},
		setSetupImportPresent: (value: boolean) => {
			setupImportPresent = value;
		},
		toasts,
	};
}

Deno.test("import blocks opening a second modal", async () => {
	const fixture = await loadImportModule({});
	try {
		fixture.setSetupImportPresent(true);

		await fixture.module.createImportModal();

		assertEquals(fixture.toasts, [{
			message: "error_close_other_modal",
			status: "error",
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import blocks opening when another modal element is already present", async () => {
	const fixture = await loadImportModule({
		hasExistingModal: true,
	});
	try {
		await fixture.module.createImportModal();

		assertEquals(fixture.toasts, [{
			message: "error_close_other_modal",
			status: "error",
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import shows the file modal and imports valid JSON files directly", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-metadata": true,
		},
		importCount: 3,
	});

	try {
		await fixture.module.createImportModal();
		assertEquals(fixture.hangerChildren.length, 1);
		assertEquals(fixture.injectStyleCalls[0], {
			id: "again-why-salesforce-import-css",
			options: {
				link: "chrome-extension://unit/salesforce/css/import.css",
			},
		});

		await fixture.changeTarget.dispatchEvent({
			preventDefault() {},
			target: {
				files: [
					createFile(
						"application/json",
						JSON.stringify([{ label: "A", url: "/a", org: "org" }]),
					),
				],
			},
			type: "change",
		} as unknown as Event);

		assertEquals(fixture.importCalls, [{
			config: {
				importMetadata: true,
				preserveOtherOrg: false,
				resetTabs: false,
			},
			json: JSON.stringify([{ label: "A", url: "/a", org: "org" }]),
		}]);
		assertEquals(fixture.closeClicks.value, 1);
		assertEquals(fixture.toasts, [{
			message: ["import_successful", 3, "tabs"],
			status: undefined,
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import toggles the other-org checkbox visibility when overwrite changes", async () => {
	const fixture = await loadImportModule({});

	try {
		await fixture.module.generateSldsImport();
		const overwriteCheckbox = fixture.fileCheckboxes[
			"again-why-salesforce-import-overwrite"
		];
		const otherOrgCheckbox = fixture.fileCheckboxes[
			"again-why-salesforce-import-other-org"
		];

		assertEquals(otherOrgCheckbox.classList.contains("hidden"), true);
		overwriteCheckbox.dispatchEvent(new Event("change"));
		assertEquals(otherOrgCheckbox.classList.contains("hidden"), false);
		overwriteCheckbox.dispatchEvent(new Event("change"));
		assertEquals(otherOrgCheckbox.classList.contains("hidden"), true);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import exposes the current file-modal parent for isolated state checks", async () => {
	const fixture = await loadImportModule({});

	try {
		assertEquals(fixture.module.__getInputModalParent(), undefined);
		await fixture.module.generateSldsImport();
		assertEquals(fixture.module.__getInputModalParent() == null, false);
		fixture.module.__setInputModalParent(null);
		assertEquals(fixture.module.__getInputModalParent(), null);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import rejects non-JSON files and surfaces the validation toast", async () => {
	const fixture = await loadImportModule({});

	try {
		await fixture.module.createImportModal();
		await fixture.changeTarget.dispatchEvent({
			preventDefault() {},
			target: {
				files: [
					createFile("text/plain", "not-json"),
				],
			},
			type: "change",
		} as unknown as Event);

		assertEquals(fixture.toasts, [
			{
				message: "import_invalid_file",
				status: "error",
			},
		]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import reads dropped files from dataTransfer.items when files is empty", async () => {
	const fixture = await loadImportModule({});

	try {
		await fixture.module.createImportModal();
		await fixture.module.readChangeOrDropFiles({
			dataTransfer: {
				files: [],
				items: [
					{
						getAsFile: () =>
							createFile(
								"",
								JSON.stringify([{
									label: "ItemDrop",
									url: "/item",
									org: "org",
								}]),
								"item-drop.json",
							),
					},
				],
			},
			preventDefault() {},
		});

		assertEquals(fixture.importCalls, [{
			config: {
				importMetadata: false,
				preserveOtherOrg: false,
				resetTabs: false,
			},
			json: JSON.stringify([{
				label: "ItemDrop",
				url: "/item",
				org: "org",
			}]),
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import lets the user pick tabs before importing and warns on empty selection", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-select-tabs": true,
			"again-why-salesforce-import-overwrite": true,
			"again-why-salesforce-import-other-org": true,
		},
		selectedTabs: [],
	});

	try {
		await fixture.module.createImportModal();
		await fixture.changeTarget.dispatchEvent({
			preventDefault() {},
			target: {
				files: [
					createFile(
						"application/json",
						JSON.stringify({
							pinnedTabsNo: 2,
							tabs: [{ label: "A", url: "/b", org: "org" }],
						}),
					),
				],
			},
			type: "change",
		} as unknown as Event);
		await fixture.selectedSaveButton.click();

		assertEquals(fixture.modalListCalls, [{
			explainer: "select_tabs_import",
			saveButtonLabel: "import",
			title: "import_tabs",
		}]);
		assertEquals(fixture.toasts.at(-1), {
			message: "error_no_tabs_selected",
			status: "warning",
		});
		assertEquals(fixture.importCalls, []);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import maps supported external formats and imports the selected tabs", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-select-tabs": true,
		},
		selectedAll: true,
		selectedTabs: [{ label: "Mapped", url: "/mapped", org: "org" }],
	});

	try {
		await fixture.module.createImportModal();
		await fixture.changeTarget.dispatchEvent({
			preventDefault() {},
			target: {
				files: [
					createFile(
						"application/json",
						JSON.stringify({
							bookmarks: [{
								title: "Mapped",
								url: "/mapped",
								org: "org",
							}],
							pinnedTabsNo: 1,
						}),
					),
				],
			},
			type: "change",
		} as unknown as Event);
		await fixture.selectedSaveButton.click();

		assertEquals(fixture.closeClicks.value, 3);
		assertEquals(fixture.importCalls, [{
			config: {
				importMetadata: false,
				preserveOtherOrg: false,
				resetTabs: false,
			},
			json: JSON.stringify({
				pinned: 1,
				tabs: [{ label: "Mapped", url: "/mapped", org: "org" }],
			}),
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import maps WhySalesforce tab arrays through the select flow", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-select-tabs": true,
		},
		selectedAll: false,
		selectedTabs: [{ label: "Mapped", url: "/mapped", org: "org" }],
	});

	try {
		await fixture.module.createImportModal();
		await fixture.changeTarget.dispatchEvent({
			preventDefault() {},
			target: {
				files: [
					createFile(
						"application/json",
						JSON.stringify([
							{
								tabTitle: "Mapped",
								url: "/mapped",
								org: "org",
								extra: true,
							},
						]),
					),
				],
			},
			type: "change",
		} as unknown as Event);
		await fixture.selectedSaveButton.click();

		assertEquals(fixture.importCalls, [{
			config: {
				importMetadata: false,
				preserveOtherOrg: false,
				resetTabs: false,
			},
			json: JSON.stringify({
				pinned: 0,
				tabs: [{ label: "Mapped", url: "/mapped", org: "org" }],
			}),
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import closes the open file modal before showing the tab picker", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-select-tabs": true,
		},
		selectedTabs: [{ label: "Mapped", url: "/mapped", org: "org" }],
	});

	try {
		await fixture.module.createImportModal();
		fixture.setModalPresent(true);
		await fixture.changeTarget.dispatchEvent({
			preventDefault() {},
			target: {
				files: [
					createFile(
						"application/json",
						JSON.stringify({
							pinnedTabsNo: 1,
							tabs: [{
								label: "Mapped",
								url: "/mapped",
								org: "org",
							}],
						}),
					),
				],
			},
			type: "change",
		} as unknown as Event);

		assertEquals(fixture.closeClicks.value, 1);
		assertEquals(fixture.modalListCalls.length, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import surfaces unknown file structures through the drop handler", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-select-tabs": true,
		},
	});

	try {
		await fixture.module.createImportModal();
		await fixture.changeTarget.dispatchEvent({
			dataTransfer: {
				files: [
					createFile(
						"application/json",
						JSON.stringify({ unsupported: true }),
					),
				],
			},
			preventDefault() {},
			type: "drop",
		} as unknown as Event);

		assertEquals(fixture.toasts.at(0), {
			message: "error_unknown_file_structure",
			status: "error",
		});
		assertEquals(fixture.modalListCalls, [{
			explainer: "select_tabs_import",
			saveButtonLabel: "import",
			title: "import_tabs",
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import rejects null and unsupported bookmark payloads through getTabsFromJSON", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-select-tabs": true,
		},
	});

	try {
		assertEquals(fixture.module.getTabsFromJSON(null), []);
		assertEquals(
			fixture.module.getTabsFromJSON({
				bookmarks: [{ label: "Broken", url: "/broken", org: "org" }],
			}),
			[],
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import maps WhySalesforce fallback tabs through getTabsFromJSON", async () => {
	const fixture = await loadImportModule({
		checkboxState: {
			"again-why-salesforce-import-select-tabs": true,
		},
	});

	try {
		assertEquals(
			fixture.module.getTabsFromJSON({
				tabs: [
					{
						tabTitle: "Mapped",
						url: "/mapped",
						org: "org",
						extra: true,
					},
				],
			}),
			[{ label: "Mapped", url: "/mapped", org: "org" }],
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import returns empty arrays for null tab collections and preserves mapped fields", async () => {
	const fixture = await loadImportModule({});

	try {
		assertEquals(fixture.module.makeValidTabs(null), []);
		assertEquals(fixture.module.filterForUnexpectedTabKeys(null), []);
		assertEquals(
			fixture.module.makeValidTabs(
				[{ destination: "/mapped", name: "Mapped", orgName: "org" }],
				{ label: "name", org: "orgName", url: "destination" },
			),
			[{ label: "Mapped", url: "/mapped", org: "org" }],
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import closes the existing modal inside showTabSelectThenImport", async () => {
	const fixture = await loadImportModule({});

	try {
		fixture.setModalPresent(true);
		await fixture.module.showTabSelectThenImport(
			[
				createFile(
					"application/json",
					JSON.stringify({
						pinnedTabsNo: 1,
						tabs: [{ label: "A", url: "/a", org: "org" }],
					}),
				),
			],
			{},
		);

		assertEquals(fixture.closeClicks.value, 1);
		assertEquals(fixture.modalListCalls.length, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import attaches the drop reader directly", async () => {
	const fixture = await loadImportModule({});

	try {
		await fixture.module.createImportModal();
		await fixture.module.readChangeOrDropFiles({
			dataTransfer: {
				files: [
					createFile(
						"application/json",
						JSON.stringify([{
							label: "Drop",
							url: "/drop",
							org: "org",
						}]),
					),
				],
			},
			preventDefault() {},
		});

		assertEquals(fixture.importCalls, [{
			config: {
				importMetadata: false,
				preserveOtherOrg: false,
				resetTabs: false,
			},
			json: JSON.stringify([{ label: "Drop", url: "/drop", org: "org" }]),
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import prevents default drag behavior over the drop area", async () => {
	const fixture = await loadImportModule({});

	try {
		await fixture.module.createImportModal();
		let defaultPrevented = false;
		let propagationStopped = false;
		await fixture.changeTarget.dispatchEvent({
			preventDefault() {
				defaultPrevented = true;
			},
			stopPropagation() {
				propagationStopped = true;
			},
			type: "dragover",
		} as unknown as Event);

		assertEquals(defaultPrevented, true);
		assertEquals(propagationStopped, true);
		assertEquals(
			fixture.changeTarget.classList.contains(
				"again-why-salesforce-import-drag-active",
			),
			true,
		);

		await fixture.changeTarget.dispatchEvent({
			preventDefault() {},
			stopPropagation() {},
			type: "dragleave",
		} as unknown as Event);
		assertEquals(
			fixture.changeTarget.classList.contains(
				"again-why-salesforce-import-drag-active",
			),
			false,
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import reads a single file object directly and surfaces read failures", async () => {
	const fixture = await loadImportModule({});

	try {
		await fixture.module.createImportModal();
		await fixture.module.readFile(
			createFile(
				"application/json",
				JSON.stringify([{
					label: "Single",
					url: "/single",
					org: "org",
				}]),
			),
		);
		await fixture.module.readFile({
			text: () => Promise.reject(new Error("broken-file")),
			type: "application/json",
		});

		assertEquals(fixture.importCalls[0], {
			config: {
				importMetadata: false,
				preserveOtherOrg: false,
				resetTabs: false,
			},
			json: JSON.stringify([{
				label: "Single",
				url: "/single",
				org: "org",
			}]),
		});
		assertEquals(fixture.toasts.at(-1), {
			message: ["error_import", "broken-file"],
			status: "error",
		});
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import retries file-modal rendering when the modal parent is cleared after generation", async () => {
	const fixture = await loadImportModule({
		clearInputModalParentOnRemove: true,
	});

	try {
		await fixture.module.showFileImport();

		assertEquals(fixture.appendCount.value, 2);
		assertEquals(fixture.hangerChildren.length, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("import surfaces modal creation failures", async () => {
	const fixture = await loadImportModule({
		generateModalError: new Error("boom"),
	});

	try {
		await fixture.module.createImportModal();

		assertEquals(
			(fixture.toasts[0].message as unknown as Error).message,
			"boom",
		);
		assertEquals(fixture.toasts[0].status, "error");
	} finally {
		fixture.cleanup();
	}
});
