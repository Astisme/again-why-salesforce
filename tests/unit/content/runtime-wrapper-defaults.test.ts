import { assertEquals, assertStrictEquals } from "@std/testing/asserts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

type RuntimeModule = Record<string, (...args: string[]) => string>;

type PopupRuntimeModule = {
	createPopupModule: (overrides?: Record<string, string>) => {
		runPopup: () => string;
	};
	getPopupRuntimeDefaults: () => {
		browser: string;
		closePopup: () => void;
		documentRef: string;
		locationRef: string;
	};
	runPopup: (overrides?: Record<string, string>) => string;
};

type ImportRuntimeModule = {
	createImportModal: () => string;
	createImportModule: () => { createImportModal: () => string };
};

/**
 * Verifies default values forwarded from a singleton wrapper to its runtime.
 *
 * @param {URL} modulePath Wrapper source path.
 * @param {string} dependencyName Imported runtime namespace identifier.
 * @param {string} factoryName Runtime factory name.
 * @param {string} functionName Wrapper function name.
 * @param {string[]} functionArgs Function arguments excluding defaults.
 * @param {unknown[]} expectedFunctionArgs Expected forwarded arguments.
 * @return {Promise<void>} Resolves once forwarding assertions complete.
 */
async function assertWrapperDefaults(
	modulePath: URL,
	dependencyName: string,
	factoryName: string,
	functionName: string,
	functionArgs: string[],
	expectedFunctionArgs: unknown[],
) {
	const calls: unknown[][] = [];
	const runtime = {
		[factoryName]: (overrides: Record<string, string> = {}) => {
			calls.push([factoryName, overrides]);
			return "factory";
		},
		[functionName]: (...args: string[]) => {
			calls.push([functionName, ...args]);
			return "result";
		},
	};
	const loaded = await loadIsolatedModule<RuntimeModule, Record<string, unknown>>({
		dependencies: { [dependencyName]: runtime },
		modulePath,
	});
	try {
		assertEquals(loaded.module[factoryName](), "factory");
		assertEquals(loaded.module[functionName](...functionArgs), "result");
		assertEquals(calls, [
			[factoryName, {}],
			[functionName, ...expectedFunctionArgs],
		]);
	} finally {
		loaded.cleanup();
	}
}

/**
 * Invokes every wrapper function against a mock runtime namespace.
 *
 * @param {URL} modulePath Wrapper source path.
 * @param {string} dependencyName Imported runtime namespace identifier.
 * @param {string[]} functionNames Exported wrapper function names.
 * @return {Promise<void>} Resolves once all functions have run.
 */
async function assertWrapperFunctionCoverage(
	modulePath: URL,
	dependencyName: string,
	functionNames: string[],
) {
	const calls: string[] = [];
	const runtime: Record<string, () => string> = {};
	for (const functionName of functionNames) {
		runtime[functionName] = () => {
			calls.push(functionName);
			return functionName;
		};
	}
	const loaded = await loadIsolatedModule<
		RuntimeModule,
		Record<string, Record<string, () => string>>
	>({
		dependencies: { [dependencyName]: runtime },
		modulePath,
	});
	try {
		for (const functionName of functionNames) {
			assertEquals(loaded.module[functionName](), functionName);
		}
		assertEquals(calls, functionNames);
	} finally {
		loaded.cleanup();
	}
}

