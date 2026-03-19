import { assertEquals, assertStrictEquals } from "@std/testing/asserts";
import { installMockDom } from "../happydom.ts";
import { loadIsolatedModule } from "../load-isolated-module.ts";
import "../mocks.ts";

type ThemeHandlerModule = {
	handleSwitchColorTheme: () => Promise<void>;
	initTheme: () => Promise<void>;
	initThemePromise: Promise<void>;
	systemColorSchemeListener: (enable?: boolean | null) => Promise<void>;
};

type Listener = (event: { matches: boolean }) => void | Promise<void>;

/**
 * Minimal localStorage mock used by the isolated theme handler tests.
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

type ThemeHandlerDependencies = {
	WHAT_THEME: string;
	sendExtensionMessage: (message: { theme: string; what: string }) => void;
};

type ThemeHandlerFixture = {
	cleanup: () => void;
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
 * Loads the theme handler module with isolated dependencies.
 *
 * @param {{ localStorage?: MemoryStorage; matchMedia?: ((query: string) => MockMediaQueryList) | null; }} [overrides={}] Runtime overrides.
 * @return {Promise<ThemeHandlerFixture>} Module and fixtures.
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
	const dependencies: ThemeHandlerDependencies = {
		WHAT_THEME: "theme-message",
		sendExtensionMessage: (message) => {
			sentMessages.push(message);
		},
	};
	const hasMatchMediaOverride = Object.hasOwn(overrides, "matchMedia");
	const { cleanup, module } = await loadIsolatedModule<
		ThemeHandlerModule,
		ThemeHandlerDependencies
	>({
		modulePath: new URL(
			"../../src/action/themeHandler.js",
			import.meta.url,
		),
		dependencies,
		globals: {
			document: { documentElement },
			localStorage,
			matchMedia: hasMatchMediaOverride
				? overrides.matchMedia
				: () => mediaQueryList,
		},
		importsToReplace: new Set([
			"/constants.js",
			"/functions.js",
		]),
	});
	await module.initThemePromise;

	return {
		cleanup,
		document: { documentElement },
		localStorage,
		module,
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
	const { cleanup, document, localStorage, module, sentMessages } =
		await loadThemeHandler({
			localStorage: storage,
			matchMedia: null,
		});
	try {
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
	} finally {
		cleanup();
	}
});

Deno.test("themeHandler attaches and detaches the system color listener", async () => {
	const {
		cleanup,
		document,
		localStorage,
		module,
		mediaQueryList,
		sentMessages,
	} = await loadThemeHandler({
		localStorage: new MemoryStorage(),
	});
	try {
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
	} finally {
		cleanup();
	}
});

Deno.test("themeHandler ignores enabling the system listener when matchMedia is unavailable", async () => {
	const storage = new MemoryStorage();
	storage.setItem("userTheme", "light");
	const { cleanup, localStorage, module } = await loadThemeHandler({
		localStorage: storage,
		matchMedia: null,
	});

	try {
		await module.systemColorSchemeListener(true);
		assertEquals(localStorage.getItem("userTheme"), "light");
	} finally {
		cleanup();
	}
});

Deno.test("themeHandler re-initializes both stored and default user themes", async () => {
	const storage = new MemoryStorage();
	const { cleanup, document, localStorage, module } = await loadThemeHandler({
		localStorage: storage,
		matchMedia: null,
	});

	try {
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
	} finally {
		cleanup();
	}
});

Deno.test("themeHandler direct module coverage", async () => {
	const dom = installMockDom(
		"https://example.lightning.force.com/lightning/setup/",
	);
	const originalMatchMedia = globalThis.matchMedia;
	try {
		const module = await import("/action/themeHandler.js");
		const media = new MockMediaQueryList(false);
		globalThis.matchMedia = () => media as unknown as MediaQueryList;
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

		globalThis.matchMedia =
			undefined as unknown as typeof globalThis.matchMedia;
			localStorage.setItem("userTheme", "system");
			await module.initTheme();
			assertEquals(document.documentElement.dataset.usertheme, "system");
			assertStrictEquals(document.documentElement.dataset.theme, null);

			localStorage.removeItem("userTheme");
			await module.initTheme();
			assertEquals(document.documentElement.dataset.usertheme, "system");
			assertStrictEquals(document.documentElement.dataset.theme, null);
		} finally {
		globalThis.matchMedia = originalMatchMedia;
		localStorage.removeItem("userTheme");
		localStorage.removeItem("usingTheme");
		dom.cleanup();
	}
});
