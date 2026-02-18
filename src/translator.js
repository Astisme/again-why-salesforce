import {
	BROWSER,
	FOLLOW_SF_LANG,
	SETTINGS_KEY,
	USER_LANGUAGE,
	WHAT_GET_SETTINGS,
	WHAT_GET_SF_LANG,
} from "/constants.js";
import { sendExtensionMessage } from "/functions.js";
const _translationSecret = Symbol("translationSecret");
let singletonTranslator = null;

/**
 * Service for handling text translations in a browser extension.
 * Uses language-specific caches to improve performance.
 */
class TranslationService {
	static FALLBACK_LANGUAGE = "en";
	static TRANSLATE_DATASET = "i18n";
	/**
	 * Retrieves the dataset attribute name used on elements
	 * to hold translation keys.
	 *
	 * @return {string} The dataset key for translation attributes.
	 */
	get translateAttributeDataset() {
		return TranslationService.TRANSLATE_DATASET;
	}
	static TRANSLATE_ELEMENT_ATTRIBUTE =
		`data-${TranslationService.TRANSLATE_DATASET}`;
	static TRANSLATE_SEPARATOR = "+-+";
	/**
	 * Retrieves the separator string used to split translation keys
	 * from the static translation attribute.
	 *
	 * @return {string} The configured translation separator.
	 */
	get separator() {
		return TranslationService.TRANSLATE_SEPARATOR;
	}
	static ATTRIBUTE_EXCLUDE = "data-exclude-automatic-i18n";

	/** @type {string} Current language code */
	currentLanguage = TranslationService.FALLBACK_LANGUAGE;
	/** @type {Object.<string, Object.<string, string>>} Cache organized by language */
	caches = {};

	/**
	 * Initialize translation service with default language
	 * @param {Symbol} secret - the secret to allow the creation of this class
	 * @throws Error when the secret does not match
	 */
	constructor(secret) {
		if (secret !== _translationSecret) {
			throw new Error(
				"error_translationservice_constructor",
			);
		}
	}

	/**
	 * Attempts to load a new language file if the specified language is not null
	 * and not the “follow Salesforce language” sentinel.
	 *
	 * @param {string|null} [language=null] - The language code to load, or null to skip.
	 * @return {Promise<boolean>}
	 *   Resolves to `true` if a new language file was loaded;
	 *   `false` if no loading was necessary or the language was null or FOLLOW_SF_LANG.
	 */
	async loadNewLanguage(language = null) {
		if (
			language == null ||
			language === FOLLOW_SF_LANG
		) {
			return false;
		}
		await this.loadLanguageFile(language);
		return true;
	}

	/**
	 * Determines the user’s preferred language from settings or Salesforce,
	 * then attempts to load it via loadNewLanguage.
	 *
	 * @return {Promise<string|null>}
	 *   Resolves to the language code that was successfully loaded;
	 *   or `null` if neither the user’s preference nor Salesforce language could be loaded.
	 */
	async loadLanguageBackground() {
		const userLanguage = (await sendExtensionMessage({
			what: WHAT_GET_SETTINGS,
			keys: USER_LANGUAGE,
		}))?.enabled;
		// load the user picked language
		if (
			await this.loadNewLanguage(userLanguage)
		) {
			return userLanguage;
		}
		// load the language in which salesforce is currently set
		const sfLanguage = await sendExtensionMessage({
			what: WHAT_GET_SF_LANG,
		});
		if (await this.loadNewLanguage(sfLanguage)) {
			return sfLanguage;
		}
		return null;
	}

	/**
	 * Initializes or returns the singletonTranslator TranslationService instance,
	 * preloading fallback and active translations, and sets up change listeners.
	 *
	 * @return {Promise<TranslationService>}
	 *   Resolves to the singletonTranslator TranslationService, with fallback and current
	 *   language files loaded, and page translations applied.
	 */
	static async create() {
		if (singletonTranslator != null) {
			await singletonTranslator.loadLanguageBackground();
			return singletonTranslator;
		}
		singletonTranslator = new TranslationService(_translationSecret);
		// load the default language for fallback cases
		await singletonTranslator.loadLanguageFile(
			TranslationService.FALLBACK_LANGUAGE,
		);
		// load translations for user picked language or salesforce language
		singletonTranslator.currentLanguage = await singletonTranslator
			.loadLanguageBackground();
		if (await singletonTranslator.updatePageTranslations()) {
			singletonTranslator.setListenerForLanguageChange();
		}
		return singletonTranslator;
	}

