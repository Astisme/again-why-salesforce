/// <reference lib="dom" />
import {
	assert,
	assertEquals,
	assertExists,
	assertRejects,
	assertStringIncludes,
	assertThrows,
} from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

type StyleRule = {
	forActive?: boolean;
	id: string;
	value: string;
};

type StyleSettings = {
	genericPinnedStyle?: StyleRule[];
	genericStyle?: StyleRule[];
	orgPinnedStyle?: StyleRule[];
	orgStyle?: StyleRule[];
};

type LightningLinkEvent = {
	ctrlKey: boolean;
	currentTarget: {
		href: string | null;
		target: string;
	};
	metaKey: boolean;
	preventDefault: () => void;
};

type ManageTabsInput =
	& Array<{ label?: string; org?: string | null; url?: string }>
	& { pinnedTabsNo?: number };

type GeneratorModule = {
	_buildCssRules: (options?: {
		isGeneric?: boolean;
		isPinned?: boolean;
		list?: StyleRule[];
	}) => {
		activeCss: string;
		inactiveCss: string;
		pseudoRules: StyleRule[];
	};
	_getLinkTarget: (
		event: { ctrlKey?: boolean; metaKey?: boolean },
		url: string,
	) => string;
	_getPseudoRules: (options?: {
		isGeneric?: boolean;
		isPinned?: boolean;
		pseudoRules?: StyleRule[];
	}) => string;
	_getPseudoSelector: (id: string) => string;
	_isPseudoRule: (id: string) => boolean;
	areArraysEqual: (
		arr1: Array<string> | null,
		arr2: Array<string> | null,
	) => boolean;
	createInputElement: (
		config?: {
			enabled?: boolean;
			id?: string | null;
			isTextArea?: boolean;
			label?: string | null;
			placeholder?: string | null;
			required?: boolean;
			style?: string | null;
			title?: string | null;
			type?: string;
			value?: string | null;
		},
		translateConfig?: {
			translateLabel?: boolean;
			translatePlaceholder?: boolean;
			translateTitle?: boolean;
		},
	) => Promise<HTMLInputElement | HTMLTextAreaElement>;
	createManageTabRow: (
		tab?: { label?: string; org?: string | null; url?: string },
		config?: {
			disabled?: boolean;
			index?: number;
			isThisOrgTab?: boolean;
			pinned?: boolean;
		},
	) => Promise<{
		dropdownButton: HTMLButtonElement;
		dropdownMenu: HTMLElement;
		logger: {
			label: HTMLInputElement;
			last_input: { label: string; org: string | null; url: string };
			org: HTMLInputElement;
			url: HTMLInputElement;
		};
		tr: HTMLTableRowElement;
	}>;
	createSldsModalShell: (options?: {
		cancelButtonLabel?: string;
		closeButtonLabel?: string;
		confirmButtonLabel?: string;
		modalTitle?: string;
		showRequiredInfo?: boolean;
	}) => {
		article: HTMLElement;
		buttonContainer: HTMLElement;
		cancelButton: HTMLButtonElement;
		closeButton: HTMLButtonElement;
		legend: HTMLElement | null;
		modalBody: HTMLElement;
		modalParent: HTMLElement;
		saveButton: HTMLButtonElement;
	};
	createTextCell: (
		text?: string | null,
		title?: string,
	) => HTMLTableCellElement;
	generateCheckboxWithLabel: (
		id: string,
		label: string,
		checked?: boolean,
	) => Promise<HTMLLabelElement>;
	generateInput: (
		config?: {
			append?: {
				label?: string | null;
				type?: string;
			} | null;
			isTextArea?: boolean;
			label?: string;
			prepend?: {
				label?: string | null;
				type?: string;
			} | null;
			placeholder?: string | null;
			required?: boolean;
			style?: string | null;
			title?: string | null;
			type?: string;
			value?: string | null;
		},
		translateConfig?: {
			translateLabel?: boolean;
			translatePlaceholder?: boolean;
			translateTitle?: boolean;
		},
	) => Promise<{
		inputContainer: HTMLInputElement | HTMLTextAreaElement;
		inputParent: HTMLElement;
	}>;
	generateTableWithCheckboxes: (
		tabs?: Array<
			{ label?: string | null; org?: string | null; url?: string | null }
		>,
		headers?: Array<{
			ariaLabel?: string;
			classList?: string[];
			label?: string;
		}>,
	) => Promise<{
		checkboxes: HTMLInputElement[];
		table: HTMLTableElement;
	}>;
	generateHelpWith_i_popup: (options?: {
		link?: string | null;
		showBottom?: boolean;
		showLeft?: boolean;
		showRight?: boolean;
		showTop?: boolean;
		text?: string | null;
	}) => {
		anchor: HTMLAnchorElement;
		linkTip: HTMLElement;
		root: HTMLElement;
		slot: HTMLElement;
		tooltip: HTMLElement;
	};
	generateManageTabsModal: (
		tabs?: ManageTabsInput,
		options?: {
			explainer?: string;
			saveButtonLabel?: string;
			title?: string;
		},
	) => Promise<{
		closeButton: HTMLButtonElement;
		deleteAllTabsButton: HTMLButtonElement;
		dropdownMenus: HTMLElement[];
		loggers: Array<{
			label: HTMLInputElement;
			last_input: { label: string; org: string | null; url: string };
			org: HTMLInputElement;
			url: HTMLInputElement;
		}>;
		modalParent: HTMLElement;
		saveButton: HTMLButtonElement;
		tbody: HTMLTableSectionElement;
		trsAndButtons: Array<
			{ button: HTMLButtonElement; tr: HTMLTableRowElement }
		>;
	}>;
	generateOpenOtherOrgModal: (options?: {
		label?: string | null;
		org?: string | null;
		url?: string | null;
	}) => Promise<{
		closeButton: HTMLButtonElement;
		getSelectedRadioButtonValue: () => string | undefined;
		inputContainer: HTMLInputElement | HTMLTextAreaElement;
		modalParent: HTMLElement;
		saveButton: HTMLButtonElement;
	}>;
	generateRadioButtons: (
		name: string,
		radio0?: {
			checked?: boolean;
			id?: string | null;
			label?: string | null;
			value?: string | null;
		},
		radio1?: {
			checked?: boolean;
			id?: string | null;
			label?: string | null;
			value?: string | null;
		},
		...otherRadioDefs: Array<
			{
				checked?: boolean;
				id?: string | null;
				label?: string | null;
				value?: string | null;
			}
		>
	) => {
		getSelectedRadioButtonValue: () => string | undefined;
		radioGroup: HTMLDivElement;
	};
	generateRequired: () => Promise<HTMLElement>;
	generateReviewSponsorSvgs: () => {
		reviewLink: HTMLAnchorElement;
		reviewSvg: SVGElement;
		root: HTMLElement;
		sponsorLink: HTMLAnchorElement;
		sponsorSvg: SVGElement;
	};
	generateRowTemplate: (
		row?: {
			label?: string | null;
			org?: string | null;
			url?: string | null;
		},
		conf?: { hide?: boolean; index?: number; isPinned?: boolean },
	) => HTMLElement;
	generateSection: (sectionTitle?: string | null) => Promise<{
		divParent: HTMLElement;
		section: HTMLElement;
	}>;
	generateSldsFileInput: (
		wrapperId: string,
		inputElementId: string,
		acceptedType: string,
		singleFile?: boolean,
		allowDrop?: boolean,
		preventFileSelection?: boolean,
		required?: boolean,
	) => Promise<{
		fileInputWrapper: HTMLElement;
		inputContainer: HTMLInputElement;
	}>;
	generateSldsModal: (options?: {
		modalTitle?: string;
		saveButtonLabel?: string;
	}) => Promise<{
		article: HTMLElement;
		buttonContainer: HTMLElement;
		closeButton: HTMLButtonElement;
		modalParent: HTMLElement;
		saveButton: HTMLButtonElement;
	}>;
	generateSldsModalWithTabList: (
		tabs?: Array<{ label?: string; org?: string | null; url?: string }>,
		options?: {
			explainer?: string;
			saveButtonLabel?: string;
			title?: string;
		},
	) => Promise<{
		closeButton: HTMLButtonElement;
		getSelectedTabs: () => {
			selectedAll: boolean;
			tabs: Array<{ label?: string; org?: string | null; url?: string }>;
		};
		modalParent: HTMLElement;
		saveButton: HTMLButtonElement;
	}>;
	generateSldsPromptModal: (options?: {
		bodyText?: string;
		cancelButtonLabel?: string;
		closeButtonLabel?: string;
		confirmButtonLabel?: string;
		modalTitle?: string;
	}) => {
		article: HTMLElement;
		bodyParagraph: HTMLElement;
		buttonContainer: HTMLElement;
		cancelButton: HTMLButtonElement;
		closeButton: HTMLButtonElement;
		modalBody: HTMLElement;
		modalParent: HTMLElement;
		saveButton: HTMLButtonElement;
	};
	generateSldsToastMessage: (
		message: string | Array<string>,
		status?: string,
	) => Promise<HTMLElement>;
	generateStyleFromSettings: () => Promise<void>;
	generateTutorialElements: () => Promise<{
		btnsParent: HTMLDivElement;
		closeBtn: HTMLButtonElement;
		confirmBtn: HTMLButtonElement;
		messageBox: HTMLDivElement;
		overlay: HTMLElement;
		segments: HTMLDivElement;
		spinner: HTMLElement;
	}>;
	generateUpdateTabModal: (
		label?: string | null,
		url?: string | null,
		org?: string | null,
	) => Promise<{
		closeButton: HTMLButtonElement;
		labelContainer: HTMLInputElement | HTMLTextAreaElement;
		modalParent: HTMLElement;
		orgContainer: HTMLInputElement | HTMLTextAreaElement;
		saveButton: HTMLButtonElement;
		urlContainer: HTMLInputElement | HTMLTextAreaElement;
	}>;
	getRng_n_digits: (digits?: number) => number;
	handleLightningLinkClick: (event: LightningLinkEvent) => Promise<void>;
	sldsConfirm: (options: {
		body?: string;
		cancelLabel?: string;
		closeLabel?: string;
		confirmLabel?: string;
		title?: string;
	}) => Promise<boolean>;
	wereSettingsUpdated: (settings: StyleSettings) => boolean;
};

