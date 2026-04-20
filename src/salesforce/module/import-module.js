"use strict";

/**
 * Builds the import-flow IDs from the extension name.
 *
 * @param {string} extensionName Extension name used as id prefix.
 * @return {{
 *   closeModalId: string;
 *   importContainerId: string;
 *   importCssId: string;
 *   importDragActiveClass: string;
 *   importDuplicateWarningClass: string;
 *   importFileId: string;
 *   importId: string;
 *   metadataId: string;
 *   otherOrgId: string;
 *   overwriteId: string;
 *   selectTabsId: string;
 * }} Import IDs.
 */
function buildImportIds(extensionName) {
	const importId = `${extensionName}-import`;
	return {
		closeModalId: `${importId}-modal-close`,
		importContainerId: `${importId}-container`,
		importCssId: `${importId}-css`,
		importDragActiveClass: `${importId}-drag-active`,
		importDuplicateWarningClass: `${importId}-duplicate-warning`,
		importFileId: `${importId}-file`,
		importId,
		metadataId: `${importId}-metadata`,
		otherOrgId: `${importId}-other-org`,
		overwriteId: `${importId}-overwrite`,
		selectTabsId: `${importId}-select-tabs`,
	};
}

/**
 * Maps imported tab objects to valid tab keys.
 *
 * @param {Array<Record<string, unknown>>} [tabs=[]] Source tabs.
 * @param {Object} [mapping={}] Key mapping.
 * @param {string} [mapping.label="label"] Label key.
 * @param {string} [mapping.url="url"] URL key.
 * @param {string} [mapping.org="org"] Org key.
 * @return {Array<Record<string, unknown>>} Mapped tabs.
 */
function makeValidTabs(tabs = [], {
	label = "label",
	url = "url",
	org = "org",
} = {}) {
	return tabs?.map((tab) => ({
		label: tab[label],
		url: tab[url],
		org: tab[org],
	})) ?? [];
}

/**
 * Checks if a tab uses WhySalesforce export keys.
 *
 * @param {Record<string, unknown>} tab Tab to validate.
 * @return {boolean} Whether it matches.
 */
function isWhySalesforceTab(tab) {
	return tab?.label == null && tab?.tabTitle != null;
}

/**
 * Checks if a tab uses Salesforce Easy Navigator export keys.
 *
 * @param {Record<string, unknown>} tab Tab to validate.
 * @return {boolean} Whether it matches.
 */
function isSalesforceEasyNavigatorTab(tab) {
	return tab?.label == null && tab?.title != null;
}

/**
 * Normalizes file-like inputs into a plain array.
 *
 * @param {File | File[] | FileList | null | undefined} files Input files.
 * @return {File[]} Normalized file list.
 */
function normalizeFiles(files) {
	if (files == null) {
		return [];
	}
	if (Array.isArray(files)) {
		return files;
	}
	if (typeof files.length === "number") {
		return Array.from(files);
	}
	return [files];
}

/**
 * Returns true when the provided file can be treated as JSON.
 *
 * @param {File} file File to validate.
 * @return {boolean} Whether it is a JSON file.
 */
function isJsonFile(file) {
	const fileName = file?.name?.toLowerCase?.() ?? "";
	return file?.type === "application/json" || fileName.endsWith(".json");
}

/**
 * Prevents default drag behavior.
 *
 * @param {Event} event Drag event.
 * @return {void}
 */
function preventDragDefaults(event) {
	event.preventDefault?.();
	event.stopPropagation?.();
}

/**
 * Serializes imported tab-container-like values to JSON.
 *
 * @param {unknown} tabs Tab container instance or JSON-serializable value.
 * @return {string} Serialized tab payload.
 */
function serializeImportedTabs(tabs) {
	if (typeof tabs?.toJSON === "function") {
		return JSON.stringify(tabs.toJSON());
	}
	if (
		typeof tabs?.toString === "function" &&
		tabs.toString !== Object.prototype.toString
	) {
		return tabs.toString();
	}
	return JSON.stringify(tabs);
}

