import {
	BROWSER,
	HIDDEN_CLASS,
	POPUP_LOGIN_NEW_TAB,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_SETUP_NEW_TAB,
	SALESFORCE_LIGHTNING_PATTERN,
	SALESFORCE_SETUP_HOME_MINI,
	SETUP_LIGHTNING,
	WHAT_GET_BROWSER_TAB,
} from "../../core/constants.js";
import { getSettings, sendExtensionMessage } from "../../core/functions.js";
import { ensureTranslatorAvailability } from "../../core/translator.js";
import "../themeHandler.js";
import { runNotSalesforceSetup } from "./notSalesforceSetup-runtime.js";

await runNotSalesforceSetup({
	browser: BROWSER,
	ensureTranslatorAvailabilityFn: ensureTranslatorAvailability,
	getSettingsFn: getSettings,
	hiddenClass: HIDDEN_CLASS,
	popupLoginNewTab: POPUP_LOGIN_NEW_TAB,
	popupOpenLogin: POPUP_OPEN_LOGIN,
	popupOpenSetup: POPUP_OPEN_SETUP,
	popupSetupNewTab: POPUP_SETUP_NEW_TAB,
	salesforceLightningPattern: SALESFORCE_LIGHTNING_PATTERN,
	salesforceSetupHomeMini: SALESFORCE_SETUP_HOME_MINI,
	sendExtensionMessageFn: sendExtensionMessage,
	setupLightning: SETUP_LIGHTNING,
	whatGetBrowserTab: WHAT_GET_BROWSER_TAB,
});
