import { assert, assertEquals, assertThrows } from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

const MODULE_PATH = new URL(
	"../../../src/salesforce/favourite-manager.js",
	import.meta.url,
);
const MODULE_SOURCE_LINE_MAP = (await Deno.readTextFile(MODULE_PATH))
	.split("\n")
	.map((_line, index) => index + 1);
const HEADER_SELECTOR_BASE =
	"div.tabsetBody.main-content.mainContentMark.fullheight.active.isSetupApp > div.split-right > section.tabContent.oneConsoleTab.active div.overflow.uiBlock";

type Command = {
	name: string;
	shortcut: string | null;
};

type FavouriteActionPayload = {
	label?: string;
	org?: string;
	url: string;
};

type FavouriteActionCall = {
	action: string;
	options?: {
		addInFront: boolean;
	};
	payload: FavouriteActionPayload;
};

type FavouriteManagerModule = {
	FAVOURITE_BUTTON_ID: string;
	SLASHED_STAR_ID: string;
	STAR_ID: string;
	actionFavourite: () => Promise<void>;
	addTab: (url: string) => Promise<void>;
	createStarSvg: (
		options?: { alt?: string | null; id?: string | null },
		slashed?: boolean,
	) => Element;
	generateFavouriteButton: () => Promise<HTMLElement>;
	getFavouriteImage: (
		favouriteId: string | null,
		button?: HTMLElement | null,
	) => HTMLElement | null;
	pageActionTab: (save?: boolean) => void;
	showFavouriteButton: (count?: number) => Promise<number | void>;
	toggleFavouriteButton: (
		isSaved?: boolean | null,
		button?: HTMLElement | null,
	) => void;
};

type SettingsEntry = {
	enabled: boolean;
	id: string;
};

type TabList = {
	existsWithOrWithoutOrg: (tab: { org: string; url: string }) => boolean;
	getSingleTabByData: (
		tab: { org: string; url: string },
	) => FavouriteActionPayload;
};

type FavouriteManagerDependencies = {
	CMD_REMOVE_TAB: string;
	CMD_SAVE_AS_TAB: string;
	CXM_REMOVE_TAB: string;
	EXTENSION_LABEL: string;
	EXTENSION_NAME: string;
	HIDDEN_CLASS: string;
	SALESFORCE_SETUP_HOME_MINI: string;
	SKIP_LINK_DETECTION: string;
	TAB_ADD_FRONT: string;
	TAB_AS_ORG: string;
	TOAST_INFO: string;
	TOAST_WARNING: string;
	TUTORIAL_EVENT_ACTION_FAVOURITE: string;
	TUTORIAL_EVENT_ACTION_UNFAVOURITE: string;
	WHAT_ADD: string;
	WHAT_GET_COMMANDS: string;
	Tab: {
		containsSalesforceId: (href: string) => boolean;
		extractOrgName: (href: string) => string;
		minifyURL: (href: string) => string;
	};
	ensureAllTabsAvailability: () => Promise<TabList>;
	ensureTranslatorAvailability: () => Promise<{
		translate: (key: string) => Promise<string>;
	}>;
	getCurrentHref: () => string;
	getIsCurrentlyOnSavedTab: () => boolean | null;
	getSettings: (keys: string[]) => Promise<SettingsEntry[] | null>;
	getWasOnSavedTab: () => boolean | null;
	injectStyle: (id: string, options: { css: string }) => HTMLElement;
	isOnSavedTab: () => Promise<void>;
	performActionOnTabs: (
		action: string,
		payload: FavouriteActionPayload,
		options?: { addInFront: boolean },
	) => Promise<void>;
	sendExtensionMessage: (message: {
		commands: string[];
		what: string;
	}) => Promise<Command[]>;
	showToast: (message: string, status: string) => void;
};

type LoadFavouriteManagerOptions = {
	commands?: Command[];
	currentHref?: string;
	existsWithOrWithoutOrg?: boolean;
	getSingleTabByDataError?: Error | null;
	headerPresent?: boolean;
	isCurrentlyOnSavedTab?: boolean | null;
	minifiedUrl?: string;
	settings?: SettingsEntry[] | null;
	tabContainsSalesforceId?: boolean;
	wasOnSavedTab?: boolean | null;
};

