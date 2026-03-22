import {
	assertEquals,
	assertRejects,
	assertThrows,
} from "@std/testing/asserts";
import { loadIsolatedModule } from "../load-isolated-module.test.ts";

type ManageTabsModule = {
	__getState: () => {
		actionButtons: ManageElement[];
		dropdownMenus: ManageElement[];
		focusedIndex: number;
		managedLoggers: ManageLogger[];
		manageInvalidateSort: boolean;
		manageTabsButtons: Record<string, ManageElement>;
		trsAndButtons: { button: ManageElement; tr: ManageElement }[];
		wasSomethingUpdated: boolean;
	};
	__setState: (state?: {
		actionButtons?: ManageElement[];
		closeButton?: ManageElement | null;
		deleteAllButton?: ManageElement | null;
		dropdownMenus?: ManageElement[];
		focusedIndex?: number;
		managedLoggers?: ManageLogger[];
		manageInvalidateSort?: boolean;
		manageTabsButtons?: Record<string, ManageElement>;
		trsAndButtons?: { button: ManageElement; tr: ManageElement }[];
		wasSomethingUpdated?: boolean;
	}) => void;
	addTr: (tabAppendElement?: ManageElement | null) => Promise<void>;
	checkAddDuplicateStyle: (tabAppendElement: ManageElement) => void;
	checkAddRemoveLastTr: (options?: {
		inputObj?: Record<string, string>;
		tabAppendElement?: ManageElement | null;
	}) => Promise<void>;
	checkDuplicates: (
		tab?: { org?: string | null; url?: string | null },
		options?: { tabAppendElement?: ManageElement | null },
	) => Promise<void>;
	checkOpenAskConfirm: (event: ManageEvent) => Promise<void>;
	checkRemoveTr: (event: ManageEvent) => Promise<void> | void;
	closeDropdownOnBtnClick: (
		event: ManageEvent,
		button: ManageElement,
	) => void;
	closeDropdownOnTrClick: (event: ManageEvent, button: ManageElement) => void;
	createManageTabsModal: () => Promise<void>;
	getLastTr: (tbody?: ManageElement | null) => ManageElement | null;
	handleActionButtonClick: (
		event: ManageEvent,
		options?: { allTabs?: Record<string, number> },
	) => Promise<void>;
	moveTrToGivenIndex: (options?: {
		currentIndex?: number | null;
		currentlyPinnedNo?: number | null;
		isPinning?: boolean;
		tabAppendElement?: ManageElement | null;
		trToMove?: ManageElement | null;
	}) => void;
	performAfterChecks: (
		tab?: { org?: string | null; url?: string | null },
		options?: {
			tabAppendElement?: ManageElement | null;
			tr?: ManageElement | null;
		},
	) => void;
	readManagedTabsAndSave: (options?: {
		allTabs?: ManageAllTabs | null;
		tbody?: ManageElement | null;
	}) => Promise<void>;
	reduceLoggersToElements: () => Array<{
		element: ManageElement;
		index: number;
		type: string;
	}>;
	removeTr: (
		tabAppendElement?: ManageElement | null,
		trToRemove?: ManageElement | null,
		removeIndex?: number,
	) => Promise<void>;
	reorderTabsTable: (
		options?: { fromIndex?: number; toIndex?: number },
	) => void;
	setInfoForDrag: (
		element: ManageElement,
		listener: () => void,
		index: number,
	) => void;
	trInputListener: (options?: {
		tabAppendElement?: ManageElement | null;
		type?: string;
	}) => Promise<void>;
	updateLoggerIndex: (
		fromIndex?: number | null,
		toIndex?: number | null,
	) => void;
	updateModalBodyOverflow: (article?: ManageElement | null) => void;
	updateTabAttributes: (options?: {
		enable?: boolean;
		tabAppendElement?: ManageElement | null;
		tr?: ManageElement | null;
	}) => void;
};

type ManageLogger = {
	label: ManageElement;
	last_input?: Record<string, string>;
	org: ManageElement;
	url: ManageElement;
};

type ManageEvent = {
	currentTarget: ManageElement;
	preventDefault: () => void;
	stopPropagation: () => void;
	target: ManageElement;
	type?: string;
};

type ManageAllTabs = {
	exists: (
		tab: { org?: string | null; url?: string | null },
		exact: boolean,
	) => boolean;
	pinnedTabsNo: number;
	replaceTabs: (
		tabs: unknown[],
		options: {
			invalidateSort: boolean;
			removeOrgTabs: boolean;
			resetTabs: boolean;
			updatePinnedTabs: boolean;
		},
	) => Promise<boolean>;
};

type ManageTabsDependencies = {
	CXM_PIN_TAB: string;
	CXM_REMOVE_TAB: string;
	CXM_UNPIN_TAB: string;
	HIDDEN_CLASS: string;
	MODAL_ID: string;
	PIN_TAB_CLASS: string;
	TOAST_ERROR: string;
	TOAST_WARNING: string;
	Tab: {
		create: (tab: Record<string, unknown>) => unknown;
		expandURL: (
			url: string,
			currentHref: string,
			org?: string | null,
		) => string;
		extractOrgName: (url: string) => string;
		minifyURL: (url: string) => string;
	};
	TabContainer: {
		keyPinnedTabsNo: string;
	};
	TUTORIAL_EVENT_CLOSE_MANAGE_TABS: string;
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL: string;
	TUTORIAL_EVENT_REORDERED_TABS_TABLE: string;
	confirm: (message: string) => boolean;
	createManageTabRow: (
		tab?: Record<string, unknown>,
		options?: { index?: number },
	) => Promise<{
		dropdownButton: ManageElement;
		dropdownMenu: ManageElement;
		logger: ManageLogger;
		tr: ManageElement;
	}>;
	ensureAllTabsAvailability: (
		options?: Record<string, unknown>,
	) => Promise<ManageAllTabs>;
	ensureTranslatorAvailability: () => Promise<{
		translate: (key: string) => Promise<string>;
	}>;
	generateManageTabsModal: (allTabs: ManageAllTabs) => Promise<{
		closeButton: ManageElement;
		deleteAllTabsButton: ManageElement;
		dropdownMenus: ManageElement[];
		loggers: ManageLogger[];
		modalParent: ManageElement;
		saveButton: ManageElement;
		tbody: ManageElement;
		trsAndButtons: { button: ManageElement; tr: ManageElement }[];
	}>;
	getCurrentHref: () => string;
	getInnerElementFieldBySelector: (options: {
		field: string;
		parentElement: ManageElement;
		selector: string;
	}) => unknown;
	getModalHanger: () => ManageElement;
	handleLightningLinkClick: (event: ManageEvent) => void;
	injectStyle: (id: string, options: { css: string }) => ManageElement;
	makeDuplicatesBold: (url: string) => void;
	reorderTabsUl: () => void;
	setupDragForTable: (
		callback: (options?: { fromIndex?: number; toIndex?: number }) => void,
	) => void;
	setupDragForUl: () => void;
	sf_afterSet: (payload: unknown) => void;
	showToast: (message: string, status?: string) => void;
};

/**
 * Minimal classList implementation for manageTabs tests.
 */
class ManageClassList {
	#classes = new Set<string>();
	#owner: ManageElement;

	/**
	 * Stores the owner element.
	 *
	 * @param {ManageElement} owner Owner element.
	 */
	constructor(owner: ManageElement) {
		this.#owner = owner;
	}

	/**
	 * Adds CSS classes.
	 *
	 * @param {...string} classNames Classes to add.
	 * @return {void}
	 */
	add(...classNames: string[]) {
		for (const className of classNames) {
			if (className !== "") {
				this.#classes.add(className);
			}
		}
		this.#owner.className = [...this.#classes].join(" ");
	}

