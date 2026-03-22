import {
	assertEquals,
	assertRejects,
	assertThrows,
} from "@std/testing/asserts";
import { loadIsolatedModule } from "../load-isolated-module.test.ts";

type OptionsModule = {
	buildDecorationConfigs: (
		styles: string[],
		configs: Record<string, Record<string, unknown>>,
	) => Record<string, Record<string, unknown>>;
	buildInputConfigs: (
		styles: string[],
		configs: Record<string, Record<string, unknown>>,
	) => Record<string, Record<string, unknown>>;
	buildInputDecorationConfigs: (
		configs: Record<string, Record<string, unknown>>,
	) => Record<string, Record<string, unknown>>;
	buildStructuredConf: (
		configs: Record<string, Record<string, Record<string, unknown>>>,
	) => Record<string, Record<string, Record<string, unknown>>>;
	createStyleIds: (options?: {
		postfix?: string;
		prefix?: string;
		state?: string | null;
		tabType?: string | null;
	}) => Record<string, string | undefined>;
	createTabElements: (options?: {
		postfix?: string;
		prefix?: string;
		state?: string | null;
		tabType?: string | null;
	}) => {
		decorationUls: Record<string, OptionElement>;
		decorations: OptionElement[];
		elements: Record<string, OptionElement | null>;
		moveBtns: Record<string, OptionElement>;
		styleIds: Record<string, string | undefined>;
	};
	getDecorationUls: (options?: {
		postfix?: string;
		prefix?: string;
		state?: string | null;
		tabType?: string | null;
	}) => Record<string, OptionElement>;
	getMoveButtons: (options?: {
		prefix?: string;
		state?: string | null;
		tabType?: string | null;
	}) => Record<string, OptionElement>;
	getObjectToSet: (options?: {
		key?: string | null;
		set?: unknown[];
	}) => Record<string, unknown>;
	getPinKey: (options?: { isPinned?: boolean }) => string;
	getTabElement: (
		styleType?: string | null,
		options?: {
			postfix?: string;
			prefix?: string;
			state?: string | null;
			tabType?: string | null;
		},
	) => OptionElement | null;
	saveCheckboxOptions: (
		this: OptionElement | undefined,
		event: { target: OptionElement },
		...dependentCheckboxElements: OptionElement[]
	) => void;
	__getState: () => {
		activePreview: OptionElement | null;
		listenersSet: Record<string, boolean>;
	};
	__setState: (state: {
		activePreview?: OptionElement | null;
		listenersSet?: Record<string, boolean>;
	}) => void;
	_buildCssRule: (
		setting: { id: string; value: string },
		options: {
			isForInactive: boolean;
			isGeneric: boolean;
			isPinned: boolean;
			wasPicked: boolean;
		},
	) => string | null;
	_flipSelected: (
		event: { target: OptionElement },
		isSelected: boolean,
	) => void;
	_getElementReferences: (
		config: Record<string, object | string | null>,
		options: {
			isForInactive: boolean;
			isGeneric: boolean;
			pinKey: string;
			wasPicked?: boolean;
		},
	) => { chosenUl?: OptionElement | null; input?: OptionElement | null };
	_getPseudoSelector: (id: string) => string;
	_getReferencesByKey: (
		configs?: {
			active: Record<string, Record<string, string>>;
			inactive: Record<string, Record<string, string>>;
		},
		key?: string,
	) => {
		active: Record<string, string>;
		inactive: Record<string, string>;
	};
	_getStyleId: (
		config: Record<string, object | string | null>,
		options: {
			isForInactive: boolean;
			isGeneric: boolean;
			pinKey: string;
		},
	) => string | null;
	_getTabResources: (options: {
		isGeneric: boolean;
		isPinned: boolean;
	}) => {
		inputs: { active: OptionElement[]; inactive: OptionElement[] };
		decorations: { active: OptionElement[]; inactive: OptionElement[] };
		active: {
			moveBtns: Record<string, OptionElement | null>;
			uls: Record<string, OptionElement | null>;
		};
		inactive: {
			moveBtns: Record<string, OptionElement | null>;
			uls: Record<string, OptionElement | null>;
		};
	};
	_restoreSettings: (key: string) => Promise<void>;
	_updateUIElements: (
		references: {
			chosenUl?: OptionElement | null;
			input?: OptionElement | null;
		},
		value: string,
	) => void;
	getContainers: (key?: string) => {
		container: OptionElement;
		header: OptionElement;
		preview: OptionElement;
	};
	moveSelectedDecorationsTo: (options?: {
		allDecorations: OptionElement[];
		allMovableDecorations: OptionElement[];
		isAdding: boolean;
		key: string;
		moveHereElement: OptionElement;
	}) => void;
	restoreGeneralSettings: () => Promise<void>;
	restoreTabSettings: (key: string) => Promise<void>;
	savePickedSort: (key?: string | null, direction?: string | null) => void;
	saveTabDecorations: (
		decorations: OptionElement[],
		isForActive: boolean,
		key: string,
	) => void;
	saveTabOptions: (event: { target: OptionElement }, key: string) => void;
	setActivePreview: (options: { isActive: boolean }) => void;
	setCurrentChoice: (choice: {
		ascending?: boolean;
		enabled?: boolean | string;
		id: string;
		value?: Array<{ forActive: boolean; id: string; value: string }>;
	}) => void;
	setPreviewAndInputValue: (options: {
		forActive: boolean;
		id: string;
		value: string;
	}) => void;
	showRelevantSettings_HideOthers: (options: {
		container?: OptionElement;
		header?: OptionElement;
		preview?: OptionElement;
	}) => void;
	showThenHideToast: (toast: OptionElement) => void;
	showToast: (message: string, isSuccess: boolean) => Promise<void>;
	startThemeTransition: () => void;
	toggleActivePreview: (event: { target: OptionElement }) => void;
};

class OptionClassList {
	#classes = new Set<string>();
	#owner: OptionElement;

	constructor(owner: OptionElement) {
		this.#owner = owner;
	}

	add(...classNames: string[]) {
		for (const className of classNames) {
			this.#classes.add(className);
		}
		this.#owner.className = [...this.#classes].join(" ");
	}

	remove(...classNames: string[]) {
		for (const className of classNames) {
			this.#classes.delete(className);
		}
		this.#owner.className = [...this.#classes].join(" ");
	}

	contains(className: string) {
		return this.#classes.has(className);
	}

