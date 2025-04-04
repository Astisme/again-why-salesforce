// translation_service_test.ts
import {
	assertEquals,
	assertThrows,
    assertRejects,
} from "https://deno.land/std/testing/asserts.ts";
import { mockBrowser } from "./mocks.ts";
import TranslationService from "/translator.js";

Deno.test("TranslationService - singleton pattern", async () => {
	const service1 = await TranslationService.create();
	const service2 = await TranslationService.create();
	assertEquals(service1, service2, "Should return the same instance");
});

Deno.test("TranslationService - constructor protection", () => {
	assertThrows(
		() => new TranslationService(Symbol("wrong")),
		Error,
		"Use TranslationService.create()",
	);
});

Deno.test("TranslationService - load user preference", async () => {
	const service = await TranslationService.create();
	assertEquals(
		service.currentLanguage,
		"fr",
		"Should load language from storage",
	);
});

Deno.test("TranslationService - translate method", async () => {
	const service = await TranslationService.create();
	// Test available translation
	assertEquals(
		await service.translate("hello"),
		"Bonjour",
		"Should translate to French",
	);
	// Test fallback to English
	assertEquals(
		await service.translate("goodbye"),
		"Goodbye",
		"Should fallback to English",
	);
	// Test missing key
	assertRejects(
		async () => await service.translate("missing"),
		Error,
		"Key not found anywhere",
	);
});

Deno.test("TranslationService - updatePageTranslations", async (t) => {
	const service = await TranslationService.create();
	await t.step("translates to french", async () => {
		// Mock DOM elements
		await service.updatePageTranslations("fr");
		const mockEle = document.querySelectorAll(
			`[${TranslationService.TRANSLATE_ELEMENT_ATTRIBUTE}]`,
		);
		assertEquals(
			mockEle[0].textContent,
			"Bonjour",
			"First element should be translated to french",
		);
		assertEquals(
			mockEle[1].textContent,
			"Goodbye",
			"Second element should not be translated to french",
		);
	});

	await t.step("translates to english", async () => {
		// Mock DOM elements
		await service.updatePageTranslations("en");
		const mockEle = document.querySelectorAll(
			`[${TranslationService.TRANSLATE_ELEMENT_ATTRIBUTE}]`,
		);
		assertEquals(
			mockEle[0].textContent,
			"Hello",
			"First element should be translated to english",
		);
		assertEquals(
			mockEle[1].textContent,
			"Goodbye",
			"Second element should not be translated to english",
		);
	});
});

Deno.test("TranslationService - loadLanguageFile", async () => {
	const service = await TranslationService.create();
	// Test loading a new language
    // Add mock de to translations
    const mockJson = { "test": "Test de" };
    translations.de = mockJson;
	const result = await service.loadLanguageFile("de");
	assertEquals(result, mockJson, "Should return loaded translations");
	assertEquals(service.caches.de, result, "Should initialize cache for language");
	// Test loading existing language
	const existingResult = await service.loadLanguageFile("en");
	assertEquals(
		existingResult,
		translations.en,
		"Should return existing translations",
	);
	// Test error handling
	globalThis.fetch = async () => {
		throw new Error("Network error");
	};
	const errorResult = await service.loadLanguageFile("es");
	assertEquals(errorResult, translations.en, "Should return null on error");
});
