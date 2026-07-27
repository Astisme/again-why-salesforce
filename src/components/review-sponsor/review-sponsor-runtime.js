"use strict";

import {
	BROWSER,
	EXTENSION_USAGE_DAYS,
	HIDDEN_CLASS,
	ISCHROME,
	ISEDGE,
	ISFIREFOX,
	ISSAFARI,
} from "../../core/constants.js";
import {
	getSettings,
	injectStyle,
	openCorrectBrowserReviewLink,
	openSponsorLink,
	shouldShowReviewOrSponsor,
} from "../../core/functions.js";
import { ensureAllTabsAvailability } from "../../core/tabContainer.js";
import { TranslationService } from "../../core/translator.js";
import { generateReviewSponsorSvgs } from "../../salesforce/generator.js";
import { createReviewSponsorModule as createReviewSponsorPureModule } from "./review-sponsor-module.js";

/**
 * Builds runtime defaults for review/sponsor component wiring.
 *
 * @return {Object} Runtime defaults.
 */
export function getReviewSponsorRuntimeDefaults() {
	return {
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
		shouldShowReviewOrSponsorFn: shouldShowReviewOrSponsor,
		openCorrectBrowserReviewLinkFn: openCorrectBrowserReviewLink,
		openSponsorLinkFn: openSponsorLink,
		generateReviewSponsorSvgsFn: generateReviewSponsorSvgs,
	};
}

/**
 * Creates and registers review/sponsor UI behavior with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime dependency overrides.
 * @return {{
 *   ReviewSponsorAws: typeof HTMLElement;
 *   showReviewOrSponsor: (options?: Record<string, unknown>) => void;
 * }} Public API for runtime and tests.
 */
export function createReviewSponsorModule(overrides = {}) {
	return createReviewSponsorPureModule({
		...getReviewSponsorRuntimeDefaults(),
		...overrides,
	});
}
