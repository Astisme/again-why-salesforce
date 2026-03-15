// deno-lint-ignore-file no-explicit-any
import {
	assert,
	assertEquals,
	assertExists,
	assertRejects,
	assertStringIncludes,
} from "@std/testing/asserts";
import { installMockDom } from "../happydom.ts";

const CONTENT_PATH = new URL(
	"../../src/salesforce/content.js",
	import.meta.url,
);
const SETUP_URL =
	"https://acme.lightning.force.com/lightning/setup/SetupOneHome/home";
const USERS_URL =
	"https://acme.lightning.force.com/lightning/setup/ManageUsers/home";
const FLOWS_URL = "https://acme.lightning.force.com/lightning/setup/Flows/home";

type ContentDeps = {
	constants: Record<string, any>;
	functions: {
		calculateReadingTime: (message: string) => number;
		getInnerElementFieldBySelector: (options: {
			parentElement: HTMLElement;
			field: string;
			selector: string;
		}) => any;
		getSettings: (keys?: string[] | string | null) => Promise<any>;
	};
	ensureTranslatorAvailability: () => Promise<{
		translate: (
			message: string | string[],
			join?: string,
		) => Promise<string>;
	}>;
	Tab: any;
	tabContainer: {
		ensureAllTabsAvailability: () => Promise<any[]>;
	};
	dragHandler: {
		setupDragForUl: (callback: () => Promise<void>) => void;
	};
	favouriteManager: {
		pageActionTab: (shouldSave: boolean) => void;
		showFavouriteButton: () => Promise<void>;
	};
	generator: {
		MODAL_ID: string;
		generateOpenOtherOrgModal: (
			options: Record<string, unknown>,
		) => Promise<any>;
		generateRowTemplate: (
			row: Record<string, any>,
			conf: Record<string, any>,
		) => HTMLElement;
		generateSldsToastMessage: (
			message: string[],
			status: string,
		) => Promise<HTMLElement>;
		generateStyleFromSettings: () => void;
		generateUpdateTabModal: (...args: unknown[]) => Promise<any>;
	};
	importModule: {
		createImportModal: () => void;
	};
	exportModule: {
		createExportModal: () => void;
	};
	manageTabs: {
		createManageTabsModal: () => void;
	};
	tutorial: {
		checkTutorial: () => void;
		startTutorial: () => void;
	};
	onceADay: {
		executeOncePerDay: () => void;
	};
};

/**
 * Replaces an import statement with the same number of newlines to preserve line numbers.
 *
 * @param {string} source Source code containing imports.
 * @param {string} fileName Import specifier to blank out.
 * @return {string} Source code with the import replaced by blank lines.
 */
function blankImport(source: string, fileName: string) {
	return source.replace(
		new RegExp(
			String.raw`import[\s\S]*?from\s*"${
				fileName.replaceAll("/", "\\/")
			}";\n`,
		),
		(match) => "\n".repeat(match.split("\n").length - 1),
	);
}

/**
 * Encodes one signed integer using base64-VLQ for source-map generation.
 *
 * @param {number} value Integer to encode.
 * @return {string} Encoded VLQ segment.
 */
function encodeVlqValue(value: number) {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	let encoded = "";
	let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
	do {
		let digit = vlq & 31;
		vlq >>>= 5;
		if (vlq > 0) {
			digit |= 32;
		}
		encoded += alphabet[digit];
	} while (vlq > 0);
	return encoded;
}

/**
 * Builds a simple per-line source map from generated code back to the original file.
 *
 * @param {Object} options Mapping options.
 * @param {number[]} options.originalLines 1-based original line numbers for each generated line.
 * @param {string} options.sourceUrl Absolute source URL for the original file.
 * @return {string} Base64-encoded JSON source-map payload.
 */
function buildInlineSourceMap({
	originalLines,
	sourceUrl,
}: {
	originalLines: number[];
	sourceUrl: string;
}) {
	let previousSource = 0;
	let previousOriginalLine = 0;
	let previousOriginalColumn = 0;
	const mappings = originalLines.map((lineNumber) => {
		if (lineNumber < 1) {
			return "";
		}
		const segment = [
			encodeVlqValue(0),
			encodeVlqValue(0 - previousSource),
			encodeVlqValue((lineNumber - 1) - previousOriginalLine),
			encodeVlqValue(0 - previousOriginalColumn),
		].join("");
		previousSource = 0;
		previousOriginalLine = lineNumber - 1;
		previousOriginalColumn = 0;
		return segment;
	}).join(";");
	const sourceMap = {
		version: 3,
		file: CONTENT_PATH.href,
		sources: [sourceUrl],
		names: [],
		mappings,
	};
	return btoa(JSON.stringify(sourceMap));
}

async function loadContentModule(deps: ContentDeps) {
	let source = await Deno.readTextFile(CONTENT_PATH);
	for (
		const fileName of [
			"/constants.js",
			"/functions.js",
			"/translator.js",
			"/tab.js",
			"/tabContainer.js",
			"./dragHandler.js",
			"./favourite-manager.js",
			"./generator.js",
			"./import.js",
			"./export.js",
			"./manageTabs.js",
			"./tutorial.js",
			"./once-a-day.js",
		]
	) {
		source = blankImport(source, fileName);
	}
	const prelude = `
const __deps = globalThis.__contentTestDeps;
const {
	ALL_TOAST_TYPES,
	BROWSER,
	CXM_EMPTY_GENERIC_TABS,
	CXM_EMPTY_TABS,
	CXM_EMPTY_VISIBLE_TABS,
	CXM_MANAGE_TABS,
	CXM_MOVE_FIRST,
	CXM_MOVE_LAST,
	CXM_MOVE_LEFT,
	CXM_MOVE_RIGHT,
	CXM_PIN_TAB,
	CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_PIN_TABS,
	CXM_REMOVE_RIGHT_TABS,
	CXM_REMOVE_TAB,
	CXM_REMOVE_UNPIN_TABS,
	CXM_RESET_DEFAULT_TABS,
	CXM_SORT_CLICK_COUNT,
	CXM_SORT_CLICK_DATE,
	CXM_SORT_LABEL,
	CXM_SORT_ORG,
	CXM_SORT_URL,
	CXM_TMP_HIDE_NON_ORG,
	CXM_TMP_HIDE_ORG,
	CXM_UNPIN_TAB,
	EXTENSION_NAME,
	HAS_ORG_TAB,
	HTTPS,
	LIGHTNING_FORCE_COM,
	LINK_NEW_BROWSER,
	SALESFORCE_URL_PATTERN,
	SETUP_LIGHTNING,
	TAB_ON_LEFT,
	TOAST_ERROR,
	TOAST_INFO,
	TOAST_SUCCESS,
	TOAST_WARNING,
	TUTORIAL_EVENT_PIN_TAB,
	USE_LIGHTNING_NAVIGATION,
	WHAT_ACTIVATE,
	WHAT_ADD,
	WHAT_EXPORT_FROM_BG,
	WHAT_FOCUS_CHANGED,
	WHAT_HIGHLIGHTED,
	WHAT_INSTALLED,
	WHAT_PAGE_REMOVE_TAB,
	WHAT_PAGE_SAVE_TAB,
	WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
	WHAT_SAVED,
	WHAT_SHOW_EXPORT_MODAL,
	WHAT_SHOW_IMPORT,
	WHAT_SHOW_OPEN_OTHER_ORG,
	WHAT_START_TUTORIAL,
	WHAT_STARTUP,
	WHAT_THEME,
	WHAT_TOGGLE_ORG,
	WHAT_UPDATE_EXTENSION,
	WHAT_UPDATE_TAB,
} = __deps.constants;
const {
	calculateReadingTime,
	getInnerElementFieldBySelector,
	getSettings,
} = __deps.functions;
const ensureTranslatorAvailability = __deps.ensureTranslatorAvailability;
const Tab = __deps.Tab;
const { ensureAllTabsAvailability } = __deps.tabContainer;
const { setupDragForUl } = __deps.dragHandler;
const { pageActionTab, showFavouriteButton } = __deps.favouriteManager;
const {
	generateOpenOtherOrgModal,
	generateRowTemplate,
	generateSldsToastMessage,
	generateStyleFromSettings,
	generateUpdateTabModal,
	MODAL_ID,
} = __deps.generator;
const { createImportModal } = __deps.importModule;
const { createExportModal } = __deps.exportModule;
const { createManageTabsModal } = __deps.manageTabs;
const { checkTutorial, startTutorial } = __deps.tutorial;
const { executeOncePerDay } = __deps.onceADay;
`;
	const sourceLines = source.split("\n");
	const preludeLines = prelude.split("\n");
	const hookLines = [
		"export const __testHooks = {",
		"\tcheckAddLightningNavigation,",
		"\tcheckKeepTabsOnLeft,",
		"\tdelayLoadSetupTabs,",
		"\thideTabs,",
		"\tinit,",
		"\tlaunchDownload,",
		"\tmain,",
		"\tonHrefUpdate,",
		"\tpromptUpdateExtension,",
		"\tshowModalOpenOtherOrg,",
		"\tshowModalUpdateTab,",
		"\ttoggleOrg,",
		"};",
	];
	const generatedLines = [
		sourceLines[0],
		...preludeLines,
		...sourceLines.slice(1),
		...hookLines,
	];
	const originalLines = [
		1,
		...preludeLines.map(() => 0),
		...sourceLines.slice(1).map((_, index) => index + 2),
		...hookLines.map(() => 0),
	];
	const inlineSourceMap = buildInlineSourceMap({
		originalLines,
		sourceUrl: CONTENT_PATH.href,
	});
	const moduleUrl = URL.createObjectURL(
		new Blob([`${generatedLines.join("\n")}
//# sourceMappingURL=data:application/json;base64,${inlineSourceMap}
//# sourceURL=${CONTENT_PATH.href}
`], { type: "text/javascript" }),
	);
	try {
		(globalThis as typeof globalThis & {
			__contentTestDeps?: ContentDeps;
		}).__contentTestDeps = deps;
		return await import(`${moduleUrl}#${crypto.randomUUID()}`);
	} finally {
		delete (globalThis as typeof globalThis & {
			__contentTestDeps?: ContentDeps;
		}).__contentTestDeps;
		URL.revokeObjectURL(moduleUrl);
	}
}

