import { assertEquals, assertStrictEquals } from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";
import { createThemeHandlerRuntime } from "../../../src/action/themeHandler-runtime.js";

type ThemeHandlerModule = {
	handleSwitchColorTheme: () => Promise<void>;
	initTheme: () => Promise<void>;
	systemColorSchemeListener: (enable?: boolean | null) => Promise<void>;
};

type Listener = (event: { matches: boolean }) => void | Promise<void>;

/**
 * Minimal localStorage mock used by the theme handler tests.
 */
class MemoryStorage {
	#values = new Map<string, string>();

	/**
	 * Returns the stored value for the provided key.
	 *
	 * @param {string} key Storage key.
	 * @return {string | null} Stored value or `null`.
	 */
	getItem(key: string) {
		return this.#values.get(key) ?? null;
	}

	/**
	 * Stores a string value.
	 *
	 * @param {string} key Storage key.
	 * @param {string} value Value to store.
	 * @return {void}
	 */
	setItem(key: string, value: string) {
		this.#values.set(key, value);
	}
}

/**
 * Minimal media query list mock with explicit listener tracking.
 */
class MockMediaQueryList {
	matches: boolean;
	listeners: Listener[] = [];

	/**
	 * Creates the media query stub.
	 *
	 * @param {boolean} matches Whether dark mode currently matches.
	 */
	constructor(matches: boolean) {
		this.matches = matches;
	}

	/**
	 * Registers a change listener.
	 *
	 * @param {"change"} _type Event type.
	 * @param {Listener} listener Listener callback.
	 * @return {void}
	 */
	addEventListener(_type: "change", listener: Listener) {
		this.listeners.push(listener);
	}

	/**
	 * Removes a change listener.
	 *
	 * @param {"change"} _type Event type.
	 * @param {Listener} listener Listener callback.
	 * @return {void}
	 */
	removeEventListener(_type: "change", listener: Listener) {
		this.listeners = this.listeners.filter((item) => item !== listener);
	}

	/**
	 * Emits a change event to all listeners.
	 *
	 * @param {boolean} matches Updated match state.
	 * @return {Promise<void>}
	 */
	async dispatch(matches: boolean) {
		this.matches = matches;
		for (const listener of this.listeners) {
			await listener({ matches });
		}
	}
}

type ThemeHandlerFixture = {
	document: {
		documentElement: {
			dataset: Record<string, string | null>;
		};
	};
	localStorage: MemoryStorage;
	mediaQueryList: MockMediaQueryList | null;
	module: ThemeHandlerModule;
	sentMessages: { theme: string; what: string }[];
};

/**
 * Builds a theme-handler runtime with test doubles.
 *
 * @param {{ localStorage?: MemoryStorage; matchMedia?: ((query: string) => MockMediaQueryList) | null; }} [overrides={}] Runtime overrides.
 * @return {Promise<ThemeHandlerFixture>} Runtime and fixtures.
 */
async function loadThemeHandler(
	overrides: {
		localStorage?: MemoryStorage;
		matchMedia?: ((query: string) => MockMediaQueryList) | null;
	} = {},
) {
	const sentMessages: { theme: string; what: string }[] = [];
	const localStorage = overrides.localStorage ?? new MemoryStorage();
	const documentElement = {
		dataset: {} as Record<string, string | null>,
	};
	const mediaQueryList = new MockMediaQueryList(false);
	const hasMatchMediaOverride = Object.hasOwn(overrides, "matchMedia");
	const matchMediaFn = hasMatchMediaOverride
		? overrides.matchMedia ?? undefined
		: (_query: string) => mediaQueryList;
	const runtime = createThemeHandlerRuntime({
		documentRef: { documentElement },
		localStorageRef: localStorage,
		matchMediaFn,
		sendExtensionMessageFn: (message: { what: string; theme: string }) => {
			sentMessages.push(message);
		},
		whatTheme: "theme-message",
	});
	await runtime.initTheme();

	return {
		document: { documentElement },
		localStorage,
		module: runtime,
		sentMessages,
		mediaQueryList: !hasMatchMediaOverride ? mediaQueryList : (
			typeof overrides.matchMedia === "function"
				? overrides.matchMedia("(prefers-color-scheme: dark)")
				: null
		),
	};
}

Deno.test("themeHandler initializes and updates theme state in isolation", async () => {
	const storage = new MemoryStorage();
	storage.setItem("userTheme", "dark");
	const { document, localStorage, module, sentMessages } =
		await loadThemeHandler({
			localStorage: storage,
			matchMedia: null,
		});

	assertEquals(
		document.documentElement.dataset.usertheme,
		"dark",
	);
	assertEquals(document.documentElement.dataset.theme, "dark");

	await module.handleSwitchColorTheme();

	assertEquals(sentMessages, [{
		theme: "light",
		what: "theme-message",
	}]);
	assertEquals(document.documentElement.dataset.theme, "light");
	assertEquals(document.documentElement.dataset.usertheme, "light");
	assertEquals(localStorage.getItem("usingTheme"), "light");
	assertEquals(localStorage.getItem("userTheme"), "light");

	await module.handleSwitchColorTheme();
	assertEquals(sentMessages.at(-1), {
		theme: "dark",
		what: "theme-message",
	});
	assertEquals(document.documentElement.dataset.theme, "dark");
	assertEquals(document.documentElement.dataset.usertheme, "dark");
});

