import { assertEquals, assertStrictEquals } from "@std/testing/asserts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

type GeneratorRuntimeDependency = {
	createGeneratorModule: (overrides: Record<string, string>) => string;
	handleLightningLinkClick: (eventName: string) => string;
	generateStyleFromSettings: () => string;
	generateRowTemplate: (rowId: string, confId: string) => string;
	generateSldsToastMessage: (
		message: string | string[],
		status: string | undefined,
	) => string;
	generateSection: (sectionTitle: string | null) => string;
	generateSldsModal: (options: Record<string, string>) => string;
	generateRadioButtons: (
		name: string,
		radio0: Record<string, string>,
		radio1: Record<string, string>,
		...otherRadioDefs: Record<string, string>[]
	) => string;
	generateOpenOtherOrgModal: (options: Record<string, string>) => string;
	generateSldsFileInput: (
		wrapperId: string,
		inputElementId: string,
		acceptedType: string,
		singleFile: boolean,
		allowDrop: boolean,
		preventFileSelection: boolean,
		required: boolean,
	) => string;
	generateCheckboxWithLabel: (
		id: string,
		label: string,
		checked: boolean,
	) => string;
	generateUpdateTabModal: (
		label: string | null,
		url: string | null,
		org: string | null,
	) => string;
	generateHelpWith_i_popup: (options: Record<string, string>) => string;
	generateSldsModalWithTabList: (
		tabs: Record<string, string>[],
		options: Record<string, string>,
	) => string;
	createManageTabRow: (
		row: Record<string, string>,
		config: Record<string, string>,
	) => string;
	generateManageTabsModal: (
		tabs: Record<string, string>[],
		options: Record<string, string>,
	) => string;
	generateReviewSponsorSvgs: () => string;
	generateTutorialElements: () => string;
	sldsConfirm: (options: Record<string, string>) => string;
};

type GeneratorWrapperModule = {
	createGeneratorModule: (overrides?: Record<string, string>) => string;
	handleLightningLinkClick: (eventName: string) => string;
	generateStyleFromSettings: () => string;
	generateRowTemplate: (rowId: string, confId: string) => string;
	generateSldsToastMessage: (
		message: string | string[],
		status?: string,
	) => string;
	generateSection: (sectionTitle?: string | null) => string;
	generateSldsModal: (options?: Record<string, string>) => string;
	generateRadioButtons: (
		name: string,
		radio0?: Record<string, string>,
		radio1?: Record<string, string>,
		...otherRadioDefs: Record<string, string>[]
	) => string;
	generateOpenOtherOrgModal: (options?: Record<string, string>) => string;
	generateSldsFileInput: (
		wrapperId: string,
		inputElementId: string,
		acceptedType: string,
		singleFile?: boolean,
		allowDrop?: boolean,
		preventFileSelection?: boolean,
		required?: boolean,
	) => string;
	generateCheckboxWithLabel: (
		id: string,
		label: string,
		checked?: boolean,
	) => string;
	generateUpdateTabModal: (
		label: string | null,
		url: string | null,
		org: string | null,
	) => string;
	generateHelpWith_i_popup: (options?: Record<string, string>) => string;
	generateSldsModalWithTabList: (
		tabs?: Record<string, string>[],
		options?: Record<string, string>,
	) => string;
	createManageTabRow: (
		row?: Record<string, string>,
		config?: Record<string, string>,
	) => string;
	generateManageTabsModal: (
		tabs?: Record<string, string>[],
		options?: Record<string, string>,
	) => string;
	generateReviewSponsorSvgs: () => string;
	generateTutorialElements: () => string;
	sldsConfirm: (options?: Record<string, string>) => string;
};