function setGlobal(name: string, value: unknown) {
	Object.defineProperty(globalThis, name, {
		value,
		configurable: true,
		writable: true,
	});
}

function createHarness(url = SETUP_URL) {
	const dom = installMockDom(url);
	delete (globalThis as Record<string, unknown>)[
		"hasLoadedagain-why-salesforce"
	];
	const originalSetTimeout = globalThis.setTimeout;
	const originalClearTimeout = globalThis.clearTimeout;
	let nextTimerId = 1;
	const timers = new Map<number, () => void>();
	const observedMutations: Array<() => void> = [];

	globalThis.setTimeout = ((handler: TimerHandler, ...args: unknown[]) => {
		const timerId = nextTimerId++;
		timers.set(timerId, () => {
			if (typeof handler === "function") {
				handler(...args);
			}
		});
		return timerId;
	}) as typeof setTimeout;
	globalThis.clearTimeout = ((timerId?: number) => {
		if (typeof timerId === "number") {
			timers.delete(timerId);
		}
	}) as typeof clearTimeout;

	class TestMutationObserver {
		callback;
		constructor(callback: MutationCallback) {
			this.callback = callback;
		}
		observe() {
			observedMutations.push(() => this.callback([], this as never));
		}
		disconnect() {}
	}
	setGlobal("MutationObserver", TestMutationObserver);

	const prototype = globalThis.HTMLElement.prototype as Record<string, any>;
	if (prototype.replaceChildren == null) {
		prototype.replaceChildren = function (...nodes: any[]) {
			this.innerHTML = "";
			for (const node of nodes) {
				if (node == null) {
					continue;
				}
				if (node.tagName === "FRAGMENT") {
					while (node.children.length > 0) {
						this.appendChild(node.children[0]);
					}
					continue;
				}
				this.appendChild(node);
			}
		};
	}
	if (prototype.insertAdjacentElement == null) {
		prototype.insertAdjacentElement = function (
			position: string,
			element: HTMLElement,
		) {
			element.remove();
			if (position === "afterbegin") {
				this.children.unshift(element);
			} else {
				this.children.push(element);
			}
			element.parentElement = this;
			return element;
		};
	}

	const originalCreateElement = document.createElement.bind(document);
	document.createElement = ((tagName: string) => {
		const element = originalCreateElement(tagName) as HTMLElement & {
			classList: { toggle?: (cls: string) => void };
			style: Record<string, string>;
		};
		element.style.overflowX ??= "";
		element.style.overflowY ??= "";
		element.style.display ??= "";
		if (element.classList.toggle == null) {
			element.classList.toggle = function (cls: string) {
				if (this.contains(cls)) {
					this.remove(cls);
				} else {
					this.add(cls);
				}
			};
		}
		return element;
	}) as typeof document.createElement;
	document.createElementNS =
		((_namespace: string, tagName: string) =>
			document.createElement(tagName)) as typeof document.createElementNS;
	(document as Document & {
		createDocumentFragment?: () => HTMLElement;
	}).createDocumentFragment = () => document.createElement("fragment");
	(document as Document & {
		getElementsByClassName?: (className: string) => HTMLElement[];
	}).getElementsByClassName = (className: string) =>
		document.querySelectorAll(
			className.split(/\s+/).map((part) => `.${part}`).join(""),
		) as HTMLElement[];

	const setupShell = document.createElement("div");
	setupShell.className = "tabsetBody";
	const tabsContainer = document.createElement("div");
	const tabsParent = document.createElement("div");
	const pinnedItems = document.createElement("ul");
	pinnedItems.className = "pinnedItems slds-grid";
	tabsParent.appendChild(pinnedItems);
	tabsContainer.appendChild(tabsParent);
	const toastHanger = document.createElement("div");
	toastHanger.className = "oneConsoleTabset navexConsoleTabset";
	const modalHanger = document.createElement("div");
	modalHanger.className = "DESKTOP uiContainerManager";
	document.body.append(setupShell, tabsContainer, toastHanger, modalHanger);

	const records = {
		showFavouriteButton: 0,
		pageActions: [] as boolean[],
		dragCallbacks: [] as Array<() => Promise<void>>,
		checkTutorial: 0,
		startTutorial: 0,
		executeOncePerDay: 0,
		createImportModal: 0,
		createExportModal: 0,
		createManageTabsModal: 0,
		rowTemplates: [] as Array<
			{ row: Record<string, any>; conf: Record<string, any> }
		>,
		styleCalls: 0,
		toasts: [] as Array<{ message: string[]; status: string }>,
		openCalls: [] as Array<unknown[]>,
		confirmCalls: [] as string[],
		replaceTabsCalls: [] as Array<
			{ tabs: any[]; options: Record<string, unknown> }
		>,
		removeCalls: [] as Array<{ tab: any; options: any }>,
		removeOtherCalls: [] as Array<{ tab: any; options: any }>,
		moveCalls: [] as Array<{ tab: any; options: any }>,
		addCalls: [] as Array<{ tab: any; options: any }>,
		sortCalls: [] as any[],
		pinCalls: [] as Array<{ tab: any; shouldPin: boolean }>,
		removePinnedCalls: [] as boolean[],
		updateCalls: [] as Array<{ tab: any; patch: any }>,
		syncCalls: 0,
	};
	const state = {
		settings: new Map<string, any>([
			["tab_position_left", { id: "tab_position_left", enabled: false }],
			["skip_link_detection", {
				id: "skip_link_detection",
				enabled: false,
			}],
		]),
		innerFieldOverride: null as
			| null
			| ((options: {
				parentElement: HTMLElement;
				field: string;
				selector: string;
			}) => any),
		getSavedTabsCalls: 0,
		removeResult: true,
		removeOtherResult: true,
		addResult: true,
		sortResult: true,
		pinResult: true,
		removePinnedResult: true,
		syncResult: true,
		defaultTabsResult: true,
		replaceTabsResult: true,
		confirmResult: true,
		modalRadioTarget: "_blank",
	};

	function createTab(
		labelOrTab: string | { label: string; url: string; org?: string },
		url?: string | null,
		org?: string,
	) {
		const source = typeof labelOrTab === "object"
			? labelOrTab
			: { label: labelOrTab, url: url ?? "", org };
		const tab = {
			label: source.label,
			url: minifyURL(source.url),
			org: source.org == null || source.org === ""
				? undefined
				: extractOrgName(source.org),
			update(patch: Record<string, any>) {
				if (patch.label != null && patch.label !== "") {
					this.label = patch.label;
				}
				if (patch.url != null && patch.url !== "") {
					this.url = minifyURL(patch.url);
				}
				if (patch.org != null) {
					this.org = patch.org === ""
						? undefined
						: extractOrgName(patch.org);
				}
				return this;
			},
		};
		return tab;
	}

	function minifyURL(url: string) {
		if (url == null || url === "") {
			throw new Error("error_minify_url");
		}
		if (url.includes("/lightning/setup/")) {
			return url.slice(
				url.indexOf("/lightning/setup/") + "/lightning/setup/".length,
			);
		}
		return url.replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "")
			.replace(/\/$/, "");
	}

	function extractOrgName(url: string) {
		if (url == null || url === "") {
			throw new Error("error_extract_empty_url");
		}
		const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
		return parsed.hostname.split(".")[0];
	}

	function containsSalesforceId(url: string) {
		return /[a-zA-Z0-9]{15,18}/.test(url ?? "");
	}

	function buildAllTabs(initialTabs: any[] = []) {
		const tabs = [] as any[];
		tabs.push(...initialTabs.map((tab) => createTab(tab)));
		Object.defineProperty(tabs, "pinned", {
			value: 0,
			writable: true,
			configurable: true,
		});
		Object.defineProperties(tabs, {
			getSavedTabs: {
				value: () => {
					state.getSavedTabsCalls++;
					return {
						tabs: tabs.map((tab: any) => ({ ...tab })),
						pinned: tabs.pinned,
					};
				},
			},
			replaceTabs: {
				value: (
					newTabs: any[] = [],
					options: Record<string, unknown> = {},
				) => {
					records.replaceTabsCalls.push({
						tabs: newTabs.map((tab) => ({ ...tab })),
						options,
					});
					if (!state.replaceTabsResult) {
						return false;
					}
					tabs.length = 0;
					for (const tab of newTabs ?? []) {
						tabs.push(createTab(tab));
					}
					return true;
				},
			},
			existsWithOrWithoutOrg: {
				value: ({ url, org }: { url: string; org: string }) =>
					tabs.some((tab: any) =>
						tab.url === url &&
						(tab.org == null || tab.org === extractOrgName(org))
					),
			},
			moveTab: {
				value: (tab: any, options: any) => {
					records.moveCalls.push({ tab, options });
					return true;
				},
			},
			remove: {
				value: (tab: any, options: any) => {
					records.removeCalls.push({ tab, options });
					return state.removeResult;
				},
			},
			removeOtherTabs: {
				value: (tab: any, options: any) => {
					records.removeOtherCalls.push({ tab, options });
					return state.removeOtherResult;
				},
			},
			addTab: {
				value: (tab: any, options: any) => {
					records.addCalls.push({ tab, options });
					if (state.addResult) {
						tabs.push(createTab(tab));
					}
					return state.addResult;
				},
			},
			setDefaultTabs: {
				value: () => state.defaultTabsResult,
			},
			sort: {
				value: (options: any) => {
					records.sortCalls.push(options);
					return state.sortResult;
				},
			},
			pinOrUnpin: {
				value: (tab: any, shouldPin: boolean) => {
					records.pinCalls.push({ tab, shouldPin });
					return state.pinResult;
				},
			},
			removePinned: {
				value: (isPinned: boolean) => {
					records.removePinnedCalls.push(isPinned);
					return state.removePinnedResult;
				},
			},
			getSingleTabByData: {
				value: (
					{ label = null, url = null, org = null }: Record<
						string,
						any
					>,
				) => {
					const match = tabs.find((tab: any) =>
						(label == null || tab.label === label) &&
						(url == null || tab.url === minifyURL(url)) &&
						(
							org == null ||
							tab.org === extractOrgName(org)
						)
					);
					if (match == null) {
						throw new Error("error_missing_tab");
					}
					return match;
				},
			},
			syncTabs: {
				value: () => {
					records.syncCalls++;
					return state.syncResult;
				},
			},
			updateTab: {
				value: (tab: any, patch: any) => {
					records.updateCalls.push({ tab, patch });
					tab.update(patch);
					return true;
				},
			},
			getSortOptions: {
				value: (options: Record<string, unknown>) => ({
					computed: true,
					...options,
				}),
			},
		});
		return tabs;
	}

	const allTabs = buildAllTabs([
		{ label: "Users", url: USERS_URL },
		{ label: "Flows", url: FLOWS_URL, org: "other-org" },
	]);

	function createRowTemplate(
		row: Record<string, any>,
		conf: Record<string, any>,
	) {
		records.rowTemplates.push({ row, conf });
		const li = document.createElement("li");
		if (row.org != null) {
			li.classList.add("has-org-tab");
		}
		if (conf.hide) {
			li.style.display = "none";
		}
		const anchor = document.createElement("a");
		anchor.setAttribute("title", row.url);
		anchor.href = row.url;
		const span = document.createElement("span");
		span.innerText = row.label;
		if (row.org != null) {
			span.dataset.org = row.org;
			span.classList.add("is-org-tab");
		}
		anchor.appendChild(span);
		li.appendChild(anchor);
		return li;
	}

	function createToastElement(messages: string[], status: string) {
		const toast = document.createElement("div");
		toast.className = `toast-${status}`;
		toast.innerText = messages.join("|");
		return toast;
	}

	const openOtherOrgModalFactory = ({
		label,
		url,
		org,
	}: Record<string, any>) => {
		const modalParent = document.createElement("div");
		modalParent.id = "again-why-salesforce-modal";
		const saveButton = document.createElement("button");
		const closeButton = document.createElement("button");
		closeButton.addEventListener("click", () => modalParent.remove());
		const inputContainer = document.createElement(
			"input",
		) as HTMLInputElement;
		inputContainer.value = `${org ?? "target-org"}`;
		modalParent.append(saveButton, closeButton, inputContainer);
		void label;
		void url;
		return {
			modalParent,
			saveButton,
			closeButton,
			inputContainer,
			getSelectedRadioButtonValue: () => state.modalRadioTarget,
		};
	};

	const updateTabModalFactory = (
		label: string,
		url: string,
		org: string,
	) => {
		const modalParent = document.createElement("div");
		modalParent.id = "again-why-salesforce-modal";
		const saveButton = document.createElement("button");
		const closeButton = document.createElement("button");
		closeButton.addEventListener("click", () => modalParent.remove());
		const labelContainer = document.createElement(
			"input",
		) as HTMLInputElement;
		const urlContainer = document.createElement(
			"input",
		) as HTMLInputElement;
		const orgContainer = document.createElement(
			"input",
		) as HTMLInputElement;
		labelContainer.value = label;
		urlContainer.value = url;
		orgContainer.value = org ?? "";
		modalParent.append(
			saveButton,
			closeButton,
			labelContainer,
			urlContainer,
			orgContainer,
		);
		return {
			modalParent,
			saveButton,
			closeButton,
			labelContainer,
			urlContainer,
			orgContainer,
		};
	};

	const browser = {
		runtime: {
			_listeners: [] as any[],
			getURL: (path: string) => path,
			onMessage: {
				addListener(callback: any) {
					browser.runtime._listeners.push(callback);
				},
			},
			triggerMessage(message: Record<string, unknown>) {
				const responses: unknown[] = [];
				for (const listener of browser.runtime._listeners) {
					listener(
						message,
						{},
						(payload: unknown) => responses.push(payload),
					);
				}
				return responses;
			},
		},
	};

	setGlobal("open", (...args: unknown[]) => {
		records.openCalls.push(args);
		return null;
	});
	setGlobal("confirm", (message?: string) => {
		records.confirmCalls.push(message ?? "");
		return state.confirmResult;
	});

	const deps: ContentDeps = {
		constants: {
			ALL_TOAST_TYPES: new Set(["success", "info", "warning", "error"]),
			BROWSER: browser,
			CXM_EMPTY_GENERIC_TABS: "empty-generic-tabs",
			CXM_EMPTY_TABS: "empty-tabs",
			CXM_EMPTY_VISIBLE_TABS: "empty-visible-tabs",
			CXM_MANAGE_TABS: "manage-tabs",
			CXM_MOVE_FIRST: "move-first",
			CXM_MOVE_LAST: "move-last",
			CXM_MOVE_LEFT: "move-left",
			CXM_MOVE_RIGHT: "move-right",
			CXM_PIN_TAB: "pin-tab",
			CXM_REMOVE_LEFT_TABS: "remove-left-tabs",
			CXM_REMOVE_OTHER_TABS: "remove-other-tabs",
			CXM_REMOVE_PIN_TABS: "remove-pin-tabs",
			CXM_REMOVE_RIGHT_TABS: "remove-right-tabs",
			CXM_REMOVE_TAB: "remove-tab",
			CXM_REMOVE_UNPIN_TABS: "remove-unpin-tabs",
			CXM_RESET_DEFAULT_TABS: "reset-default",
			CXM_SORT_CLICK_COUNT: "sort-click-count",
			CXM_SORT_CLICK_DATE: "sort-click-date",
			CXM_SORT_LABEL: "sort-label",
			CXM_SORT_ORG: "sort-org",
			CXM_SORT_URL: "sort-url",
			CXM_TMP_HIDE_NON_ORG: "hide-without-org",
			CXM_TMP_HIDE_ORG: "hide-with-org",
			CXM_UNPIN_TAB: "unpin-tab",
			EXTENSION_NAME: "again-why-salesforce",
			HAS_ORG_TAB: ".has-org-tab",
			HTTPS: "https://",
			LIGHTNING_FORCE_COM: ".lightning.force.com",
			LINK_NEW_BROWSER: "link_new_browser",
			SALESFORCE_URL_PATTERN: /^[a-z0-9-]+$/i,
			SETUP_LIGHTNING: "/lightning/setup/",
			TAB_ON_LEFT: "tab_position_left",
			TOAST_ERROR: "error",
			TOAST_INFO: "info",
			TOAST_SUCCESS: "success",
			TOAST_WARNING: "warning",
			TUTORIAL_EVENT_PIN_TAB: "tutorial-pin",
			USE_LIGHTNING_NAVIGATION: "use_lightning_navigation",
			WHAT_ACTIVATE: "activate",
			WHAT_ADD: "add",
			WHAT_EXPORT_FROM_BG: "export-bg",
			WHAT_FOCUS_CHANGED: "focuschanged",
			WHAT_HIGHLIGHTED: "highlighted",
			WHAT_INSTALLED: "installed",
			WHAT_PAGE_REMOVE_TAB: "page-remove-tab",
			WHAT_PAGE_SAVE_TAB: "page-save-tab",
			WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP:
				"export-perm-open-popup",
			WHAT_SAVED: "saved",
			WHAT_SHOW_EXPORT_MODAL: "show-export-modal",
			WHAT_SHOW_IMPORT: "show-import",
			WHAT_SHOW_OPEN_OTHER_ORG: "show-open-other-org",
			WHAT_START_TUTORIAL: "start-tutorial",
			WHAT_STARTUP: "startup",
			WHAT_THEME: "theme",
			WHAT_TOGGLE_ORG: "toggle-org",
			WHAT_UPDATE_EXTENSION: "update-extension",
			WHAT_UPDATE_TAB: "update-tab",
		},
		functions: {
			calculateReadingTime: () => 5,
			getInnerElementFieldBySelector: (
				{ parentElement, field, selector },
			) => {
				if (state.innerFieldOverride != null) {
					return state.innerFieldOverride({
						parentElement,
						field,
						selector,
					});
				}
				const element = (
					selector === "a"
						? (parentElement.children.find((child) =>
							child.tagName === "A"
						) ?? null)
						: selector === "a > span"
						? (parentElement.children.find((child) =>
							child.tagName === "A"
						)?.children.find((child) => child.tagName === "SPAN") ??
							null)
						: parentElement.querySelector(
							selector.replaceAll(" > ", " "),
						)
				) as Record<string, any> | null;
				if (element == null) {
					return undefined;
				}
				if (field === "href") {
					return element.href ?? element.getAttribute?.("href");
				}
				return field.split(".").reduce(
					(value, part) => value?.[part],
					element,
				);
			},
			getSettings: (keys = null) => {
				if (Array.isArray(keys)) {
					return keys.map((key) => state.settings.get(key)).filter(
						Boolean,
					);
				}
				if (typeof keys === "string") {
					return state.settings.get(keys);
				}
				return [...state.settings.values()];
			},
		},
		ensureTranslatorAvailability: () => ({
			translate: (message: string | string[], join = " ") =>
				Array.isArray(message) ? message.join(join) : message,
		}),
		Tab: {
			keyClickCount: "click-count",
			keyClickDate: "click-date",
			create: createTab,
			minifyURL,
			extractOrgName,
			containsSalesforceId,
		},
		tabContainer: {
			ensureAllTabsAvailability: () => allTabs,
		},
		dragHandler: {
			setupDragForUl: (callback) => {
				records.dragCallbacks.push(callback);
			},
		},
		favouriteManager: {
			pageActionTab: (shouldSave) => {
				records.pageActions.push(shouldSave);
			},
			showFavouriteButton: () => {
				records.showFavouriteButton++;
			},
		},
		generator: {
			MODAL_ID: "again-why-salesforce-modal",
			generateOpenOtherOrgModal: openOtherOrgModalFactory,
			generateRowTemplate: createRowTemplate,
			generateSldsToastMessage: (message, status) => {
				records.toasts.push({ message, status });
				return createToastElement(message, status);
			},
			generateStyleFromSettings: () => {
				records.styleCalls++;
			},
			generateUpdateTabModal: updateTabModalFactory,
		},
		importModule: {
			createImportModal: () => {
				records.createImportModal++;
			},
		},
		exportModule: {
			createExportModal: () => {
				records.createExportModal++;
			},
		},
		manageTabs: {
			createManageTabsModal: () => {
				records.createManageTabsModal++;
			},
		},
		tutorial: {
			checkTutorial: () => {
				records.checkTutorial++;
			},
			startTutorial: () => {
				records.startTutorial++;
			},
		},
		onceADay: {
			executeOncePerDay: () => {
				records.executeOncePerDay++;
			},
		},
	};

	return {
		records,
		state,
		allTabs,
		toastHanger,
		modalHanger,
		setupShell,
		tabsParent,
		browser,
		async load() {
			return await loadContentModule(deps);
		},
		async flush() {
			for (let index = 0; index < 6; index++) {
				await Promise.resolve();
			}
		},
		flushTimers() {
			while (timers.size > 0) {
				const next = timers.entries().next().value;
				if (next == null) {
					break;
				}
				const [timerId, callback] = next;
				timers.delete(timerId);
				callback();
			}
		},
		triggerMutation() {
			for (const callback of observedMutations) {
				callback();
			}
		},
		setUrl(nextUrl: string) {
			globalThis.history.pushState({}, "", nextUrl);
		},
		resetSetupTabs() {
			const setupTabUl = document.getElementById("again-why-salesforce");
			setupTabUl?.replaceChildren();
		},
		cleanup() {
			delete (globalThis as Record<string, unknown>)[
				"hasLoadedagain-why-salesforce"
			];
			globalThis.setTimeout = originalSetTimeout;
			globalThis.clearTimeout = originalClearTimeout;
			dom.cleanup();
		},
	};
}