	/**
	 * Removes CSS classes.
	 *
	 * @param {...string} classNames Classes to remove.
	 * @return {void}
	 */
	remove(...classNames: string[]) {
		for (const className of classNames) {
			this.#classes.delete(className);
		}
		this.#owner.className = [...this.#classes].join(" ");
	}

	/**
	 * Checks whether the class exists.
	 *
	 * @param {string} className Class to check.
	 * @return {boolean} `true` when present.
	 */
	contains(className: string) {
		return this.#classes.has(className);
	}
}

/**
 * Minimal DOM element with only the selectors used by manageTabs.
 */
class ManageElement {
	attributes = new Map<string, string>();
	childNodes: ManageElement[] = [];
	children: ManageElement[] = [];
	classList = new ManageClassList(this);
	className = "";
	clientHeight = 0;
	dataset: Record<string, string> = {};
	parentNode: ManageElement | null = null;
	scrollCalls: unknown[] = [];
	style: Record<string, string> = {};
	tagName: string;
	value = "";
	#closestMap = new Map<string, ManageElement | null>();
	#listeners = new Map<
		string,
		Array<(event: ManageEvent) => void | Promise<void>>
	>();
	#queryMap = new Map<string, ManageElement | null>();
	#queryAllMap = new Map<string, ManageElement[]>();

	/**
	 * Creates an element with the given tag name.
	 *
	 * @param {string} tagName Tag name.
	 */
	constructor(tagName: string) {
		this.tagName = tagName.toUpperCase();
	}

	/**
	 * Appends a child node.
	 *
	 * @param {ManageElement} child Child node.
	 * @return {ManageElement} Appended node.
	 */
	appendChild(child: ManageElement) {
		child.parentNode = this;
		this.children.push(child);
		this.childNodes.push(child);
		return child;
	}

	/**
	 * Appends nodes to the element.
	 *
	 * @param {...ManageElement} children Child nodes.
	 * @return {void}
	 */
	append(...children: ManageElement[]) {
		for (const child of children) {
			this.appendChild(child);
		}
	}

	/**
	 * Registers an event listener.
	 *
	 * @param {string} type Event type.
	 * @param {(event: ManageEvent) => void | Promise<void>} listener Listener callback.
	 * @return {void}
	 */
	addEventListener(
		type: string,
		listener: (event: ManageEvent) => void | Promise<void>,
	) {
		const listeners = this.#listeners.get(type) ?? [];
		listeners.push(listener);
		this.#listeners.set(type, listeners);
	}

	/**
	 * Inserts an element before this node.
	 *
	 * @param {ManageElement} node Node to insert.
	 * @return {void}
	 */
	before(node: ManageElement) {
		const parent = this.parentNode;
		if (parent == null) {
			return;
		}
		parent.children = parent.children.filter((child) => child !== node);
		parent.childNodes = parent.childNodes.filter((child) => child !== node);
		const index = parent.children.indexOf(this);
		parent.children.splice(index, 0, node);
		parent.childNodes.splice(index, 0, node);
		node.parentNode = parent;
	}

	/**
	 * Returns the number of child elements.
	 */
	get childElementCount() {
		return this.children.length;
	}

	/**
	 * Resolves the nearest ancestor for a selector.
	 *
	 * @param {string} selector Selector to resolve.
	 * @return {ManageElement | null} Matching ancestor.
	 */
	closest(selector: string) {
		if (this.#closestMap.has(selector)) {
			return this.#closestMap.get(selector) ?? null;
		}
		let current = this.parentNode;
		while (current != null) {
			if (
				selector.startsWith(".")
					? current.classList.contains(selector.slice(1))
					: current.tagName === selector.toUpperCase()
			) {
				return current;
			}
			current = current.parentNode;
		}
		return null;
	}

	/**
	 * Dispatches an event to registered listeners.
	 *
	 * @param {ManageEvent} event Event object.
	 * @return {Promise<void> | void} Listener completion when async handlers are present.
	 */
	dispatchEvent(event: ManageEvent) {
		const type = event.type ?? "click";
		const asyncListeners: Promise<void>[] = [];
		for (const listener of this.#listeners.get(type) ?? []) {
			const result = listener({
				...event,
				currentTarget: event.currentTarget ?? this,
				target: event.target ?? this,
			});
			if (result instanceof Promise) {
				asyncListeners.push(result);
			}
		}
		if (asyncListeners.length > 0) {
			return Promise.all(asyncListeners).then(() => {});
		}
	}

	/**
	 * Finds a single descendant by the configured selector.
	 *
	 * @param {string} selector Selector to resolve.
	 * @return {ManageElement | null} Matching element.
	 */
	querySelector(selector: string) {
		return this.#queryMap.get(selector) ?? null;
	}

	/**
	 * Finds all configured descendants for a selector.
	 *
	 * @param {string} selector Selector to resolve.
	 * @return {ManageElement[]} Matching elements.
	 */
	querySelectorAll(selector: string) {
		return this.#queryAllMap.get(selector) ?? [];
	}

	/**
	 * Removes the node from its parent.
	 *
	 * @return {void}
	 */
	remove() {
		if (this.parentNode == null) {
			return;
		}
		this.parentNode.children = this.parentNode.children.filter((child) =>
			child !== this
		);
		this.parentNode.childNodes = this.parentNode.childNodes.filter((
			child,
		) => child !== this);
		this.parentNode = null;
	}

	/**
	 * Tracks scroll requests.
	 *
	 * @param {unknown} options Scroll options.
	 * @return {void}
	 */
	scrollIntoView(options: unknown) {
		this.scrollCalls.push(options);
	}

	/**
	 * Sets a synthetic closest mapping.
	 *
	 * @param {string} selector Selector string.
	 * @param {ManageElement | null} element Mapped ancestor.
	 * @return {void}
	 */
	setClosest(selector: string, element: ManageElement | null) {
		this.#closestMap.set(selector, element);
	}

	/**
	 * Sets an attribute value.
	 *
	 * @param {string} name Attribute name.
	 * @param {string} value Attribute value.
	 * @return {void}
	 */
	setAttribute(name: string, value: string) {
		this.attributes.set(name, value);
	}

	/**
	 * Removes an attribute.
	 *
	 * @param {string} name Attribute name.
	 * @return {void}
	 */
	removeAttribute(name: string) {
		this.attributes.delete(name);
	}

	/**
	 * Dispatches a click event on the element.
	 *
	 * @return {Promise<void> | void} Listener completion when async handlers are present.
	 */
	click() {
		return this.dispatchEvent(createEvent(this));
	}

	/**
	 * Sets a single querySelector result.
	 *
	 * @param {string} selector Selector string.
	 * @param {ManageElement | null} element Result.
	 * @return {void}
	 */
	setQueryResult(selector: string, element: ManageElement | null) {
		this.#queryMap.set(selector, element);
	}

	/**
	 * Sets a querySelectorAll result.
	 *
	 * @param {string} selector Selector string.
	 * @param {ManageElement[]} elements Results.
	 * @return {void}
	 */
	setQueryResults(selector: string, elements: ManageElement[]) {
		this.#queryAllMap.set(selector, elements);
	}
}

/**
 * Tbody helper with support for the selectors used by manageTabs.
 */
class ManageTbody extends ManageElement {
	/**
	 * Creates a tbody element.
	 */
	constructor() {
		super("tbody");
	}

	/**
	 * Finds row selectors dynamically.
	 *
	 * @param {string} selector Selector string.
	 * @return {ManageElement | null} Matching row.
	 */
	override querySelector(selector: string) {
		const nthMatch = selector.match(/^tr:nth-child\((\d+)\)$/);
		if (nthMatch != null) {
			return this.children[Number(nthMatch[1]) - 1] ?? null;
		}
		if (selector === "tr:last-child") {
			return this.children.at(-1) ?? null;
		}
		return super.querySelector(selector);
	}

