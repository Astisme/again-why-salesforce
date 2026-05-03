import { BROWSER, HIDDEN_CLASS } from "../../core/constants.js";
import { injectStyle } from "../../core/functions.js";
import { generateHelpWith_i_popup } from "../../salesforce/generator.js";
import { getTranslations } from "../../core/translator.js";
import { registerHelpComponent } from "./help-runtime.js";

registerHelpComponent({
	browser: BROWSER,
	generateHelpWithPopupFn: generateHelpWith_i_popup,
	getTranslationsFn: getTranslations,
	hiddenClass: HIDDEN_CLASS,
	injectStyleFn: injectStyle,
});