	/**
	 * Loads the translation JSON for the specified language, caching the result.
	 * Falls back to a parent locale (e.g., "en" from "en_US") or the default fallback language on error.
	 *
	 * @param {string|null} [language=null] - The language code (e.g., "en", "fr_FR") to load.
	 * @throws {Error} Throws `"error_required_params"` if `language` is null.
	 * @return {Promise<Object>} Resolves to the loaded message map for the language.
	 *   If the file is already cached, returns the cached object.
	 *   On failure, attempts parent locale or returns the fallback language cache.
	 */
	async loadLanguageFile(language = null) {
		if (language == null) {
			console.trace();
			throw new Error("error_required_params");
		}
		if (this.caches[language] != null) {
			this.currentLanguage = language;
			return this.caches[language];
		}
		try {
			const jsonUrl = BROWSER.runtime.getURL(
				`/_locales/${language}/messages.json`,
			);
			const response = await fetch(jsonUrl);
			this.caches[language] = await response.json();
			this.currentLanguage = language;
			return this.caches[language];
		} catch (e) {
			console.error(`Failed to load language file for ${language}`, e);
			const index = language.indexOf("_");
			if (index > 0) {
				this.loadLanguageFile(language.substring(0, index));
			} else {
				this.currentLanguage = TranslationService.FALLBACK_LANGUAGE;
				return this.caches[TranslationService.FALLBACK_LANGUAGE];
			}
		}
	}

	/**
	 * retrieves the message related to the given key
	 * @param {string|Array} key - the key for which to find the message
	 * @return {string|undefined} the message found or nothing
	 * @throws TypeError if key is neither a string nor an Array
	 */
	#getMessageFromCache(key) {
		if (Array.isArray(key)) {
			return undefined;
		}
		if (typeof key !== "string") {
			throw new TypeError("error_required_params");
		}
		return this.caches?.[this.currentLanguage]?.[key]?.message;
	}

	/**
	 * Retrieves the translated message for a given key from the current language cache,
	 * falling back to a region-agnostic locale or the default fallback language.
	 * Throws an error if no translation is found.
	 *
	 * @private
	 * @param {string} key - The translation key to look up.
	 * @param {string} [connector=" "] - The string used to join compound error messages.
	 * @param {boolean} [isError=false] - Internal flag to avoid infinite recursion when translating error keys.
	 * @return {Promise<string>} Resolves to the translated message.
	 * @throws {Error} If the key is missing in all locale caches, throws an Error with a translated error message prefix.
	 */
	async #_translate(key, connector = " ", isError = false) {
		if (
			key.includes(" ") &&
			this.#getMessageFromCache(key) == null
		) {
			return key;
		}
		if (key.startsWith("$")) {
			key = key.slice(1);
		}
		// Check language-specific cache first
		const cacheMessage = this.#getMessageFromCache(key);
		if (cacheMessage != null) {
			return cacheMessage;
		}
		const loadedLanguage = await this.loadLanguageFile(
			this.currentLanguage,
		);
		let regionAgnosticLanguage = null;
		const index = this.currentLanguage.indexOf("_");
		if (index > 0) {
			regionAgnosticLanguage = await this.loadLanguageFile(
				this.currentLanguage.substring(0, index),
			);
		}
		// Get translation or fallback to region agnostic or fallback to default language
		const translation = loadedLanguage?.[key]?.message ??
			regionAgnosticLanguage?.[key]?.message ??
			this.caches[TranslationService.FALLBACK_LANGUAGE]?.[key]?.message;
		if (translation == null) {
			let errorMsg = "error_missing_key"; // fallback
			if (isError === false) {
				errorMsg = await this.#_translate(
					errorMsg,
					connector,
					true,
				);
			}
			throw new Error(`${errorMsg}: ${key}`);
		}
		return translation;
	}

	/**
	 * Translates one or more keys into the current language, processing nested placeholder tokens.
	 * If given an array of keys, translates each and joins them with the connector.
	 * For single-key translations, replaces tokens prefixed with `$` by recursively translating the inner key.
	 * On any error during lookup, returns the original key string.
	 *
	 * @param {string|string[]} key - A single translation key or an array of keys to translate.
	 * @param {string} [connector=" "] - The delimiter used to join multiple translated parts.
	 * @return {Promise<string>} Resolves to the fully translated string or the original key on failure.
	 */
	async translate(key, connector = " ") {
		// get all inner translations
		const cacheMessage = this.#getMessageFromCache(key);
		if (
			cacheMessage != null &&
			!cacheMessage.includes("$")
		) {
			return cacheMessage;
		}
		if (
			key.includes(" ") &&
			cacheMessage == null
		) {
			const translation = await this.translate(key.split(/\s+/));
			this.#addTranslationToCache(key, translation);
			return translation;
		}
		if (Array.isArray(key)) {
			return (await Promise.all(
				key.map((k) => this.translate(k)),
			))
				.join(connector);
		}
		// key is not an Array
		try {
			const keyTranslate = await this.#_translate(key);
			if (!keyTranslate.includes("$")) {
				return keyTranslate;
			}
			let messageTranslated = "";
			const words = keyTranslate.split(/\s+/);
			for (const word of words) {
				if (!word.startsWith("$")) {
					messageTranslated += ` ${word}`;
					continue;
				}
				const innerTranslation = await this.#_translate(word);
				if (innerTranslation.includes("$")) {
					messageTranslated += ` ${await this.translate(
						innerTranslation,
					)}`;
				} else {
					messageTranslated += ` ${innerTranslation}`;
				}
			}
			const finalTranslation = messageTranslated.slice(1); // remove beginning whitespace
			this.#addTranslationToCache(key, finalTranslation);
			return finalTranslation;
		} catch (e) {
			console.info(e);
			return key;
		}
	}

	/**
	 * add translation to cache
	 * @param {string} key - the key to add to cache
	 * @param {string} value - the value associated
	 */
	#addTranslationToCache(key, value) {
		try {
			if (
				typeof this.caches[this.currentLanguage][key] !== "object" ||
				this.caches[this.currentLanguage][key] === null
			) {
				this.caches[this.currentLanguage][key] = {};
			}
			this.caches[this.currentLanguage][key].message = value;
		} catch (e) {
			console.info(e);
			// no-op, would be better to add but it's not a necessary feature...
		}
	}

	/**
	 * Updates all translatable elements on the page to the specified language.
	 * Selects elements with the translate attribute and applies translated text or attributes.
	 *
	 * @param {string} [language=this.currentLanguage] - The language code to apply for translation.
	 * @return {Promise<boolean>}
	 *   Resolves to `false` if the `document` object is unavailable;
	 *   otherwise resolves after all elements have been updated.
	 */
	async updatePageTranslations(language = this.currentLanguage) {
		this.currentLanguage = language ?? TranslationService.FALLBACK_LANGUAGE;
		if (document == null) {
			return false;
		}
		const elements = document.querySelectorAll(
			`[${TranslationService.TRANSLATE_ELEMENT_ATTRIBUTE}]:not([${TranslationService.ATTRIBUTE_EXCLUDE}="true"])`,
		);
		for (const element of elements) {
			const toTranslateKey = element.getAttribute(
				TranslationService.TRANSLATE_ELEMENT_ATTRIBUTE,
			);
			const [key, ...attributes] = toTranslateKey.split(
				TranslationService.TRANSLATE_SEPARATOR,
			);
			const translation = (await this.translate(
				key,
			)).replaceAll("\n", "<br />");
			if (attributes == null) continue;
			if (attributes.length === 0) {
				attributes.push("textContent");
			}
			for (const attribute of attributes) {
				element[attribute] = translation;
			}
		}
	}

	/**
	 * Registers a listener on browser storage changes to re-run page translations
	 * when the user’s language setting is modified.
	 *
	 * @return {void}
	 */
	setListenerForLanguageChange() {
		BROWSER.storage.onChanged.addListener((changes) => {
			const pickedLanguageObj = changes[SETTINGS_KEY]?.newValue?.filter(
				(el) => el.id === USER_LANGUAGE,
			);
			if (pickedLanguageObj != null && pickedLanguageObj.length > 0) {
				this.updatePageTranslations(pickedLanguageObj[0].enabled);
			}
		});
	}
}