Deno.test("runtime wrappers forward default arguments", async () => {
	await assertWrapperDefaults(
		new URL("../../../src/salesforce/favourite-manager.js", import.meta.url),
		"favouriteManagerRuntime",
		"createFavouriteManagerModule",
		"pageActionTab",
		[],
		[true],
	);
	await assertWrapperDefaults(
		new URL("../../../src/salesforce/import.js", import.meta.url),
		"importRuntime",
		"createImportModule",
		"createImportModal",
		[],
		[],
	);
	await assertWrapperDefaults(
		new URL("../../../src/salesforce/manageTabs.js", import.meta.url),
		"manageTabsRuntime",
		"createManageTabsModule",
		"handleActionButtonClick",
		["event"],
		["event", {}],
	);
	await assertWrapperDefaults(
		new URL("../../../src/salesforce/openOtherOrg.js", import.meta.url),
		"openOtherOrgRuntime",
		"createOpenOtherOrgModule",
		"createOpenOtherOrgModal",
		[],
		[{}],
	);
	await assertWrapperDefaults(
		new URL("../../../src/salesforce/tutorial.js", import.meta.url),
		"tutorialRuntime",
		"createTutorialModule",
		"checkTutorial",
		[],
		[false],
	);
	await assertWrapperDefaults(
		new URL("../../../src/salesforce/toast.js", import.meta.url),
		"toastRuntime",
		"createToastModule",
		"showToast",
		["message"],
		["message", undefined],
	);
	await assertWrapperDefaults(
		new URL("../../../src/salesforce/sf-elements.js", import.meta.url),
		"sfElementsRuntime",
		"createSfElementsModule",
		"getCurrentHref",
		[],
		[],
	);
});

Deno.test("runtime wrapper functions delegate to their runtime APIs", async () => {
	await assertWrapperFunctionCoverage(
		new URL("../../../src/salesforce/favourite-manager.js", import.meta.url),
		"favouriteManagerRuntime",
		[
			"createFavouriteManagerModule",
			"pageActionTab",
			"showFavouriteButton",
		],
	);
	await assertWrapperFunctionCoverage(
		new URL("../../../src/salesforce/import.js", import.meta.url),
		"importRuntime",
		["createImportModal", "createImportModule"],
	);
	await assertWrapperFunctionCoverage(
		new URL("../../../src/salesforce/manageTabs.js", import.meta.url),
		"manageTabsRuntime",
		[
			"createManageTabsModal",
			"createManageTabsModule",
			"handleActionButtonClick",
		],
	);
	await assertWrapperFunctionCoverage(
		new URL("../../../src/salesforce/openOtherOrg.js", import.meta.url),
		"openOtherOrgRuntime",
		["createOpenOtherOrgModal", "createOpenOtherOrgModule"],
	);
	await assertWrapperFunctionCoverage(
		new URL("../../../src/salesforce/toast.js", import.meta.url),
		"toastRuntime",
		["createToastModule", "showToast"],
	);
	await assertWrapperFunctionCoverage(
		new URL("../../../src/salesforce/tutorial.js", import.meta.url),
		"tutorialRuntime",
		["checkTutorial", "createTutorialModule"],
	);
	await assertWrapperFunctionCoverage(
		new URL("../../../src/salesforce/sf-elements.js", import.meta.url),
		"sfElementsRuntime",
		[
			"createSfElementsModule",
			"findSetupTabUlInSalesforcePage",
			"getCurrentHref",
			"getModalHanger",
			"getSetupTabUl",
			"setSetupTabUl",
		],
	);
});

Deno.test("popup runtime applies defaults and forwards omitted overrides", async () => {
	const createCalls: Record<string, unknown>[] = [];
	const loaded = await loadIsolatedModule<
		PopupRuntimeModule,
		Record<string, unknown>
	>({
		dependencies: {
			BROWSER: "browser",
			CMD_EXPORT_ALL: "export",
			CMD_IMPORT: "import",
			CMD_OPEN_SETTINGS: "settings",
			CXM_MANAGE_TABS: "manage",
			WHAT_EXPORT_CHECK: "export-check",
			WHAT_GET_COMMANDS: "get-commands",
			WHAT_SHOW_IMPORT: "show-import",
			WHAT_START_TUTORIAL: "start-tutorial",
			TranslationService: {
				TRANSLATE_DATASET: "i18n",
				TRANSLATE_SEPARATOR: "+-+",
				getTranslations: "translations",
			},
			_createPopupModule: (options: Record<string, unknown>) => {
				createCalls.push(options);
				return { runPopup: () => "ran" };
			},
			areFramePatternsAllowed: "allowed",
			isOnSalesforceSetup: "setup",
			openSettingsPage: "settings-page",
			sendExtensionMessage: "send-message",
		},
		globals: {
			close: "close-popup",
			document: "document",
			location: "location",
		},
		modulePath: new URL(
			"../../../src/action/popup/popup-runtime.js",
			import.meta.url,
		),
	});
	try {
		const defaults = loaded.module.getPopupRuntimeDefaults();
		assertStrictEquals(defaults.browser, "browser");
		assertStrictEquals(defaults.closePopup, "close-popup");
		assertStrictEquals(defaults.documentRef, "document");
		assertStrictEquals(defaults.locationRef, "location");
		assertEquals(loaded.module.createPopupModule().runPopup(), "ran");
		assertEquals(loaded.module.runPopup(), "ran");
		assertEquals(createCalls.length, 2);
		assertStrictEquals(createCalls[0].browser, "browser");
	} finally {
		loaded.cleanup();
	}
});