Deno.test("themeHandler attaches and detaches the system color listener", async () => {
	const {
		document,
		localStorage,
		module,
		mediaQueryList,
		sentMessages,
	} = await loadThemeHandler({
		localStorage: new MemoryStorage(),
	});
	assertStrictEquals(mediaQueryList?.listeners.length, 1);
	assertEquals(sentMessages[0], {
		theme: "light",
		what: "theme-message",
	});
	assertEquals(localStorage.getItem("userTheme"), "system");
	assertStrictEquals(mediaQueryList?.listeners.length, 1);

	await mediaQueryList?.dispatch(false);
	assertEquals(sentMessages.length, 1);

	await mediaQueryList?.dispatch(true);
	assertEquals(sentMessages[1], {
		theme: "dark",
		what: "theme-message",
	});
	assertEquals(document.documentElement.dataset.theme, "dark");

	await module.systemColorSchemeListener(false);
	assertStrictEquals(mediaQueryList?.listeners.length, 0);

	await module.systemColorSchemeListener(true);
	assertStrictEquals(mediaQueryList?.listeners.length, 1);

	await module.systemColorSchemeListener(true);
	assertStrictEquals(mediaQueryList?.listeners.length, 1);

	await module.systemColorSchemeListener(false);
	await (
		module.systemColorSchemeListener as (
			enable?: boolean | null,
		) => Promise<void>
	)(null);
	assertStrictEquals(mediaQueryList?.listeners.length, 0);
});

Deno.test("themeHandler ignores enabling the system listener when matchMedia is unavailable", async () => {
	const storage = new MemoryStorage();
	storage.setItem("userTheme", "light");
	const { localStorage, module } = await loadThemeHandler({
		localStorage: storage,
		matchMedia: null,
	});

	await module.systemColorSchemeListener(true);
	assertEquals(localStorage.getItem("userTheme"), "light");
});

Deno.test("themeHandler re-initializes both stored and default user themes", async () => {
	const storage = new MemoryStorage();
	const { document, localStorage, module } = await loadThemeHandler({
		localStorage: storage,
		matchMedia: null,
	});

	assertEquals(document.documentElement.dataset.usertheme, "system");
	assertEquals(document.documentElement.dataset.theme, null);

	localStorage.setItem("userTheme", "light");
	await module.initTheme();
	assertEquals(document.documentElement.dataset.usertheme, "light");
	assertEquals(document.documentElement.dataset.theme, "light");

	localStorage.setItem("userTheme", "system");
	await module.initTheme();
	assertEquals(document.documentElement.dataset.usertheme, "system");
	assertEquals(document.documentElement.dataset.theme, null);
});

Deno.test("themeHandler direct module coverage", async () => {
	const dom = installMockDom(
		"https://example.lightning.force.com/lightning/setup/",
	);
	const originalMatchMedia = globalThis.matchMedia;
	const originalChrome = (globalThis as Record<string, unknown>).chrome;
	const originalBrowser = (globalThis as Record<string, unknown>).browser;
	try {
		const browserGlobal = {
			i18n: {
				getMessage: () => "again-why-salesforce",
			},
			runtime: {
				getManifest: () => ({
					homepage_url: "https://github.com/acme/again-why-salesforce",
					optional_host_permissions: [],
					version: "1.0.0",
				}),
				lastError: null,
				sendMessage: (
					message: { theme: string; what: string },
					callback?: (response?: { theme: string; what: string }) => void,
				) => {
					callback?.(message);
					return Promise.resolve(message);
				},
			},
		};
		(globalThis as Record<string, unknown>).chrome = browserGlobal;
		(globalThis as Record<string, unknown>).browser = browserGlobal;

		const media = new MockMediaQueryList(false);
		globalThis.matchMedia = () => media as unknown as MediaQueryList;
		const module = await import(
			`../../../src/action/themeHandler.js?runtime=${crypto.randomUUID()}`
		);
		await module.systemColorSchemeListener(false);
		localStorage.setItem("userTheme", "system");

		await module.initTheme();
		assertEquals(document.documentElement.dataset.usertheme, "system");
		assertEquals(document.documentElement.dataset.theme, "light");

		await media.dispatch(true);
		assertEquals(document.documentElement.dataset.theme, "dark");
		await module.handleSwitchColorTheme();
		assertEquals(document.documentElement.dataset.theme, "light");
		assertEquals(document.documentElement.dataset.usertheme, "light");

		await module.systemColorSchemeListener(false);
		await module.systemColorSchemeListener(false);
		await (module.systemColorSchemeListener as (
			enable?: boolean | null,
		) => Promise<void>)(null);
		await module.systemColorSchemeListener(true);
		await module.systemColorSchemeListener(true);

		document.documentElement.dataset.theme = "dark";
		await media.dispatch(true);
		assertEquals(document.documentElement.dataset.theme, "dark");

		localStorage.setItem("userTheme", "dark");
		await module.initTheme();
		assertEquals(document.documentElement.dataset.theme, "dark");
	} finally {
		globalThis.matchMedia = originalMatchMedia;
		(globalThis as Record<string, unknown>).chrome = originalChrome;
		(globalThis as Record<string, unknown>).browser = originalBrowser;
		dom.cleanup();
	}
});