/**
 * Asynchronously retrieves the translator instance, initializing it if necessary.
 *
 * If the translator has not been initialized, it creates a new instance.
 * If initialization is already in progress (i.e., `singletonTranslator` is a Promise), it waits for it to complete.
 *
 * @return {Promise<TranslationService>} A promise that resolves to the translator instance.
 */
async function getTranslator_async() {
	if (singletonTranslator == null) {
		singletonTranslator = await TranslationService.create();
	} else if (singletonTranslator instanceof Promise) {
		await singletonTranslator;
	}
	return singletonTranslator;
}

/**
 * Returns the initialized translator instance.
 *
 * Throws an error if the translator has not been initialized or is still initializing.
 *
 * @throws {Error} If the translator is not yet initialized.
 * @return {TranslationService} The initialized translator instance.
 */
function getTranslator() {
	if (singletonTranslator == null || singletonTranslator instanceof Promise) {
		throw new Error("error_translator_not_initialized");
	}
	return singletonTranslator;
}

/**
 * Ensures that the translator service is available.
 *
 * Returns the initialized translator if available, otherwise attempts to initialize and return it.
 *
 * @return {Promise<TranslationService>} A promise that resolves to the translator instance.
 */
export default async function ensureTranslatorAvailability() {
	try {
		return getTranslator();
	} catch (e) {
		console.info(e);
		return await getTranslator_async();
	}
}