	/**
	 * Finds all row selectors dynamically.
	 *
	 * @param {string} selector Selector string.
	 * @return {ManageElement[]} Matching rows.
	 */
	override querySelectorAll(selector: string) {
		if (selector === "tr") {
			return [...this.children];
		}
		return super.querySelectorAll(selector);
	}
}

type ManageTabsFixture = {
	allTabs: ManageAllTabs;
	cleanup: () => void;
	confirmResult: { value: boolean };
	createManageTabRowResult: {
		current: ManageTabsDependencies["createManageTabRow"];
	};
	currentHref: { value: string };
	documentById: { current: ManageElement | null };
	documentEvents: string[];
	documentQuery: { current: ManageElement | null };
	duplicateExists: { value: boolean };
	duplicateUrls: string[];
	ensureAllTabsCalls: Array<Record<string, unknown> | undefined>;
	generateManageTabsModalResult: {
		current: ManageTabsDependencies["generateManageTabsModal"];
	};
	hanger: ManageElement;
	lightningClicks: { value: number };
	module: ManageTabsModule;
	replaceTabsCalls: Array<
		{ options: Record<string, unknown>; tabs: unknown[] }
	>;
	replacedTabsResult: { value: boolean };
	reorderTabsUlCalls: { value: number };
	setupDragForTableCallbacks: Array<
		(options?: { fromIndex?: number; toIndex?: number }) => void
	>;
	setupDragForUlCalls: { value: number };
	sfAfterSetCalls: unknown[];
	timeouts: Array<() => void>;
	timeoutWaits: number[];
	toasts: { message: string; status?: string }[];
};

/**
 * Creates a row with the selectors used by the tested helpers.
 *
 * @param {number} index Row index.
 * @return {{ dragIconCell: ManageElement; dragWrapperCell: ManageElement; dropdownButton: ManageElement; dropdownMenu: ManageElement; pinButton: ManageElement; row: ManageElement; unpinButton: ManageElement; }} Row fixture.
 */
function createRow(index: number) {
	const row = new ManageElement("tr");
	row.dataset.rowIndex = String(index);
	const dropdownButton = new ManageElement("button");
	dropdownButton.dataset.name = "dropdownButton";
	const actionsParent = new ManageElement("div");
	const pinButton = new ManageElement("a");
	const unpinButton = new ManageElement("a");
	actionsParent.setQueryResults("a", [pinButton, unpinButton]);
	actionsParent.setQueryResult("[data-name=dropdownButton]", dropdownButton);
	dropdownButton.parentNode = actionsParent;
	const dragWrapperCell = new ManageElement("td");
	const dragIconCell = new ManageElement("td");
	const dropdownMenu = new ManageElement("div");
	row.setQueryResult("td button[data-name=dropdownButton]", dropdownButton);
	row.setQueryResult(".actions-dropdown-menu", dropdownMenu);
	row.setQueryResult(".pin-btn", pinButton);
	row.setQueryResult(".unpin-btn", unpinButton);
	row.setQueryResult("td.slds-cell-wrap", dragWrapperCell);
	row.setQueryResult("td:has(> svg)", dragIconCell);
	return {
		dragIconCell,
		dragWrapperCell,
		dropdownButton,
		dropdownMenu,
		pinButton,
		row,
		unpinButton,
	};
}

/**
 * Builds logger entries tied to the provided rows.
 *
 * @param {ManageElement[]} rows Row elements.
 * @return {ManageLogger[]} Logger objects for module state.
 */
function createManagedLoggers(rows: ManageElement[]) {
	return rows.map((row) => {
		const label = new ManageElement("input");
		const url = new ManageElement("input");
		const org = new ManageElement("input");
		const openLink = new ManageElement("a");
		openLink.dataset.action = "open";
		for (const element of [label, url, org]) {
			element.setClosest("tr", row);
		}
		const actionLink0 = new ManageElement("a");
		const actionLink1 = new ManageElement("a");
		row.setQueryResults("a.awsf-td-button", [actionLink0, actionLink1]);
		row.setQueryResult(".label", label);
		row.setQueryResult(".url", url);
		row.setQueryResult("input.label", label);
		row.setQueryResult("input.url", url);
		row.setQueryResult("input.org", org);
		row.setQueryResult("[data-action=open]", openLink);
		return {
			label,
			last_input: {},
			org,
			url,
		};
	});
}

/**
 * Creates an event object with preventDefault and propagation counters.
 *
 * @param {ManageElement} currentTarget Current target button.
 * @param {ManageElement} [target=currentTarget] Event target.
 * @param {string} [type="click"] Event type.
 * @return {ManageEvent & { prevented: { value: boolean }; stopped: { value: boolean } }} Event plus instrumentation.
 */
function createEvent(
	currentTarget: ManageElement,
	target = currentTarget,
	type = "click",
) {
	const prevented = { value: false };
	const stopped = { value: false };
	return {
		currentTarget,
		preventDefault: () => {
			prevented.value = true;
		},
		prevented,
		stopPropagation: () => {
			stopped.value = true;
		},
		stopped,
		target,
		type,
	};
}

/**
 * Loads manageTabs.js with lightweight dependencies.
 *
 * @return {Promise<ManageTabsFixture>} Loaded module fixture.
 */
