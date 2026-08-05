import { BROWSER, HIDDEN_CLASS } from "../../core/constants.js";
import { injectStyle } from "../../core/functions.js";
import { generateHelpWith_i_popup } from "../../salesforce/generator.js";
import { TranslationService } from "../../core/translator.js";
import { registerHelpComponent } from "./help-runtime.js";

registerHelpComponent({
	browser: BROWSER,
	generateHelpWithPopup: generateHelpWith_i_popup,
	getTranslations: TranslationService.getTranslations,
	hiddenClass: HIDDEN_CLASS,
	injectStyle: injectStyle,
});