type ContentRuntimeModule = {
	createContentModule: (
		overrides?: Record<string, string>,
	) => ContentFactoryResult;
	bootstrapIfNeeded: () => boolean;
	getCurrentHref: () => string;
	getIsCurrentlyOnSavedTab: () => boolean;
	getModalHanger: () => string;
	getSetupTabUl: () => string;
	getWasOnSavedTab: () => boolean;
	isOnSavedTab: (
		isFromHrefUpdate?: boolean,
		callback?: ((isSaved: boolean) => void) | null,
	) => string;
	makeDuplicatesBold: (miniURL: string) => string;
	performActionOnTabs: (
		action: string,
		tab?: string,
		options?: string,
	) => string;
	reorderTabsUl: () => string;
	sf_afterSet: (options?: Record<string, string>) => string;
	showToast: (
		message: string | string[],
		status?: string,
	) => string;
	__testHooks: { hookName: string };
};

type ContentPureModule = {
	bootstrapIfNeeded: () => boolean;
	getCurrentHref: () => string;
	getIsCurrentlyOnSavedTab: () => boolean;
	getModalHanger: () => string;
	getSetupTabUl: () => string;
	getWasOnSavedTab: () => boolean;
	isOnSavedTab: (
		isFromHrefUpdate: boolean,
		callback: ((isSaved: boolean) => void) | null,
	) => string;
	makeDuplicatesBold: (miniURL: string) => string;
	performActionOnTabs: (
		action: string,
		tab: string,
		options: string,
	) => string;
	reorderTabsUl: () => string;
	sf_afterSet: (options: Record<string, string>) => string;
	showToast: (
		message: string | string[],
		status: string | undefined,
	) => string;
	__testHooks: { hookName: string };
};

type ContentFactoryResult = ContentPureModule | { factoryResult: true };

type ManageTabsPureModule = {
	createManageTabsModal: () => string;
	handleActionButtonClick: (
		eventName: string,
		options: Record<string, string>,
	) => string;
};

type ManageTabsRuntimeModule = {
	createManageTabsModule: (
		overrides?: Record<string, unknown>,
	) => ManageTabsPureModule;
	createManageTabsModal: () => string;
	handleActionButtonClick: (
		eventName: string,
		options?: Record<string, string>,
	) => string;
};

type ManageTabsDependencyMap = {
	CXM_PIN_TAB: string;
	CXM_REMOVE_TAB: string;
	CXM_UNPIN_TAB: string;
	HIDDEN_CLASS: string;
	MODAL_ID: string;
	PIN_TAB_CLASS: string;
	TOAST_ERROR: string;
	TOAST_WARNING: string;
	TUTORIAL_EVENT_CLOSE_MANAGE_TABS: string;
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL: string;
	TUTORIAL_EVENT_REORDERED_TABS_TABLE: string;
	getInnerElementFieldBySelector: (selector: string) => string;
	injectStyle: (id: string) => string;
	Tab: new () => { kind: string };
	ensureAllTabsAvailability: () => string[];
	TabContainer: new () => { size: number };
	getTranslations: (message: string | string[]) => string;
	setupDragForTable: (name: string) => string;
	setupDragForUl: (name: string) => string;
	createManageTabRow: (rowLabel: string) => string;
	generateManageTabsModal: (title: string) => string;
	handleLightningLinkClick: (eventName: string) => string;
	sldsConfirm: (options: { body?: string }) => Promise<boolean>;
	makeDuplicatesBold: (url: string) => string;
	reorderTabsUl: () => string;
	sf_afterSet: (state: string) => string;
	showToast: (message: string) => string;
	getCurrentHref: () => string;
	getModalHanger: () => string;
	updateModalBodyOverflow: (state: string) => string;
	createManageTabsPureModule: (
		dependencies: Record<string, unknown>,
	) => ManageTabsPureModule;
};

/**
 * Loads `generator.js` with a mocked runtime module.
 *
 * @param {GeneratorRuntimeDependency} generatorRuntime Runtime stub.
 * @return {Promise<{ cleanup: () => void; module: GeneratorWrapperModule }>} Isolated wrapper module.
 */