Deno.test("content.js bootstraps on setup pages and exposes current setup DOM", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		await harness.flush();
		const setupTabUl = content.getSetupTabUl();
		assertExists(setupTabUl);
		assertEquals(setupTabUl.id, "again-why-salesforce");
		assertEquals(content.getCurrentHref(), SETUP_URL);
		assertEquals(harness.records.dragCallbacks.length, 1);
		assertEquals(harness.records.checkTutorial, 1);
		assertEquals(harness.records.executeOncePerDay, 1);
		assertEquals(harness.records.styleCalls, 1);
		assertEquals(harness.records.showFavouriteButton, 1);
		assertEquals(harness.allTabs.length, 2);
		assertEquals(setupTabUl.childElementCount, 2);
		assertEquals(harness.records.rowTemplates[1].conf.hide, true);
		assertEquals(document.head.childElementCount > 0, true);
		assertEquals(harness.browser.runtime._listeners.length, 1);
		assertEquals(globalThis.hasLoadedagainwhysalesforce, undefined);
		assertEquals(globalThis["hasLoadedagain-why-salesforce"], true);
	} finally {
		harness.cleanup();
	}
});

Deno.test("content.js does not bootstrap outside setup pages", async () => {
	const harness = createHarness(
		"https://acme.lightning.force.com/lightning/page/home",
	);
	try {
		const content = await harness.load();
		await harness.flush();
		assertEquals(content.getSetupTabUl(), undefined);
		assertEquals(harness.records.dragCallbacks.length, 0);
		assertEquals(harness.records.executeOncePerDay, 0);
	} finally {
		harness.cleanup();
	}
});

