/// <reference lib="dom" />
import { assertEquals } from "@std/testing/asserts";
import { translations } from "../../mocks.test.ts";
import ensureTranslatorAvailability from "/core/translator.js";
const translate_element_attribute = "data-i18n";

Deno.test("TranslationService - load user preference", async () => {
	const service = await ensureTranslatorAvailability();
	assertEquals(
		service.currentLanguage,
		"fr",
		"Should load language from storage",
	);
	assertEquals(service.translateAttributeDataset, "i18n");
	assertEquals(service.separator, "+-+");
});

Deno.test("TranslationService - translate method", async () => {
	const service = await ensureTranslatorAvailability();
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
	assertEquals(
		await service.translate("missing"),
		"missing",
		"Key not found anywhere should report same string",
	);
	// Test placeholder translated
	assertEquals(
		await service.translate("world"),
		"Bonjour Monde",
		"Placeholder should get translated",
	);
	// change lang to en
	service.loadLanguageFile("en");
	// check concatenated translations
	assertEquals(
		await service.translate("salesforce"),
		"Salesforce",
	);
	assertEquals(
		await service.translate("sf_login"),
		"Salesforce Login",
		"Placeholder should get translated",
	);
	assertEquals(
		await service.translate("use_sf_login"),
		"Use Salesforce Login",
		"Placeholder in placeholder should get translated",
	);
	assertEquals(
		await service.translate("plz_use_sf_login"),
		"You should Use Salesforce Login please!",
		"Placeholder in placeholder in placeholder should get translated",
	);
});

Deno.test("TranslationService - updatePageTranslations", async (t) => {
	const service = await ensureTranslatorAvailability();
	await t.step("translates to french", async () => {
		// Mock DOM elements
		await service.updatePageTranslations("fr");
		const mockEle = Array.from(document.querySelectorAll(
			`[${translate_element_attribute}]`,
		)) as HTMLElement[];
		assertEquals(
			mockEle[0].textContent,
			"Bonjour",
			"First element should be translated to french",
		);
		assertEquals(
			mockEle[1].textContent,
			"thisiskept",
			"Second element textContent should not be translated",
		);
		assertEquals(
			mockEle[1].title,
			"Goodbye",
			"Second element title should not be translated to french",
		);
		assertEquals(
			mockEle[2].textContent,
			"Météo",
			"Third element textContent should be translated to french",
		);
		assertEquals(
			mockEle[2].title,
			"Météo",
			"Third element title should be translated to french",
		);
	});

	await t.step("translates to english", async () => {
		// Mock DOM elements
		await service.updatePageTranslations("en");
		const mockEle = Array.from(document.querySelectorAll(
			`[${translate_element_attribute}]`,
		)) as HTMLElement[];
		assertEquals(
			mockEle[0].textContent,
			"Hello",
			"First element should be translated to english",
		);
		assertEquals(
			mockEle[1].textContent,
			"thisiskept",
			"Second element textContent should not be translated to english",
		);
		assertEquals(
			mockEle[1].title,
			"Goodbye",
			"Second element title should be translated to english",
		);
		assertEquals(
			mockEle[2].textContent,
			"Weather",
			"Third element textContent should be translated to english",
		);
		assertEquals(
			mockEle[2].title,
			"Weather",
			"Third element title should be translated to english",
		);
	});
});

Deno.test("TranslationService - loadLanguageFile", async () => {
	const service = await ensureTranslatorAvailability();
	// Test loading a new language
	// Add mock de to translations
	const mockJson: Record<string, { message: string }> = {
		"test": { message: "Test de" },
	};
	translations.de = mockJson;
	const result = await service.loadLanguageFile("de");
	assertEquals(result, mockJson, "Should return loaded translations");
	assertEquals(
		service.caches.de,
		result,
		"Should initialize cache for language",
	);
	// Test loading existing language
	const existingResult = await service.loadLanguageFile("en");
	assertEquals(
		existingResult,
		translations.en,
		"Should return existing translations",
	);
	// Test error handling
	globalThis.fetch = () => {
		throw new Error("Network error");
	};
	const errorResult = await service.loadLanguageFile("es");
	assertEquals(
		errorResult,
		translations.en,
		"Should return fallback language on error",
	);
	await service.loadLanguageFile("pt_BR");
});

Deno.test("TranslationService - edge cases", async () => {
	const service = await ensureTranslatorAvailability();
	assertEquals(
		await service.translate("plain sentence key"),
		"plain sentence key",
		"Missing space-delimited keys should be returned as-is",
	);

	const originalDocument = globalThis.document;
	Reflect.set(globalThis, "document", undefined);
	assertEquals(
		await service.updatePageTranslations("en"),
		false,
		"Should return false when no document is available",
	);
	Reflect.set(globalThis, "document", originalDocument);
});