type GeneratorDependencies = {
	BROWSER: {
		runtime: {
			getURL: (path: string) => string;
		};
	};
	CXM_PIN_TAB: string;
	CXM_REMOVE_TAB: string;
	CXM_UNPIN_TAB: string;
	EXTENSION_GITHUB_LINK: string;
	EXTENSION_LABEL: string;
	EXTENSION_NAME: string;
	GENERIC_PINNED_TAB_STYLE_KEY: string;
	GENERIC_TAB_STYLE_KEY: string;
	HIDDEN_CLASS: string;
	HTTPS: string;
	LIGHTNING_FORCE_COM: string;
	LINK_NEW_BROWSER: string;
	ORG_PINNED_TAB_STYLE_KEY: string;
	ORG_TAB_CLASS: string;
	ORG_TAB_STYLE_KEY: string;
	PIN_TAB_CLASS: string;
	SETUP_LIGHTNING: string;
	TAB_STYLE_HOVER: string;
	TAB_STYLE_TOP: string;
	TOAST_ERROR: string;
	TOAST_SUCCESS: string;
	USE_LIGHTNING_NAVIGATION: string;
	Tab: {
		extractOrgName: (url: string) => string;
		expandURL: (url: string | null, href: string) => string;
		minifyURL: (url: string | null) => string;
	};
	TabContainer: {
		keyPinnedTabsNo: string;
	};
	ensureAllTabsAvailability: () => Promise<{
		handleClickTabByData: (payload: { url: string }) => void;
	}>;
	ensureTranslatorAvailability: () => Promise<{
		translate: (
			key: string | Array<string>,
			join?: string,
		) => Promise<string>;
	}>;
	getCssRule: (id: string, value: string) => string;
	getCssSelector: (options: {
		isGeneric?: boolean;
		isInactive?: boolean;
		isPinned?: boolean;
		pseudoElement?: string;
	}) => string;
	getCurrentHref: () => string;
	getPinnedSpecificKey: (options: {
		isGeneric?: boolean;
		isPinned?: boolean;
	}) => string;
	getSettings: (
		keys: string | Array<string>,
	) => Promise<Array<{ enabled: boolean; id: string }> | null>;
	getStyleSettings: () => Promise<StyleSettings | null>;
	injectStyle: (
		id: string,
		options: { css?: string; link?: string },
	) => HTMLElement;
	performLightningRedirect: (url: string) => void;
	showToast: (message: string, status?: string) => void;
	updateModalBodyOverflow: () => void;
};