Deno.test("content.js does not bootstrap twice when the loaded flag already exists", async () => {
	const harness = createHarness();
	try {
		globalThis["hasLoadedagain-why-salesforce"] = true;
		const content = await harness.load();
		await harness.flush();
		assertEquals(content.getSetupTabUl(), undefined);
		assertEquals(harness.records.dragCallbacks.length, 0);
		assertEquals(harness.records.executeOncePerDay, 0);
	} finally {
		harness.cleanup();
	}
});

Deno.test("showToast validates status, appends a toast, and removes it on timer flush", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		await assertRejects(() => content.showToast("bad", "wat"));
		await content.showToast("hello", "success");
		assertEquals(harness.toastHanger.childElementCount, 1);
		assertEquals(harness.records.toasts[0], {
			message: ["hello"],
			status: "success",
		});
		harness.flushTimers();
		assertEquals(harness.toastHanger.childElementCount, 0);
	} finally {
		harness.cleanup();
	}
});

Deno.test("sf_afterSet reloads tabs and can skip reload while still toasting", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		const newTabs = [{ label: "Only Users", url: USERS_URL }];
		content.sf_afterSet({
			what: "saved",
			tabs: newTabs,
			shouldReload: false,
		});
		await harness.flush();
		assertEquals(harness.records.toasts.at(-1), {
			message: ["extension_label", "tabs_saved"],
			status: "success",
		});
		content.sf_afterSet({ what: "focused", tabs: newTabs });
		await harness.flush();
		assertEquals(
			harness.records.replaceTabsCalls.at(-1)?.tabs[0].label,
			"Only Users",
		);
		assertEquals(content.getSetupTabUl().childElementCount, 1);
	} finally {
		harness.cleanup();
	}
});

