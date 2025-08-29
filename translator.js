import {
	BROWSER,
	FOLLOW_SF_LANG,
	sendExtensionMessage,
	SETTINGS_KEY,
	USER_LANGUAGE,
} from "/constants.js";
const _translationSecret = Symbol("translationSecret");
let singleton = null;

/**
 * Service for handling text translations in a browser extension.
 * Uses language-specific caches to improve performance.
 */
class TranslationService {
	static FALLBACK_LANGUAGE = "en";
	static TRANSLATE_DATASET = "i18n";
	static TRANSLATE_ELEMENT_ATTRIBUTE =
		`data-${TranslationService.TRANSLATE_DATASET}`;
	static TRANSLATE_SEPARATOR = "+-+";
	static ATTRIBUTE_EXCLUDE = "data-exclude-automatic-i18n";

	/** @type {string} Current language code */
	currentLanguage = TranslationService.FALLBACK_LANGUAGE;
	/** @type {Object.<string, Object.<string, string>>} Cache organized by language */
	caches = {};

	/**
	 * Initialize translation service with default language
	 * @constructor
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
	 * @returns {Promise<boolean>}
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
	 * @returns {Promise<string|null>}
	 *   Resolves to the language code that was successfully loaded;
	 *   or `null` if neither the user’s preference nor Salesforce language could be loaded.
	 */
	async loadLanguageBackground() {
		const userLanguage = (await sendExtensionMessage({
			what: "get-settings",
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
			what: "get-sf-language",
		});
		if (await this.loadNewLanguage(sfLanguage)) {
			return sfLanguage;
		}
		return null;
	}

	/**
	 * Initializes or returns the singleton TranslationService instance,
	 * preloading fallback and active translations, and sets up change listeners.
	 *
	 * @returns {Promise<TranslationService>}
	 *   Resolves to the singleton TranslationService, with fallback and current
	 *   language files loaded, and page translations applied.
	 */
	static async create() {
		if (singleton != null) {
			await singleton.loadLanguageBackground();
			return singleton;
		}
		singleton = new TranslationService(_translationSecret);
		// load the default language for fallback cases
		await singleton.loadLanguageFile(TranslationService.FALLBACK_LANGUAGE);
		// load translations for user picked language or salesforce language
		singleton.currentLanguage = await singleton.loadLanguageBackground();
		if (await singleton.updatePageTranslations()) {
			singleton.setListenerForLanguageChange();
		}
		return singleton;
	}

	/**
	 * Loads the translation JSON for the specified language, caching the result.
	 * Falls back to a parent locale (e.g., "en" from "en_US") or the default fallback language on error.
	 *
	 * @param {string|null} [language=null] - The language code (e.g., "en", "fr_FR") to load.
	 * @throws {Error} Throws `"error_required_params"` if `language` is null.
	 * @returns {Promise<Object>} Resolves to the loaded message map for the language.
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
			const jsonUrl = await BROWSER.runtime.getURL(
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
	 * Retrieves the translated message for a given key from the current language cache,
	 * falling back to a region-agnostic locale or the default fallback language.
	 * Throws an error if no translation is found.
	 *
	 * @private
	 * @param {string} key - The translation key to look up.
	 * @param {string} [connector=" "] - The string used to join compound error messages.
	 * @param {boolean} [isError=false] - Internal flag to avoid infinite recursion when translating error keys.
	 * @returns {Promise<string>} Resolves to the translated message.
	 * @throws {Error} If the key is missing in all locale caches, throws an Error with a translated error message prefix.
	 */
	async #_translate(key, connector = " ", isError = false) {
		// Check language-specific cache first
		if (this.caches[this.currentLanguage]?.[key]?.message != null) {
			return this.caches[this.currentLanguage][key].message;
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
	 * @returns {Promise<string>} Resolves to the fully translated string or the original key on failure.
	 */
	async translate(key, connector = " ") {
		// get all inner translations
		if (Array.isArray(key)) {
			const compoundTranslation = [];
			for (const k of key) {
				const kTranslate = await this.translate(k);
				compoundTranslation.push(kTranslate);
			}
			return compoundTranslation.join(connector);
		}
		// key is not an Array
		try {
			const keyTranslate = await this.#_translate(key);
			if (keyTranslate.indexOf("$") < 0) {
				return keyTranslate;
			}
			let messageTranslated = "";
			const words = keyTranslate.split(/\s+/);
			for (const word of words) {
				if (!word.startsWith("$")) {
					messageTranslated += ` ${word}`;
					continue;
				}
				const innerTranslation = await this.#_translate(word.slice(1));
				messageTranslated += ` ${innerTranslation}`;
			}
			return messageTranslated.slice(1);
		} catch (e) {
            console.info(e);
			return key;
		}
	}

	/**
	 * Updates all translatable elements on the page to the specified language.
	 * Selects elements with the translate attribute and applies translated text or attributes.
	 *
	 * @param {string} [language=this.currentLanguage] - The language code to apply for translation.
	 * @returns {Promise<boolean>}
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
	 * @returns {void}
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

	/**
	 * Retrieves the separator string used to split translation keys
	 * from the static translation attribute.
	 *
	 * @returns {string} The configured translation separator.
	 */
	getSeparator() {
		return TranslationService.TRANSLATE_SEPARATOR;
	}

	/**
	 * Retrieves the dataset attribute name used on elements
	 * to hold translation keys.
	 *
	 * @returns {string} The dataset key for translation attributes.
	 */
	getTranslateAttributeDataset() {
		return TranslationService.TRANSLATE_DATASET;
	}
}

/**
 * Asynchronously retrieves the translator instance, initializing it if necessary.
 *
 * If the translator has not been initialized, it creates a new instance.
 * If initialization is already in progress (i.e., `singleton` is a Promise), it waits for it to complete.
 *
 * @returns {Promise<TranslationService>} A promise that resolves to the translator instance.
 */
async function getTranslator_async() {
	if (singleton == null) {
		singleton = await TranslationService.create();
	} else if (singleton instanceof Promise) {
		await singleton;
	}
	return singleton;
}

/**
 * Returns the initialized translator instance.
 *
 * Throws an error if the translator has not been initialized or is still initializing.
 *
 * @throws {Error} If the translator is not yet initialized.
 * @returns {TranslationService} The initialized translator instance.
 */
function getTranslator() {
	if (singleton == null || singleton instanceof Promise) {
		throw new Error("error_translator_not_initialized");
	}
	return singleton;
}

/**
 * Ensures that the translator service is available.
 *
 * Returns the initialized translator if available, otherwise attempts to initialize and return it.
 *
 * @returns {Promise<TranslationService>} A promise that resolves to the translator instance.
 */
export default async function ensureTranslatorAvailability() {
	try {
		return getTranslator();
	} catch (e) {
        console.info(e);
		return await getTranslator_async();
	}
}
