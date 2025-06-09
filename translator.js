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
	static TRANSLATE_ELEMENT_ATTRIBUTE = "data-i18n";
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
	 * Load user's language preference from storage
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
	 * Lazy-load translations from external files
	 * @param {string} language - Language code to load
	 * @returns {Promise<Object>} Loaded translations
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
	 * Translate a key to the current language
	 * @param {string} key - The translation key
	 * @returns {string} Translated text
	 */
	async _translate(key, connector = " ", isError = false) {
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
				errorMsg = await this._translate(
					errorMsg,
					connector,
					true,
				);
			}
			throw new Error(`${errorMsg}: ${key}`);
		}
		return translation;
	}

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
			const keyTranslate = await this._translate(key);
			if (keyTranslate.indexOf("$") < 0) {
				return keyTranslate;
			}
			let messageTranslated = "";
			const words = keyTranslate.split(/\s+/);
			for (const word of words) {
				if (!word.startsWith("\$")) {
					messageTranslated += ` ${word}`;
					continue;
				}
				const innerTranslation = await this._translate(word.slice(1));
				messageTranslated += ` ${innerTranslation}`;
			}
			return messageTranslated.slice(1);
		} catch (_) {
			return key;
		}
	}

	/**
	 * Update all translatable elements on the page
	 * @returns {boolean} whether the page translations have been setup or not
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
			//const translation = await BROWSER.i18n.getMessage(key);
			if (attributes == null) continue;
			if (attributes.length === 0) {
				attributes.push("textContent");
			}
			for (const attribute of attributes) {
				element[attribute] = translation;
			}
		}
	}

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
	} catch (_) {
		return await getTranslator_async();
	}
}