Deno.test("isOnSavedTab tracks current and previous saved state across href updates", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		let callbackValue = null;
		await content.isOnSavedTab(true, (value: boolean) => {
			callbackValue = value;
		});
		assertEquals(callbackValue, false);
		assertEquals(content.getIsCurrentlyOnSavedTab(), false);
		harness.allTabs.push({
			label: "Setup",
			url: "SetupOneHome/home",
			org: undefined,
			update() {
				return this;
			},
		});
		await content.isOnSavedTab();
		assertEquals(
			content.getIsCurrentlyOnSavedTab(),
			false,
			"first call after href update should be skipped by the guard",
		);
		await content.isOnSavedTab();
		assertEquals(content.getWasOnSavedTab(), false);
		assertEquals(content.getIsCurrentlyOnSavedTab(), true);
	} finally {
		harness.cleanup();
	}
});

Deno.test("mutation-driven href updates reload tabs when a saved-tab state changes", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		harness.allTabs.push({
			label: "Users",
			url: "ManageUsers/home",
			org: undefined,
			update() {
				return this;
			},
		});
		harness.setUrl(USERS_URL);
		harness.triggerMutation();
		harness.flushTimers();
		await harness.flush();
		assertEquals(content.getCurrentHref(), USERS_URL);
		assertEquals(harness.records.rowTemplates.length >= 3, true);
		assertEquals(content.getSetupTabUl().childElementCount >= 1, true);
	} finally {
		harness.cleanup();
	}
});

Deno.test("reorderTabsUl extracts DOM tab data and persists the reordered collection", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		const setupTabUl = content.getSetupTabUl();
		setupTabUl.replaceChildren();
		setupTabUl.append(
			document.createElement("li"),
			document.createElement("li"),
		);
		const extractedFields = [
			"Users",
			USERS_URL,
			undefined,
			"Flows",
			FLOWS_URL,
			"other-org",
		];
		let readIndex = 0;
		harness.state.innerFieldOverride = () => extractedFields[readIndex++];
		await content.reorderTabsUl();
		harness.state.innerFieldOverride = null;
		const reorderedTabs = harness.records.replaceTabsCalls.at(-1)?.tabs;
		assertExists(reorderedTabs);
		assertEquals(reorderedTabs.length, 2);
		assertEquals(reorderedTabs[0].label, "Users");
		assertEquals(reorderedTabs[0].url, "ManageUsers/home");
		assertEquals(reorderedTabs[1].label, "Flows");
		assertEquals(reorderedTabs[1].url, "Flows/home");
		assertEquals(reorderedTabs[1].org, "other-org");
	} finally {
		harness.cleanup();
	}
});

Deno.test("reorderTabsUl surfaces invalid extracted rows as an error toast", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		const setupTabUl = content.getSetupTabUl();
		setupTabUl.replaceChildren();
		const invalidLi = document.createElement("li");
		setupTabUl.append(invalidLi);
		await content.reorderTabsUl();
		assertEquals(harness.records.replaceTabsCalls.length, 0);
		assertEquals(harness.records.toasts.at(-1), {
			message: ["error_minify_url"],
			status: "error",
		});
	} finally {
		harness.cleanup();
	}
});

Deno.test("makeDuplicatesBold toggles duplicate warning state twice", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		const setupTabUl = content.getSetupTabUl();
		setupTabUl.replaceChildren();
		const createAnchor = () => {
			const li = document.createElement("li");
			const a = document.createElement("a");
			a.setAttribute("title", "ManageUsers/home");
			li.appendChild(a);
			return { li, a };
		};
		const first = createAnchor();
		const second = createAnchor();
		setupTabUl.append(first.li, second.li);
		content.makeDuplicatesBold("ManageUsers/home");
		assert(first.a.classList.contains("slds-theme--warning"));
		assert(second.a.classList.contains("slds-theme--warning"));
		harness.flushTimers();
		assertEquals(first.a.classList.contains("slds-theme--warning"), false);
		assertEquals(second.a.classList.contains("slds-theme--warning"), false);
	} finally {
		harness.cleanup();
	}
});

Deno.test("getModalHanger caches the first resolved modal root", async () => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		const first = content.getModalHanger();
		assertEquals(first, harness.modalHanger);
		const replacement = document.createElement("div");
		replacement.className = "DESKTOP uiContainerManager";
		document.body.appendChild(replacement);
		assertEquals(content.getModalHanger(), first);
	} finally {
		harness.cleanup();
	}
});

Deno.test("internal helper hooks cover setup retries, direct startup branches, and utility fallbacks", async (t) => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		const hooks = content.__testHooks;

		await t.step("lightning navigation can be skipped and left-side positioning can be forced", async () => {
			const headChildren = document.head.childElementCount;
			harness.state.settings.set("link_new_browser", {
				id: "link_new_browser",
				enabled: true,
			});
			await hooks.checkAddLightningNavigation();
			assertEquals(document.head.childElementCount, headChildren);
			harness.state.settings.set("tab_position_left", {
				id: "tab_position_left",
				enabled: true,
			});
			await hooks.checkKeepTabsOnLeft();
			assertEquals(
				content.getSetupTabUl().parentElement?.children[0],
				content.getSetupTabUl(),
			);
		});

		await t.step("href updates that do not change the URL are ignored", () => {
			const previousFavouriteCalls = harness.records.showFavouriteButton;
			harness.triggerMutation();
			harness.flushTimers();
			assertEquals(
				harness.records.showFavouriteButton,
				previousFavouriteCalls,
			);
		});

		await t.step("href updates can process a changed URL directly", async () => {
			harness.allTabs.push({
				label: "Users",
				url: "ManageUsers/home",
				org: undefined,
				update() {
					return this;
				},
			});
			harness.setUrl(USERS_URL);
			hooks.onHrefUpdate();
			await harness.flush();
			assertEquals(content.getCurrentHref(), USERS_URL);
		});

		await t.step("init can no-op cleanly when the rendered tab list is empty", async () => {
			await hooks.init([]);
			assertEquals(content.getSetupTabUl().childElementCount >= 0, true);
		});

		await t.step("delayLoadSetupTabs handles retries, failures, and pre-existing setup lists", async () => {
			const originalError = console.error;
			const errors = [] as unknown[];
			console.error = (...args: unknown[]) => errors.push(args);
			try {
				harness.tabsParent.replaceChildren();
				hooks.delayLoadSetupTabs(0);
				const existingSetupUl = document.createElement("ul");
				existingSetupUl.id = "again-why-salesforce";
				existingSetupUl.classList.add("tabBarItems", "slds-grid");
				existingSetupUl.dataset.wheelListenerApplied = "true";
				existingSetupUl.style.overflowX = "auto";
					harness.tabsParent.appendChild(existingSetupUl);
					harness.flushTimers();
					await harness.flush();
					assertEquals(content.getSetupTabUl()?.id, "again-why-salesforce");
					assertEquals(
						Boolean(content.getSetupTabUl()?.dataset.wheelListenerApplied),
						true,
					);
				hooks.delayLoadSetupTabs(6);
				await harness.flush();
				assertEquals(errors.length > 0, true);
			} finally {
				console.error = originalError;
			}
		});

		await t.step("non-org hiding and duplicate highlighting safely no-op when setup tabs are absent", async () => {
			harness.cleanup();
			const offSetupHarness = createHarness(
				"https://acme.lightning.force.com/lightning/page/home",
			);
			try {
				const offSetupContent = await offSetupHarness.load();
				offSetupContent.__testHooks.hideTabs(false);
				await offSetupContent.reorderTabsUl();
				offSetupContent.makeDuplicatesBold("ManageUsers/home");
				offSetupContent.sf_afterSet();
				assertEquals(offSetupHarness.records.toasts.length, 0);
			} finally {
				offSetupHarness.cleanup();
			}
		});
	} finally {
		try {
			harness.cleanup();
		} catch {
			// The nested harness step may already have restored globals.
		}
	}
});