type TimeoutCall = {
	callback: () => void;
	delay: number;
};

type ToastCall = {
	message: string;
	status: string;
};

type StyledElement = Element & {
	style: CSSStyleDeclaration;
};

type FavouriteManagerFixture = {
	breadcrumb: HTMLElement;
	cleanup: () => void;
	errorCalls: string[];
	existsCalls: Array<{ org: string; url: string }>;
	getSingleTabByDataCalls: Array<{ org: string; url: string }>;
	header: HTMLElement;
	injectStyleCalls: Array<{ css: string; id: string }>;
	isOnSavedTabCalls: { value: number };
	module: FavouriteManagerModule;
	performActionCalls: FavouriteActionCall[];
	sendMessageCalls: Array<{ commands: string[]; what: string }>;
	timeoutCalls: TimeoutCall[];
	toasts: ToastCall[];
	translationCalls: string[];
	warnCalls: string[];
};

/**
 * Returns the exact selector string used by `getHeader()`.
 *
 * @param {string} innerElement Inner selector suffix.
 * @return {string} Full selector string.
 */
function createHeaderSelector(innerElement: string) {
	return `${HEADER_SELECTOR_BASE} ${innerElement}`;
}

/**
 * Loads favourite-manager.js with isolated dependencies and a small DOM harness.
 *
 * @param {LoadFavouriteManagerOptions} [options={}] Fixture configuration.
 * @return {Promise<FavouriteManagerFixture>} Loaded fixture.
 */