async function loadManageTabs() {
	const allTabs: ManageAllTabs = {
		exists: () => false,
		pinnedTabsNo: 0,
		replaceTabs: () => Promise.resolve(true),
	};
	const createManageTabRowResult = {
		current: (() =>
			Promise.reject(
				new Error("not-needed"),
			)) as ManageTabsDependencies["createManageTabRow"],
	};
	const confirmResult = { value: true };
	const currentHref = { value: "https://example.com" };
	const documentById = { current: null as ManageElement | null };
	const documentEvents: string[] = [];
	const documentQuery = { current: null as ManageElement | null };
	const duplicateExists = { value: false };
	const duplicateUrls: string[] = [];
	const ensureAllTabsCalls: Array<Record<string, unknown> | undefined> = [];
	const generateManageTabsModalResult = {
		current: (() =>
			Promise.reject(
				new Error("not-needed"),
			)) as ManageTabsDependencies["generateManageTabsModal"],
	};
	const hanger = new ManageElement("div");
	const lightningClicks = { value: 0 };
	const replaceTabsCalls: Array<
		{ options: Record<string, unknown>; tabs: unknown[] }
	> = [];
	const replacedTabsResult = { value: true };
	const reorderTabsUlCalls = { value: 0 };
	const setupDragForTableCallbacks: Array<
		(options?: { fromIndex?: number; toIndex?: number }) => void
	> = [];
	const setupDragForUlCalls = { value: 0 };
	const sfAfterSetCalls: unknown[] = [];
	const timeouts: Array<() => void> = [];
	const timeoutWaits: number[] = [];
	const toasts: { message: string; status?: string }[] = [];

	allTabs.exists = () => duplicateExists.value;
	allTabs.replaceTabs = (tabs, options) => {
		replaceTabsCalls.push({ options, tabs });
		return Promise.resolve(replacedTabsResult.value);
	};

	const { cleanup, module } = await loadIsolatedModule<
		ManageTabsModule,
		ManageTabsDependencies
	>({
		modulePath: new URL(
			"../../src/salesforce/manageTabs.js",
			import.meta.url,
		),
		additionalExports: [
			"addTr",
			"__getState",
			"__setState",
			"checkAddDuplicateStyle",
			"checkAddRemoveLastTr",
			"checkDuplicates",
			"checkOpenAskConfirm",
			"checkRemoveTr",
			"closeDropdownOnBtnClick",
			"closeDropdownOnTrClick",
			"getLastTr",
			"moveTrToGivenIndex",
			"performAfterChecks",
			"readManagedTabsAndSave",
			"reduceLoggersToElements",
			"removeTr",
			"reorderTabsTable",
			"setInfoForDrag",
			"trInputListener",
			"updateLoggerIndex",
			"updateTabAttributes",
		],
		extraSource: `
function __setState(state = {}) {
	if (state.focusedIndex !== undefined) focusedIndex = state.focusedIndex;
	if (state.deleteAllButton !== undefined) deleteAllButton = state.deleteAllButton;
	if (state.closeButton !== undefined) closeButton = state.closeButton;
	if (state.manageInvalidateSort !== undefined) manage_InvalidateSort = state.manageInvalidateSort;
	if (state.wasSomethingUpdated !== undefined) wasSomethingUpdated = state.wasSomethingUpdated;
	if (state.managedLoggers !== undefined) {
		managedLoggers.length = 0;
		managedLoggers.push(...state.managedLoggers);
	}
	if (state.actionButtons !== undefined) {
		actionButtons.length = 0;
		actionButtons.push(...state.actionButtons);
	}
	if (state.dropdownMenus !== undefined) {
		dropdownMenus.length = 0;
		dropdownMenus.push(...state.dropdownMenus);
	}
	if (state.trsAndButtons !== undefined) {
		trsAndButtons.length = 0;
		trsAndButtons.push(...state.trsAndButtons);
	}
	if (state.manageTabsButtons !== undefined) {
		for (const key of Object.keys(manageTabsButtons)) delete manageTabsButtons[key];
		Object.assign(manageTabsButtons, state.manageTabsButtons);
	}
}
function __getState() {
	return {
		actionButtons,
		dropdownMenus,
		focusedIndex,
		managedLoggers,
		manageInvalidateSort: manage_InvalidateSort,
		manageTabsButtons,
		trsAndButtons,
		wasSomethingUpdated,
	};
}`,
		dependencies: {
			CXM_PIN_TAB: "pin",
			CXM_REMOVE_TAB: "remove",
			CXM_UNPIN_TAB: "unpin",
			HIDDEN_CLASS: "hidden",
			MODAL_ID: "modal",
			PIN_TAB_CLASS: "pin-tab",
			TOAST_ERROR: "error",
			TOAST_WARNING: "warning",
			Tab: {
				create: (tab) => tab,
				expandURL: (url, href, org) => `${href}::${url}::${org ?? ""}`,
				extractOrgName: (url) => url,
				minifyURL: (url) => `min:${url}`,
			},
			TabContainer: {
				keyPinnedTabsNo: "pinnedTabsNo",
			},
			TUTORIAL_EVENT_CLOSE_MANAGE_TABS: "close-manage-tabs",
			TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL: "create-manage-tabs",
			TUTORIAL_EVENT_REORDERED_TABS_TABLE: "reordered-tabs-table",
			confirm: () => confirmResult.value,
			createManageTabRow: (...args) =>
				createManageTabRowResult.current(...args),
			ensureAllTabsAvailability: (options) => {
				ensureAllTabsCalls.push(options);
				return Promise.resolve(allTabs);
			},
			ensureTranslatorAvailability: () =>
				Promise.resolve({
					translate: () => Promise.resolve("translated"),
				}),
			generateManageTabsModal: (tabs) =>
				generateManageTabsModalResult.current(tabs),
			getCurrentHref: () => currentHref.value,
			getInnerElementFieldBySelector: (
				{ field, parentElement, selector },
			) => (parentElement.querySelector(selector) as
				| Record<string, unknown>
				| null)?.[field] ?? null,
			getModalHanger: () => hanger,
			handleLightningLinkClick: () => {
				lightningClicks.value++;
			},
			injectStyle: () => new ManageElement("style"),
			makeDuplicatesBold: (url) => {
				duplicateUrls.push(url);
			},
			reorderTabsUl: () => {
				reorderTabsUlCalls.value++;
			},
			setupDragForTable: (callback) => {
				setupDragForTableCallbacks.push(callback);
			},
			setupDragForUl: () => {
				setupDragForUlCalls.value++;
			},
			sf_afterSet: (payload) => {
				sfAfterSetCalls.push(payload);
			},
			showToast: (message, status) => {
				toasts.push({ message, status });
			},
		},
		globals: {
			CustomEvent: class {
				type: string;

				/**
				 * Stores the event type.
				 *
				 * @param {string} type Event type.
				 */
				constructor(type: string) {
					this.type = type;
				}
			},
			confirm: () => confirmResult.value,
			document: {
				dispatchEvent: (event: { type: string }) => {
					documentEvents.push(event.type);
					return true;
				},
				getElementById: () => documentById.current,
				querySelector: () => documentQuery.current,
			},
			setTimeout: (callback: () => void, delay: number) => {
				timeouts.push(callback);
				timeoutWaits.push(delay);
				return timeouts.length;
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"/functions.js",
			"/tab.js",
			"/tabContainer.js",
			"/translator.js",
			"./dragHandler.js",
			"./generator.js",
			"./content.js",
		]),
	});

	return {
		allTabs,
		cleanup,
		confirmResult,
		createManageTabRowResult,
		currentHref,
		documentById,
		documentEvents,
		documentQuery,
		duplicateExists,
		duplicateUrls,
		ensureAllTabsCalls,
		generateManageTabsModalResult,
		hanger,
		lightningClicks,
		module,
		replaceTabsCalls,
		replacedTabsResult,
		reorderTabsUlCalls,
		setupDragForTableCallbacks,
		setupDragForUlCalls,
		sfAfterSetCalls,
		timeouts,
		timeoutWaits,
		toasts,
	};
}

/**
 * Creates the article structure expected by `updateModalBodyOverflow`.
 *
 * @param {ManageElement} tbody Table body used by the tested helpers.
 * @param {ManageElement} [firstRow=tbody.children[0] ?? new ManageElement("tr")] Row used for height calculations.
 * @return {{ article: ManageElement; modalBody: ManageElement; table: ManageElement; }} Article fixture.
 */
function createArticleFixture(
	tbody: ManageElement,
	firstRow = tbody.children[0] ?? new ManageElement("tr"),
) {
	const article = new ManageElement("article");
	const modalBody = new ManageElement("div");
	modalBody.classList.add(
		"modal-body",
		"scrollable",
		"slds-modal__content",
		"slds-p-around_medium",
	);
	modalBody.clientHeight = 200;
	const wrapper = new ManageElement("div");
	const table = new ManageElement("table");
	table.clientHeight = 120;
	table.parentNode = wrapper;
	table.setQueryResult("tr:nth-child(1)", firstRow);
	article.childNodes = [new ManageElement("div"), wrapper];
	article.setClosest(
		".modal-body.scrollable.slds-modal__content.slds-p-around_medium",
		modalBody,
	);
	article.setQueryResult("#sortable-table", table);
	tbody.setClosest("article", article);
	return { article, modalBody, table };
}