type GeneratorFixture = {
	cleanup: () => void;
	handleClickCalls: Array<{ url: string }>;
	injectStyleCalls: Array<
		{ id: string; options: { css?: string; link?: string } }
	>;
	module: GeneratorModule;
	openCalls: Array<{ target: string; url: string }>;
	redirects: string[];
	toasts: Array<{ message: string; status?: string }>;
	translationCalls: Array<string>;
	updateModalBodyOverflowCalls: number;
};

/**
 * Loads generator.js with isolated dependencies and a DOM harness.
 *
 * @param {Object} [options={}] Fixture configuration.
 * @param {string} [options.currentHref="https://acme.lightning.force.com/lightning/setup/Users/home"] Current setup URL.
 * @param {Array<{ enabled: boolean; id: string; }>} [options.settings=[]] Settings returned by getSettings.
 * @param {StyleSettings | null} [options.styleSettings=null] Style settings returned by getStyleSettings.
 * @param {Record<string, string>} [options.translations={}] Translation overrides.
 * @return {Promise<GeneratorFixture>} Loaded fixture.
 */
async function loadGeneratorFixture({
	currentHref = "https://acme.lightning.force.com/lightning/setup/Users/home",
	settings = [],
	styleSettings = null,
	translations = {},
}: {
	currentHref?: string;
	settings?: Array<{ enabled: boolean; id: string }>;
	styleSettings?: StyleSettings | null;
	translations?: Record<string, string>;
} = {}) {
	const dom = installMockDom(currentHref);
	if (typeof globalThis.Element.prototype.cloneNode !== "function") {
		globalThis.Element.prototype.cloneNode = function () {
			const cloned = document.createElement(this.tagName);
			cloned.className = this.className;
			for (const attributeName of ["id", "slot"]) {
				const attributeValue = this.getAttribute(attributeName);
				if (attributeValue != null) {
					cloned.setAttribute(attributeName, attributeValue);
				}
			}
			return cloned;
		};
	}
	if (typeof document.createElement("div").style.setProperty !== "function") {
		const stylePrototype = Object.getPrototypeOf(
			document.createElement("div").style,
		) as {
			setProperty?: (name: string, value: string) => void;
		};
		stylePrototype.setProperty = function (name: string, value: string) {
			(this as Record<string, string>)[name] = value;
		};
	}
	if (typeof globalThis.Element.prototype.prepend !== "function") {
		globalThis.Element.prototype.prepend = function (
			...nodes: Array<string | Node>
		) {
			for (const node of [...nodes].reverse()) {
				const resolvedNode = typeof node === "string"
					? document.createElement("span")
					: node;
				if (typeof node === "string") {
					resolvedNode.textContent = node;
				}
				if ("children" in this && Array.isArray(this.children)) {
					(this.children as Node[]).unshift(resolvedNode);
					continue;
				}
				this.appendChild(resolvedNode);
			}
		};
	}
	if (typeof globalThis.Element.prototype.hasAttribute !== "function") {
		globalThis.Element.prototype.hasAttribute = function (name: string) {
			return this.getAttribute(name) != null;
		};
	}
	if (typeof document.createElement("div").classList.toggle !== "function") {
		const classListPrototype = Object.getPrototypeOf(
			document.createElement("div").classList,
		) as {
			add: (token: string) => void;
			contains: (token: string) => boolean;
			remove: (token: string) => void;
			toggle?: (token: string) => boolean;
		};
		classListPrototype.toggle = function (token: string) {
			if (this.contains(token)) {
				this.remove(token);
				return false;
			}
			this.add(token);
			return true;
		};
	}
	if (typeof globalThis.Element.prototype.removeAttribute !== "function") {
		globalThis.Element.prototype.removeAttribute = function (name: string) {
			if ("attributes" in this && this.attributes instanceof Map) {
				this.attributes.delete(name);
			}
		};
	}
	const redirects: string[] = [];
	const handleClickCalls: Array<{ url: string }> = [];
	const injectStyleCalls: Array<
		{ id: string; options: { css?: string; link?: string } }
	> = [];
	const openCalls: Array<{ target: string; url: string }> = [];
	const toasts: Array<{ message: string; status?: string }> = [];
	const translationCalls: Array<string> = [];
	const updateModalBodyOverflowState = { value: 0 };

	const { cleanup, module } = await loadIsolatedModule<
		GeneratorModule,
		GeneratorDependencies
	>({
		modulePath: new URL(
			"../../../src/salesforce/generator.js",
			import.meta.url,
		),
		additionalExports: [
			"getRng_n_digits",
			"_getLinkTarget",
			"areArraysEqual",
			"wereSettingsUpdated",
			"_getPseudoSelector",
			"_getPseudoRules",
			"_isPseudoRule",
			"_buildCssRules",
			"createSldsModalShell",
			"generateSldsPromptModal",
			"generateRequired",
			"createInputElement",
			"generateInput",
			"generateTableWithCheckboxes",
			"createTextCell",
		],
		dependencies: {
			BROWSER: {
				runtime: {
					getURL: (path) => `chrome-extension://test${path}`,
				},
			},
			CXM_PIN_TAB: "pin_tab",
			CXM_REMOVE_TAB: "remove_tab",
			CXM_UNPIN_TAB: "unpin_tab",
			EXTENSION_GITHUB_LINK: "https://example.test/repo",
			EXTENSION_LABEL: "Again Why Salesforce",
			EXTENSION_NAME: "again-why-salesforce",
			GENERIC_PINNED_TAB_STYLE_KEY: "genericPinnedStyle",
			GENERIC_TAB_STYLE_KEY: "genericStyle",
			HIDDEN_CLASS: "hidden",
			HTTPS: "https://",
			LIGHTNING_FORCE_COM: ".lightning.force.com",
			LINK_NEW_BROWSER: "link_new_browser",
			ORG_PINNED_TAB_STYLE_KEY: "orgPinnedStyle",
			ORG_TAB_CLASS: "org-tab",
			ORG_TAB_STYLE_KEY: "orgStyle",
			PIN_TAB_CLASS: "pin-tab",
			SETUP_LIGHTNING: "/lightning/setup/",
			TAB_STYLE_HOVER: "hover",
			TAB_STYLE_TOP: "top",
			TOAST_ERROR: "error",
			TOAST_SUCCESS: "success",
			USE_LIGHTNING_NAVIGATION: "use_lightning_navigation",
			Tab: {
				extractOrgName: () => "current-org",
				expandURL: (url, _href) =>
					url?.startsWith("http")
						? url
						: `https://acme.lightning.force.com/lightning/setup/${
							url ?? ""
						}`,
				minifyURL: (url) =>
					(url ?? "").replace(
						/^https:\/\/acme\.lightning\.force\.com\/lightning\/setup\//,
						"",
					),
			},
			TabContainer: {
				keyPinnedTabsNo: "pinnedTabsNo",
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					handleClickTabByData: (payload) => {
						handleClickCalls.push(payload);
					},
				}),
			ensureTranslatorAvailability: () =>
				Promise.resolve({
					translate: (key) => {
						const joinedKey = Array.isArray(key)
							? key.join(" ")
							: key;
						translationCalls.push(joinedKey);
						return Promise.resolve(
							translations[joinedKey] ??
								`translated:${joinedKey}`,
						);
					},
				}),
			getCssRule: (id, value) => `${id}:${value};`,
			getCssSelector: ({
				isGeneric = false,
				isInactive = false,
				isPinned = false,
				pseudoElement = "",
			}) =>
				`.selector-${isGeneric ? "g" : "o"}-${isInactive ? "i" : "a"}-${
					isPinned ? "p" : "u"
				}${pseudoElement}`,
			getCurrentHref: () => currentHref,
			getPinnedSpecificKey: ({
				isGeneric = false,
				isPinned = false,
			}) =>
				`${isGeneric ? "generic" : "org"}-${
					isPinned ? "pinned" : "tabs"
				}`,
			getSettings: (_keys) => Promise.resolve(settings),
			getStyleSettings: () => Promise.resolve(styleSettings),
			injectStyle: (id, options) => {
				injectStyleCalls.push({ id, options });
				const element = document.createElement(
					options.link != null ? "link" : "style",
				);
				element.id = id;
				if (options.css != null) {
					element.textContent = options.css;
				}
				if (options.link != null) {
					element.setAttribute("href", options.link);
				}
				return element;
			},
			performLightningRedirect: (url) => {
				redirects.push(url);
			},
			showToast: (message, status) => {
				toasts.push({ message, status });
			},
			updateModalBodyOverflow: () => {
				updateModalBodyOverflowState.value++;
			},
		},
		globals: {
			open: (url: string, target: string) => {
				openCalls.push({ target, url });
			},
		},
		importsToReplace: new Set([
			"/core/constants.js",
			"/core/functions.js",
			"/core/tab.js",
			"/core/tabContainer.js",
			"/core/translator.js",
			"./toast.js",
			"./sf-elements.js",
			"./modal-layout.js",
		]),
	});

	return {
		cleanup: () => {
			cleanup();
			dom.cleanup();
		},
		handleClickCalls,
		injectStyleCalls,
		module,
		openCalls,
		redirects,
		toasts,
		translationCalls,
		get updateModalBodyOverflowCalls() {
			return updateModalBodyOverflowState.value;
		},
	};
}