async function loadFavouriteManagerFixture(
	{
		commands = [],
		currentHref =
			"https://acme.lightning.force.com/lightning/setup/Users/home",
		existsWithOrWithoutOrg = false,
		getSingleTabByDataError = null,
		headerPresent = true,
		isCurrentlyOnSavedTab = false,
		minifiedUrl = "Users/home",
		settings = [],
		tabContainsSalesforceId = true,
		wasOnSavedTab = false,
	}: LoadFavouriteManagerOptions = {},
) {
	const dom = installMockDom(currentHref);
	const { document } = globalThis;
	const header = document.createElement("div");
	const breadcrumb = document.createElement("div");
	breadcrumb.classList.add("breadcrumbDetail");
	breadcrumb.innerText = "Users";
	header.appendChild(breadcrumb);
	document.body.appendChild(header);

	const originalQuerySelector = document.querySelector.bind(document);
	document.querySelector = ((selector: string) => {
		if (selector === createHeaderSelector("div.bRight")) {
			return headerPresent ? header : null;
		}
		if (selector === createHeaderSelector(".breadcrumbDetail")) {
			return breadcrumb;
		}
		return originalQuerySelector(selector);
	}) as typeof document.querySelector;

	const performActionCalls: FavouriteActionCall[] = [];
	const sendMessageCalls: Array<{ commands: string[]; what: string }> = [];
	const timeoutCalls: TimeoutCall[] = [];
	const toasts: ToastCall[] = [];
	const translationCalls: string[] = [];
	const injectStyleCalls: Array<{ css: string; id: string }> = [];
	const warnCalls: string[] = [];
	const errorCalls: string[] = [];
	const existsCalls: Array<{ org: string; url: string }> = [];
	const getSingleTabByDataCalls: Array<{ org: string; url: string }> = [];
	const isOnSavedTabCalls = { value: 0 };

	const globals = {
		BUTTON_ID: "awsf-button",
		console: {
			error: (message: string) => {
				errorCalls.push(message);
			},
			warn: (message: Error | string) => {
				warnCalls.push(String(message));
			},
		},
		setTimeout: (callback: () => void, delay: number) => {
			timeoutCalls.push({ callback, delay });
			return timeoutCalls.length;
		},
	};

	const { cleanup, module } = await loadIsolatedModule<
		FavouriteManagerModule,
		FavouriteManagerDependencies
	>({
		modulePath: MODULE_PATH,
		additionalExports: [
			"actionFavourite",
			"addTab",
			"createStarSvg",
			"generateFavouriteButton",
			"getFavouriteImage",
			"toggleFavouriteButton",
		],
		dependencies: {
			CMD_REMOVE_TAB: "cmd_remove_tab",
			CMD_SAVE_AS_TAB: "cmd_save_as_tab",
			CXM_REMOVE_TAB: "cxm_remove_tab",
			EXTENSION_LABEL: "AWSF",
			EXTENSION_NAME: "awsf",
			HIDDEN_CLASS: "hidden",
			SALESFORCE_SETUP_HOME_MINI: "SetupOneHome/home",
			SKIP_LINK_DETECTION: "skip_link_detection",
			TAB_ADD_FRONT: "tab_add_front",
			TAB_AS_ORG: "tab_as_org",
			TOAST_INFO: "info",
			TOAST_WARNING: "warning",
			TUTORIAL_EVENT_ACTION_FAVOURITE: "tutorial:favourite",
			TUTORIAL_EVENT_ACTION_UNFAVOURITE: "tutorial:unfavourite",
			WHAT_ADD: "add",
			WHAT_GET_COMMANDS: "get_commands",
			Tab: {
				containsSalesforceId: (_href) => tabContainsSalesforceId,
				extractOrgName: (href) => `org:${href}`,
				minifyURL: (_href) => minifiedUrl,
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					existsWithOrWithoutOrg: (tab) => {
						existsCalls.push(tab);
						return existsWithOrWithoutOrg;
					},
					getSingleTabByData: (tab) => {
						getSingleTabByDataCalls.push(tab);
						if (getSingleTabByDataError != null) {
							throw getSingleTabByDataError;
						}
						return {
							label: "Saved Tab",
							org: tab.org,
							url: tab.url,
						};
					},
				}),
			ensureTranslatorAvailability: () =>
				Promise.resolve({
					translate: (key) => {
						translationCalls.push(key);
						return Promise.resolve(`translated:${key}`);
					},
				}),
			getCurrentHref: () => currentHref,
			getIsCurrentlyOnSavedTab: () => isCurrentlyOnSavedTab,
			getSettings: (_keys) => Promise.resolve(settings),
			getWasOnSavedTab: () => wasOnSavedTab,
			injectStyle: (id, options) => {
				injectStyleCalls.push({ css: options.css, id });
				const style = document.createElement("style");
				style.id = id;
				style.textContent = options.css;
				return style;
			},
			isOnSavedTab: () => {
				isOnSavedTabCalls.value++;
				return Promise.resolve();
			},
			performActionOnTabs: (action, payload, options) => {
				performActionCalls.push({ action, options, payload });
				return Promise.resolve();
			},
			sendExtensionMessage: (message) => {
				sendMessageCalls.push(message);
				return Promise.resolve(commands);
			},
			showToast: (message, status) => {
				toasts.push({ message, status });
			},
		},
		globals,
		importsToReplace: new Set([
			"/core/constants.js",
			"/core/functions.js",
			"/core/tab.js",
			"/core/tabContainer.js",
			"/core/translator.js",
			"./content.js",
		]),
		sourceMapLineMap: MODULE_SOURCE_LINE_MAP,
	});

	return {
		breadcrumb,
		cleanup: () => {
			cleanup();
			dom.cleanup();
		},
		errorCalls,
		existsCalls,
		getSingleTabByDataCalls,
		header,
		injectStyleCalls,
		isOnSavedTabCalls,
		module,
		performActionCalls,
		sendMessageCalls,
		timeoutCalls,
		toasts,
		translationCalls,
		warnCalls,
	};
}

/**
 * Creates a generated favourite button and appends it to the provided parent.
 *
 * @param {FavouriteManagerFixture} fixture Loaded fixture.
 * @param {HTMLElement} parent Parent element receiving the button.
 * @return {Promise<HTMLElement>} Created favourite button.
 */
async function appendGeneratedButton(
	fixture: FavouriteManagerFixture,
	parent: HTMLElement,
) {
	const button = await fixture.module.generateFavouriteButton();
	parent.appendChild(button);
	return button;
}