Deno.test("manageTabs reorders logger state and validates required indices", async () => {
	const fixture = await loadManageTabs();
	const rows = [createRow(0).row, createRow(1).row, createRow(2).row];
	const managedLoggers = createManagedLoggers(rows);
	fixture.module.__setState({ managedLoggers });

	try {
		assertThrows(
			() => fixture.module.updateLoggerIndex(null, 1),
			Error,
			"error_required_params",
		);
		fixture.module.updateLoggerIndex(1, 1);
		assertEquals(managedLoggers[1].label.closest("tr"), rows[1]);

		fixture.module.updateLoggerIndex(2, 0);

		assertEquals(
			fixture.module.getLastTr(null),
			undefined,
		);
		assertEquals(
			fixture.module.__getState().managedLoggers[0].label.closest("tr"),
			rows[2],
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs moves rows to the pinned boundary and refreshes row indexes", async () => {
	const fixture = await loadManageTabs();
	const tbody = new ManageTbody();
	const row0 = createRow(0).row;
	const row1 = createRow(1).row;
	const row2 = createRow(2).row;
	for (const row of [row0, row1, row2]) {
		tbody.appendChild(row);
	}
	const managedLoggers = createManagedLoggers([row0, row1, row2]);
	fixture.module.__setState({ managedLoggers });

	try {
		assertThrows(
			() => fixture.module.moveTrToGivenIndex({ currentIndex: null }),
			Error,
			"error_required_params",
		);
		assertThrows(
			() =>
				fixture.module.moveTrToGivenIndex({
					currentIndex: 2,
					currentlyPinnedNo: 0,
					isPinning: true,
				}),
			Error,
			"error_required_params",
		);

		fixture.module.moveTrToGivenIndex({
			currentIndex: 2,
			currentlyPinnedNo: 1,
			isPinning: true,
			tabAppendElement: tbody,
			trToMove: row2,
		});

		assertEquals(tbody.children[0], row0);
		assertEquals(tbody.children[1], row2);
		assertEquals(tbody.children[2], row1);
		assertEquals(row2.dataset.rowIndex, 1 as unknown as string);
		assertEquals(
			fixture.module.__getState().managedLoggers[1].label.dataset
				.element_index,
			1 as unknown as string,
		);
		assertEquals(
			fixture.module.__getState().managedLoggers[1].label.closest("tr")
				?.dataset.rowIndex,
			1 as unknown as string,
		);

		fixture.module.moveTrToGivenIndex({
			currentIndex: 1,
			currentlyPinnedNo: 0,
			isPinning: true,
			tabAppendElement: tbody,
			trToMove: row2,
		});
		assertEquals(tbody.children[0], row2);
		assertEquals(tbody.children[1], row0);
		assertEquals(tbody.children[2], row1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs updates action attributes and modal overflow state", async () => {
	const fixture = await loadManageTabs();
	const { dragIconCell, dropdownButton, row } = createRow(0);
	const actionButton0 = new ManageElement("a");
	const actionButton1 = new ManageElement("a");
	const actionsParent = new ManageElement("div");
	actionsParent.setQueryResults("a", [actionButton0, actionButton1]);
	dropdownButton.parentNode = actionsParent;
	row.setQueryResult("td button[data-name=dropdownButton]", dropdownButton);
	const tbody = new ManageTbody();
	tbody.appendChild(row);

	const article = new ManageElement("article");
	const modalBody = new ManageElement("div");
	modalBody.classList.add(
		"modal-body",
		"scrollable",
		"slds-modal__content",
		"slds-p-around_medium",
	);
	modalBody.clientHeight = 200;
	const wrapper = new ManageElement("div");
	const table = new ManageElement("table");
	table.clientHeight = 180;
	const other = new ManageElement("div");
	other.clientHeight = 30;
	const tr = new ManageElement("tr");
	tr.clientHeight = 20;
	table.setQueryResult("tr:nth-child(1)", tr);
	table.parentNode = wrapper;
	article.childNodes = [other, wrapper];
	article.setClosest(
		".modal-body.scrollable.slds-modal__content.slds-p-around_medium",
		modalBody,
	);
	article.setQueryResult("#sortable-table", table);

	try {
		assertThrows(
			() => fixture.module.updateTabAttributes(),
			Error,
			"error_required_params",
		);

		fixture.module.updateTabAttributes({ enable: false, tr: row });
		assertEquals(dropdownButton.attributes.get("disabled"), "true");
		assertEquals(actionButton0.attributes.get("disabled"), "true");
		assertEquals(row.attributes.has("draggable"), false);
		assertEquals(
			dragIconCell.dataset.draggable,
			false as unknown as string,
		);

		fixture.module.updateTabAttributes({ enable: true, tr: row });
		assertEquals(dropdownButton.attributes.has("disabled"), false);
		assertEquals(actionButton0.attributes.has("disabled"), false);
		assertEquals(row.attributes.get("draggable"), "true");
		assertEquals(dragIconCell.dataset.draggable, true as unknown as string);

		assertThrows(
			() => fixture.module.updateModalBodyOverflow(),
			Error,
			"error_required_params",
		);

		fixture.module.updateModalBodyOverflow(article);
		assertEquals(modalBody.style.overflowY, "auto");

		table.clientHeight = 100;
		fixture.module.updateModalBodyOverflow(article);
		assertEquals(modalBody.style.overflowY, "hidden");
		assertEquals(article.scrollCalls.length, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs handles open, pin, unpin, remove, and unknown row actions", async () => {
	const fixture = await loadManageTabs();
	const tbody = new ManageTbody();
	const row0Parts = createRow(0);
	const row1Parts = createRow(1);
	const row2Parts = createRow(2);
	for (const row of [row0Parts.row, row1Parts.row, row2Parts.row]) {
		tbody.appendChild(row);
	}
	const managedLoggers = createManagedLoggers([
		row0Parts.row,
		row1Parts.row,
		row2Parts.row,
	]);
	const deleteAllButton = new ManageElement("button");
	const closeButton = new ManageElement("button");
	let closeClicks = 0;
	closeButton.setClosest("button", closeButton);
	(closeButton as ManageElement & { click?: () => void }).click = () => {
		closeClicks++;
		return undefined;
	};
	fixture.module.__setState({
		closeButton,
		deleteAllButton,
		managedLoggers,
		wasSomethingUpdated: false,
	});

	try {
		const openButton = new ManageElement("button");
		openButton.dataset.action = "open";
		const openEvent = createEvent(openButton);
		await fixture.module.handleActionButtonClick(openEvent, {
			allTabs: { pinnedTabsNo: 1 },
		});
		assertEquals(openEvent.prevented.value, true);
		assertEquals(openEvent.stopped.value, true);
		assertEquals(fixture.lightningClicks.value, 1);
		assertEquals(closeClicks, 1);

		const pinButton = new ManageElement("button");
		pinButton.dataset.action = "pin";
		pinButton.dataset.tabIndex = "2";
		pinButton.setClosest("tr", row2Parts.row);
		const pinEvent = createEvent(pinButton);
		const allTabs = { pinnedTabsNo: 1 };
		fixture.module.handleActionButtonClick(pinEvent, { allTabs });
		assertEquals(row2Parts.dropdownMenu.classList.contains("hidden"), true);
		assertEquals(row2Parts.pinButton.style.display, "none");
		assertEquals(row2Parts.unpinButton.style.display, "inline-block");
		assertEquals(
			row2Parts.dragWrapperCell.classList.contains("pin-tab"),
			true,
		);
		assertEquals(allTabs.pinnedTabsNo, 2);

		const unpinButton = new ManageElement("button");
		unpinButton.dataset.action = "unpin";
		unpinButton.dataset.tabIndex = "1";
		unpinButton.setClosest("tr", row2Parts.row);
		fixture.module.handleActionButtonClick(
			createEvent(unpinButton),
			{ allTabs },
		);
		assertEquals(row2Parts.pinButton.style.display, "inline-block");
		assertEquals(row2Parts.unpinButton.style.display, "none");
		assertEquals(
			row2Parts.dragWrapperCell.classList.contains("pin-tab"),
			false,
		);
		assertEquals(allTabs.pinnedTabsNo, 1);

		const removeButton = new ManageElement("button");
		removeButton.dataset.action = "remove";
		removeButton.dataset.tabIndex = "0";
		removeButton.setClosest("tr", row0Parts.row);
		fixture.module.handleActionButtonClick(
			createEvent(removeButton),
			{ allTabs },
		);
		assertEquals(tbody.children.length, 2);
		assertEquals(deleteAllButton.attributes.has("disabled"), false);

		const removeLastButton = new ManageElement("button");
		removeLastButton.dataset.action = "remove";
		removeLastButton.dataset.tabIndex = "1";
		removeLastButton.setClosest("tr", row1Parts.row);
		fixture.module.handleActionButtonClick(
			createEvent(removeLastButton),
			{ allTabs },
		);
		assertEquals(
			deleteAllButton.attributes.get("disabled"),
			true as unknown as string,
		);

		const unknownButton = new ManageElement("button");
		unknownButton.dataset.action = "unknown";
		unknownButton.dataset.tabIndex = "0";
		unknownButton.setClosest("tr", row2Parts.row);
		fixture.module.handleActionButtonClick(
			createEvent(unknownButton),
			{ allTabs },
		);
		assertEquals(row2Parts.dropdownMenu.classList.contains("hidden"), true);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs confirms unsaved opens, falls back to the last row, and moves unpinned rows", async () => {
	const fixture = await loadManageTabs();
	const closeButton = new ManageElement("button");
	let closeClicks = 0;
	closeButton.addEventListener("click", () => {
		closeClicks++;
	});
	const tbody = new ManageTbody();
	const row0 = createRow(0).row;
	const row1 = createRow(1).row;
	const row2 = createRow(2).row;
	for (const row of [row0, row1, row2]) {
		tbody.appendChild(row);
	}
	const managedLoggers = createManagedLoggers([row0, row1, row2]);
	fixture.module.__setState({
		closeButton,
		managedLoggers,
		wasSomethingUpdated: true,
	});

	try {
		fixture.confirmResult.value = false;
		await fixture.module.checkOpenAskConfirm(
			createEvent(new ManageElement("button")),
		);
		assertEquals(fixture.lightningClicks.value, 0);
		assertEquals(closeClicks, 0);

		fixture.confirmResult.value = true;
		await fixture.module.checkOpenAskConfirm(
			createEvent(new ManageElement("button")),
		);
		assertEquals(fixture.lightningClicks.value, 1);
		assertEquals(closeClicks, 1);

		fixture.module.updateTabAttributes({
			enable: false,
			tabAppendElement: tbody,
		});
		assertEquals(row2.attributes.has("draggable"), false);
		assertEquals(
			row2.querySelector("td:has(> svg)")?.dataset.draggable,
			false as unknown as string,
		);

		fixture.module.moveTrToGivenIndex({
			currentIndex: 0,
			currentlyPinnedNo: 2,
			isPinning: false,
			tabAppendElement: tbody,
			trToMove: row0,
		});
		assertEquals(tbody.children[0], row1);
		assertEquals(tbody.children[1], row0);
		assertEquals(tbody.children[2], row2);
		assertEquals(row0.dataset.rowIndex, 1 as unknown as string);
		assertEquals(
			fixture.module.__getState().managedLoggers[1].label.closest("tr"),
			row0,
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs closes dropdowns and removes empty rows from drag listeners", async () => {
	const fixture = await loadManageTabs();
	const visibleMenu = new ManageElement("div");
	const otherMenu = new ManageElement("div");
	const owningButton = new ManageElement("button");
	const otherButton = new ManageElement("button");
	const owner = new ManageElement("div");
	const otherOwner = new ManageElement("div");
	owner.setQueryResult("[data-name=dropdownButton]", owningButton);
	otherOwner.setQueryResult("[data-name=dropdownButton]", otherButton);
	visibleMenu.parentNode = owner;
	otherMenu.parentNode = otherOwner;
	visibleMenu.classList.add("menu-open");
	otherMenu.classList.add("menu-open");
	fixture.module.__setState({ dropdownMenus: [visibleMenu, otherMenu] });

	const tbody = new ManageTbody();
	const row0 = createRow(0).row;
	const row1 = createRow(1).row;
	tbody.appendChild(row0);
	tbody.appendChild(row1);
	const managedLoggers = createManagedLoggers([row0, row1]);
	const deleteAllButton = new ManageElement("button");
	createArticleFixture(tbody, row1);
	fixture.module.__setState({
		deleteAllButton,
		focusedIndex: 0,
		managedLoggers,
	});

	try {
		fixture.module.closeDropdownOnTrClick(
			createEvent(new ManageElement("tr"), new ManageElement("button")),
			owningButton,
		);
		assertEquals(visibleMenu.classList.contains("hidden"), false);

		fixture.module.closeDropdownOnTrClick(
			createEvent(new ManageElement("tr"), new ManageElement("td")),
			owningButton,
		);
		assertEquals(visibleMenu.classList.contains("hidden"), true);

		visibleMenu.classList.remove("hidden");
		otherMenu.classList.remove("hidden");
		fixture.module.closeDropdownOnBtnClick(
			createEvent(owningButton, new ManageElement("span")),
			owningButton,
		);
		assertEquals(otherMenu.classList.contains("hidden"), false);

		fixture.module.closeDropdownOnBtnClick(
			createEvent(owningButton),
			owningButton,
		);
		assertEquals(visibleMenu.classList.contains("hidden"), false);
		assertEquals(otherMenu.classList.contains("hidden"), true);

		let inputCalls = 0;
		fixture.module.setInfoForDrag(managedLoggers[0].label, () => {
			inputCalls++;
		}, 0);
		managedLoggers[0].label.dispatchEvent(
			createEvent(
				managedLoggers[0].label,
				managedLoggers[0].label,
				"input",
			),
		);
		managedLoggers[0].label.dispatchEvent(
			createEvent(
				managedLoggers[0].label,
				managedLoggers[0].label,
				"focusin",
			),
		);
		assertEquals(inputCalls, 1);
		assertEquals(fixture.module.__getState().focusedIndex, 0);

		managedLoggers[0].label.value = "";
		managedLoggers[0].url.value = "";
		await managedLoggers[0].label.dispatchEvent(
			createEvent(
				managedLoggers[0].label,
				managedLoggers[0].label,
				"focusout",
			),
		);
		assertEquals(tbody.children.length, 1);
		assertEquals(row1.attributes.has("draggable"), false);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs adds and removes rows through internal helpers", async () => {
	const fixture = await loadManageTabs();
	const tbody = new ManageTbody();
	const row0Parts = createRow(0);
	tbody.appendChild(row0Parts.row);
	const managedLoggers = createManagedLoggers([row0Parts.row]);
	const deleteAllButton = new ManageElement("button");
	const previousAction = new ManageElement("a");
	previousAction.dataset.action = "unknown";
	previousAction.dataset.tabIndex = "0";
	previousAction.setClosest("tr", row0Parts.row);
	fixture.module.__setState({
		actionButtons: [previousAction],
		deleteAllButton,
		dropdownMenus: [row0Parts.dropdownMenu],
		managedLoggers,
		trsAndButtons: [{
			button: row0Parts.dropdownButton,
			tr: row0Parts.row,
		}],
	});
	createArticleFixture(tbody, row0Parts.row);

	fixture.createManageTabRowResult.current = () => {
		const row1Parts = createRow(1);
		const [logger] = createManagedLoggers([row1Parts.row]);
		const newAction = new ManageElement("a");
		newAction.dataset.action = "unknown";
		row1Parts.row.setQueryResults("[data-action]", [newAction]);
		return Promise.resolve({
			dropdownButton: row1Parts.dropdownButton,
			dropdownMenu: row1Parts.dropdownMenu,
			logger,
			tr: row1Parts.row,
		});
	};

	try {
		await assertRejects(
			() => fixture.module.addTr(),
			Error,
			"error_required_params",
		);
		await fixture.module.addTr(tbody);
		assertEquals(tbody.children.length, 2);
		assertEquals(fixture.module.__getState().managedLoggers.length, 2);
		assertEquals(fixture.module.__getState().trsAndButtons.length, 2);

		row0Parts.dropdownMenu.classList.remove("hidden");
		row0Parts.row.dispatchEvent(
			createEvent(row0Parts.row, new ManageElement("td")),
		);
		assertEquals(row0Parts.dropdownMenu.classList.contains("hidden"), true);

		row0Parts.dropdownMenu.classList.remove("hidden");
		row0Parts.dropdownButton.dispatchEvent(
			createEvent(row0Parts.dropdownButton),
		);
		assertEquals(row0Parts.dropdownMenu.classList.contains("hidden"), true);

		await previousAction.dispatchEvent(createEvent(previousAction));
		assertEquals(row0Parts.dropdownMenu.classList.contains("hidden"), true);

		const newLogger = fixture.module.__getState().managedLoggers[1];
		newLogger.last_input = { label: "", org: "org", url: "" };
		newLogger.url.value = "listener-url";
		tbody.setQueryResults("tr input.url", [newLogger.url]);
		newLogger.url.dispatchEvent(
			createEvent(newLogger.url, newLogger.url, "focusin"),
		);
		newLogger.url.dispatchEvent(
			createEvent(newLogger.url, newLogger.url, "input"),
		);
		assertEquals(newLogger.url.value, "min:listener-url");

		await assertRejects(
			() => fixture.module.removeTr(),
			Error,
			"error_required_params",
		);
		await fixture.module.removeTr(new ManageTbody());
		fixture.allTabs.pinnedTabsNo = 1;
		await fixture.module.removeTr(tbody, row0Parts.row, 0);
		assertEquals(tbody.children.length, 1);
		assertEquals(fixture.allTabs.pinnedTabsNo, 0);
		assertEquals(fixture.module.__getState().managedLoggers.length, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs checks duplicates, updates links, and handles input bookkeeping", async () => {
	const fixture = await loadManageTabs();
	const tbody = new ManageTbody();
	const row0Parts = createRow(0);
	const row1Parts = createRow(1);
	const row2Parts = createRow(2);
	for (const row of [row0Parts.row, row1Parts.row, row2Parts.row]) {
		tbody.appendChild(row);
	}
	const managedLoggers = createManagedLoggers([
		row0Parts.row,
		row1Parts.row,
		row2Parts.row,
	]);
	const hideButton = new ManageElement("button");
	hideButton.setAttribute("disabled", "true");
	const deleteAllButton = new ManageElement("button");
	fixture.module.__setState({
		deleteAllButton,
		focusedIndex: 0,
		manageTabsButtons: { hide: hideButton },
		managedLoggers,
		trsAndButtons: [{
			button: row0Parts.dropdownButton,
			tr: row0Parts.row,
		}],
	});
	createArticleFixture(tbody, row0Parts.row);
	tbody.setQueryResults("tr input.url", [
		managedLoggers[0].url,
		managedLoggers[1].url,
	]);
	managedLoggers[0].url.value = "duplicate-url";
	managedLoggers[1].url.value = "duplicate-url";

	fixture.createManageTabRowResult.current = () => {
		const row3Parts = createRow(3);
		const [logger] = createManagedLoggers([row3Parts.row]);
		row3Parts.row.setQueryResults("[data-action]", []);
		return Promise.resolve({
			dropdownButton: row3Parts.dropdownButton,
			dropdownMenu: row3Parts.dropdownMenu,
			logger,
			tr: row3Parts.row,
		});
	};

	try {
		await fixture.module.checkDuplicates(
			{ org: "org-a", url: "duplicate-url" },
			{ tabAppendElement: tbody },
		);
		assertEquals(fixture.toasts.length, 0);

		fixture.duplicateExists.value = true;
		await fixture.module.checkDuplicates(
			{ org: "org-a", url: "duplicate-url" },
			{ tabAppendElement: tbody },
		);
		assertEquals(fixture.toasts.at(-1), {
			message: "error_tab_url_saved",
			status: "warning",
		});
		assertEquals(fixture.duplicateUrls.at(-1), "duplicate-url");
		assertEquals(row0Parts.row.classList.contains("duplicate"), true);
		assertEquals(fixture.timeoutWaits.at(-1), 4000);
		fixture.timeouts.at(-1)?.();
		assertEquals(row0Parts.row.classList.contains("duplicate"), false);
		fixture.duplicateExists.value = false;

		assertThrows(
			() => fixture.module.performAfterChecks(),
			Error,
			"error_required_params",
		);
		fixture.module.performAfterChecks(
			{ org: "", url: "" },
			{ tabAppendElement: tbody, tr: row0Parts.row },
		);
		assertEquals(
			(row0Parts.row.querySelector("[data-action=open]") as
				& ManageElement
				& { href?: string }).href,
			"#",
		);

		fixture.currentHref.value = "current-org";
		fixture.module.performAfterChecks(
			{ org: "saved-org", url: "saved-url" },
			{ tabAppendElement: tbody, tr: row0Parts.row },
		);
		assertEquals(
			(row0Parts.row.querySelector("[data-action=open]") as
				& ManageElement
				& { href?: string }).href,
			"current-org::saved-url::saved-org",
		);

		assertRejects(
			async () => await fixture.module.trInputListener(),
			Error,
			"error_required_params",
		);
		managedLoggers[0].last_input = {
			label: "",
			org: "saved-org",
			url: "old",
		};
		managedLoggers[0].url.value = "long-value";
		fixture.module.trInputListener({
			tabAppendElement: tbody,
			type: "url",
		});
		assertEquals(managedLoggers[0].url.value, "min:long-value");
		assertEquals(
			(managedLoggers[0].last_input as Record<string, string>).url,
			"min:long-value",
		);
		assertEquals(fixture.module.__getState().wasSomethingUpdated, true);

		row0Parts.row.dataset.isThisOrgTab = "true";
		(managedLoggers[0].last_input as Record<string, string>).url =
			"saved-url";
		managedLoggers[0].org.value = "external-org";
		fixture.module.trInputListener({
			tabAppendElement: tbody,
			type: "org",
		});
		assertEquals(managedLoggers[0].org.value, "external-org");
		assertEquals(
			row0Parts.row.dataset.isThisOrgTab,
			false as unknown as string,
		);
		assertEquals(hideButton.attributes.has("disabled"), false);

		managedLoggers[0].label.value = "Tab label";
		fixture.module.trInputListener({
			tabAppendElement: tbody,
			type: "label",
		});
		assertEquals(
			(managedLoggers[0].last_input as Record<string, string>).label,
			"Tab label",
		);

		fixture.module.__setState({
			focusedIndex: 2,
			managedLoggers,
		});
		managedLoggers[2].last_input = {};
		managedLoggers[2].label.value = "Fresh label";
		fixture.module.trInputListener({
			tabAppendElement: tbody,
			type: "label",
		});
		assertEquals(
			(managedLoggers[2].last_input as Record<string, string>).label,
			"Fresh label",
		);

		await assertRejects(
			() => fixture.module.checkAddRemoveLastTr(),
			Error,
			"error_required_params",
		);
		const addTbody = new ManageTbody();
		const previousRowParts = createRow(9);
		createArticleFixture(addTbody);
		fixture.module.__setState({
			actionButtons: [],
			dropdownMenus: [],
			focusedIndex: 0,
			managedLoggers: [managedLoggers[0]],
			trsAndButtons: [{
				button: previousRowParts.dropdownButton,
				tr: previousRowParts.row,
			}],
		});
		await fixture.module.checkAddRemoveLastTr({
			inputObj: { label: "new", url: "url" },
			tabAppendElement: addTbody,
		});
		assertEquals(addTbody.children.length, 1);

		fixture.module.__setState({
			focusedIndex: 2,
			managedLoggers,
			trsAndButtons: [{
				button: row2Parts.dropdownButton,
				tr: row2Parts.row,
			}],
		});
		fixture.module.__setState({
			focusedIndex: 1,
		});
		await fixture.module.checkAddRemoveLastTr({
			inputObj: { label: "present", url: "" },
			tabAppendElement: tbody,
		});
		assertEquals(tbody.children.length, 3);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs reduces loggers, reorders rows, and saves managed tabs", async () => {
	const fixture = await loadManageTabs();
	const tbody = new ManageTbody();
	const rows = [createRow(0).row, createRow(1).row, createRow(2).row];
	for (const row of rows) {
		tbody.appendChild(row);
	}
	const managedLoggers = createManagedLoggers(rows);
	managedLoggers[0].label.value = "Label 0";
	managedLoggers[0].url.value = "Url 0";
	managedLoggers[0].org.value = "Org 0";
	managedLoggers[1].label.value = "Label 1";
	managedLoggers[1].url.value = "Url 1";
	managedLoggers[1].org.value = "Org 1";
	fixture.module.__setState({ managedLoggers });
	fixture.documentQuery.current = tbody;

	try {
		assertEquals(fixture.module.reduceLoggersToElements().length, 9);

		fixture.module.reorderTabsTable({ fromIndex: 2, toIndex: 0 });
		assertEquals(
			fixture.module.__getState().managedLoggers[0].label.closest("tr"),
			rows[2],
		);
		assertEquals(fixture.module.__getState().manageInvalidateSort, true);
		assertEquals(
			fixture.documentEvents.includes("reordered-tabs-table"),
			true,
		);

		await fixture.module.readManagedTabsAndSave({
			tbody,
			allTabs: fixture.allTabs,
		});
		assertEquals(fixture.replaceTabsCalls.length, 1);
		assertEquals(fixture.replaceTabsCalls[0].tabs.length, 2);
		assertEquals(fixture.replaceTabsCalls[0].options.invalidateSort, true);
		assertEquals(fixture.sfAfterSetCalls.length, 1);

		fixture.replacedTabsResult.value = false;
		await fixture.module.readManagedTabsAndSave();
		assertEquals(fixture.toasts.at(-1), {
			message: "error_processing_tabs",
			status: "error",
		});
	} finally {
		fixture.cleanup();
	}
});

Deno.test("manageTabs creates the modal and wires its listeners", async () => {
	const fixture = await loadManageTabs();
	const row0Parts = createRow(0);
	const row1Parts = createRow(1);
	const row2Parts = createRow(2);
	const tbody = new ManageTbody();
	for (const row of [row0Parts.row, row1Parts.row, row2Parts.row]) {
		tbody.appendChild(row);
	}
	const loggers = createManagedLoggers([
		row0Parts.row,
		row1Parts.row,
		row2Parts.row,
	]);
	loggers[0].label.value = "Label 0";
	loggers[0].url.value = "Url 0";
	loggers[0].org.value = "Org 0";
	loggers[1].label.value = "Label 1";
	loggers[1].url.value = "Url 1";
	loggers[1].org.value = "Org 1";
	const actionButton = new ManageElement("a");
	actionButton.dataset.action = "open";
	const buttonContainer = new ManageElement("div");
	const showButton = new ManageElement("button");
	const hideButton = new ManageElement("button");
	buttonContainer.setQueryResult(".show_all_tabs", showButton);
	buttonContainer.setQueryResult(".hide_other_org_tabs", hideButton);
	const saveButton = new ManageElement("button");
	saveButton.setClosest("div", buttonContainer);
	const closeButton = new ManageElement("button");
	const deleteAllTabsButton = new ManageElement("button");
	const modalParent = new ManageElement("section");
	const { article } = createArticleFixture(tbody, row0Parts.row);
	modalParent.setQueryResult("article", article);
	modalParent.setQueryResults("[data-action]", [actionButton]);
	const trsAndButtons = [
		{ button: row0Parts.dropdownButton, tr: row0Parts.row },
		{ button: row1Parts.dropdownButton, tr: row1Parts.row },
		{ button: row2Parts.dropdownButton, tr: row2Parts.row },
	];
	const dropdownMenus = [
		row0Parts.dropdownMenu,
		row1Parts.dropdownMenu,
		row2Parts.dropdownMenu,
	];
	fixture.documentById.current = new ManageElement("div");
	fixture.generateManageTabsModalResult.current = () =>
		Promise.resolve({
			closeButton,
			deleteAllTabsButton,
			dropdownMenus,
			loggers,
			modalParent,
			saveButton,
			tbody,
			trsAndButtons,
		});

	try {
		await fixture.module.createManageTabsModal();
		assertEquals(fixture.toasts.at(-1), {
			message: "error_close_other_modal",
			status: "error",
		});

		fixture.documentById.current = null;
		await fixture.module.createManageTabsModal();
		assertEquals(fixture.ensureAllTabsCalls.at(-1), { reset: true });
		assertEquals(fixture.hanger.children[0], modalParent);
		assertEquals(
			fixture.module.__getState().manageTabsButtons.hide,
			hideButton,
		);
		assertEquals(fixture.setupDragForTableCallbacks.length, 1);
		assertEquals(
			fixture.documentEvents.includes("create-manage-tabs"),
			true,
		);

		tbody.setQueryResults("tr input.url", [loggers[2].url]);
		loggers[2].last_input = { label: "", org: "Org 2", url: "" };
		loggers[2].url.value = "modal-url";
		loggers[2].url.dispatchEvent(
			createEvent(loggers[2].url, loggers[2].url, "focusin"),
		);
		loggers[2].url.dispatchEvent(
			createEvent(loggers[2].url, loggers[2].url, "input"),
		);
		assertEquals(loggers[2].url.value, "min:modal-url");

		await actionButton.click();
		assertEquals(fixture.lightningClicks.value, 1);
		assertEquals(fixture.setupDragForUlCalls.value, 1);
		assertEquals(
			fixture.documentEvents.includes("close-manage-tabs"),
			true,
		);

		fixture.setupDragForTableCallbacks[0]({ fromIndex: 1, toIndex: 0 });
		assertEquals(
			fixture.documentEvents.includes("reordered-tabs-table"),
			true,
		);

		row1Parts.dropdownMenu.classList.remove("hidden");
		row1Parts.row.dispatchEvent(
			createEvent(row1Parts.row, new ManageElement("td")),
		);
		assertEquals(row1Parts.dropdownMenu.classList.contains("hidden"), true);

		row0Parts.dropdownMenu.classList.remove("hidden");
		row1Parts.dropdownMenu.classList.remove("hidden");
		row0Parts.dropdownButton.dispatchEvent(
			createEvent(row0Parts.dropdownButton),
		);
		assertEquals(row1Parts.dropdownMenu.classList.contains("hidden"), true);

		await saveButton.click();
		assertEquals(fixture.replaceTabsCalls.at(-1)?.tabs.length, 2);
		assertEquals(fixture.module.__getState().managedLoggers.length, 0);

		deleteAllTabsButton.click();
		assertEquals(tbody.children.length, 1);
		assertEquals(
			deleteAllTabsButton.attributes.get("disabled"),
			true as unknown as string,
		);
	} finally {
		fixture.cleanup();
	}
});
