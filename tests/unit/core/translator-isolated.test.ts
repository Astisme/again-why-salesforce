import {
	assertEquals,
	assertRejects,
	assertThrows,
} from "@std/testing/asserts";

type TranslatorModule = {
	TranslationService: {
		FALLBACK_LANGUAGE: string;
		create: () => Promise<{
			caches: Record<string, Record<string, { message: string }>>;
			currentLanguage: string | null;
			loadLanguageBackground: () => Promise<string | null>;
			loadLanguageFile: (
				language?: string | null,
			) => Promise<Record<string, { message: string }>>;
			loadNewLanguage: (language?: string | null) => Promise<boolean>;
			separator: string;
			setListenerForLanguageChange: () => void;
			translate: (
				key: string | string[],
				connector?: string,
			) => Promise<string>;
			translateAttributeDataset: string;
			updatePageTranslations: (
				language?: string | null,
			) => Promise<boolean>;
		}>;
		new (secret: symbol): unknown;
	};
	ensureTranslatorAvailability: () => Promise<{
		loadLanguageFile: (
			language?: string | null,
		) => Promise<Record<string, { message: string }>>;
		translate: (
			key: string | string[],
			connector?: string,
		) => Promise<string>;
		updatePageTranslations: (language?: string | null) => Promise<boolean>;
	}>;
};

/**
 * Lazily imports the translator module factory after global browser stubs are installed.
 *
 * @return {Promise<(overrides?: Record<string, unknown>) => TranslatorModule>} Runtime factory.
 */
async function getCreateTranslatorModule() {
	const module = await import("../../../src/core/translator.js");
	return module.createTranslatorModule as unknown as (
		overrides?: Record<string, unknown>,
	) => TranslatorModule;
}

/**
 * Loads translator.js in isolation with source-mapped coverage.
 *
 * @return {Promise<{
 *   cleanup: () => void;
 *   changeListeners: Array<(changes: Record<string, unknown>) => void>;
 *   module: TranslatorModule;
 *   setLanguageResponse: (userLanguage: string | null, sfLanguage: string | null) => void;
 * }>}
 */
async function loadTranslatorFixture() {
	let userLanguage: string | null = "fr";
	let sfLanguage: string | null = "en";
	const changeListeners: Array<(changes: Record<string, unknown>) => void> =
		[];
	const localeMessages: Record<string, Record<string, { message: string }>> =
		{
			en: {
				hello: { message: "Hello" },
				error_missing_key: { message: "Missing key" },
			},
			fr: {
				hello: { message: "Bonjour" },
			},
		};
	const mockDocument = {
		querySelectorAll: () => [{
			getAttribute: () => "hello",
			textContent: "",
		}],
	};
	const hadBrowser = "browser" in globalThis;
	const originalBrowser = (globalThis as { browser?: unknown }).browser;
	const hadDocument = "document" in globalThis;
	const originalDocument = (globalThis as { document?: unknown }).document;
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (input: string | URL | Request) => {
		const path = `${input}`;
		return Promise.resolve({
			json: () => {
				const language = path.match(
					/\/_locales\/([^/]+)\/messages\.json$/,
				)
					?.[1];
				if (language == null) {
					throw new Error("error_missing_language");
				}
				if (localeMessages[language] == null) {
					throw new Error("error_missing_locale");
				}
				return localeMessages[language];
			},
		} as unknown as Response);
	};
	const browserStub = {
		i18n: {
			getMessage: (key: string) => key,
		},
		runtime: {
			getManifest: () => ({
				homepage_url: "https://github.com/example/repo",
				optional_host_permissions: [],
				version: "1.0.0",
			}),
			getURL: (path: string) => path,
			sendMessage: () => undefined,
		},
		storage: {
			onChanged: {
				addListener: (
					listener: (changes: Record<string, unknown>) => void,
				) => {
					changeListeners.push(listener);
				},
			},
		},
	};
	Object.defineProperty(globalThis, "browser", {
		configurable: true,
		value: browserStub,
		writable: true,
	});
	Object.defineProperty(globalThis, "document", {
		configurable: true,
		value: mockDocument,
		writable: true,
	});
	const createTranslatorModule = await getCreateTranslatorModule();
	const module = createTranslatorModule({
		BROWSER: browserStub,
		FOLLOW_SF_LANG: "follow",
		SETTINGS_KEY: "settings",
		USER_LANGUAGE: "picked-language",
		WHAT_GET_SETTINGS: "get-settings",
		WHAT_GET_SF_LANG: "get-sf-language",
		sendExtensionMessage: (
			{ what }: { what: string; keys?: string },
		) => {
			if (what === "get-settings") {
				return Promise.resolve(
					userLanguage == null ? null : { enabled: userLanguage },
				);
			}
			if (what === "get-sf-language") {
				return Promise.resolve(sfLanguage);
			}
			return Promise.resolve(null);
		},
		document: mockDocument,
		fetch: globalThis.fetch,
	});
	return {
		cleanup: () => {
			globalThis.fetch = originalFetch;
			if (hadBrowser) {
				Object.defineProperty(globalThis, "browser", {
					configurable: true,
					value: originalBrowser,
					writable: true,
				});
			} else {
				delete (globalThis as { browser?: unknown }).browser;
			}
			if (hadDocument) {
				Object.defineProperty(globalThis, "document", {
					configurable: true,
					value: originalDocument,
					writable: true,
				});
			} else {
				delete (globalThis as { document?: unknown }).document;
			}
		},
		changeListeners,
		module,
		setLanguageResponse: (
			newUserLanguage: string | null,
			newSfLanguage: string | null,
		) => {
			userLanguage = newUserLanguage;
			sfLanguage = newSfLanguage;
		},
	};
}

Deno.test("translator isolated coverage hits constructor, fallback, and listener branches", async () => {
	const fixture = await loadTranslatorFixture();
	try {
		assertThrows(
			() => new fixture.module.TranslationService(Symbol("invalid")),
			Error,
			"error_translationservice_constructor",
		);

		const translator = await fixture.module.TranslationService.create();
		assertEquals(translator.translateAttributeDataset, "i18n");
		assertEquals(translator.separator, "+-+");
		assertEquals(await translator.loadNewLanguage(null), false);
		assertEquals(await translator.loadNewLanguage("follow"), false);
		assertEquals(await translator.loadNewLanguage("fr"), true);

		fixture.setLanguageResponse(null, "fr");
		assertEquals(await translator.loadLanguageBackground(), "fr");
		fixture.setLanguageResponse(null, null);
		assertEquals(await translator.loadLanguageBackground(), null);

		await assertRejects(
			async () => await translator.loadLanguageFile(null),
			Error,
			"error_required_params",
		);

		assertEquals(
			await translator.translate(["hello", "hello"], "-"),
			"Bonjour-Bonjour",
		);
		assertEquals(await translator.translate("missing key"), "missing key");

		assertEquals(await translator.updatePageTranslations(null), undefined);
		const originalDocument =
			(globalThis as { document?: unknown }).document;
		Reflect.set(globalThis, "document", undefined);
		assertEquals(await translator.updatePageTranslations("en"), false);
		Reflect.set(globalThis, "document", originalDocument);

		translator.setListenerForLanguageChange();
		fixture.changeListeners[0]?.({
			settings: {
				newValue: [{ id: "picked-language", enabled: "en" }],
			},
		});
	} finally {
		fixture.cleanup();
	}
});