/**
 * Creates the import module API with injected dependencies.
 *
 * @param {Object} [options={}] Runtime options and dependencies.
 * @param {{
 *   runtime?: {
 *     getURL: (path: string) => string;
 *   };
 * }} [options.browserRef] Browser API reference.
 * @param {string} [options.extensionName=""] Extension name/id.
 * @param {string} [options.hiddenClass=""] Hidden CSS utility class.
 * @param {string} [options.modalId=""] Modal id used by generator modals.
 * @param {string} [options.toastError="error"] Error toast type.
 * @param {string} [options.toastWarning="warning"] Warning toast type.
 * @param {{
 *   hasUnexpectedKeys: (tab: Record<string, unknown>) => boolean;
 * }} [options.tabRef] Tab helper object.
 * @param {{
 *   keyPinnedTabsNo: string;
 *   keyTabs: string;
 *   getThrowawayInstance: (options?: { pinned?: number; tabs?: unknown[] }) => {
 *     sort: (options: Record<string, unknown>, shouldSync: boolean) => void;
 *     toString: () => string;
 *   };
 * }} [options.tabContainerRef] TabContainer helper object.
 * @param {() => Promise<{
 *   importTabs: (
 *     json: string,
 *     config: Record<string, boolean>,
 *   ) => Promise<number>;
 * }>} [options.ensureAllTabsAvailabilityFn] Saved-tab container resolver.
 * @param {(keys: string | string[]) => Promise<string | string[]>} [options.getTranslationsFn] Translation resolver.
 * @param {(id: string, i18nKey: string, checked: boolean) => Promise<HTMLElement>} [options.generateCheckboxWithLabelFn] Checkbox generator.
 * @param {() => Promise<{ section: HTMLElement; divParent: HTMLElement }>} [options.generateSectionFn] Section generator.
 * @param {(importId: string, fileInputId: string, accept: string) => Promise<{
 *   fileInputWrapper: HTMLElement;
 *   inputContainer: HTMLInputElement;
 * }>} [options.generateSldsFileInputFn] File input generator.
 * @param {(options: { modalTitle: string }) => Promise<{
 *   modalParent: HTMLElement | null;
 *   article: HTMLElement;
 *   saveButton: HTMLElement;
 *   closeButton: HTMLElement;
 * }>} [options.generateSldsModalFn] Modal generator.
 * @param {(tabContainer: unknown, options: {
 *   title: string;
 *   saveButtonLabel: string;
 *   explainer: string;
 * }) => Promise<{
 *   modalParent: HTMLElement;
 *   saveButton: HTMLElement;
 *   closeButton: HTMLElement;
 *   getSelectedTabs: () => { tabs: unknown[]; selectedAll: boolean };
 * }>} [options.generateSldsModalWithTabListFn] Tab-picker modal generator.
 * @param {(id: string, options: { css?: string; link?: string }) => unknown} [options.injectStyleFn] Style injector.
 * @param {(options?: Record<string, unknown>) => void} [options.sfAfterSetFn] Content post-update hook.
 * @param {(message: string | string[] | unknown[], status?: string) => void | Promise<void>} [options.showToastFn] Toast helper.
 * @param {() => { appendChild: (node: unknown) => unknown } | null} [options.getModalHangerFn] Modal hanger resolver.
 * @param {() => { querySelector: (selector: string) => unknown } | null} [options.getSetupTabUlFn] Setup-tab UL resolver.
 * @param {{
 *   createElement: (tagName: string) => HTMLElement;
 *   getElementById: (id: string) => HTMLElement | null;
 * }} [options.documentRef=globalThis.document] Document-like object.
 * @return {{
 *   __getInputModalParent: () => unknown;
 *   __setInputModalParent: (value: unknown) => void;
 *   createImportModal: () => Promise<void>;
 *   filterForUnexpectedTabKeys: (tabs?: Record<string, unknown>[] | null) => unknown[];
 *   generateSldsImport: () => Promise<{
 *     closeButton: HTMLElement;
 *     inputContainer: HTMLInputElement;
 *     saveButton: HTMLElement;
 *   }>;
 *   getTabsFromJSON: (jsonWithTabs?: Record<string, unknown> | null) => unknown[];
 *   makeValidTabs: (
 *     tabs?: Record<string, unknown>[] | null,
 *     mapping?: { label?: string; org?: string; url?: string },
 *   ) => unknown[];
 *   readChangeOrDropFiles: (event: Event) => Promise<void>;
 *   readFile: (files: FileList | File[] | File) => Promise<void>;
 *   showFileImport: () => Promise<void>;
 *   showTabSelectThenImport: (files?: File[], importConfig?: Record<string, boolean>) => Promise<void>;
 * }} Import module API.
 */