	toggle(className: string) {
		if (this.#classes.has(className)) {
			this.#classes.delete(className);
			this.#owner.className = [...this.#classes].join(" ");
			return false;
		}
		this.#classes.add(className);
		this.#owner.className = [...this.#classes].join(" ");
		return true;
	}
}

class OptionElement {
	ariaSelected: boolean | string = "false";
	checked: boolean | string = false;
	children: OptionElement[] = [];
	classList = new OptionClassList(this);
	className = "";
	dataset: Record<string, string> = {};
	disabled = false;
	id: string;
	innerText = "";
	parentNode: OptionElement | null = null;
	style: Record<string, string> = {};
	tagName: string;
	textContent = "";
	value = "";
	#listeners = new Map<
		string,
		Array<(event: Record<string, unknown>) => void>
	>();
	#queryMap = new Map<string, OptionElement | null>();
	#queryAllMap = new Map<string, OptionElement[]>();

	constructor(id: string, tagName = "div") {
		this.id = id;
		this.tagName = tagName.toUpperCase();
	}

	addEventListener(
		type: string,
		listener: (event: Record<string, unknown>) => void,
	) {
		const listeners = this.#listeners.get(type) ?? [];
		listeners.push(listener);
		this.#listeners.set(type, listeners);
	}

	append(...elements: OptionElement[]) {
		for (const element of elements) {
			if (element.parentNode != null) {
				element.parentNode.children = element.parentNode.children
					.filter((child) => child !== element);
			}
			element.parentNode = this;
			this.children.push(element);
		}
	}

	click() {
		void this.dispatch("click");
	}

	closest(selector: string) {
		if (selector.toLowerCase() === this.tagName.toLowerCase()) {
			return this;
		}
		for (
			let current = this.parentNode;
			current != null;
			current = current.parentNode
		) {
			if (selector.toLowerCase() === current.tagName.toLowerCase()) {
				return current;
			}
		}
		return null;
	}

	async dispatch(type: string, overrides: Record<string, unknown> = {}) {
		const event = {
			currentTarget: this,
			preventDefault: () => {},
			target: this,
			...overrides,
		};
		for (const listener of this.#listeners.get(type) ?? []) {
			await listener(event);
		}
	}

	querySelector(selector: string) {
		return this.#queryMap.get(selector) ?? null;
	}

	querySelectorAll(selector: string) {
		return this.#queryAllMap.get(selector) ?? [];
	}

	setQueryResult(selector: string, element: OptionElement | null) {
		this.#queryMap.set(selector, element);
	}

	setQueryResults(selector: string, elements: OptionElement[]) {
		this.#queryAllMap.set(selector, elements);
	}
}

type OptionsFixture = {
	areFramePatternsAllowedResult: { value: boolean };
	clearTimeoutCalls: Array<number | null>;
	cleanup: () => void;
	consoleErrors: string[];
	cssRuleCalls: Array<{ id: string; value: string }>;
	cssSelectorCalls: Array<Record<string, unknown>>;
	documentElement: OptionElement;
	elements: Map<string, OptionElement>;
	exportPermissionResult: { value: boolean };
	framePatternsPermissionResult: { value: boolean };
	injectStyleCalls: Array<{ css: string | null; id: string }>;
	isExportAllowedResult: { value: boolean };
	isStyleKeyResult: { value: boolean };
	module: OptionsModule;
	querySelectors: Map<string, OptionElement>;
	requestCookiesPermissionResult: { value: boolean };
	restoreOnLoadPromise: Promise<void>;
	sendMessages: Record<string, unknown>[];
	scheduledTimeouts: Array<() => void>;
	settingsResult: {
		value: Record<string, unknown> | Record<string, unknown>[] | null;
	};
	styleSettings: Map<string, unknown>;
};

function getOrCreateElement(
	elements: Map<string, OptionElement>,
	id: string,
) {
	const existing = elements.get(id);
	if (existing != null) {
		return existing;
	}
	const element = new OptionElement(id);
	elements.set(id, element);
	return element;
}

function createListItem(id: string, styleKey: string) {
	const element = new OptionElement(id, "li");
	element.dataset.styleKey = styleKey;
	return element;
}