/**
 * Builds a minimal NodeList-shaped object for selector monkeypatches.
 *
 * @param elements Elements returned by the fake selector.
 * @return NodeList-compatible wrapper over the provided elements.
 */
function createNodeList(elements: Element[]) {
	const nodeList = Object.assign([...elements], {
		item(index: number) {
			return elements[index] ?? null;
		},
		forEach(
			callback: (
				value: Element,
				key: number,
				parent: NodeListOf<Element>,
			) => void,
			thisArg?: object,
		) {
			elements.forEach((value, key) => {
				callback.call(thisArg, value, key, nodeList);
			});
		},
		entries() {
			return elements.entries();
		},
		keys() {
			return elements.keys();
		},
		values() {
			return elements.values();
		},
	});
	return nodeList as NodeListOf<Element>;
}

Deno.test("generator helper functions cover random validation and CSS rule assembly", async () => {
	const fixture = await loadGeneratorFixture();

	try {
		assertThrows(
			() => fixture.module.getRng_n_digits(1),
			Error,
			"error_required_params",
		);
		const rng = fixture.module.getRng_n_digits(3);
		assert(rng >= 100 && rng < 1000);
		assertEquals(
			fixture.module._getLinkTarget(
				{ ctrlKey: false, metaKey: false },
				"/lightning/setup/Users/home",
			),
			"_top",
		);
		assertEquals(
			fixture.module._getLinkTarget(
				{ ctrlKey: true, metaKey: false },
				"/lightning/setup/Users/home",
			),
			"_blank",
		);
		assert(fixture.module.areArraysEqual(null, null));
		assert(!fixture.module.areArraysEqual(["a"], ["b"]));
		assertEquals(
			fixture.module.wereSettingsUpdated({
				genericStyle: [{ id: "hover", value: "red" }],
			}),
			true,
		);
		assertEquals(fixture.module._getPseudoSelector("hover"), ":hover");
		assertEquals(fixture.module._getPseudoSelector("top"), "::before");
		assertEquals(fixture.module._getPseudoSelector("plain"), "");
		assert(fixture.module._isPseudoRule("hover"));
		assert(!fixture.module._isPseudoRule("color"));

		const builtRules = fixture.module._buildCssRules({
			list: [
				{ forActive: false, id: "color", value: "red" },
				{ forActive: true, id: "background", value: "blue" },
				{ forActive: true, id: "hover", value: "orange" },
			],
			isGeneric: true,
		});

		assertStringIncludes(
			builtRules.inactiveCss,
			".selector-g-i-u { color:red;}",
		);
		assertStringIncludes(
			builtRules.activeCss,
			".selector-g-a-u {background:blue;}",
		);
		assertEquals(builtRules.pseudoRules.length, 1);
		assertStringIncludes(
			fixture.module._getPseudoRules({
				isGeneric: true,
				pseudoRules: builtRules.pseudoRules,
			}),
			".selector-g-a-u:hover{ hover:orange; }",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("generator handles Lightning links for missing href, redirects, and new-window opens", async () => {
	const missingHrefFixture = await loadGeneratorFixture();

	try {
		await missingHrefFixture.module.handleLightningLinkClick({
			ctrlKey: false,
			currentTarget: {
				href: null,
				target: "",
			},
			metaKey: false,
			preventDefault() {},
		});

		assertEquals(missingHrefFixture.toasts, [{
			message: "error_redirect",
			status: "error",
		}]);
		assertEquals(missingHrefFixture.handleClickCalls, []);
	} finally {
		missingHrefFixture.cleanup();
	}

	const redirectFixture = await loadGeneratorFixture();

	try {
		await redirectFixture.module.handleLightningLinkClick({
			ctrlKey: false,
			currentTarget: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Flows/home",
				target: "",
			},
			metaKey: false,
			preventDefault() {},
		});

		assertEquals(redirectFixture.handleClickCalls, [{
			url: "Flows/home",
		}]);
		assertEquals(redirectFixture.redirects, [
			"https://acme.lightning.force.com/lightning/setup/Flows/home",
		]);
		assertEquals(redirectFixture.openCalls, []);
	} finally {
		redirectFixture.cleanup();
	}

	const openFixture = await loadGeneratorFixture({
		settings: [{ enabled: true, id: "link_new_browser" }],
	});

	try {
		await openFixture.module.handleLightningLinkClick({
			ctrlKey: false,
			currentTarget: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Profiles/home",
				target: "",
			},
			metaKey: false,
			preventDefault() {},
		});

		assertEquals(openFixture.openCalls, [{
			target: "_blank",
			url: "https://acme.lightning.force.com/lightning/setup/Profiles/home",
		}]);
		assertEquals(openFixture.redirects, []);
	} finally {
		openFixture.cleanup();
	}

	const sameHrefFixture = await loadGeneratorFixture({
		currentHref:
			"https://acme.lightning.force.com/lightning/setup/Profiles/home",
	});

	try {
		await sameHrefFixture.module.handleLightningLinkClick({
			ctrlKey: false,
			currentTarget: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Profiles/home",
				target: "_self",
			},
			metaKey: false,
			preventDefault() {},
		});

		assertEquals(sameHrefFixture.openCalls, [{
			target: "_self",
			url: "https://acme.lightning.force.com/lightning/setup/Profiles/home",
		}]);
		assertEquals(sameHrefFixture.redirects, []);
	} finally {
		sameHrefFixture.cleanup();
	}

	const lightningNavFixture = await loadGeneratorFixture({
		settings: [{ enabled: true, id: "use_lightning_navigation" }],
	});

	try {
		await lightningNavFixture.module.handleLightningLinkClick({
			ctrlKey: false,
			currentTarget: {
				href:
					"https://acme.lightning.force.com/lightning/setup/PermissionSets/home",
				target: "",
			},
			metaKey: false,
			preventDefault() {},
		});

		assertEquals(lightningNavFixture.openCalls, [{
			target: "_top",
			url: "https://acme.lightning.force.com/lightning/setup/PermissionSets/home",
		}]);
		assertEquals(lightningNavFixture.redirects, []);
	} finally {
		lightningNavFixture.cleanup();
	}
});

Deno.test("generator renders styles only when settings exist and change", async () => {
	const styleSettings = {
		genericStyle: [
			{ forActive: false, id: "color", value: "red" },
			{ forActive: true, id: "hover", value: "orange" },
		],
		orgStyle: [
			{ forActive: true, id: "background", value: "green" },
		],
	};
	const fixture = await loadGeneratorFixture({
		styleSettings,
	});

	try {
		await fixture.module.generateStyleFromSettings();
		await fixture.module.generateStyleFromSettings();

		assertEquals(fixture.injectStyleCalls.length, 2);
		assertEquals(
			fixture.injectStyleCalls[0].id,
			"again-why-salesforce-generic-tabs",
		);
		assertStringIncludes(
			fixture.injectStyleCalls[0].options.css ?? "",
			".selector-g-i-u { color:red;}",
		);
		assertStringIncludes(
			fixture.injectStyleCalls[0].options.css ?? "",
			".selector-g-a-u:hover{ hover:orange; }",
		);
		assertEquals(
			fixture.injectStyleCalls[1].id,
			"again-why-salesforce-org-tabs",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("generator builds active rows and translated toasts", async () => {
	const fixture = await loadGeneratorFixture({
		currentHref:
			"https://acme.lightning.force.com/lightning/setup/Users/home",
		translations: {
			toast_lines: "Line one\nLine two",
		},
	});

	try {
		const row = fixture.module.generateRowTemplate(
			{
				label: "Users",
				org: "acme",
				url: "Users/home",
			},
			{
				hide: true,
				index: 3,
				isPinned: true,
			},
		);
		const anchor = row.querySelector("a");
		const label = row.querySelector("span");

		assertEquals(String(row.dataset.rowIndex), "3");
		assertEquals(row.style.display, "none");
		assert(row.classList.contains("slds-is-active"));
		assertEquals(
			anchor?.getAttribute("href"),
			fixture.openCalls[0]?.url ??
				"https://acme.lightning.force.com/lightning/setup/Users/home",
		);
		assert(label?.classList.contains("org-tab"));
		assert(label?.classList.contains("pin-tab"));
		assertEquals(label?.dataset.org, "acme");

		const titledCell = fixture.module.createTextCell("Users", "Accounts");
		assertEquals(
			titledCell.querySelector("span")?.style.display,
			"inline-block",
		);
		assertEquals(titledCell.querySelector("span")?.textContent, "Users");
		assertEquals(titledCell.querySelector("span")?.title, "Accounts");

		await assertRejects(
			() => fixture.module.generateSldsToastMessage(""),
			Error,
			"translated:error_toast_generation",
		);
		const toast = await fixture.module.generateSldsToastMessage(
			"toast_lines",
			"warning",
		);
		const successToast = await fixture.module.generateSldsToastMessage(
			"toast_lines",
			"success",
		);
		const toastLines = toast.querySelectorAll(".toastMessage");

		assertEquals(
			toast.getAttribute("id")?.startsWith("again-why-salesforce-toast-"),
			true,
		);
		assertEquals(
			toast.querySelector(".forceToastMessage")?.getAttribute(
				"aria-label",
			),
			"warning",
		);
		assertEquals(toastLines.length, 2);
		assertEquals(toastLines[0].textContent, "Line one");
		assertEquals(toastLines[1].textContent, "Line two");
		assertEquals(
			successToast.querySelector("svg")?.dataset.key,
			"success",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("generator renders sections, required markers, and stacked inputs", async () => {
	const fixture = await loadGeneratorFixture();

	try {
		const { section, divParent } = await fixture.module.generateSection(
			"tab_information",
		);
		assertEquals(divParent.tagName, "DIV");
		assertEquals(
			section.querySelector("span")?.textContent,
			"translated:tab_information",
		);

		const required = await fixture.module.generateRequired();
		assertEquals(required.getAttribute("title"), "translated:required");
		assertEquals(required.textContent, "*");

		const textarea = await fixture.module.createInputElement(
			{
				enabled: false,
				id: "notes",
				isTextArea: true,
				label: "tab_label",
				placeholder: "tab_placeholder",
				required: true,
				style: "width: 100%",
				title: "table_row_label",
				value: "Accounts",
			},
		);
		assertEquals(textarea.tagName, "TEXTAREA");
		assertEquals(
			textarea.getAttribute("placeholder"),
			"translated:tab_placeholder",
		);
		assert(textarea.getAttribute("disabled") != null);
		assertEquals(
			textarea.getAttribute("title"),
			"translated:table_row_label",
		);

		const generatedInput = await fixture.module.generateInput({
			append: { label: "suffix", type: "text" },
			label: "tab_url",
			prepend: { label: "prefix", type: "text" },
			required: true,
			type: "text",
		});
		assertExists(
			generatedInput.inputParent.querySelector("abbr.slds-required"),
		);
		assertEquals(
			generatedInput.inputParent.querySelectorAll("input").length,
			3,
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("generator builds modal shells, prompt modals, and confirm flows", async () => {
	const fixture = await loadGeneratorFixture();

	try {
		const shell = fixture.module.createSldsModalShell({
			cancelButtonLabel: "Cancel",
			closeButtonLabel: "Close",
			confirmButtonLabel: "Save",
			modalTitle: "Modal",
		});
		document.body.appendChild(shell.modalParent);
		assertEquals(
			shell.modalParent.getAttribute("id"),
			"again-why-salesforce-modal",
		);
		assertExists(shell.legend);
		let saveClicks = 0;
		shell.saveButton.addEventListener("click", () => {
			saveClicks++;
		});
		const unrelatedKey = new Event("keydown");
		Object.defineProperty(unrelatedKey, "key", { value: "Tab" });
		document.dispatchEvent(unrelatedKey);
		assertEquals(saveClicks, 0);
		const enterKey = new Event("keydown");
		Object.defineProperty(enterKey, "key", { value: "Enter" });
		document.dispatchEvent(enterKey);
		assertEquals(saveClicks, 1);
		shell.closeButton.click();
		assertEquals(
			document.getElementById("Again Why Salesforce-modal"),
			null,
		);

		const backdropShell = fixture.module.createSldsModalShell({
			cancelButtonLabel: "Cancel",
			closeButtonLabel: "Close",
			confirmButtonLabel: "Save",
			modalTitle: "Modal",
		});
		document.body.appendChild(backdropShell.modalParent);
		(
			backdropShell.modalParent.querySelector(
				".modal-glass",
			) as HTMLElement
		).dispatchEvent(new Event("click"));
		assertEquals(backdropShell.modalParent.parentElement, null);

		const escapeShell = fixture.module.createSldsModalShell({
			cancelButtonLabel: "Cancel",
			closeButtonLabel: "Close",
			confirmButtonLabel: "Save",
			modalTitle: "Modal",
		});
		document.body.appendChild(escapeShell.modalParent);
		let closeClicks = 0;
		escapeShell.closeButton.addEventListener("click", () => {
			closeClicks++;
		});
		const escapeKey = new Event("keydown");
		Object.defineProperty(escapeKey, "key", { value: "Escape" });
		document.dispatchEvent(escapeKey);
		assertEquals(closeClicks, 1);

		const modal = await fixture.module.generateSldsModal({
			modalTitle: "Modal",
			saveButtonLabel: "continue",
		});
		assertEquals(
			modal.article.querySelector(".required-legend")?.textContent,
			"*translated:required_info",
		);

		const prompt = fixture.module.generateSldsPromptModal({
			bodyText: "Prompt body",
			cancelButtonLabel: "Cancel",
			closeButtonLabel: "Close",
			confirmButtonLabel: "Save",
			modalTitle: "Prompt",
		});
		assertEquals(prompt.bodyParagraph.textContent, "Prompt body");
		assertEquals(
			prompt.modalBody.getAttribute("aria-label"),
			"Prompt body",
		);

		const rejectPromise = fixture.module.sldsConfirm({
			body: "Body",
			cancelLabel: "Cancel",
			closeLabel: "Close",
			confirmLabel: "Save",
			title: "Confirm",
		});
		document.getElementById("again-why-salesforce-modal-confirm")
			?.querySelector(".slds-button_neutral")
			?.dispatchEvent(new Event("click"));
		assertEquals(await rejectPromise, false);

		const resolvePromise = fixture.module.sldsConfirm({
			body: "Body",
			cancelLabel: "Cancel",
			closeLabel: "Close",
			confirmLabel: "Save",
			title: "Confirm",
		});
		document.getElementById("again-why-salesforce-modal-confirm")
			?.querySelector("#again-why-salesforce-modal-save-btn")
			?.dispatchEvent(new Event("click"));
		assertEquals(await resolvePromise, true);

		const minimalPromise = fixture.module.sldsConfirm({});
		document.getElementById("again-why-salesforce-modal-confirm")
			?.querySelector(".slds-modal__close")
			?.dispatchEvent(new Event("click"));
		assertEquals(await minimalPromise, false);

		const permissiveConfirm = fixture.module.sldsConfirm as (
			options?: {
				body?: string;
				cancelLabel?: string;
				closeLabel?: string;
				confirmLabel?: string;
				title?: string;
			},
		) => Promise<boolean>;
		assertThrows(
			() => permissiveConfirm(),
			TypeError,
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("generator covers radios, file inputs, checkbox labels, tutorial elements, and review links", async () => {
	const fixture = await loadGeneratorFixture();

	try {
		const radios = fixture.module.generateRadioButtons(
			"mode",
			{ checked: false, id: "r1", label: "One", value: "one" },
			{ checked: true, id: "r2", label: "Two", value: "two" },
			{ checked: false, id: "r3", label: "Three", value: "three" },
		);
		assertEquals(radios.radioGroup.querySelectorAll("input").length, 3);
		assertEquals(radios.getSelectedRadioButtonValue(), "two");

		await assertRejects(
			() =>
				fixture.module.generateSldsFileInput(
					"",
					"input-id",
					"application/json",
					false,
					false,
					true,
				),
			Error,
			"error_required_params",
		);
		const fileInput = await fixture.module.generateSldsFileInput(
			"wrapper",
			"input-id",
			"application/json",
			true,
			true,
			true,
		);
		assertEquals(fileInput.fileInputWrapper.id, "wrapper");
		assertEquals(
			fileInput.inputContainer.getAttribute("aria-label"),
			"translated:upload translated:file",
		);
		assertEquals(
			fileInput.fileInputWrapper.textContent?.includes(
				"translated:drop translated:file",
			),
			true,
		);
		const multiFileInput = await fixture.module.generateSldsFileInput(
			"multi-wrapper",
			"multi-input-id",
			"application/json",
			false,
			true,
			true,
		);
		assertEquals(
			multiFileInput.inputContainer.getAttribute("aria-label"),
			"translated:upload translated:files",
		);
		assertEquals(
			multiFileInput.fileInputWrapper.textContent?.includes(
				"translated:or_drop translated:files",
			),
			true,
		);

		const checkbox = await fixture.module.generateCheckboxWithLabel(
			"accept",
			"confirm",
			true,
		);
		assertEquals(
			checkbox.querySelector("input")?.checked,
			true,
		);
		assertEquals(checkbox.textContent, "translated:confirm");

		const reviewSponsor = fixture.module.generateReviewSponsorSvgs();
		assert(reviewSponsor.reviewSvg.classList.contains("hidden"));
		assert(reviewSponsor.sponsorSvg.classList.contains("hidden"));
		assertEquals(
			reviewSponsor.reviewLink.dataset.i18n,
			"write_review+-+title+-+ariaLabel",
		);

		const tutorialElements = await fixture.module
			.generateTutorialElements();
		assertEquals(
			tutorialElements.overlay.style.backgroundColor,
			"rgba(0,0,0,0.5)",
		);
		assert(tutorialElements.spinner.classList.contains("hidden"));
		assertEquals(
			tutorialElements.confirmBtn.textContent,
			"translated:confirm",
		);
		assertEquals(tutorialElements.closeBtn.textContent, "translated:close");
		assertEquals(
			fixture.injectStyleCalls.some((call) =>
				call.options.link?.includes("/salesforce/css/tutorial.css") ===
					true
			),
			true,
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("generator covers open-other-org, update-tab, and help popup builders", async () => {
	const fixture = await loadGeneratorFixture();

	try {
		const otherOrgModal = await fixture.module.generateOpenOtherOrgModal({
			label: "Accounts",
			org: "sandbox",
			url: "Users/home",
		});
		assertStringIncludes(
			otherOrgModal.modalParent.textContent ?? "",
			"https://",
		);
		assertStringIncludes(
			otherOrgModal.modalParent.textContent ?? "",
			".lightning.force.com/lightning/setup/Users/home",
		);
		assertEquals(otherOrgModal.inputContainer.value, "sandbox");
		assertEquals(otherOrgModal.getSelectedRadioButtonValue(), "_blank");

		const rootUrlModal = await fixture.module.generateOpenOtherOrgModal({
			label: "Accounts",
			org: "sandbox",
			url: "/setup/home",
		});
		assertStringIncludes(
			rootUrlModal.modalParent.textContent ?? "",
			".lightning.force.com/setup/home",
		);

		const nullLabelModal = await fixture.module.generateOpenOtherOrgModal({
			org: "sandbox",
			url: "Users/home",
		});
		assertStringIncludes(
			nullLabelModal.modalParent.textContent ?? "",
			"translated:where_to",
		);

		const updateTabModal = await fixture.module.generateUpdateTabModal(
			null,
			null,
			null,
		);
		assertEquals(
			updateTabModal.labelContainer.getAttribute("placeholder"),
			"translated:users",
		);
		assertEquals(
			updateTabModal.urlContainer.getAttribute("placeholder"),
			"ManageUsers/home",
		);
		assertEquals(
			updateTabModal.orgContainer.getAttribute("placeholder"),
			"translated:mycustomorg",
		);

		const linkedHelp = fixture.module.generateHelpWith_i_popup({
			link: "https://docs.test/help",
			showBottom: true,
			text: "Helpful docs",
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		assertStringIncludes(linkedHelp.anchor.href, "https://docs.test/help");
		assertEquals(String(linkedHelp.tooltip.dataset.showBottom), "true");
		assertEquals(linkedHelp.slot.textContent, "Helpful docs");
		assertEquals(linkedHelp.linkTip.classList.contains("hidden"), false);
		assertEquals(
			fixture.injectStyleCalls.some((call) =>
				call.options.link?.includes("/components/help/help.css") ===
					true
			),
			true,
		);

		const passiveHelp = fixture.module.generateHelpWith_i_popup();
		await new Promise((resolve) => setTimeout(resolve, 0));
		assertEquals(
			(passiveHelp.slot as HTMLElement & { name?: string }).name,
			"text",
		);
		assertEquals(passiveHelp.slot.textContent, "Nothing to see here...");
	} finally {
		fixture.cleanup();
	}
});

Deno.test("generator covers selectable tab-list and manage-tabs modal builders", async () => {
	const fixture = await loadGeneratorFixture();

	try {
		const tabs = [
			{ label: "Accounts", org: null, url: "Accounts/home" },
			{ label: "Contacts", org: "other-org", url: "Contacts/home" },
		];
		const tabListModal = await fixture.module.generateSldsModalWithTabList(
			tabs,
			{
				explainer: "select_tabs_export",
				saveButtonLabel: "export",
				title: "export_tabs",
			},
		);
		const smallButtons = Array.from(
			tabListModal.modalParent.querySelectorAll(".slds-button_small"),
		) as HTMLButtonElement[];
		const selectAllButton = smallButtons.find((button) =>
			button.textContent === "translated:select_all"
		);
		const unselectAllButton = smallButtons.find((button) =>
			button.textContent === "translated:unselect_all"
		);
		const checkboxes = Array.from(
			tabListModal.modalParent.querySelectorAll("input"),
		) as HTMLInputElement[];
		const firstRow = checkboxes[0].parentElement?.parentElement
			?.parentElement as HTMLTableRowElement;
		assertEquals(tabListModal.getSelectedTabs().selectedAll, true);
		firstRow.dispatchEvent(new Event("click"));
		assertEquals(checkboxes[0].checked, false);
		assertEquals(tabListModal.getSelectedTabs().selectedAll, false);
		assertEquals(tabListModal.getSelectedTabs().tabs[0], tabs[1]);
		checkboxes[0].checked = true;
		checkboxes[0].dispatchEvent(new Event("click"));
		assertEquals(tabListModal.getSelectedTabs().selectedAll, true);
		unselectAllButton?.click();
		assertEquals(tabListModal.getSelectedTabs(), {
			selectedAll: false,
			tabs: [],
		});
		selectAllButton?.click();
		assertEquals(tabListModal.getSelectedTabs().tabs.length, 2);

		const manageRow = await fixture.module.createManageTabRow(
			{ label: "Accounts", org: "other-org", url: "Accounts/home" },
			{
				disabled: false,
				index: 1,
				isThisOrgTab: false,
				pinned: true,
			},
		);
		assertEquals(String(manageRow.tr.dataset.rowIndex), "1");
		assert(manageRow.tr.classList.contains("hidden"));
		assertEquals(manageRow.tr.draggable, true);
		const openButton = manageRow.dropdownMenu.children[0] as
			| HTMLAnchorElement
			| undefined;
		assertEquals(
			openButton?.href,
			"https://acme.lightning.force.com/lightning/setup/Accounts/home",
		);
		const pinButton = manageRow.dropdownMenu.children[1] as
			| (HTMLAnchorElement & { style: { display?: string } })
			| undefined;
		assertEquals(
			pinButton?.style.display === "none",
			true,
		);
		manageRow.dropdownButton.dispatchEvent(new Event("click"));
		assertEquals(
			manageRow.dropdownMenu.classList.contains("hidden"),
			false,
		);

		const originalCreateElement = document.createElement.bind(document);
		type TrackedRow = HTMLTableRowElement & {
			__trackedListeners: Map<
				string,
				Set<EventListenerOrEventListenerObject>
			>;
		};
		const trackedRows: TrackedRow[] = [];
		document.createElement = ((tagName: string) => {
			const element = originalCreateElement(tagName);
			if (tagName.toLowerCase() !== "tr") {
				return element;
			}
			const trackedRow = element as TrackedRow;
			trackedRow.__trackedListeners = new Map();
			const originalRowAddEventListener = trackedRow.addEventListener
				.bind(
					trackedRow,
				);
			trackedRow.addEventListener = ((
				type: string,
				listener: EventListenerOrEventListenerObject | null,
				options?: boolean | AddEventListenerOptions,
			) => {
				if (listener == null) {
					return;
				}
				if (listener != null) {
					const listeners = trackedRow.__trackedListeners.get(type) ??
						new Set();
					listeners.add(listener);
					trackedRow.__trackedListeners.set(type, listeners);
				}
				return originalRowAddEventListener(type, listener, options);
			}) as HTMLTableRowElement["addEventListener"];
			trackedRows.push(trackedRow);
			return trackedRow;
		}) as typeof document.createElement;
		const tableWithCheckboxes = await fixture.module
			.generateTableWithCheckboxes(
				tabs,
				[{ label: "" }],
			);
		document.createElement = originalCreateElement;
		const checkboxRow = tableWithCheckboxes.checkboxes[0].parentElement
			?.parentElement?.parentElement as HTMLTableRowElement;
		checkboxRow.dispatchEvent(new Event("click"));
		assertEquals(tableWithCheckboxes.checkboxes[0].checked, false);
		const tableRowEvent = new Event("click");
		Object.defineProperty(tableRowEvent, "target", {
			value: { tagName: "SPAN" },
		});
		const rowWithClickListener = trackedRows.find((row) =>
			(row.__trackedListeners.get("click")?.size ?? 0) > 0
		);
		assertExists(rowWithClickListener);
		const trackedCheckbox = rowWithClickListener.querySelector("input") as
			| HTMLInputElement
			| null;
		assertExists(trackedCheckbox);
		trackedCheckbox.checked = true;
		for (
			const listener
				of rowWithClickListener?.__trackedListeners.get("click") ??
					[]
		) {
			if (typeof listener === "function") {
				listener.call(rowWithClickListener, tableRowEvent);
				continue;
			}
			listener.handleEvent(tableRowEvent);
		}
		assertEquals(trackedCheckbox.checked, false);
		const checkboxClickEvent = new Event("click");
		Object.defineProperty(checkboxClickEvent, "target", {
			value: { tagName: "INPUT", type: "checkbox" },
		});
		for (
			const listener
				of rowWithClickListener?.__trackedListeners.get("click") ??
					[]
		) {
			if (typeof listener === "function") {
				listener.call(rowWithClickListener, checkboxClickEvent);
				continue;
			}
			listener.handleEvent(checkboxClickEvent);
		}
		assertEquals(trackedCheckbox.checked, false);
		tableWithCheckboxes.checkboxes[0].checked = true;
		tableWithCheckboxes.checkboxes[0].dispatchEvent(new Event("click"));
		assertEquals(tableWithCheckboxes.checkboxes[0].checked, true);

		const modalTabs = Object.assign(
			[
				{ label: "Accounts", org: null, url: "Accounts/home" },
				{ label: "Contacts", org: "other-org", url: "Contacts/home" },
			],
			{ pinnedTabsNo: 1 },
		) as ManageTabsInput;
		const manageTabsModal = await fixture.module.generateManageTabsModal(
			modalTabs,
		);
		const showAllButton = manageTabsModal.modalParent.querySelector(
			".show_all_tabs",
		) as HTMLButtonElement | null;
		const hideOtherOrgTabsButton = manageTabsModal.modalParent
			.querySelector(
				".hide_other_org_tabs",
			) as HTMLButtonElement | null;
		assertEquals(manageTabsModal.loggers.length >= 3, true);
		assertEquals(manageTabsModal.trsAndButtons.length >= 3, true);
		assertEquals(manageTabsModal.dropdownMenus.length >= 3, true);
		assertEquals(
			manageTabsModal.deleteAllTabsButton.hasAttribute("disabled"),
			false,
		);
		const originalQuerySelectorAll = manageTabsModal.tbody.querySelectorAll
			.bind(
				manageTabsModal.tbody,
			);
		const otherOrgRows = [manageTabsModal.trsAndButtons[1].tr] as Element[];
		manageTabsModal.tbody.querySelectorAll = ((selector: string) =>
			selector === "tr[data-is-this-org-tab=false]"
				? createNodeList(otherOrgRows)
				: originalQuerySelectorAll(
					selector,
				)) as typeof manageTabsModal.tbody.querySelectorAll;
		showAllButton?.click();
		assertEquals(
			manageTabsModal.trsAndButtons[1].tr.classList.contains("hidden"),
			false,
		);
		hideOtherOrgTabsButton?.click();
		assertEquals(
			manageTabsModal.trsAndButtons[1].tr.classList.contains("hidden"),
			true,
		);
		assertEquals(fixture.updateModalBodyOverflowCalls, 2);

		const emptyManageTabsModal = await fixture.module
			.generateManageTabsModal(
				[] as ManageTabsInput,
			);
		assertEquals(
			emptyManageTabsModal.deleteAllTabsButton.hasAttribute("disabled"),
			true,
		);
	} finally {
		fixture.cleanup();
	}
});
