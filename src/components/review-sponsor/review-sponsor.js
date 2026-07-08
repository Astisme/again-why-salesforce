import {
	BROWSER,
	EXTENSION_USAGE_DAYS,
	HIDDEN_CLASS,
	ISCHROME,
	ISEDGE,
	ISFIREFOX,
	ISSAFARI,
} from "../../core/constants.js";
import { getSettings, injectStyle } from "../../core/functions.js";
import { ensureAllTabsAvailability } from "../../core/tabContainer.js";
import { TranslationService } from "../../core/translator.js";
import { generateReviewSponsorSvgs } from "../../salesforce/generator.js";
import { createReviewSponsorModule } from "./review-sponsor-runtime.js";

const { showReviewOrSponsor } = createReviewSponsorModule({
	browser: BROWSER,
	extensionUsageDays: EXTENSION_USAGE_DAYS,
	hiddenClass: HIDDEN_CLASS,
	isChrome: ISCHROME,
	isEdge: ISEDGE,
	isFirefox: ISFIREFOX,
	isSafari: ISSAFARI,
	getSettingsFn: getSettings,
	injectStyleFn: injectStyle,
	ensureAllTabsAvailabilityFn: ensureAllTabsAvailability,
	getTranslationsFn: TranslationService.getTranslations,
	getTranslatorAttributeFn: TranslationService.getTranslatorAttribute,
	generateReviewSponsorSvgsFn: generateReviewSponsorSvgs,
});

export { showReviewOrSponsor };