async function loadOptions(
	{ runRestoreOnLoad = false }: { runRestoreOnLoad?: boolean } = {},
) {
	const areFramePatternsAllowedResult = { value: true };
	const clearTimeoutCalls: Array<number | null> = [];
	const consoleErrors: string[] = [];
	const cssRuleCalls: Array<{ id: string; value: string }> = [];
	const cssSelectorCalls: Array<Record<string, unknown>> = [];
	const documentElement = new OptionElement("html");
	const elements = new Map<string, OptionElement>();
	const exportPermissionResult = { value: true };
	const framePatternsPermissionResult = { value: true };
	const injectStyleCalls: Array<{ css: string | null; id: string }> = [];
	const isExportAllowedResult = { value: true };
	const isStyleKeyResult = { value: true };
	const requestCookiesPermissionResult = { value: true };
	const scheduledTimeouts: Array<() => void> = [];
	const sendMessages: Record<string, unknown>[] = [];
	const settingsResult = {
		value: {} as Record<string, unknown> | Record<string, unknown>[] | null,
	};
	const styleSettings = new Map<string, unknown>();
	const querySelectorMap = new Map<string, OptionElement>();
	querySelectorMap.set(
		"theme-selector-aws",
		new OptionElement("theme-selector-aws"),
	);
	querySelectorMap.set(
		"#save-container > button",
		new OptionElement("save-button", "button"),
	);
	for (const toastId of ["toast-display-success", "toast-display-error"]) {
		const toast = getOrCreateElement(elements, toastId);
		const message = new OptionElement(`${toastId}-message`);
		toast.setQueryResult(
			"div.toastMessage.slds-text-heading--small.forceActionsText",
			message,
		);
	}

	const { cleanup, module } = await loadIsolatedModule<
		OptionsModule,
		Record<string, unknown>
	>({
		modulePath: new URL("../../src/settings/options.js", import.meta.url),
		additionalExports: [
			"_buildCssRule",
			"_flipSelected",
			"_getElementReferences",
			"_getPseudoSelector",
			"_getReferencesByKey",
			"_getStyleId",
			"_getTabResources",
			"_restoreSettings",
			"_setupMoveButtonListeners",
			"_setupUIListeners",
			"_updateUIElements",
			"__getState",
			"__setState",
			"buildDecorationConfigs",
			"buildInputConfigs",
			"buildInputDecorationConfigs",
			"buildStructuredConf",
			"createStyleIds",
			"createTabElements",
			"getContainers",
			"getDecorationUls",
			"getMoveButtons",
			"getObjectToSet",
			"getPinKey",
			"getTabElement",
			"moveSelectedDecorationsTo",
			"restoreGeneralSettings",
			"restoreTabSettings",
			"saveCheckboxOptions",
			"savePickedSort",
			"saveTabDecorations",
			"saveTabOptions",
			"setActivePreview",
			"setCurrentChoice",
			"setPreviewAndInputValue",
			"showRelevantSettings_HideOthers",
			"showThenHideToast",
			"showToast",
			"startThemeTransition",
			"toggleActivePreview",
		],
		extraSource: `
function __setState(state = {}) {
	if (state.activePreview !== undefined) activePreview = state.activePreview;
	if (state.listenersSet !== undefined) {
		for (const key of Object.keys(listenersSet)) delete listenersSet[key];
		Object.assign(listenersSet, state.listenersSet);
	}
}
function __getState() {
	return { activePreview, listenersSet };
}`,
		dependencies: {
			EXTENSION_NAME: "awsf",
			FOLLOW_SF_LANG: "follow-sf-lang",
			GENERIC_PINNED_TAB_STYLE_KEY: "generic-pinned-style",
			GENERIC_TAB_STYLE_KEY: "generic-style",
			HIDDEN_CLASS: "hidden",
			LINK_NEW_BROWSER: "link-new-browser",
			NO_RELEASE_NOTES: "no-release-notes",
			NO_UPDATE_NOTIFICATION: "no-update-notification",
			ORG_PINNED_TAB_STYLE_KEY: "org-pinned-style",
			ORG_TAB_STYLE_KEY: "org-style",
			PERSIST_SORT: "persist-sort",
			POPUP_LOGIN_NEW_TAB: "popup-login-new-tab",
			POPUP_OPEN_LOGIN: "popup-open-login",
			POPUP_OPEN_SETUP: "popup-open-setup",
			POPUP_SETUP_NEW_TAB: "popup-setup-new-tab",
			PREVENT_ANALYTICS: "prevent-analytics",
			PREVENT_DEFAULT_OVERRIDE: "prevent-default-override",
			SETTINGS_KEY: "settings-key",
			SKIP_LINK_DETECTION: "skip-link-detection",
			SLDS_ACTIVE: "slds-active",
			TAB_ADD_FRONT: "tab-add-front",
			TAB_AS_ORG: "tab-as-org",
			TAB_GENERIC_STYLE: "generic",
			TAB_ON_LEFT: "tab-on-left",
			TAB_ORG_STYLE: "org",
			TAB_STYLE_BACKGROUND: "background",
			TAB_STYLE_BOLD: "bold",
			TAB_STYLE_BORDER: "border",
			TAB_STYLE_COLOR: "color",
			TAB_STYLE_HOVER: "hover",
			TAB_STYLE_ITALIC: "italic",
			TAB_STYLE_SHADOW: "shadow",
			TAB_STYLE_TOP: "top",
			TAB_STYLE_UNDERLINE: "underline",
			USE_LIGHTNING_NAVIGATION: "use-lightning-navigation",
			USER_LANGUAGE: "user-language",
			WHAT_SET: "what-set",
			areFramePatternsAllowed: () =>
				Promise.resolve(areFramePatternsAllowedResult.value),
			ensureTranslatorAvailability: () =>
				Promise.resolve({
					translate: (key: string) => Promise.resolve(key),
				}),
			getCssRule: (id: string, value: string) => {
				cssRuleCalls.push({ id, value });
				return `${id}:${value};`;
			},
			getCssSelector: (options: Record<string, unknown>) => {
				cssSelectorCalls.push(options);
				return `.selector-${cssSelectorCalls.length}`;
			},
			getPinnedSpecificKey: (
				{ isGeneric, isPinned }: {
					isGeneric: boolean;
					isPinned: boolean;
				},
			) => `${isGeneric ? "generic" : "org"}-${
				isPinned ? "pinned" : "unpinned"
			}`,
			getSettings: () => Promise.resolve(settingsResult.value),
			getStyleSettings: (key: string) =>
				Promise.resolve(styleSettings.get(key) ?? null),
			injectStyle: (id: string, { css }: { css: string | null }) => {
				injectStyleCalls.push({ css, id });
				return new OptionElement(id, "style");
			},
			isExportAllowed: () => isExportAllowedResult.value,
			isGenericKey: (key: string) => key.includes("generic"),
			isPinnedKey: (key: string) => key.includes("pinned"),
			isStyleKey: () => isStyleKeyResult.value,
			requestCookiesPermission: () =>
				Promise.resolve(requestCookiesPermissionResult.value),
			requestExportPermission: () =>
				Promise.resolve(exportPermissionResult.value),
			requestFramePatternsPermission: () =>
				Promise.resolve(framePatternsPermissionResult.value),
			sendExtensionMessage: (message: Record<string, unknown>) => {
				sendMessages.push(message);
			},
		},
		globals: {
			clearTimeout: (timeoutId: number | null) => {
				clearTimeoutCalls.push(timeoutId);
			},
			console: {
				error: (message: string) => {
					consoleErrors.push(message);
				},
			},
			document: {
				documentElement,
				getElementById: (id: string) =>
					getOrCreateElement(elements, id),
				querySelector: (selector: string) =>
					querySelectorMap.get(selector) ??
						getOrCreateElement(elements, selector),
			},
			__runRestoreGeneralSettingsOnLoad: runRestoreOnLoad,
			__restoreGeneralSettingsOnLoadPromise: undefined,
			setTimeout: (callback: () => void) => {
				scheduledTimeouts.push(callback);
				return scheduledTimeouts.length;
			},
		},
		importsToReplace: new Set([
			"/core/constants.js",
			"/core/functions.js",
			"/core/translator.js",
			"/components/theme-selector/theme-selector.js",
		]),
		transformSource: (source) =>
			source.replace(
				/\nawait restoreGeneralSettings\(\);\s*$/,
				"\nif (globalThis.__runRestoreGeneralSettingsOnLoad) { globalThis.__restoreGeneralSettingsOnLoadPromise = restoreGeneralSettings(); } else { globalThis.__restoreGeneralSettingsSkipped = true; globalThis.__restoreGeneralSettingsOnLoadPromise = Promise.resolve(); }\n",
			),
	});

	return {
		areFramePatternsAllowedResult,
		clearTimeoutCalls,
		cleanup,
		consoleErrors,
		cssRuleCalls,
		cssSelectorCalls,
		documentElement,
		elements,
		exportPermissionResult,
		framePatternsPermissionResult,
		injectStyleCalls,
		isExportAllowedResult,
		isStyleKeyResult,
		module,
		querySelectors: querySelectorMap,
		requestCookiesPermissionResult,
		restoreOnLoadPromise: (globalThis as {
			__restoreGeneralSettingsOnLoadPromise?: Promise<void>;
		}).__restoreGeneralSettingsOnLoadPromise ?? Promise.resolve(),
		scheduledTimeouts,
		sendMessages,
		settingsResult,
		styleSettings,
	};
}