function loadGeneratorWrappers(generatorRuntime: GeneratorRuntimeDependency) {
	return loadIsolatedModule<
		GeneratorWrapperModule,
		{ generatorRuntime: GeneratorRuntimeDependency }
	>({
		modulePath: new URL(
			"../../../src/salesforce/generator.js",
			import.meta.url,
		),
		dependencies: { generatorRuntime },
	});
}

Deno.test("generator.js wrappers delegate all exported runtime calls", async () => {
	const calls: string[] = [];
	const runtime: GeneratorRuntimeDependency = {
		createGeneratorModule: (overrides) => {
			calls.push(`createGeneratorModule:${overrides.kind}`);
			return "factory";
		},
		handleLightningLinkClick: (eventName) => {
			calls.push(`handleLightningLinkClick:${eventName}`);
			return "lightning";
		},
		generateStyleFromSettings: () => {
			calls.push("generateStyleFromSettings");
			return "styles";
		},
		generateRowTemplate: (rowId, confId) => {
			calls.push(`generateRowTemplate:${rowId}:${confId}`);
			return "row";
		},
		generateSldsToastMessage: (message, status) => {
			calls.push(`generateSldsToastMessage:${message}:${status}`);
			return "toast";
		},
		generateSection: (sectionTitle) => {
			calls.push(`generateSection:${sectionTitle}`);
			return "section";
		},
		generateSldsModal: (options) => {
			calls.push(`generateSldsModal:${options.kind}`);
			return "modal";
		},
		generateRadioButtons: (name, radio0, radio1, ...otherRadioDefs) => {
			calls.push(
				`generateRadioButtons:${name}:${radio0.id}:${radio1.id}:${otherRadioDefs.length}`,
			);
			return "radios";
		},
		generateOpenOtherOrgModal: (options) => {
			calls.push(`generateOpenOtherOrgModal:${options.kind}`);
			return "other-org";
		},
		generateSldsFileInput: (
			wrapperId,
			inputElementId,
			acceptedType,
			singleFile,
			allowDrop,
			preventFileSelection,
			required,
		) => {
			calls.push(
				`generateSldsFileInput:${wrapperId}:${inputElementId}:${acceptedType}:${singleFile}:${allowDrop}:${preventFileSelection}:${required}`,
			);
			return "file-input";
		},
		generateCheckboxWithLabel: (id, label, checked) => {
			calls.push(`generateCheckboxWithLabel:${id}:${label}:${checked}`);
			return "checkbox";
		},
		generateUpdateTabModal: (label, url, org) => {
			calls.push(`generateUpdateTabModal:${label}:${url}:${org}`);
			return "update-modal";
		},
		generateHelpWith_i_popup: (options) => {
			calls.push(`generateHelpWith_i_popup:${options.kind}`);
			return "help";
		},
		generateSldsModalWithTabList: (tabs, options) => {
			calls.push(
				`generateSldsModalWithTabList:${tabs.length}:${options.kind}`,
			);
			return "tab-list-modal";
		},
		createManageTabRow: (row, config) => {
			calls.push(`createManageTabRow:${row.kind}:${config.kind}`);
			return "manage-row";
		},
		generateManageTabsModal: (tabs, options) => {
			calls.push(
				`generateManageTabsModal:${tabs.length}:${options.kind}`,
			);
			return "manage-modal";
		},
		generateReviewSponsorSvgs: () => {
			calls.push("generateReviewSponsorSvgs");
			return "review-sponsor";
		},
		generateTutorialElements: () => {
			calls.push("generateTutorialElements");
			return "tutorial";
		},
		sldsConfirm: (options) => {
			calls.push(`sldsConfirm:${options.kind}`);
			return "confirm";
		},
	};
	const { cleanup, module } = await loadGeneratorWrappers(runtime);

	try {
		assertStrictEquals(
			module.createGeneratorModule({ kind: "factory" }),
			"factory",
		);
		assertStrictEquals(module.handleLightningLinkClick("evt"), "lightning");
		assertStrictEquals(module.generateStyleFromSettings(), "styles");
		assertStrictEquals(
			module.generateRowTemplate("row-a", "conf-a"),
			"row",
		);
		assertStrictEquals(
			module.generateSldsToastMessage("toast_message_key", "warning"),
			"toast",
		);
		assertStrictEquals(module.generateSection("section_title"), "section");
		assertStrictEquals(
			module.generateSldsModal({ kind: "modal" }),
			"modal",
		);
		assertStrictEquals(
			module.generateRadioButtons(
				"group-a",
				{ id: "r0" },
				{ id: "r1" },
				{ id: "r2" },
			),
			"radios",
		);
		assertStrictEquals(
			module.generateOpenOtherOrgModal({ kind: "open-other-org" }),
			"other-org",
		);
		assertStrictEquals(
			module.generateSldsFileInput(
				"wrapper-a",
				"input-a",
				"application/json",
				false,
				false,
				false,
				true,
			),
			"file-input",
		);
		assertStrictEquals(
			module.generateCheckboxWithLabel("id-a", "label_key", true),
			"checkbox",
		);
		assertStrictEquals(
			module.generateUpdateTabModal("label-a", "url-a", "org-a"),
			"update-modal",
		);
		assertStrictEquals(
			module.generateHelpWith_i_popup({ kind: "help" }),
			"help",
		);
		assertStrictEquals(
			module.generateSldsModalWithTabList(
				[{ tab: "1" }],
				{ kind: "tab-list" },
			),
			"tab-list-modal",
		);
		assertStrictEquals(
			module.createManageTabRow({ kind: "row" }, { kind: "cfg" }),
			"manage-row",
		);
		assertStrictEquals(
			module.generateManageTabsModal(
				[{ tab: "1" }, { tab: "2" }],
				{ kind: "manage" },
			),
			"manage-modal",
		);
		assertStrictEquals(
			module.generateReviewSponsorSvgs(),
			"review-sponsor",
		);
		assertStrictEquals(module.generateTutorialElements(), "tutorial");
		assertStrictEquals(module.sldsConfirm({ kind: "confirm" }), "confirm");

		assertEquals(calls, [
			"createGeneratorModule:factory",
			"handleLightningLinkClick:evt",
			"generateStyleFromSettings",
			"generateRowTemplate:row-a:conf-a",
			"generateSldsToastMessage:toast_message_key:warning",
			"generateSection:section_title",
			"generateSldsModal:modal",
			"generateRadioButtons:group-a:r0:r1:1",
			"generateOpenOtherOrgModal:open-other-org",
			"generateSldsFileInput:wrapper-a:input-a:application/json:false:false:false:true",
			"generateCheckboxWithLabel:id-a:label_key:true",
			"generateUpdateTabModal:label-a:url-a:org-a",
			"generateHelpWith_i_popup:help",
			"generateSldsModalWithTabList:1:tab-list",
			"createManageTabRow:row:cfg",
			"generateManageTabsModal:2:manage",
			"generateReviewSponsorSvgs",
			"generateTutorialElements",
			"sldsConfirm:confirm",
		]);
	} finally {
		cleanup();
	}
});