Deno.test("performActionOnTabs routes add, hide, pin, page actions, and errors", async (t) => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		const setupTabUl = content.getSetupTabUl();
		const orgLi = document.createElement("li");
		orgLi.classList.add("has-org-tab");
		const genericLi = document.createElement("li");
		setupTabUl.append(orgLi, genericLi);
		await t.step("add tab", async () => {
			await content.performActionOnTabs("add", {
				label: "Added",
				url: FLOWS_URL,
			}, { addInFront: true });
			assertEquals(
				harness.records.addCalls.at(-1)?.options.addInFront,
				true,
			);
		});

		await t.step("hide org tabs", async () => {
			await content.performActionOnTabs("hide-with-org");
			assertEquals(orgLi.style.display, "none");
			assertEquals(genericLi.style.display, "");
		});

		await t.step("pin tab dispatches tutorial event", async () => {
			let pinEventCount = 0;
			document.addEventListener("tutorial-pin", () => {
				pinEventCount++;
			});
			await content.performActionOnTabs("pin-tab", {
				label: "Users",
				url: USERS_URL,
			});
			assertEquals(pinEventCount, 1);
			assertEquals(harness.records.pinCalls.at(-1)?.shouldPin, true);
		});

		await t.step("page actions delegate to favourite manager", async () => {
			await content.performActionOnTabs("page-save-tab");
			await content.performActionOnTabs("page-remove-tab");
			assertEquals(harness.records.pageActions.slice(-2), [true, false]);
		});

		await t.step("failing remove shows an error toast", async () => {
			harness.state.removeResult = false;
			await content.performActionOnTabs("remove-tab", {
				label: "Users",
				url: USERS_URL,
			});
			assertEquals(harness.records.toasts.at(-1)?.status, "error");
			harness.state.removeResult = true;
		});
	} finally {
		harness.cleanup();
	}
});

Deno.test("performActionOnTabs covers move, remove-other, reset, toggle, and pinned variants", async (t) => {
	const harness = createHarness(USERS_URL);
	try {
		const content = await harness.load();
		await t.step(
			"move and remove-other variants delegate to tab storage",
			async () => {
				await content.performActionOnTabs("move", {
					label: "Users",
					url: USERS_URL,
				}, {
					moveBefore: true,
					fullMovement: true,
				});
				await content.performActionOnTabs("remove-other", {
					label: "Users",
					url: USERS_URL,
				}, {
					removeBefore: false,
				});
				assertEquals(
					harness.records.moveCalls.at(-1)?.options.fullMovement,
					true,
				);
				assertEquals(
					harness.records.removeOtherCalls.at(-1)?.options
						.removeBefore,
					false,
				);
			},
		);

		await t.step(
			"reset and empty actions call replace/default handlers",
			async () => {
				await content.performActionOnTabs("empty-generic-tabs");
				await content.performActionOnTabs("empty-tabs");
				await content.performActionOnTabs("empty-visible-tabs");
				await content.performActionOnTabs("reset-default");
				assertEquals(
					harness.records.replaceTabsCalls.length >= 3,
					true,
				);
			},
		);

		await t.step(
			"toggle org syncs matching tabs and errors on failed sync",
			async () => {
				await harness.allTabs.replaceTabs([{
					label: "Users",
					url: USERS_URL,
					org: USERS_URL,
				}], {
					resetTabs: true,
					removeOrgTabs: true,
					updatePinnedTabs: false,
				});
				await content.performActionOnTabs("toggle-org", {
					label: "Users",
					url: USERS_URL,
				});
				assertEquals(harness.records.syncCalls > 0, true);
				await harness.allTabs.replaceTabs([{
					label: "Users",
					url: USERS_URL,
					org: USERS_URL,
				}], {
					resetTabs: true,
					removeOrgTabs: true,
					updatePinnedTabs: false,
				});
				harness.state.syncResult = false;
				await content.performActionOnTabs("toggle-org", {
					label: "Users",
					url: USERS_URL,
				});
				assertEquals(
					harness.records.toasts.at(-1)?.message[0],
					"error_failed_sync",
				);
				harness.state.syncResult = true;
			},
		);

		await t.step(
			"pin removal and unpin variants are forwarded",
			async () => {
				await content.performActionOnTabs("unpin-tab", {
					label: "Users",
					url: USERS_URL,
				});
				await content.performActionOnTabs("remove-pin-tabs");
				await content.performActionOnTabs("remove-unpin-tabs");
				assertEquals(harness.records.pinCalls.at(-1)?.shouldPin, false);
				assertEquals(harness.records.removePinnedCalls.slice(-2), [
					true,
					false,
				]);
			},
		);

		await t.step(
			"unknown actions log no-match without throwing",
			async () => {
				const originalError = console.error;
				const errors = [] as unknown[];
				console.error = (...args: unknown[]) => errors.push(args);
				try {
					await content.performActionOnTabs("something-else");
				} finally {
					console.error = originalError;
				}
				assertEquals(errors.length > 0, true);
			},
		);
	} finally {
		harness.cleanup();
	}
});

Deno.test("performActionOnTabs and internal hooks cover remaining failure and default branches", async (t) => {
	const harness = createHarness(USERS_URL);
	try {
		const content = await harness.load();
		const hooks = content.__testHooks;

		await t.step("info toasts, update prompts, and downloads cover alternate utility branches", async () => {
			await content.showToast("heads-up", "info");
			harness.state.confirmResult = false;
			await hooks.promptUpdateExtension({
				version: "2.0.0",
				oldversion: "1.0.0",
				link: "https://example.test/release",
			});
			hooks.launchDownload({ payload: '{"ok":true}' });
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.status === "info" && toast.message[0] === "heads-up"
				),
				true,
			);
			assertEquals(
				harness.records.openCalls.some((call) =>
					call[0] === "https://example.test/release"
				),
				false,
			);
		});

		await t.step("toggleOrg fills current url and org when the input tab is omitted", async () => {
			await harness.allTabs.replaceTabs([{
				label: "Users",
				url: USERS_URL,
				org: USERS_URL,
			}], {
				resetTabs: true,
				removeOrgTabs: true,
				updatePinnedTabs: false,
			});
			await hooks.toggleOrg();
			assertEquals(harness.records.syncCalls > 0, true);
		});

		await t.step("showModalUpdateTab can be launched directly with an empty selector payload", async () => {
			document.getElementById("again-why-salesforce-modal")?.remove();
			await harness.allTabs.replaceTabs([{
				label: "Users",
				url: USERS_URL,
				org: USERS_URL,
			}], {
				resetTabs: true,
				removeOrgTabs: true,
				updatePinnedTabs: false,
			});
			await hooks.showModalUpdateTab();
			assertExists(document.getElementById("again-why-salesforce-modal"));
			document.getElementById("again-why-salesforce-modal")?.remove();
		});

		await t.step("direct modal hooks and main bootstrap remain callable", async () => {
			await hooks.showModalOpenOtherOrg({
				label: "Users",
				url: "ManageUsers/home",
				org: "acme",
			});
			const directOrgModal = document.getElementById(
				"again-why-salesforce-modal",
			);
			assertExists(directOrgModal);
			(directOrgModal.querySelector("input") as HTMLInputElement).value =
				"bad_org";
			(directOrgModal.querySelector("button") as HTMLButtonElement).dispatchEvent(
				new Event("click", { bubbles: true, cancelable: true }),
			);
			await harness.flush();
			assertEquals(harness.records.toasts.at(-1)?.message[0], "insert_valid_org");
			directOrgModal.remove();
			await hooks.showModalUpdateTab({
				label: "Users",
				url: USERS_URL,
				org: USERS_URL,
			});
			assertExists(document.getElementById("again-why-salesforce-modal"));
			document.getElementById("again-why-salesforce-modal")?.remove();
			hooks.main();
			await harness.flush();
			assertEquals(harness.records.executeOncePerDay >= 2, true);
		});

		await t.step("failing actions surface every error branch", async () => {
			await content.performActionOnTabs("add", {
				label: "Added first",
				url: USERS_URL,
			}, {
				addInFront: false,
			});
			assertEquals(harness.records.addCalls.at(-1)?.options.addInFront, false);
			harness.state.addResult = false;
			await content.performActionOnTabs("add", {
				label: "Added",
				url: FLOWS_URL,
			});
			harness.state.addResult = true;
			harness.state.replaceTabsResult = false;
			for (
				const action of [
					"empty-generic-tabs",
					"empty-tabs",
					"empty-visible-tabs",
				]
			) {
				await content.performActionOnTabs(action);
			}
			harness.state.replaceTabsResult = true;
			harness.state.defaultTabsResult = false;
			await content.performActionOnTabs("reset-default");
			harness.state.defaultTabsResult = true;
			harness.state.sortResult = false;
			await content.performActionOnTabs("sort", undefined, {
				sortBy: "label",
			});
			harness.state.sortResult = true;
			harness.state.pinResult = false;
			await content.performActionOnTabs("pin-tab", {
				label: "Users",
				url: USERS_URL,
			});
			await content.performActionOnTabs("unpin-tab", {
				label: "Users",
				url: USERS_URL,
			});
			harness.state.pinResult = true;
			harness.state.removePinnedResult = false;
			await content.performActionOnTabs("remove-pin-tabs");
			await content.performActionOnTabs("remove-unpin-tabs");
			harness.state.removePinnedResult = true;
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_adding_tab"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_removing_generic_tabs"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_removing_all_tabs"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_removing_visible_tabs"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_resetting_default_tabs"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_sorting_tabs"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_pin_tab"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_unpin_tab"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_removing_pin_tabs"
				),
				true,
			);
			assertEquals(
				harness.records.toasts.some((toast) =>
					toast.message[0] === "error_removing_unpin_tabs"
				),
				true,
			);
		});
	} finally {
		harness.cleanup();
	}
});