Deno.test("options starts the theme transition and builds checkbox payloads", async () => {
	const fixture = await loadOptions();
	const dependentCheckbox = new OptionElement("dependent");
	dependentCheckbox.checked = true;

	try {
		fixture.module.__setState({});
		fixture.module.__setState({ listenersSet: {} });
		fixture.module.__setState({ listenersSet: { settings: true } });
		fixture.module.__setState({ listenersSet: { other: true } });
		fixture.module.startThemeTransition();
		assertEquals(
			fixture.documentElement.classList.contains("theme-transitioning"),
			true,
		);
		fixture.scheduledTimeouts[0]();
		assertEquals(
			fixture.documentElement.classList.contains("theme-transitioning"),
			false,
		);

		fixture.module.startThemeTransition();
		assertEquals(fixture.clearTimeoutCalls, [null, 1]);

		assertThrows(
			() => fixture.module.getObjectToSet(),
			Error,
			"error_required_params",
		);
		assertEquals(
			fixture.module.getObjectToSet({
				key: "settings-key",
				set: [{ id: "a" }],
			}),
			{
				key: "settings-key",
				set: [{ id: "a" }],
				what: "what-set",
			},
		);

		const checkbox = new OptionElement("allow-export");
		checkbox.checked = true;
		fixture.module.saveCheckboxOptions.call(
			checkbox,
			{ target: checkbox },
			dependentCheckbox,
		);
		assertEquals(fixture.sendMessages[0], {
			key: "settings-key",
			set: [
				{ enabled: true, id: "allow-export" },
				{ enabled: true, id: "dependent" },
			],
			what: "what-set",
		});
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options resolves tab element ids and tab element groups", async () => {
	const fixture = await loadOptions();

	try {
		assertThrows(
			() => fixture.module.getTabElement(),
			Error,
			"error_required_params",
		);
		assertEquals(
			fixture.module.getTabElement("background", {
				postfix: "-preview",
				prefix: "custom-",
				state: "active",
				tabType: "generic",
			})?.id,
			"custom-generic-background-active-preview",
		);

		assertThrows(
			() => fixture.module.getDecorationUls(),
			Error,
			"error_required_params",
		);
		assertEquals(
			fixture.module.getDecorationUls({
				postfix: "-preview",
				prefix: "custom-",
				state: "inactive",
				tabType: "generic",
			}).available.id,
			"custom-generic-set_decoration_available-inactive-preview",
		);

		assertThrows(
			() => fixture.module.createStyleIds(),
			Error,
			"error_required_params",
		);
		assertEquals(
			fixture.module.createStyleIds({
				state: "active",
				tabType: "generic",
			}),
			{
				background: "awsf-background-style-generic-active",
				bold: "awsf-bold-style-generic-active",
				border: "awsf-border-style-generic-active",
				color: "awsf-color-style-generic-active",
				hover: "awsf-hover-style-generic-active",
				italic: "awsf-italic-style-generic-active",
				shadow: "awsf-shadow-style-generic-active",
				top: "awsf-top-style-generic-active",
				underline: "awsf-underline-style-generic-active",
			},
		);

		assertThrows(
			() => fixture.module.getMoveButtons(),
			Error,
			"error_required_params",
		);
		assertEquals(
			fixture.module.getMoveButtons({
				prefix: "pinned_",
				state: "active",
				tabType: "org",
			}).chosen.id,
			"pinned_org-move-chosen-active",
		);

		assertThrows(
			() => fixture.module.createTabElements(),
			Error,
			"error_required_params",
		);
		const inactiveTabElements = fixture.module.createTabElements({
			state: "inactive",
			tabType: "generic",
		});
		assertEquals(inactiveTabElements.elements.top, null);
		assertEquals(inactiveTabElements.decorations.length, 3);
		assertEquals(
			inactiveTabElements.moveBtns.available.id,
			"generic-move-available-inactive",
		);
		assertEquals(
			inactiveTabElements.styleIds.hover,
			"awsf-hover-style-generic-inactive",
		);

		const activeTabElements = fixture.module.createTabElements({
			prefix: "pinned_",
			state: "active",
			tabType: "org",
		});
		assertEquals(
			activeTabElements.elements.top?.id,
			"pinned_org-top-active",
		);
		assertEquals(
			activeTabElements.decorationUls.chosen.id,
			"pinned_org-set_decoration_chosen-active",
		);
		assertEquals(
			activeTabElements.styleIds.top,
			"awsf-pinned_-top-style-org-active",
		);
		assertEquals(fixture.module.getPinKey({ isPinned: false }), "unpinned");
		assertEquals(fixture.module.getPinKey({ isPinned: true }), "pinned");
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options builds structured style configuration maps", async () => {
	const fixture = await loadOptions();
	type NestedValueConfig = Record<
		string,
		Record<string, Record<string, string>>
	>;
	type InputConfigEntry = {
		elements: NestedValueConfig;
		styleIds: NestedValueConfig;
	};
	type DecorationConfigEntry = {
		availableUls: NestedValueConfig;
		chosenUls: NestedValueConfig;
	};
	type MergedConfigEntry = {
		type: string;
		availableUls: NestedValueConfig;
	};
	type StructuredConfEntry = {
		inputs: string[];
		moveBtns: Record<string, string>;
	};
	type StructuredConfig = Record<
		string,
		Record<string, StructuredConfEntry>
	>;
	const makeConfig = (prefix: string) => ({
		decorations: [prefix],
		decorationUls: {
			available: `${prefix}-available`,
			chosen: `${prefix}-chosen`,
		},
		elements: {
			background: `${prefix}-background`,
			bold: `${prefix}-bold`,
			top: `${prefix}-top`,
		},
		moveBtns: {
			available: `${prefix}-move-available`,
			chosen: `${prefix}-move-chosen`,
		},
		styleIds: {
			background: `${prefix}-background-style`,
			bold: `${prefix}-bold-style`,
			top: `${prefix}-top-style`,
		},
	});
	const configs = {
		activeGenericPinned: makeConfig("active-generic-pinned"),
		activeGenericUnpinned: makeConfig("active-generic-unpinned"),
		activeOrgPinned: makeConfig("active-org-pinned"),
		activeOrgUnpinned: makeConfig("active-org-unpinned"),
		inactiveGenericPinned: makeConfig("inactive-generic-pinned"),
		inactiveGenericUnpinned: makeConfig("inactive-generic-unpinned"),
		inactiveOrgPinned: makeConfig("inactive-org-pinned"),
		inactiveOrgUnpinned: makeConfig("inactive-org-unpinned"),
	};

	try {
		const inputConfigs = fixture.module.buildInputConfigs(
			["background", "bold", "top"],
			configs,
		) as Record<string, InputConfigEntry>;
		assertEquals(
			inputConfigs.background.elements.inactive.generic.unpinned,
			"inactive-generic-unpinned-background",
		);
		assertEquals(
			inputConfigs.top.styleIds.active.org.pinned,
			"active-org-pinned-top-style",
		);

		const decorationConfigs = fixture.module.buildDecorationConfigs(
			["bold"],
			configs,
		) as Record<string, DecorationConfigEntry>;
		assertEquals(
			decorationConfigs.bold.chosenUls.active.generic.unpinned,
			"active-generic-unpinned-chosen",
		);
		assertEquals(
			decorationConfigs.bold.availableUls.inactive.org.pinned,
			"inactive-org-pinned-available",
		);

		const mergedConfigs = fixture.module.buildInputDecorationConfigs(
			configs,
		) as Record<string, MergedConfigEntry>;
		assertEquals(mergedConfigs.bold.type, "decoration");
		assertEquals(
			mergedConfigs.background.type,
			"input",
		);
		assertEquals(
			mergedConfigs.bold.availableUls.active.org.unpinned,
			"active-org-unpinned-available",
		);

		const structured = fixture.module.buildStructuredConf({
			active: {
				pinned: makeConfig("active-pinned"),
				unpinned: makeConfig("active-unpinned"),
			},
			inactive: {
				pinned: makeConfig("inactive-pinned"),
				unpinned: makeConfig("inactive-unpinned"),
			},
		}) as StructuredConfig;
		assertEquals(structured.unpinned.active.inputs, [
			"active-unpinned-background",
			"active-unpinned-bold",
			"active-unpinned-top",
		]);
		assertEquals(
			structured.pinned.inactive.moveBtns.available,
			"inactive-pinned-move-available",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options builds preview css rules and updates preview inputs", async () => {
	const fixture = await loadOptions();
	const decorationInput = new OptionElement("decoration-input", "li");
	const chosenUl = new OptionElement("chosen-ul", "ul");
	const availableUl = new OptionElement("available-ul", "ul");
	const inputConfig = {
		elements: {
			active: { generic: { pinned: null, unpinned: decorationInput } },
			inactive: { generic: { pinned: null, unpinned: decorationInput } },
		},
		styleIds: {
			active: { generic: { pinned: null, unpinned: "input-style-id" } },
			inactive: { generic: { pinned: null, unpinned: "input-style-id" } },
		},
		type: "input",
	};
	const decorationConfig = {
		availableUls: {
			active: { generic: { pinned: null, unpinned: availableUl } },
			inactive: { generic: { pinned: null, unpinned: availableUl } },
		},
		chosenUls: {
			active: { generic: { pinned: null, unpinned: chosenUl } },
			inactive: { generic: { pinned: null, unpinned: chosenUl } },
		},
		elements: inputConfig.elements,
		styleIds: inputConfig.styleIds,
		type: "decoration",
	};

	try {
		assertEquals(fixture.module._getPseudoSelector("hover"), ":hover");
		assertEquals(fixture.module._getPseudoSelector("top"), "::before");
		assertEquals(fixture.module._getPseudoSelector("other"), "");

		assertEquals(
			fixture.module._getElementReferences(inputConfig, {
				isForInactive: true,
				isGeneric: true,
				pinKey: "unpinned",
			}).input,
			decorationInput,
		);
		assertEquals(
			fixture.module._getElementReferences(decorationConfig, {
				isForInactive: false,
				isGeneric: true,
				pinKey: "unpinned",
				wasPicked: false,
			}).chosenUl,
			availableUl,
		);
		assertEquals(
			fixture.module._getElementReferences(decorationConfig, {
				isForInactive: false,
				isGeneric: true,
				pinKey: "unpinned",
				wasPicked: true,
			}).chosenUl,
			chosenUl,
		);
		assertEquals(
			fixture.module._getStyleId(inputConfig, {
				isForInactive: false,
				isGeneric: true,
				pinKey: "unpinned",
			}),
			"input-style-id",
		);

		assertEquals(
			fixture.module._buildCssRule(
				{ id: "hover", value: "red" },
				{
					isForInactive: false,
					isGeneric: true,
					isPinned: true,
					wasPicked: false,
				},
			),
			null,
		);
		assertEquals(
			fixture.module._buildCssRule(
				{ id: "hover", value: "red" },
				{
					isForInactive: false,
					isGeneric: true,
					isPinned: true,
					wasPicked: true,
				},
			),
			".selector-1{ hover:red; }",
		);

		fixture.module._updateUIElements({
			chosenUl,
			input: decorationInput,
		}, "blue");
		assertEquals(decorationInput.value, "blue");
		assertEquals(chosenUl.children[0], decorationInput);

		const injectCallsBefore = fixture.injectStyleCalls.length;
		fixture.module.setPreviewAndInputValue({
			forActive: false,
			id: "top",
			value: "10px",
		});
		assertEquals(fixture.injectStyleCalls.length, injectCallsBefore);

		fixture.module.setPreviewAndInputValue({
			forActive: true,
			id: "prevent-default-override",
			value: "ignore",
		});
		assertEquals(fixture.injectStyleCalls.length, injectCallsBefore);

		fixture.module.setPreviewAndInputValue({
			forActive: true,
			id: "unknown-setting",
			value: "value",
		});
		assertEquals(
			fixture.consoleErrors.at(-1),
			"Unmatched style setting id: unknown-setting",
		);

		fixture.module.setPreviewAndInputValue({
			forActive: true,
			id: "background",
			value: "salmon",
		});
		assertEquals(
			fixture.elements.get("generic-background-active")?.value,
			"salmon",
		);
		assertEquals(
			fixture.injectStyleCalls.at(-1),
			{
				css: ".selector-2{ background:salmon; }",
				id: "awsf-background-style-generic-active",
			},
		);

		fixture.module.setPreviewAndInputValue({
			forActive: true,
			id: "bold",
			value: "bold",
		});
		assertEquals(
			fixture.elements.get("generic-set_decoration_chosen-active")
				?.children[0],
			fixture.elements.get("generic-bold-active"),
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options applies current choices, sort settings, and toast helpers", async () => {
	const fixture = await loadOptions();
	const sortWrapper = fixture.elements.get("sort-wrapper")!;
	sortWrapper.classList.add("invisible");

	try {
		fixture.module.setCurrentChoice({
			enabled: true,
			id: "link-new-browser",
		});
		assertEquals(fixture.elements.get("link-new-browser")?.checked, true);

		fixture.module.setCurrentChoice({
			enabled: "it",
			id: "user-language",
		});
		assertEquals(fixture.elements.get("user-language")?.value, "it");

		fixture.module.setCurrentChoice({
			ascending: false,
			enabled: "recent",
			id: "persist-sort",
		});
		assertEquals(
			fixture.elements.get("keep_sorted")?.checked,
			"recent",
		);
		assertEquals(fixture.elements.get("picked-sort")?.value, "recent");
		assertEquals(
			fixture.elements.get("picked-sort-direction")?.value,
			"descending",
		);
		assertEquals(sortWrapper.classList.contains("invisible"), false);
		fixture.module.setCurrentChoice({
			ascending: true,
			enabled: "recent",
			id: "persist-sort",
		});
		assertEquals(
			fixture.elements.get("picked-sort-direction")?.value,
			"ascending",
		);

		fixture.module.setCurrentChoice({
			id: "generic-style",
			value: [{
				forActive: true,
				id: "color",
				value: "gold",
			}],
		});
		assertEquals(
			fixture.elements.get("generic-color-active")?.value,
			"gold",
		);

		fixture.module.setCurrentChoice({
			id: "unknown-setting",
		});
		assertEquals(
			fixture.consoleErrors.at(-1),
			"Unmatched setting id: unknown-setting",
		);

		fixture.module.savePickedSort("custom-key", "ascending");
		assertEquals(fixture.elements.get("tab-add-front")?.checked, false);
		assertEquals(fixture.sendMessages.at(-1), {
			key: "settings-key",
			set: [
				{ ascending: true, enabled: "custom-key", id: "persist-sort" },
				{ enabled: false, id: "tab-add-front" },
			],
			what: "what-set",
		});

		fixture.module.savePickedSort();
		assertEquals(fixture.sendMessages.at(-1), {
			key: "settings-key",
			set: [{ ascending: null, enabled: null, id: "persist-sort" }],
			what: "what-set",
		});

		const keepSorted = fixture.elements.get("keep_sorted")!;
		keepSorted.checked = true;
		await keepSorted.dispatch("click", { currentTarget: keepSorted });
		assertEquals(sortWrapper.classList.contains("invisible"), false);
		keepSorted.checked = false;
		await keepSorted.dispatch("click", { currentTarget: keepSorted });
		assertEquals(sortWrapper.classList.contains("invisible"), true);

		const toast = fixture.elements.get("toast-display-success")!;
		toast.classList.add("invisible");
		fixture.module.showThenHideToast(toast);
		assertEquals(toast.classList.contains("invisible"), false);
		fixture.scheduledTimeouts.at(-1)?.();
		assertEquals(toast.classList.contains("invisible"), true);

		await fixture.module.showToast("translated-message", false);
		assertEquals(
			fixture.elements.get("toast-display-error")?.querySelector(
				"div.toastMessage.slds-text-heading--small.forceActionsText",
			)?.innerText,
			"translated-message",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options restores general settings and handles general setting listeners", async () => {
	const fixture = await loadOptions();
	const allowDomains = fixture.elements.get("allow-domains")!;
	const allowExport = fixture.elements.get("allow-export")!;
	const keepSorted = fixture.elements.get("keep_sorted")!;
	const linkNewBrowser = fixture.elements.get("link-new-browser")!;
	const skipLinkDetection = fixture.elements.get("skip-link-detection")!;
	const sortWrapper = fixture.elements.get("sort-wrapper")!;
	const tabAddFront = fixture.elements.get("tab-add-front")!;
	const useLightningNavigation = fixture.elements.get(
		"use-lightning-navigation",
	)!;
	const userLanguage = fixture.elements.get("user-language")!;
	sortWrapper.classList.add("invisible");
	userLanguage.value = "en";
	fixture.settingsResult.value = [
		{ enabled: true, id: "link-new-browser" },
		{ enabled: "it", id: "user-language" },
	];
	fixture.areFramePatternsAllowedResult.value = false;
	fixture.isExportAllowedResult.value = false;

	try {
		await fixture.module.restoreGeneralSettings();
		assertEquals(linkNewBrowser.checked, true);
		assertEquals(userLanguage.value, "it");
		assertEquals(allowExport.checked, false);
		assertEquals(allowDomains.checked, false);

		skipLinkDetection.checked = true;
		await skipLinkDetection.dispatch("change");
		assertEquals(fixture.sendMessages.at(-1), {
			key: "settings-key",
			set: [{ enabled: true, id: "skip-link-detection" }],
			what: "what-set",
		});

		linkNewBrowser.checked = true;
		await linkNewBrowser.dispatch("change");
		assertEquals(useLightningNavigation.checked, true);
		assertEquals(fixture.sendMessages.at(-1), {
			key: "settings-key",
			set: [
				{ enabled: true, id: "link-new-browser" },
				{ enabled: true, id: "use-lightning-navigation" },
			],
			what: "what-set",
		});

		useLightningNavigation.checked = false;
		await useLightningNavigation.dispatch("change");
		assertEquals(linkNewBrowser.checked, false);

		let keepSortedClicks = 0;
		const originalKeepSortedClick = keepSorted.click.bind(keepSorted);
		keepSorted.click = () => {
			keepSortedClicks++;
			originalKeepSortedClick();
		};
		keepSorted.checked = true;
		tabAddFront.checked = true;
		await tabAddFront.dispatch("change");
		assertEquals(keepSortedClicks, 1);

		fixture.requestCookiesPermissionResult.value = false;
		userLanguage.value = "follow-sf-lang";
		await userLanguage.dispatch("change");
		assertEquals(userLanguage.value, "it");
		assertEquals(
			fixture.elements.get("toast-display-error")?.querySelector(
				"div.toastMessage.slds-text-heading--small.forceActionsText",
			)?.innerText,
			"permission_request_failure",
		);

		fixture.requestCookiesPermissionResult.value = true;
		userLanguage.value = "follow-sf-lang";
		await userLanguage.dispatch("change");
		assertEquals(fixture.sendMessages.at(-1), {
			key: "settings-key",
			set: [{ enabled: "follow-sf-lang", id: "user-language" }],
			what: "what-set",
		});

		userLanguage.value = "fr";
		await userLanguage.dispatch("change");
		assertEquals(fixture.sendMessages.at(-1), {
			key: "settings-key",
			set: [{ enabled: "fr", id: "user-language" }],
			what: "what-set",
		});

		fixture.exportPermissionResult.value = false;
		allowExport.checked = true;
		await allowExport.dispatch("change");
		assertEquals(allowExport.checked, false);
		assertEquals(
			fixture.elements.get("toast-display-error")?.querySelector(
				"div.toastMessage.slds-text-heading--small.forceActionsText",
			)?.innerText,
			"permission_request_failure",
		);

		allowExport.checked = false;
		await allowExport.dispatch("change");
		assertEquals(allowExport.checked, true);
		fixture.exportPermissionResult.value = true;
		allowExport.checked = true;
		await allowExport.dispatch("change");
		assertEquals(allowExport.checked, true);

		fixture.framePatternsPermissionResult.value = false;
		allowDomains.checked = false;
		await allowDomains.dispatch("change");
		allowDomains.checked = true;
		await allowDomains.dispatch("change");
		assertEquals(allowDomains.checked, false);
		fixture.framePatternsPermissionResult.value = true;
		allowDomains.checked = true;
		await allowDomains.dispatch("change");
		assertEquals(allowDomains.checked, true);
		assertEquals(
			fixture.elements.get("toast-display-success")?.querySelector(
				"div.toastMessage.slds-text-heading--small.forceActionsText",
			)?.innerText,
			"permission_request_success",
		);

		const sendsBefore = fixture.sendMessages.length;
		await fixture.module.restoreGeneralSettings();
		skipLinkDetection.checked = false;
		await skipLinkDetection.dispatch("change");
		assertEquals(fixture.sendMessages.length, sendsBefore + 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options can trigger general settings restoration on module load", async () => {
	const fixture = await loadOptions({ runRestoreOnLoad: true });

	try {
		await fixture.restoreOnLoadPromise;
		assertEquals(fixture.module.__getState().listenersSet.settings, true);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options saves tab style inputs and decoration selections", async () => {
	const fixture = await loadOptions();
	const activeInput = fixture.elements.get("generic-border-active")!;
	activeInput.dataset.styleKey = "border";
	activeInput.value = "2px";
	const inactiveDecoration = createListItem(
		"generic-italic-inactive",
		"italic",
	);
	const activeDecoration = createListItem("generic-bold-active", "bold");
	const destination = new OptionElement("destination", "ul");
	const otherDecoration = createListItem(
		"generic-underline-active",
		"underline",
	);
	const child = new OptionElement("child", "span");
	child.parentNode = activeDecoration;
	const preview = new OptionElement("preview");
	preview.classList.add("slds-active");
	fixture.module.__setState({ activePreview: preview });

	try {
		fixture.module.saveTabOptions(
			{ target: activeInput },
			"org-pinned-style",
		);
		assertEquals(fixture.sendMessages.at(-1), {
			key: "org-pinned-style",
			set: [{ forActive: true, id: "border", value: "2px" }],
			what: "what-set",
		});

		fixture.module.saveTabDecorations(
			[inactiveDecoration],
			false,
			"generic-style",
		);
		assertEquals(fixture.sendMessages.at(-1), {
			key: "generic-style",
			set: [
				{ id: "prevent-default-override", value: "no-default" },
				{ forActive: false, id: "italic", value: "" },
			],
			what: "what-set",
		});

		fixture.module.setActivePreview({ isActive: false });
		assertEquals(preview.classList.contains("slds-active"), false);
		fixture.module.setActivePreview({ isActive: true });
		assertEquals(preview.classList.contains("slds-active"), true);

		fixture.module._flipSelected({ target: child }, true);
		assertEquals(String(activeDecoration.ariaSelected), "true");
		assertEquals(preview.classList.contains("slds-active"), true);

		assertThrows(
			() => fixture.module.moveSelectedDecorationsTo(),
			Error,
			"error_required_params",
		);
		activeDecoration.ariaSelected = "true";
		otherDecoration.ariaSelected = "false";
		fixture.module.moveSelectedDecorationsTo({
			allDecorations: [activeDecoration, otherDecoration],
			allMovableDecorations: [activeDecoration, otherDecoration],
			isAdding: true,
			key: "generic-style",
			moveHereElement: destination,
		});
		assertEquals(destination.children[0], activeDecoration);
		assertEquals(String(activeDecoration.ariaSelected), "false");
		assertEquals(String(otherDecoration.ariaSelected), "false");

		assertThrows(
			() => fixture.module._getReferencesByKey(),
			Error,
			"error_required_params",
		);
		const references = fixture.module._getReferencesByKey({
			active: {
				moveBtns: { available: "aa", chosen: "ab" },
			},
			inactive: {
				moveBtns: { available: "ia", chosen: "ib" },
			},
		}, "moveBtns");
		assertEquals(references.active.available, "aa");
		assertEquals(references.inactive.chosen, "ib");

		const orgPinnedResources = fixture.module._getTabResources({
			isGeneric: false,
			isPinned: true,
		});
		assertEquals(Array.isArray(orgPinnedResources.inputs.active), true);
		assertEquals(
			Array.isArray(orgPinnedResources.decorations.inactive),
			true,
		);

		fixture.styleSettings.set("generic-pinned-style", [
			{ forActive: false, id: "shadow", value: "4px" },
		]);
		await fixture.module._restoreSettings("generic-pinned-style");
		assertEquals(
			fixture.elements.get("pinned_generic-shadow-inactive")?.value,
			"4px",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("options restores tab settings and wires tab, header, and save listeners", async () => {
	const fixture = await loadOptions();
	const inactiveInput = fixture.elements.get("generic-background-inactive")!;
	const activeInput = fixture.elements.get("generic-background-active")!;
	inactiveInput.dataset.styleKey = "background";
	activeInput.dataset.styleKey = "background";
	const inactiveDecoration = fixture.elements.get("generic-bold-inactive")!;
	const activeDecoration = fixture.elements.get("generic-bold-active")!;
	inactiveDecoration.dataset.styleKey = "bold";
	activeDecoration.dataset.styleKey = "bold";
	inactiveDecoration.parentNode = new OptionElement("inactive-parent", "li");
	activeDecoration.parentNode = new OptionElement("active-parent", "li");
	const resources = fixture.module._getTabResources({
		isGeneric: true,
		isPinned: false,
	});
	fixture.styleSettings.set("generic-unpinned", {
		id: "generic-style",
		value: { forActive: true, id: "background", value: "navy" },
	});

	try {
		fixture.isStyleKeyResult.value = false;
		await assertRejects(
			() => fixture.module.restoreTabSettings("bad-key"),
			Error,
			"error_invalid_key",
		);
		fixture.isStyleKeyResult.value = true;

		await fixture.module.restoreTabSettings("generic-style");
		assertEquals(
			fixture.module.__getState().listenersSet["generic-unpinned"],
			true,
		);
		assertEquals(activeInput.value, "navy");

		activeInput.value = "orange";
		await activeInput.dispatch("change");
		assertEquals(fixture.sendMessages.at(-1), {
			key: "generic-unpinned",
			set: [{ forActive: true, id: "background", value: "orange" }],
			what: "what-set",
		});

		fixture.module.__setState({
			activePreview: fixture.elements.get("generic-preview"),
		});
		await inactiveInput.dispatch("click");
		assertEquals(
			fixture.elements.get("generic-preview")?.classList.contains(
				"slds-active",
			),
			false,
		);
		await activeInput.dispatch("click");
		assertEquals(
			fixture.elements.get("generic-preview")?.classList.contains(
				"slds-active",
			),
			true,
		);

		const inactiveLi = new OptionElement("inactive-li", "li");
		inactiveDecoration.parentNode = inactiveLi;
		await inactiveDecoration.dispatch("click", {
			target: inactiveDecoration,
		});
		assertEquals(String(inactiveLi.ariaSelected), "true");

		const inactiveChosenButton = resources.inactive.moveBtns
			.chosen as OptionElement;
		const inactiveAvailableButton = resources.inactive.moveBtns
			.available as OptionElement;
		const inactiveChosenUl = resources.inactive.uls.chosen as OptionElement;
		const inactiveAvailableUl = resources.inactive.uls
			.available as OptionElement;
		const activeAvailableButton = resources.active.moveBtns
			.available as OptionElement;
		const activeChosenButton = resources.active.moveBtns
			.chosen as OptionElement;
		const activeChosenUl = resources.active.uls.chosen as OptionElement;
		const activeAvailableUl = resources.active.uls
			.available as OptionElement;
		inactiveDecoration.ariaSelected = "true";
		await inactiveChosenButton.dispatch("click");
		assertEquals(
			inactiveChosenUl.children.includes(inactiveDecoration),
			true,
		);
		inactiveDecoration.ariaSelected = "true";
		await inactiveAvailableButton.dispatch("click");
		assertEquals(
			inactiveAvailableUl.children.includes(inactiveDecoration),
			true,
		);

		const activeLi = new OptionElement("active-li", "li");
		activeDecoration.parentNode = activeLi;
		await activeDecoration.dispatch("click", { target: activeDecoration });
		assertEquals(String(activeLi.ariaSelected), "true");
		activeDecoration.ariaSelected = "true";
		await activeChosenButton.dispatch("click");
		assertEquals(activeChosenUl.children.includes(activeDecoration), true);
		activeDecoration.ariaSelected = "true";
		await activeAvailableButton.dispatch("click");
		assertEquals(
			activeAvailableUl.children.includes(activeDecoration),
			true,
		);

		inactiveInput.value = "teal";
		await inactiveInput.dispatch("change");
		assertEquals(fixture.sendMessages.at(-1), {
			key: "generic-unpinned",
			set: [{ forActive: false, id: "background", value: "teal" }],
			what: "what-set",
		});

		assertThrows(
			() => fixture.module.getContainers(),
			Error,
			"error_required_params",
		);
		assertEquals(
			fixture.module.getContainers("general").container.id,
			"general-container",
		);

		const previewLi = new OptionElement("preview-li", "li");
		const previewChild = new OptionElement("preview-child", "span");
		previewChild.parentNode = previewLi;
		fixture.module.toggleActivePreview({ target: previewChild });
		assertEquals(previewLi.classList.contains("slds-active"), true);

		fixture.module.showRelevantSettings_HideOthers({
			container: fixture.elements.get("org-container"),
			header: fixture.elements.get("org-settings"),
			preview: fixture.elements.get("org-preview"),
		});
		assertEquals(
			fixture.elements.get("org-settings")?.classList.contains(
				"slds-active",
			),
			true,
		);
		assertEquals(
			fixture.module.__getState().activePreview,
			fixture.elements.get("org-preview"),
		);

		await fixture.elements.get("general-settings")!.dispatch("click");
		await fixture.elements.get("generic-settings")!.dispatch("click");
		await fixture.elements.get("org-settings")!.dispatch("click");
		await fixture.elements.get("pinned_generic-settings")!.dispatch(
			"click",
		);
		await fixture.elements.get("pinned_org-settings")!.dispatch("click");
		assertEquals(
			fixture.module.__getState().listenersSet["org-pinned"],
			true,
		);

		fixture.elements.get("keep_sorted")!.checked = true;
		fixture.elements.get("picked-sort")!.value = "alpha";
		fixture.elements.get("picked-sort-direction")!.value = "ascending";
		await fixture.querySelectors.get("#save-container > button")!.dispatch(
			"click",
		);
		assertEquals(fixture.sendMessages.at(-1), {
			key: "settings-key",
			set: [
				{ ascending: true, enabled: "alpha", id: "persist-sort" },
				{ enabled: false, id: "tab-add-front" },
			],
			what: "what-set",
		});
		assertEquals(
			fixture.elements.get("save-confirm")?.classList.contains(
				"invisible",
			),
			false,
		);
	} finally {
		fixture.cleanup();
	}
});
