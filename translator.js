import { BROWSER, LOCALE_KEY } from "/constants.js";
const _translationSecret = Symbol("translationSecret");
let singleton = null;

async function sendMessage(message){
    return await BROWSER.runtime.sendMessage({message});
}

/**
 * Service for handling text translations in a browser extension.
 * Uses language-specific caches to improve performance.
 */
export class TranslationService {
	static DEFAULT_LANGUAGE = "en";
	static TRANSLATE_ELEMENT_ATTRIBUTE = "data-i18n";
    static TRANSLATE_SEPARATOR = "+-+";
	/** @type {string} Current language code */
	currentLanguage = TranslationService.DEFAULT_LANGUAGE;
	/** @type {Object.<string, Object.<string, string>>} Cache organized by language */
	caches = {};

	/**
	 * Initialize translation service with default language
	 * @constructor
	 */
	constructor(secret) {
		if (secret !== _translationSecret) {
			throw new Error(
				"Use TranslationService.create() instead of new TranslationService()",
			);
		}
	}

    async loadNewLanguage(language = null){
        if(language != null && language != this.currentLanguage)
            await this.loadLanguageFile(language);
    }

    async loadSalesforceLanguage(){
        const sfLanguage = await sendMessage({what: "get-sf-language"});
        await this.loadNewLanguage(sfLanguage);
    }

    async loadSavedLanguage(){
        const savedLanguage = await sendMessage({what: "get-language"});
        await this.loadNewLanguage(savedLanguage);
    }

	/**
	 * Load user's language preference from storage
	 */
	static async create() {
		if (singleton != null) {
            await singleton.loadSalesforceLanguage();
			return singleton;
		}
		singleton = new TranslationService(_translationSecret);
        // load the default language for fallback cases
        await singleton.loadLanguageFile(TranslationService.DEFAULT_LANGUAGE);
        // load the user picked language
        await singleton.loadSavedLanguage();
        // load the language in which salesforce is currently set
        await singleton.loadSalesforceLanguage();
        await singleton.updatePageTranslations();
        singleton.setListenerForLanguageChange();
		return singleton;
	}

	/**
	 * Lazy-load translations from external files
	 * @param {string} language - Language code to load
	 * @returns {Promise<Object>} Loaded translations
	 */
	async loadLanguageFile(language = null) {
        if(language == null){
            throw new Error("Be sure to insert a language to load.");
        }
		if (this.caches[language] != null) {
            this.currentLanguage = language;
			return this.caches[language];
		}
		try {
            const jsonUrl = await BROWSER.runtime.getURL(`/_locales/${language}/messages.json`);
			const response = await fetch(jsonUrl);
			this.caches[language] = await response.json();
            this.currentLanguage = language;
			return this.caches[language];
		} catch (e) {
			console.error(`Failed to load language file for ${language}`, e);
            const index = language.indexOf("_");
            if(index > 0)
                this.loadLanguageFile(language.substring(0, index));
            else {
                this.currentLanguage = TranslationService.DEFAULT_LANGUAGE;
                return this.caches[TranslationService.DEFAULT_LANGUAGE];
            }
		}
	}

	/**
	 * Translate a key to the current language
	 * @param {string} key - The translation key
	 * @returns {string} Translated text
	 */
	async translate(key, language = this.currentLanguage, isError = false) {
        if(key instanceof Array){
            const compoundTranslation = [];
            for(const k of key)
                try {
                    compoundTranslation.push(await this.translate(k, language, isError));
                } catch (_) {
                    compoundTranslation.push(k);
                }
            return compoundTranslation.join(" ");
        }
		// Check language-specific cache first
		if (this.caches[language]?.[key]?.message != null) {
			return this.caches[language][key].message;
		}
        const loadedLanguage = await this.loadLanguageFile(language);
        let regionAgnosticLanguage = null;
        const index = language.indexOf("_");
        if(index > 0)
            regionAgnosticLanguage = await this.loadLanguageFile(language.substring(0, index));
		// Get translation or fallback to region agnostic or fallback to default language
		const translation = loadedLanguage?.[key]?.message ??
            regionAgnosticLanguage?.[key]?.message ??
			this.caches[TranslationService.DEFAULT_LANGUAGE]?.[key]?.message;
        if(translation == null){
            let errorMsg =  "Key not found anywhere";
            if(isError === false)
                errorMsg = await this.translate("error_missing_key", language, true);
            throw new Error(`${errorMsg}: ${key}`);
        }
        return translation
	}

	/**
	 * Update all translatable elements on the page
	 */
	async updatePageTranslations(language = this.currentLanguage) {
        this.currentLanguage = language;
		const elements = document.querySelectorAll(
			`[${TranslationService.TRANSLATE_ELEMENT_ATTRIBUTE}]`,
		);
        for(const element of elements){
            const toTranslateKey = element.getAttribute(
                TranslationService.TRANSLATE_ELEMENT_ATTRIBUTE,
            );
            const [key, ...attributes] = toTranslateKey.split(TranslationService.TRANSLATE_SEPARATOR);
            const translation = await this.translate(
                key,
                language,
            );
            //const translation = await BROWSER.i18n.getMessage(key);
            for(const attribute of attributes)
                element[attribute] = translation;
        }
	}

    setListenerForLanguageChange(){
        BROWSER.storage.onChanged.addListener((changes) => {
            console.log('storage-changed',changes);
          if (changes[LOCALE_KEY] != null) {
            this.updatePageTranslations(changes[LOCALE_KEY].newValue);
          }
        });
    }
}

async function getTranslator_async(){
    if(singleton == null){
        singleton = await TranslationService.create();
    }
    else if(singleton instanceof Promise)
        await singleton;
    return singleton;
}
getTranslator_async();

function getTranslator(){
    if(singleton == null || singleton instanceof Promise)
        throw new Error("translator was not yet initialized");
    return singleton;
}

export async function ensureTranslatorAvailability(){
    try {
        return getTranslator();
    } catch (_) {
        return await getTranslator_async();
    }
}