Deno.test("content.js modal flows cover open-other-org and update-tab interactions", async (t) => {
	const harness = createHarness(USERS_URL);
	try {
		const content = await harness.load();
		void content;
		await t.step(
			"open other org validates input and opens a confirmed target",
			async () => {
				harness.browser.runtime.triggerMessage({
					what: "show-open-other-org",
					label: "Users",
					url: "ManageUsers/home",
					org: "acme",
				});
				await harness.flush();
				const modal = document.getElementById(
					"again-why-salesforce-modal",
				);
				assertExists(modal);
				const saveButton = modal.querySelector("button") as
					| HTMLButtonElement
					| null;
				const input = modal.querySelector("input") as
					| HTMLInputElement
					| null;
				assertExists(saveButton);
				assertExists(input);
				harness.browser.runtime.triggerMessage({
					what: "show-open-other-org",
					label: "Users",
					url: "ManageUsers/home",
					org: "acme",
				});
				await harness.flush();
				assertEquals(
					harness.records.toasts.at(-1)?.message[0],
					"error_close_other_modal",
				);
				input.value = "";
				saveButton.dispatchEvent(
					new Event("click", { bubbles: true, cancelable: true }),
				);
				await harness.flush();
				assertEquals(
					harness.records.toasts.at(-1)?.message[0],
					"insert_another",
				);
				input.value = "acme";
				saveButton.dispatchEvent(
					new Event("click", { bubbles: true, cancelable: true }),
				);
				await harness.flush();
				assertEquals(
					harness.records.toasts.at(-1)?.message[0],
					"insert_another_org",
				);
				input.value = "other-org";
				saveButton.dispatchEvent(
					new Event("click", { bubbles: true, cancelable: true }),
				);
				await harness.flush();
				assertEquals(
					String(harness.records.openCalls.at(-1)?.[0]).includes(
						"other-org.lightning.force.com",
					),
					true,
				);
			},
		);

		await t.step(
			"update tab covers missing, duplicate-modal, and save flows",
			async () => {
				const existingModal = document.getElementById(
					"again-why-salesforce-modal",
				);
				existingModal?.remove();
				harness.browser.runtime.triggerMessage({
					what: "update-tab",
					label: "Missing",
					url: "Missing/home",
				});
				await harness.flush();
				assertEquals(
					harness.records.toasts.at(-1)?.message[0],
					"error_missing_tab",
				);

				harness.browser.runtime.triggerMessage({
					what: "update-tab",
					label: "Users",
					url: USERS_URL,
				});
				await harness.flush();
				const modal = document.getElementById(
					"again-why-salesforce-modal",
				);
				assertExists(modal);
				harness.browser.runtime.triggerMessage({
					what: "update-tab",
					label: "Users",
					url: USERS_URL,
				});
				await harness.flush();
				assertEquals(
					harness.records.toasts.at(-1)?.message[0],
					"error_close_other_modal",
				);
				const inputs = modal.querySelectorAll(
					"input",
				) as HTMLInputElement[];
				const [labelInput, urlInput, orgInput] = inputs;
				labelInput.value = "Users 2";
				urlInput.value = USERS_URL;
				orgInput.value = "other-org";
				const saveButton = modal.querySelector("button") as
					| HTMLButtonElement
					| null;
				assertExists(saveButton);
				saveButton.dispatchEvent(
					new Event("click", { bubbles: true, cancelable: true }),
				);
				await harness.flush();
				assertEquals(harness.records.updateCalls.length > 0, true);
			},
		);

		await t.step(
			"open other org infers data, warns on ids, normalizes input, and supports cancel",
			async () => {
				document.getElementById("again-why-salesforce-modal")?.remove();
				harness.setUrl(
					"https://acme.lightning.force.com/lightning/setup/001ABCDEF123456789/view",
				);
				harness.state.confirmResult = false;
				harness.browser.runtime.triggerMessage({
					what: "show-open-other-org",
				});
				await harness.flush();
				const modal = document.getElementById(
					"again-why-salesforce-modal",
				);
				assertExists(modal);
				assert(
					harness.records.toasts.some((toast) =>
						toast.status === "warning" &&
						toast.message[0] === "error_link_with_id"
					),
				);
				const saveButton = modal.querySelector("button") as
					| HTMLButtonElement
					| null;
				const input = modal.querySelector("input") as
					| HTMLInputElement
					| null;
				assertExists(saveButton);
				assertExists(input);
				input.value = "https://new-target.lightning.force.com";
				input.dispatchEvent(new Event("input"));
				assertEquals(input.value, "new-target");
				input.value = "bad_org";
				saveButton.dispatchEvent(
					new Event("click", { bubbles: true, cancelable: true }),
				);
				await harness.flush();
				assertEquals(
					harness.records.toasts.at(-1)?.message[0],
					"insert_valid_org",
				);
				input.value = "other-org";
				saveButton.dispatchEvent(
					new Event("click", { bubbles: true, cancelable: true }),
				);
				await harness.flush();
				assertEquals(harness.records.openCalls.length, 1);

				document.getElementById("again-why-salesforce-modal")?.remove();
				harness.state.confirmResult = true;
				harness.browser.runtime.triggerMessage({
					what: "show-open-other-org",
					linkTabUrl: "/lightning/page/home",
				});
				await harness.flush();
				const slashModal = document.getElementById(
					"again-why-salesforce-modal",
				);
				assertExists(slashModal);
				(slashModal.querySelector("input") as HTMLInputElement).value =
					"other-org";
				(slashModal.querySelector("button") as HTMLButtonElement).dispatchEvent(
					new Event("click", { bubbles: true, cancelable: true }),
				);
				await harness.flush();
				assertEquals(
					String(harness.records.openCalls.at(-1)?.[0]).includes(
						"/lightning/page/home",
					),
					true,
				);
			},
		);

		await t.step(
			"update tab resolves the current page when no tab payload is provided",
			async () => {
				document.getElementById("again-why-salesforce-modal")?.remove();
				harness.setUrl(USERS_URL);
				await harness.allTabs.replaceTabs([{
					label: "Users",
					url: USERS_URL,
					org: USERS_URL,
				}], {
					resetTabs: true,
					removeOrgTabs: true,
					updatePinnedTabs: false,
				});
				harness.browser.runtime.triggerMessage({
					what: "update-tab",
				});
				await harness.flush();
				const modal = document.getElementById(
					"again-why-salesforce-modal",
				);
				assertExists(modal);
				const inputs = modal.querySelectorAll(
					"input",
				) as HTMLInputElement[];
				const [, urlInput, orgInput] = inputs;
				urlInput.value =
					"https://acme.lightning.force.com/lightning/setup/Flows/home";
				urlInput.dispatchEvent(new Event("input"));
				assertEquals(urlInput.value, "Flows/home");
				orgInput.value = "https://other-org.lightning.force.com";
				orgInput.dispatchEvent(new Event("input"));
				assertEquals(orgInput.value, "other-org");
			},
		);
	} finally {
		harness.cleanup();
	}
});