Deno.test("content-runtime wrappers delegate to the singleton and factory", async () => {
	const calls: string[] = [];
	const hooks = { hookName: "content-hook" };
	const singletonContentModule: ContentPureModule = {
		bootstrapIfNeeded: () => {
			calls.push("bootstrapIfNeeded");
			return true;
		},
		getCurrentHref: () => {
			calls.push("getCurrentHref");
			return "https://example.com/setup";
		},
		getIsCurrentlyOnSavedTab: () => {
			calls.push("getIsCurrentlyOnSavedTab");
			return true;
		},
		getModalHanger: () => {
			calls.push("getModalHanger");
			return "modal-hanger";
		},
		getSetupTabUl: () => {
			calls.push("getSetupTabUl");
			return "setup-tab-ul";
		},
		getWasOnSavedTab: () => {
			calls.push("getWasOnSavedTab");
			return false;
		},
		isOnSavedTab: (
			isFromHrefUpdate: boolean,
			callback: ((isSaved: boolean) => void) | null,
		) => {
			calls.push(`isOnSavedTab:${isFromHrefUpdate}`);
			callback?.(true);
			return "is-on-saved";
		},
		makeDuplicatesBold: (miniURL: string) => {
			calls.push(`makeDuplicatesBold:${miniURL}`);
			return "duplicates";
		},
		performActionOnTabs: (action: string, tab: string, options: string) => {
			calls.push(`performActionOnTabs:${action}:${tab}:${options}`);
			return "perform-action";
		},
		reorderTabsUl: () => {
			calls.push("reorderTabsUl");
			return "reorder";
		},
		sf_afterSet: (options: Record<string, string>) => {
			calls.push(`sf_afterSet:${options.kind}`);
			return "after-set";
		},
		showToast: (message: string | string[], status: string | undefined) => {
			calls.push(`showToast:${message}:${status}`);
			return "toast";
		},
		__testHooks: hooks,
	};
	const createdModules = [singletonContentModule, { factoryResult: true }];
	const createContentPureModule = (
		overrides: Record<string, string>,
	) => {
		calls.push(`createContentPureModule:${overrides.kind ?? "singleton"}`);
		return createdModules.shift() as ContentFactoryResult;
	};

	const { cleanup, module } = await loadIsolatedModule<
		ContentRuntimeModule,
		{
			createContentPureModule: (
				overrides: Record<string, string>,
			) => ContentFactoryResult;
		}
	>({
		modulePath: new URL(
			"../../../src/salesforce/runtime/content-runtime.js",
			import.meta.url,
		),
		dependencies: {
			createContentPureModule,
		},
	});

	try {
		const createdModule = module.createContentModule({ kind: "factory" });
		assertEquals(createdModule, { factoryResult: true });
		assertStrictEquals(module.bootstrapIfNeeded(), true);
		assertStrictEquals(
			module.getCurrentHref(),
			"https://example.com/setup",
		);
		assertStrictEquals(module.getIsCurrentlyOnSavedTab(), true);
		assertStrictEquals(module.getModalHanger(), "modal-hanger");
		assertStrictEquals(module.getSetupTabUl(), "setup-tab-ul");
		assertStrictEquals(module.getWasOnSavedTab(), false);
		let callbackValue = false;
		assertStrictEquals(
			module.isOnSavedTab(false, (isSaved) => {
				callbackValue = isSaved;
			}),
			"is-on-saved",
		);
		assertStrictEquals(callbackValue, true);
		assertStrictEquals(module.makeDuplicatesBold("mini-url"), "duplicates");
		assertStrictEquals(
			module.performActionOnTabs("remove", "tab-1", "options-1"),
			"perform-action",
		);
		assertStrictEquals(module.reorderTabsUl(), "reorder");
		assertStrictEquals(
			module.sf_afterSet({ kind: "refresh" }),
			"after-set",
		);
		assertStrictEquals(
			module.showToast("toast_message_key", "warning"),
			"toast",
		);
		assertStrictEquals(module.__testHooks, hooks);

		assertEquals(calls, [
			"createContentPureModule:singleton",
			"createContentPureModule:factory",
			"bootstrapIfNeeded",
			"getCurrentHref",
			"getIsCurrentlyOnSavedTab",
			"getModalHanger",
			"getSetupTabUl",
			"getWasOnSavedTab",
			"isOnSavedTab:false",
			"makeDuplicatesBold:mini-url",
			"performActionOnTabs:remove:tab-1:options-1",
			"reorderTabsUl",
			"sf_afterSet:refresh",
			"showToast:toast_message_key:warning",
		]);
	} finally {
		cleanup();
	}
});