export function createImportPureModule({
	browserRef,
	extensionName = "",
	hiddenClass = "",
	modalId = "",
	toastError = "error",
	toastWarning = "warning",
	tabRef,
	tabContainerRef,
	ensureAllTabsAvailabilityFn,
	getTranslationsFn,
	generateCheckboxWithLabelFn,
	generateSectionFn,
	generateSldsFileInputFn,
	generateSldsModalFn,
	generateSldsModalWithTabListFn,
	injectStyleFn,
	sfAfterSetFn,
	showToastFn,
	getModalHangerFn,
	getSetupTabUlFn,
	documentRef = globalThis.document,
} = {}) {
	const ids = buildImportIds(extensionName);
	let inputModalParent;

	/**
	 * Generates an SLDS import modal for importing tabs.
	 *
	 * @return {Promise<{
	 *   saveButton: HTMLElement,
	 *   closeButton: HTMLElement,
	 *   inputContainer: HTMLInputElement
	 * }>} Modal controls.
	 */
	async function generateSldsImport() {
		const [modalTitle, dupDesc0, dupDesc1] = await getTranslationsFn([
			"import_tabs",
			"import_duplicate_description_0",
			"import_duplicate_description_1",
		]);
		const { modalParent, article, saveButton, closeButton } =
			await generateSldsModalFn({
				modalTitle,
			});
		inputModalParent = modalParent;
		closeButton.id = ids.closeModalId;
		const { section, divParent } = await generateSectionFn();
		divParent.id = ids.importContainerId;
		article.appendChild(section);
		const { fileInputWrapper, inputContainer } =
			await generateSldsFileInputFn(
				ids.importId,
				ids.importFileId,
				".json,application/json",
			);
		divParent.appendChild(fileInputWrapper);
		injectStyleFn(
			ids.importCssId,
			{ link: browserRef.runtime.getURL("/salesforce/css/import.css") },
		);
		const duplicateWarningPart0 = documentRef.createElement("div");
		duplicateWarningPart0.textContent = dupDesc0;
		duplicateWarningPart0.classList.add(ids.importDuplicateWarningClass);
		divParent.append(duplicateWarningPart0);
		const duplicateWarningPart1 = documentRef.createElement("div");
		duplicateWarningPart1.textContent = dupDesc1;
		duplicateWarningPart1.classList.add(ids.importDuplicateWarningClass);
		divParent.append(duplicateWarningPart1);
		const selectTabsCheckbox = await generateCheckboxWithLabelFn(
			ids.selectTabsId,
			"select_tabs_import",
			false,
		);
		divParent.appendChild(selectTabsCheckbox);
		const importMetadataCheckbox = await generateCheckboxWithLabelFn(
			ids.metadataId,
			"import_metadata",
			false,
		);
		divParent.appendChild(importMetadataCheckbox);
		const overwriteCheckbox = await generateCheckboxWithLabelFn(
			ids.overwriteId,
			"overwrite_tabs",
			false,
		);
		divParent.appendChild(overwriteCheckbox);
		const otherOrgCheckbox = await generateCheckboxWithLabelFn(
			ids.otherOrgId,
			"preserve_org_tabs",
			true,
		);
		otherOrgCheckbox.classList.add(hiddenClass);
		divParent.appendChild(otherOrgCheckbox);
		overwriteCheckbox.addEventListener(
			"change",
			() => otherOrgCheckbox.classList.toggle(hiddenClass),
		);
		return { saveButton, closeButton, inputContainer };
	}

	/**
	 * Imports the given tabs.
	 *
	 * @param {unknown[] | { toString: () => string }} [tabs=[]] Tabs to import.
	 * @param {Object} [importConfig={}] Import options.
	 * @param {boolean} [importConfig.resetTabs=false] Whether to overwrite existing tabs.
	 * @param {boolean} [importConfig.preserveOtherOrg=false] Whether to preserve other-org tabs.
	 * @param {boolean} [importConfig.importMetadata=false] Whether to import metadata.
	 * @return {Promise<void>}
	 */
	async function launchImport(tabs = [], importConfig = {}) {
		const allTabs = await ensureAllTabsAvailabilityFn();
		let importedNum = 0;
		if (tabs instanceof tabContainerRef) {
			importedNum = await allTabs.importTabs(
				serializeImportedTabs(tabs),
				importConfig,
			);
		} else {
			for (const file of tabs) {
				const jsonString = await file.text();
				importedNum += await allTabs.importTabs(
					jsonString,
					importConfig,
				);
			}
		}
		documentRef.getElementById(ids.closeModalId)?.click();
		showToastFn(["import_successful", importedNum, "tabs"]);
		sfAfterSetFn({
			what: "imported",
			tabs: allTabs,
		});
	}

	/**
	 * Extracts extension tabs with a custom mapping.
	 *
	 * @param {unknown} tabs Source tab list.
	 * @param {(tab: Record<string, unknown>) => boolean} validator Validator predicate.
	 * @param {Record<string, string>} mapping Tab key mapping.
	 * @return {Array<Record<string, unknown>>} Valid mapped tabs.
	 */
	function getTabsFromExtensions(tabs, validator, mapping) {
		return Array.isArray(tabs) && tabs.length > 0 && tabs.every(validator)
			? makeValidTabs(tabs, mapping)
			: [];
	}

	/**
	 * Removes tabs with unsupported keys.
	 *
	 * @param {Array<Record<string, unknown>> | null} [tabs=null] Tabs to filter.
	 * @return {Array<Record<string, unknown>>} Filtered tabs.
	 */
	function filterForUnexpectedTabKeys(tabs = null) {
		return tabs
			?.filter((tab) => !tabRef.hasUnexpectedKeys(tab)) ??
			[];
	}

	/**
	 * Extracts supported tabs from a JSON payload.
	 *
	 * @param {Record<string, unknown> | null} [jsonWithTabs=null] Parsed JSON payload.
	 * @return {Array<Record<string, unknown>>} Extracted tabs.
	 */
	function getTabsFromJSON(jsonWithTabs = null) {
		if (jsonWithTabs == null) {
			return [];
		}
		const tabs = jsonWithTabs[tabContainerRef.keyTabs];
		if (tabs != null) {
			const validTabs = filterForUnexpectedTabKeys(tabs);
			return validTabs.length === tabs.length
				? validTabs
				: getTabsFromExtensions(tabs, isWhySalesforceTab, {
					label: "tabTitle",
				});
		}
		const bookmarks = jsonWithTabs.bookmarks;
		if (bookmarks != null) {
			return getTabsFromExtensions(
				bookmarks,
				isSalesforceEasyNavigatorTab,
				{ label: "title" },
			);
		}
		return [];
	}

	/**
	 * Shows an invalid-structure toast for unsupported import files.
	 *
	 * @return {void}
	 */
	function showToastBrokenImportFile() {
		showToastFn("error_unknown_file_structure", toastError);
	}

	/**
	 * Presents a selectable list of tabs and imports the selected ones.
	 *
	 * @param {File[]} [files=[]] File list to parse.
	 * @param {Object} [importConfig={}] Import options.
	 * @return {Promise<void>}
	 */
	async function showTabSelectThenImport(files = [], importConfig = {}) {
		if (documentRef.getElementById(modalId) != null) {
			documentRef.getElementById(ids.closeModalId)?.click();
		}
		const fileTabs = await Promise.all(
			files.map(async (file) => JSON.parse(await file.text())),
		);
		const fileTabsIsArray = Array.isArray(fileTabs) && fileTabs.length > 1;
		const availableTabs = [];
		for (const fileTabsEntry of fileTabs) {
			const tabs = Array.isArray(fileTabsEntry)
				? getTabsFromJSON({ [tabContainerRef.keyTabs]: fileTabsEntry })
				: getTabsFromJSON(fileTabsEntry);
			if (tabs.length === 0) {
				showToastBrokenImportFile();
			} else {
				availableTabs.push(...tabs);
			}
		}
		const importTabs = tabContainerRef.getThrowawayInstance({
			tabs: availableTabs,
		});
		importTabs.sort({ sortBy: "url" }, false);
		const {
			modalParent,
			saveButton,
			closeButton,
			getSelectedTabs,
		} = await generateSldsModalWithTabListFn(
			importTabs,
			{
				title: "import_tabs",
				saveButtonLabel: "import",
				explainer: "select_tabs_import",
			},
		);
		getModalHangerFn().appendChild(modalParent);
		saveButton.addEventListener("click", async (event) => {
			event.preventDefault();
			const { tabs: pickedTabs, selectedAll } = getSelectedTabs();
			if (pickedTabs.length === 0) {
				return showToastFn("error_no_tabs_selected", toastWarning);
			}
			closeButton.click();
			const selectedTabContainer = tabContainerRef.getThrowawayInstance({
				tabs: pickedTabs,
				pinned: fileTabsIsArray || !selectedAll
					? 0
					: fileTabs[0][tabContainerRef.keyPinnedTabsNo],
			});
			await launchImport(selectedTabContainer, importConfig);
		});
	}

	/**
	 * Reads and processes JSON files.
	 *
	 * @param {File | File[]} files File(s) to process.
	 * @return {Promise<void>}
	 */
	async function readFile(files) {
		const fileArray = normalizeFiles(files);
		const validFileArray = [];
		for (const file of fileArray) {
			if (isJsonFile(file)) {
				validFileArray.push(file);
			} else {
				showToastFn("import_invalid_file", toastError);
			}
		}
		if (validFileArray.length === 0) {
			return;
		}
		try {
			const selectTabsPick =
				inputModalParent.querySelector(`#${ids.selectTabsId}`).checked;
			const metadataPick =
				inputModalParent.querySelector(`#${ids.metadataId}`).checked;
			const overwritePick =
				inputModalParent.querySelector(`#${ids.overwriteId}`).checked;
			const otherOrgPick =
				inputModalParent.querySelector(`#${ids.otherOrgId}`).checked;
			const importConfig = {
				resetTabs: overwritePick,
				preserveOtherOrg: otherOrgPick,
				importMetadata: metadataPick,
			};
			if (selectTabsPick) {
				return await showTabSelectThenImport(
					validFileArray,
					importConfig,
				);
			}
			return await launchImport(validFileArray, importConfig);
		} catch (error) {
			showToastFn(["error_import", error.message], toastError);
		}
	}

	/**
	 * Extracts files from a change/drop event.
	 *
	 * @param {Event} event Event containing files.
	 * @return {File[]} Collected files.
	 */
	function getFilesFromChangeOrDropEvent(event) {
		const targetFiles = normalizeFiles(
			event.target?.files ?? event.dataTransfer?.files,
		);
		if (targetFiles.length > 0) {
			return targetFiles;
		}
		const transferItems = normalizeFiles(event.dataTransfer?.items);
		return transferItems
			.map((item) => item?.getAsFile?.())
			.filter((file) => file != null);
	}

	/**
	 * Handles file input change/drop events.
	 *
	 * @param {Event} event Source event.
	 * @return {Promise<void>}
	 */
	function readChangeOrDropFiles(event) {
		event.preventDefault();
		return readFile(getFilesFromChangeOrDropEvent(event));
	}

	/**
	 * Marks drop area as active.
	 *
	 * @param {HTMLElement | null} dropArea Drop area element.
	 * @return {void}
	 */
	function markDropAreaAsActive(dropArea) {
		dropArea?.classList.add(ids.importDragActiveClass);
	}

	/**
	 * Removes drop-area active state.
	 *
	 * @param {HTMLElement | null} dropArea Drop area element.
	 * @return {void}
	 */
	function clearDropAreaActiveState(dropArea) {
		dropArea?.classList.remove(ids.importDragActiveClass);
	}

	/**
	 * Handles drag-enter.
	 *
	 * @param {Event} event Drag event.
	 * @param {HTMLElement | null} dropArea Drop area element.
	 * @return {void}
	 */
	function handleDropAreaDragEnter(event, dropArea) {
		preventDragDefaults(event);
		markDropAreaAsActive(dropArea);
	}

	/**
	 * Handles drag-over.
	 *
	 * @param {Event} event Drag event.
	 * @param {HTMLElement | null} dropArea Drop area element.
	 * @return {void}
	 */
	function handleDropAreaDragOver(event, dropArea) {
		preventDragDefaults(event);
		markDropAreaAsActive(dropArea);
	}

	/**
	 * Handles drag-leave.
	 *
	 * @param {Event} event Drag event.
	 * @param {HTMLElement | null} dropArea Drop area element.
	 * @return {void}
	 */
	function handleDropAreaDragLeave(event, dropArea) {
		preventDragDefaults(event);
		clearDropAreaActiveState(dropArea);
	}

	/**
	 * Handles file drop.
	 *
	 * @param {Event} event Drop event.
	 * @param {HTMLElement | null} dropArea Drop area element.
	 * @return {Promise<void>}
	 */
	function handleDropAreaDrop(event, dropArea) {
		preventDragDefaults(event);
		clearDropAreaActiveState(dropArea);
		return readFile(getFilesFromChangeOrDropEvent(event));
	}

	/**
	 * Attaches file-upload listeners.
	 *
	 * @return {void}
	 */
	function listenToFileUpload() {
		const dropArea = documentRef.getElementById(ids.importId);
		dropArea.addEventListener("change", readChangeOrDropFiles);
		dropArea.addEventListener(
			"dragenter",
			(event) => handleDropAreaDragEnter(event, dropArea),
		);
		dropArea.addEventListener(
			"dragover",
			(event) => handleDropAreaDragOver(event, dropArea),
		);
		dropArea.addEventListener(
			"dragleave",
			(event) => handleDropAreaDragLeave(event, dropArea),
		);
		dropArea.addEventListener(
			"drop",
			(event) => handleDropAreaDrop(event, dropArea),
		);
	}

	/**
	 * Displays the file import modal.
	 *
	 * @return {Promise<void>}
	 */
	async function showFileImport() {
		if (
			getSetupTabUlFn().querySelector(`#${ids.importId}`) != null ||
			documentRef.getElementById(modalId) != null
		) {
			return showToastFn("error_close_other_modal", toastError);
		}
		const { saveButton } = await generateSldsImport();
		saveButton.remove();
		if (inputModalParent == null) {
			return await showFileImport();
		}
		getModalHangerFn().appendChild(inputModalParent);
		listenToFileUpload();
	}

	/**
	 * Displays the file import modal and handles top-level failures.
	 *
	 * @return {Promise<void>}
	 */
	async function createImportModal() {
		try {
			await showFileImport();
		} catch (error) {
			showToastFn(error, toastError);
		}
	}

	return {
		__getInputModalParent: () => inputModalParent,
		__setInputModalParent: (value) => {
			inputModalParent = value;
		},
		createImportModal,
		filterForUnexpectedTabKeys,
		generateSldsImport,
		getTabsFromJSON,
		makeValidTabs,
		readChangeOrDropFiles,
		readFile,
		showFileImport,
		showTabSelectThenImport,
	};
}