Deno.test("popup runtime falls back when window close is unavailable", async () => {
	const loaded = await loadIsolatedModule<
		PopupRuntimeModule,
		Record<string, unknown>
	>({
		dependencies: {
			BROWSER: "browser",
			CMD_EXPORT_ALL: "export",
			CMD_IMPORT: "import",
			CMD_OPEN_SETTINGS: "settings",
			CXM_MANAGE_TABS: "manage",
			WHAT_EXPORT_CHECK: "export-check",
			WHAT_GET_COMMANDS: "get-commands",
			WHAT_SHOW_IMPORT: "show-import",
			WHAT_START_TUTORIAL: "start-tutorial",
			TranslationService: {
				TRANSLATE_DATASET: "i18n",
				TRANSLATE_SEPARATOR: "+-+",
				getTranslations: "translations",
			},
			_createPopupModule: () => ({ runPopup: () => "ran" }),
			areFramePatternsAllowed: "allowed",
			isOnSalesforceSetup: "setup",
			openSettingsPage: "settings-page",
			sendExtensionMessage: "send-message",
		},
		globals: {
			close: undefined,
			document: "document",
			location: "location",
		},
		modulePath: new URL(
			"../../../src/action/popup/popup-runtime.js",
			import.meta.url,
		),
	});
	try {
		const defaults = loaded.module.getPopupRuntimeDefaults();
		assertEquals(typeof defaults.closePopup, "function");
		defaults.closePopup();
	} finally {
		loaded.cleanup();
	}
});

Deno.test("import runtime delegates through its singleton module", async () => {
	const loaded = await loadIsolatedModule<
		ImportRuntimeModule,
		Record<string, string | (() => { createImportModal: () => string })>
	>({
		dependencies: {
			BROWSER: "browser",
			EXTENSION_NAME: "extension",
			HIDDEN_CLASS: "hidden",
			MODAL_ID: "modal",
			TOAST_ERROR: "error",
			TOAST_WARNING: "warning",
			Tab: "tab",
			TabContainer: "tab-container",
			TranslationService: "translations",
			createImportPureModule: () => ({
				createImportModal: () => "modal-created",
			}),
			ensureAllTabsAvailability: "tabs",
			generateCheckboxWithLabel: "checkbox",
			generateSection: "section",
			generateSldsFileInput: "file-input",
			generateSldsModal: "modal-generator",
			generateSldsModalWithTabList: "tab-modal",
			getCurrentHref: "href",
			getModalHanger: "hanger",
			getSetupTabUl: "tab-ul",
			injectStyle: "style",
			sf_afterSet: "after-set",
			showToast: "toast",
		},
		globals: { document: "document" },
		modulePath: new URL(
			"../../../src/salesforce/runtime/import-runtime.js",
			import.meta.url,
		),
	});
	try {
		assertEquals(loaded.module.createImportModule().createImportModal(), "modal-created");
		assertEquals(loaded.module.createImportModal(), "modal-created");
	} finally {
		loaded.cleanup();
	}
});