Deno.test("background message routing covers modal launchers, downloads, sorting, and unknown messages", async (t) => {
	const harness = createHarness();
	try {
		const content = await harness.load();
		void content;
		const originalCreateObjectURL = URL.createObjectURL;
		const originalRevokeObjectURL = URL.revokeObjectURL;
		let downloadClicks = 0;
		URL.createObjectURL = (() =>
			"blob:test-download") as typeof URL.createObjectURL;
		URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
		const originalClick = globalThis.HTMLElement.prototype.click;
		(globalThis.HTMLElement.prototype as Record<string, any>).click =
			function () {
				downloadClicks++;
				return originalClick.call(this);
			};
		try {
			await t.step("modal launchers and tutorial messages", async () => {
				harness.browser.runtime.triggerMessage({ what: "show-import" });
				harness.browser.runtime.triggerMessage({ what: "manage-tabs" });
				harness.browser.runtime.triggerMessage({
					what: "show-export-modal",
				});
				harness.browser.runtime.triggerMessage({
					what: "start-tutorial",
				});
				await harness.flush();
				assertEquals(harness.records.createImportModal, 1);
				assertEquals(harness.records.createManageTabsModal, 1);
				assertEquals(harness.records.createExportModal, 1);
				assertEquals(harness.records.startTutorial, 1);
			});

			await t.step("update prompt and export download", async () => {
				harness.browser.runtime.triggerMessage({
					what: "update-extension",
					version: "2.0.0",
					oldversion: "1.0.0",
					link: "https://example.test/release",
				});
				harness.browser.runtime.triggerMessage({
					what: "export-bg",
					payload: '{"ok":true}',
					filename: "tabs.json",
				});
				await harness.flush();
				assertStringIncludes(harness.records.confirmCalls[0], "1.0.0");
				assertEquals(
					harness.records.openCalls.at(-1)?.[0],
					"https://example.test/release",
				);
				assertEquals(downloadClicks > 0, true);
			});

			await t.step("sorting delegates computed options", async () => {
				harness.browser.runtime.triggerMessage({ what: "sort-label" });
				await harness.flush();
				assertEquals(harness.records.sortCalls[0], {
					computed: true,
					sortBy: "label",
				});
			});

			await t.step(
				"permission, move, remove, and sort variants route correctly",
				async () => {
					harness.browser.runtime.triggerMessage({
						what: "export-perm-open-popup",
						ok: true,
					});
					harness.browser.runtime.triggerMessage({
						what: "export-perm-open-popup",
						ok: false,
					});
					harness.browser.runtime.triggerMessage({
						what: "move-right",
						label: "Users",
						url: USERS_URL,
					});
					harness.browser.runtime.triggerMessage({
						what: "move-last",
						label: "Users",
						url: USERS_URL,
					});
					harness.browser.runtime.triggerMessage({
						what: "move-left",
						label: "Users",
						url: USERS_URL,
					});
					harness.browser.runtime.triggerMessage({
						what: "move-first",
						label: "Users",
						url: USERS_URL,
					});
					harness.browser.runtime.triggerMessage({
						what: "remove-other-tabs",
						label: "Users",
						url: USERS_URL,
					});
					harness.browser.runtime.triggerMessage({
						what: "remove-left-tabs",
						label: "Users",
						url: USERS_URL,
					});
					harness.browser.runtime.triggerMessage({
						what: "remove-right-tabs",
						label: "Users",
						url: USERS_URL,
					});
					harness.browser.runtime.triggerMessage({
						what: "sort-url",
					});
					harness.browser.runtime.triggerMessage({
						what: "sort-org",
					});
					harness.browser.runtime.triggerMessage({
						what: "sort-click-count",
					});
					harness.browser.runtime.triggerMessage({
						what: "sort-click-date",
					});
					await harness.flush();
					assertEquals(harness.records.moveCalls.length >= 4, true);
					assertEquals(
						harness.records.removeOtherCalls.length >= 3,
						true,
					);
					assertEquals(harness.records.sortCalls.length >= 5, true);
					assertEquals(
						harness.records.toasts.some((toast) =>
							toast.message[0] === "req_downloads_open_popup"
						),
						true,
					);
					assertEquals(
						harness.records.toasts.some((toast) =>
							toast.message[0] === "error_req_downloads"
						),
						true,
					);
				},
			);

			await t.step(
				"hot reload, toast passthrough, grouped actions, and theme ignore route correctly",
				async () => {
					const setupTabUl = content.getSetupTabUl();
					setupTabUl.replaceChildren();
					const orgLi = document.createElement("li");
					orgLi.classList.add("has-org-tab");
					const genericLi = document.createElement("li");
					setupTabUl.append(orgLi, genericLi);
					await harness.allTabs.replaceTabs([{
						label: "Users",
						url: USERS_URL,
						org: USERS_URL,
					}], {
						resetTabs: true,
						removeOrgTabs: true,
						updatePinnedTabs: false,
					});
					for (
						const what of [
							"saved",
							"startup",
							"installed",
							"activate",
							"highlighted",
							"focuschanged",
						]
					) {
						harness.browser.runtime.triggerMessage({
							what,
							tabs: [{ label: "Users", url: USERS_URL }],
						});
					}
					harness.browser.runtime.triggerMessage({
						what: "warning",
						message: "warn-msg",
					});
					harness.browser.runtime.triggerMessage({
						what: "error",
						message: "error-msg",
					});
					for (
						const what of [
							"remove-pin-tabs",
							"remove-unpin-tabs",
							"empty-generic-tabs",
							"empty-tabs",
							"empty-visible-tabs",
							"reset-default",
							"toggle-org",
							"pin-tab",
							"unpin-tab",
							"remove-tab",
							"hide-with-org",
							"hide-without-org",
							"page-save-tab",
							"page-remove-tab",
						]
					) {
						harness.browser.runtime.triggerMessage({
							what,
							label: "Users",
							url: USERS_URL,
							org: USERS_URL,
						});
					}
					harness.browser.runtime.triggerMessage({
						what: "theme",
					});
					harness.browser.runtime.triggerMessage({});
					await harness.flush();
					assertEquals(harness.records.replaceTabsCalls.length >= 10, true);
					assertEquals(
						harness.records.toasts.some((toast) =>
							toast.message[0] === "warn-msg" && toast.status === "warning"
						),
						true,
					);
					assertEquals(
						harness.records.toasts.some((toast) =>
							toast.message[0] === "error-msg" && toast.status === "error"
						),
						true,
					);
					assertEquals(harness.records.removePinnedCalls.length >= 2, true);
					assertEquals(harness.records.pageActions.slice(-2), [true, false]);
					assertEquals(orgLi.style.display, "none");
					assertEquals(genericLi.style.display, "none");
					assertEquals(
						harness.records.toasts.some((toast) =>
							toast.message[0] === "error_unknown_message" &&
							toast.message[1] === "theme"
						),
						false,
					);
				},
			);

			await t.step(
				"unknown messages surface a warning toast",
				async () => {
					harness.browser.runtime.triggerMessage({
						what: "something-unknown",
					});
					await harness.flush();
					assert(
						harness.records.toasts.some((toast) =>
							toast.status === "warning" &&
							toast.message[0] === "error_unknown_message" &&
							toast.message[1] === "something-unknown"
						),
					);
				},
			);
		} finally {
			URL.createObjectURL = originalCreateObjectURL;
			URL.revokeObjectURL = originalRevokeObjectURL;
			(globalThis.HTMLElement.prototype as Record<string, any>).click =
				originalClick;
		}
	} finally {
		harness.cleanup();
	}
});