Deno.test("manageTabs-runtime wrappers delegate singleton and merge overrides", async () => {
	const singletonCalls: string[] = [];
	const explicitModule: ManageTabsPureModule = {
		createManageTabsModal: () => "explicit-create",
		handleActionButtonClick: () => "explicit-action",
	};
	const singletonModule: ManageTabsPureModule = {
		createManageTabsModal: () => {
			singletonCalls.push("createManageTabsModal");
			return "singleton-create";
		},
		handleActionButtonClick: (eventName, options) => {
			singletonCalls.push(
				`handleActionButtonClick:${eventName}:${options.kind}`,
			);
			return "singleton-action";
		},
	};
	const factoryInputs: Array<Record<string, unknown>> = [];
	const dependencies: ManageTabsDependencyMap = {
		CXM_PIN_TAB: "ctx-pin",
		CXM_REMOVE_TAB: "ctx-remove",
		CXM_UNPIN_TAB: "ctx-unpin",
		HIDDEN_CLASS: "hidden",
		MODAL_ID: "modal-default",
		PIN_TAB_CLASS: "pinned",
		TOAST_ERROR: "toast-error",
		TOAST_WARNING: "toast-warning",
		TUTORIAL_EVENT_CLOSE_MANAGE_TABS: "event-close",
		TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL: "event-open",
		TUTORIAL_EVENT_REORDERED_TABS_TABLE: "event-reorder",
		getInnerElementFieldBySelector: (selector) => selector,
		injectStyle: (id) => id,
		Tab: class {
			kind = "tab";
		},
		ensureAllTabsAvailability: () => [],
		TabContainer: class {
			size = 0;
		},
		getTranslations: (message) =>
			Array.isArray(message) ? message.join(",") : message,
		setupDragForTable: (name) => name,
		setupDragForUl: (name) => name,
		createManageTabRow: (rowLabel) => rowLabel,
		generateManageTabsModal: (title) => title,
		handleLightningLinkClick: (eventName) => eventName,
		sldsConfirm: () => Promise.resolve(true),
		makeDuplicatesBold: (url) => url,
		reorderTabsUl: () => "reorder",
		sf_afterSet: (state) => state,
		showToast: (message) => message,
		getCurrentHref: () => "https://default.example",
		getModalHanger: () => "modal-hanger",
		updateModalBodyOverflow: (state) => state,
		createManageTabsPureModule: (inputDependencies) => {
			factoryInputs.push(inputDependencies);
			return factoryInputs.length === 1
				? singletonModule
				: explicitModule;
		},
	};

	const { cleanup, module } = await loadIsolatedModule<
		ManageTabsRuntimeModule,
		ManageTabsDependencyMap
	>({
		modulePath: new URL(
			"../../../src/salesforce/runtime/manageTabs-runtime.js",
			import.meta.url,
		),
		dependencies,
	});

	try {
		const customShowToast = (message: string) => `custom-${message}`;
		const createdModule = module.createManageTabsModule({
			MODAL_ID: "modal-custom",
			getCurrentHref: () => "https://custom.example",
			showToast: customShowToast,
		});
		assertStrictEquals(createdModule, explicitModule);
		assertStrictEquals(module.createManageTabsModal(), "singleton-create");
		assertStrictEquals(
			module.handleActionButtonClick("evt-a", { kind: "opts-a" }),
			"singleton-action",
		);

		assertEquals(singletonCalls, [
			"createManageTabsModal",
			"handleActionButtonClick:evt-a:opts-a",
		]);
		assertStrictEquals(factoryInputs.length, 2);
		assertEquals(factoryInputs[1].CXM_PIN_TAB, "ctx-pin");
		assertEquals(factoryInputs[1].MODAL_ID, "modal-custom");
		assertStrictEquals(factoryInputs[1].showToast, customShowToast);
		assertStrictEquals(
			(factoryInputs[1].getCurrentHref as () => string)(),
			"https://custom.example",
		);
	} finally {
		cleanup();
	}
});