/**
 * Invokes a registered event listener and awaits async handlers.
 *
 * @param {EventListenerOrEventListenerObject} listener Registered listener.
 * @param {EventTarget} target Event target bound as `this`.
 * @return {Promise<void>} Promise resolved after the listener completes.
 */
async function invokeEventListener(
	listener: EventListenerOrEventListenerObject,
	target: EventTarget,
) {
	const event = new Event("click");
	if (typeof listener === "function") {
		await listener.call(target, event);
		return;
	}
	await listener.handleEvent(event);
}

Deno.test("favourite-manager creates regular and slashed star svgs", async () => {
	const fixture = await loadFavouriteManagerFixture();

	try {
		const regularStar = fixture.module.createStarSvg({}, false);
		const slashedStar = fixture.module.createStarSvg(
			{ alt: "label", id: "star-id" },
			true,
		);
		const regularPath = regularStar.querySelector("path") as
			| StyledElement
			| null;
		const slashedPath = slashedStar.querySelector("path") as
			| StyledElement
			| null;

		assertEquals(regularStar.getAttribute("viewBox"), "0 0 24 24");
		assertEquals(regularStar.getAttribute("id"), null);
		assertEquals(
			regularPath?.style.stroke,
			"#00a1e0",
		);
		assertEquals(
			regularPath?.style.fill,
			"transparent",
		);
		assertEquals(
			regularPath?.getAttribute("stroke-linecap"),
			"round",
		);
		assertEquals(slashedStar.id, "star-id");
		assertEquals(
			(slashedStar as HTMLElement & { alt?: string }).alt,
			"label",
		);
		assertEquals(slashedStar.getAttribute("viewBox"), "0 0 56 56");
		assertEquals(
			slashedPath?.style.fill,
			"#00a1e0",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager generates the button markup with shortcut labels", async () => {
	const fixture = await loadFavouriteManagerFixture({
		commands: [
			{ name: "cmd_save_as_tab", shortcut: "Ctrl+S" },
			{ name: "ignored", shortcut: "Ctrl+I" },
			{ name: "cmd_remove_tab", shortcut: "Ctrl+R" },
		],
	});

	try {
		const button = await fixture.module.generateFavouriteButton();
		const assistiveText = button.querySelector(".slds-assistive-text");
		const star = button.querySelector(`#${fixture.module.STAR_ID}`);
		const slashedStar = button.querySelector(
			`#${fixture.module.SLASHED_STAR_ID}`,
		);

		assertEquals(fixture.sendMessageCalls, [{
			commands: ["cmd_save_as_tab", "cmd_remove_tab"],
			what: "get_commands",
		}]);
		assertEquals(fixture.translationCalls, ["save_tab", "remove_tab"]);
		assertEquals(button.id, fixture.module.FAVOURITE_BUTTON_ID);
		assertEquals(button.getAttribute("aria-live"), "off");
		assertEquals(
			button.getAttribute("aria-label"),
			"translated:save_tab (Ctrl+S)",
		);
		assertEquals(
			button.dataset.saveAssistiveText,
			"translated:save_tab (Ctrl+S)",
		);
		assertEquals(
			button.dataset.removeAssistiveText,
			"translated:remove_tab (Ctrl+R)",
		);
		assertEquals(
			assistiveText?.textContent,
			"translated:save_tab (Ctrl+S)",
		);
		assert(star != null);
		assert(slashedStar != null);
		assert(slashedStar.classList.contains("hidden"));
		assertEquals(fixture.injectStyleCalls, [{
			css: ".hidden { display: none; }",
			id: "awsf-hidden-favman",
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager omits shortcut suffixes when commands are unavailable", async () => {
	const fixture = await loadFavouriteManagerFixture({
		commands: [],
	});

	try {
		const button = await fixture.module.generateFavouriteButton();

		assertEquals(button.dataset.saveAssistiveText, "translated:save_tab");
		assertEquals(
			button.dataset.removeAssistiveText,
			"translated:remove_tab",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager resolves favourite images from the button or the document", async () => {
	const fixture = await loadFavouriteManagerFixture();

	try {
		const button = await appendGeneratedButton(fixture, fixture.header);
		const localStar = fixture.module.getFavouriteImage(
			fixture.module.STAR_ID,
			button,
		);
		const globalSlashedStar = fixture.module.getFavouriteImage(
			fixture.module.SLASHED_STAR_ID,
		);

		assertEquals(localStar?.id, fixture.module.STAR_ID);
		assertEquals(globalSlashedStar?.id, fixture.module.SLASHED_STAR_ID);
		assertThrows(
			() => fixture.module.getFavouriteImage(null),
			Error,
			"error_missing_favourite_id",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager toggles button icons and assistive text", async () => {
	const fixture = await loadFavouriteManagerFixture();

	try {
		const button = await appendGeneratedButton(fixture, fixture.header);
		const star = button.querySelector(`#${fixture.module.STAR_ID}`);
		const slashedStar = button.querySelector(
			`#${fixture.module.SLASHED_STAR_ID}`,
		);

		fixture.module.toggleFavouriteButton(null, button);
		assert(!star?.classList.contains("hidden"));
		assert(slashedStar?.classList.contains("hidden"));

		fixture.module.toggleFavouriteButton(true, button);
		assert(star?.classList.contains("hidden"));
		assert(!slashedStar?.classList.contains("hidden"));
		assertEquals(button.getAttribute("aria-pressed"), "true");
		assertEquals(
			button.getAttribute("aria-label"),
			"translated:remove_tab",
		);

		fixture.module.toggleFavouriteButton(false, button);
		assert(!star?.classList.contains("hidden"));
		assert(slashedStar?.classList.contains("hidden"));
		assertEquals(button.getAttribute("aria-pressed"), "false");
		assertEquals(
			button.getAttribute("aria-label"),
			"translated:save_tab",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager tolerates missing favourite buttons and assistive text", async () => {
	const fixture = await loadFavouriteManagerFixture();

	try {
		const star = fixture.module.createStarSvg({
			id: fixture.module.STAR_ID,
		}, false);
		const slashedStar = fixture.module.createStarSvg(
			{ id: fixture.module.SLASHED_STAR_ID },
			true,
		);
		document.body.appendChild(star as HTMLElement);
		document.body.appendChild(slashedStar as HTMLElement);

		fixture.module.toggleFavouriteButton(true);
		assert(star.classList.contains("hidden"));
		assert(!slashedStar.classList.contains("hidden"));

		const button = document.createElement("button");
		button.id = fixture.module.FAVOURITE_BUTTON_ID;
		button.dataset.saveAssistiveText = "translated:save_tab";
		button.dataset.removeAssistiveText = "translated:remove_tab";
		button.appendChild(star as HTMLElement);
		button.appendChild(slashedStar as HTMLElement);
		document.body.appendChild(button);

		fixture.module.toggleFavouriteButton(false);
		assertEquals(button.getAttribute("aria-label"), "translated:save_tab");
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager adds a tab with org data when link detection applies", async () => {
	const fixture = await loadFavouriteManagerFixture({
		currentHref:
			"https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
		settings: null,
		tabContainsSalesforceId: true,
	});

	try {
		await fixture.module.addTab("Users/home");

		assertEquals(fixture.performActionCalls, [{
			action: "add",
			options: { addInFront: false },
			payload: {
				label: "Users",
				org: "org:https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
				url: "Users/home",
			},
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager skips org extraction when tab-as-org is off and link detection is disabled", async () => {
	const fixture = await loadFavouriteManagerFixture({
		settings: [
			{ enabled: true, id: "skip_link_detection" },
			{ enabled: false, id: "tab_as_org" },
			{ enabled: true, id: "tab_add_front" },
		],
		tabContainsSalesforceId: true,
	});

	try {
		await fixture.module.addTab("Users/home");

		assertEquals(fixture.performActionCalls, [{
			action: "add",
			options: { addInFront: true },
			payload: {
				label: "Users",
				org: undefined,
				url: "Users/home",
			},
		}]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager removes a saved favourite and dispatches the unfavourite event", async () => {
	const fixture = await loadFavouriteManagerFixture({
		currentHref:
			"https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
		isCurrentlyOnSavedTab: true,
		minifiedUrl: "Users/home",
	});
	const dispatchedEvents: string[] = [];
	document.addEventListener("tutorial:unfavourite", () => {
		dispatchedEvents.push("tutorial:unfavourite");
	});

	try {
		await fixture.module.actionFavourite();

		assertEquals(fixture.getSingleTabByDataCalls, [{
			org: "org:https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
			url: "Users/home",
		}]);
		assertEquals(fixture.performActionCalls, [{
			action: "cxm_remove_tab",
			options: undefined,
			payload: {
				label: "Saved Tab",
				org: "org:https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
				url: "Users/home",
			},
		}]);
		assertEquals(dispatchedEvents, ["tutorial:unfavourite"]);
		assertEquals(fixture.toasts, []);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager warns when removing a missing favourite fails", async () => {
	const fixture = await loadFavouriteManagerFixture({
		getSingleTabByDataError: new Error("missing"),
		isCurrentlyOnSavedTab: true,
	});
	const dispatchedEvents: string[] = [];
	document.addEventListener("tutorial:unfavourite", () => {
		dispatchedEvents.push("tutorial:unfavourite");
	});

	try {
		await fixture.module.actionFavourite();

		assertEquals(fixture.warnCalls, ["Error: missing"]);
		assertEquals(fixture.toasts, [{
			message: "error_remove_not_favourite",
			status: "warning",
		}]);
		assertEquals(dispatchedEvents, ["tutorial:unfavourite"]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager adds a new favourite and dispatches the favourite event", async () => {
	const fixture = await loadFavouriteManagerFixture({
		currentHref:
			"https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
		isCurrentlyOnSavedTab: false,
		minifiedUrl: "Users/home",
		settings: [{ enabled: true, id: "tab_add_front" }],
	});
	const dispatchedEvents: string[] = [];
	document.addEventListener("tutorial:favourite", () => {
		dispatchedEvents.push("tutorial:favourite");
	});

	try {
		await fixture.module.actionFavourite();

		assertEquals(fixture.performActionCalls, [{
			action: "add",
			options: { addInFront: true },
			payload: {
				label: "Users",
				org: "org:https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
				url: "Users/home",
			},
		}]);
		assertEquals(dispatchedEvents, ["tutorial:favourite"]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager schedules retries for missing headers and logs hard failures", async () => {
	const retryFixture = await loadFavouriteManagerFixture({
		headerPresent: false,
	});

	try {
		const result = await retryFixture.module.showFavouriteButton(2);

		assertEquals(result, 1);
		assertEquals(retryFixture.timeoutCalls.length, 1);
		assertEquals(retryFixture.timeoutCalls[0].delay, 500);
	} finally {
		retryFixture.cleanup();
	}

	const failFixture = await loadFavouriteManagerFixture();

	try {
		const result = await failFixture.module.showFavouriteButton(6);

		assertEquals(result, 1);
		assertEquals(failFixture.translationCalls, ["error_no_headers"]);
		assertEquals(failFixture.errorCalls, [
			"AWSF - translated:error_no_headers",
		]);
		assertEquals(failFixture.timeoutCalls.length, 1);
		assertEquals(failFixture.timeoutCalls[0].delay, 5000);
	} finally {
		failFixture.cleanup();
	}
});

Deno.test("favourite-manager skips unsupported setup pages", async () => {
	const homeFixture = await loadFavouriteManagerFixture({
		minifiedUrl: "SetupOneHome/home",
	});

	try {
		const result = await homeFixture.module.showFavouriteButton();

		assertEquals(result, undefined);
		assertEquals(homeFixture.header.children.length, 1);
	} finally {
		homeFixture.cleanup();
	}

	const objectManagerFixture = await loadFavouriteManagerFixture({
		minifiedUrl: "ObjectManager/home",
	});

	try {
		await objectManagerFixture.module.showFavouriteButton();

		assertEquals(objectManagerFixture.header.children.length, 1);
	} finally {
		objectManagerFixture.cleanup();
	}
});

Deno.test("favourite-manager refreshes an existing button from the current saved state", async () => {
	const fixture = await loadFavouriteManagerFixture({
		existsWithOrWithoutOrg: true,
		isCurrentlyOnSavedTab: null,
		wasOnSavedTab: null,
	});

	try {
		const button = await appendGeneratedButton(fixture, fixture.header);

		await fixture.module.showFavouriteButton();

		assertEquals(fixture.isOnSavedTabCalls.value, 1);
		assertEquals(fixture.existsCalls, [{
			org: "org:https://acme.lightning.force.com/lightning/setup/Users/home",
			url: "Users/home",
		}]);
		assertEquals(
			button.getAttribute("aria-label"),
			"translated:remove_tab",
		);
		assert(
			button.querySelector(`#${fixture.module.STAR_ID}`)?.classList
				.contains(
					"hidden",
				),
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager inserts a new button and initializes its saved state", async () => {
	const fixture = await loadFavouriteManagerFixture({
		commands: [{ name: "cmd_save_as_tab", shortcut: "Ctrl+S" }],
		isCurrentlyOnSavedTab: true,
	});

	try {
		await fixture.module.showFavouriteButton();

		const button = fixture.header.querySelector(
			`#${fixture.module.FAVOURITE_BUTTON_ID}`,
		);

		assert(button != null);
		assertEquals(button.getAttribute("aria-pressed"), "true");
		assertEquals(
			button.getAttribute("aria-label"),
			"translated:remove_tab",
		);
		assert(
			button.querySelector(`#${fixture.module.SLASHED_STAR_ID}`) != null,
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager page actions show info toasts or click the matching button", async () => {
	const fixture = await loadFavouriteManagerFixture();

	try {
		const uselessSaveButton = await appendGeneratedButton(
			fixture,
			fixture.header,
		);
		const uselessSaveStar = uselessSaveButton.querySelector(
			`#${fixture.module.STAR_ID}`,
		);
		const removeStar = uselessSaveButton.querySelector(
			`#${fixture.module.SLASHED_STAR_ID}`,
		);
		uselessSaveStar?.classList.add("hidden");

		fixture.module.pageActionTab(true);
		assertEquals(fixture.toasts, [{
			message: "error_useless_save",
			status: "info",
		}]);

		fixture.module.pageActionTab(false);
		assertEquals(fixture.toasts, [
			{
				message: "error_useless_save",
				status: "info",
			},
			{
				message: "error_useless_remove",
				status: "info",
			},
		]);

		const removeClickCount = { value: 0 };
		uselessSaveButton.click = () => {
			removeClickCount.value++;
		};
		removeStar?.classList.remove("hidden");

		fixture.module.pageActionTab(false);
		assertEquals(removeClickCount.value, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("favourite-manager button click handlers invoke the favourite action flow", async () => {
	const fixture = await loadFavouriteManagerFixture({
		currentHref:
			"https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
		isCurrentlyOnSavedTab: false,
		minifiedUrl: "Users/home",
	});
	const originalAddEventListener = EventTarget.prototype.addEventListener;
	let clickListener: EventListenerOrEventListenerObject | null = null;
	EventTarget.prototype.addEventListener = function (
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: AddEventListenerOptions | boolean,
	) {
		if (
			type === "click" &&
			listener != null &&
			this instanceof HTMLElement &&
			this.tagName === "BUTTON"
		) {
			clickListener = listener;
		}
		return originalAddEventListener.call(this, type, listener, options);
	};

	try {
		const button = await fixture.module.generateFavouriteButton();

		assert(clickListener != null);
		await invokeEventListener(clickListener, button);

		assertEquals(fixture.performActionCalls, [{
			action: "add",
			options: { addInFront: false },
			payload: {
				label: "Users",
				org: "org:https://acme.lightning.force.com/lightning/setup/Users/home?id=001",
				url: "Users/home",
			},
		}]);
	} finally {
		EventTarget.prototype.addEventListener = originalAddEventListener;
		fixture.cleanup();
	}
});
