import {
	assertEquals,
	assertRejects,
	assertThrows,
} from "@std/testing/asserts";
import { loadIsolatedModule } from "./load-isolated-module.test.ts";

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

type TranslatorDependencies = {
	BROWSER: {
		runtime: {
			getURL: (path: string) => string;
		};
		storage: {
			onChanged: {
				addListener: (
					listener: (changes: Record<string, unknown>) => void,
				) => void;
			};
		};
	};
	FOLLOW_SF_LANG: string;
	SETTINGS_KEY: string;
	USER_LANGUAGE: string;
	WHAT_GET_SETTINGS: string;
	WHAT_GET_SF_LANG: string;
	sendExtensionMessage: (message: { what: string; keys?: string }) => Promise<
		{ enabled?: string } | string | null
	>;
};

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
	const modulePath = new URL("../src/translator.js", import.meta.url);
	const sourceMapLineMap = (await Deno.readTextFile(modulePath))
		.split("\n")
		.map((_, index) => index + 1);
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
	const { cleanup, module } = await loadIsolatedModule<
		TranslatorModule,
		TranslatorDependencies
	>({
		modulePath,
		additionalExports: [
			"TranslationService",
			"ensureTranslatorAvailability",
		],
		transformSource: (source) =>
			source.replace(
				"export default async function ensureTranslatorAvailability() {",
				"async function ensureTranslatorAvailability() {",
			),
		dependencies: {
			BROWSER: {
				runtime: {
					getURL: (path) => path,
				},
				storage: {
					onChanged: {
						addListener: (listener) => {
							changeListeners.push(listener);
						},
					},
				},
			},
			FOLLOW_SF_LANG: "follow",
			SETTINGS_KEY: "settings",
			USER_LANGUAGE: "picked-language",
			WHAT_GET_SETTINGS: "get-settings",
			WHAT_GET_SF_LANG: "get-sf-language",
			sendExtensionMessage: ({ what }) => {
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
		},
		globals: {
			document: mockDocument,
		},
		importsToReplace: new Set(["/constants.js", "/functions.js"]),
		sourceMapLineMap,
	});
	return {
		cleanup: () => {
			cleanup();
			globalThis.fetch = originalFetch;
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
