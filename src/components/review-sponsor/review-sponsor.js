import {
	BROWSER,
	EXTENSION_USAGE_DAYS,
	HIDDEN_CLASS,
	ISCHROME,
	ISEDGE,
	ISFIREFOX,
	ISSAFARI,
} from "/constants.js";
import { injectStyle, getSettings } from "/functions.js";
import { ensureAllTabsAvailability } from "/tabContainer.js";
import ensureTranslatorAvailability from "/translator.js";
import { generateReviewSponsorSvgs } from "/salesforce/generator.js";

const REVIEW_TAB_THRESHOLD = 8;
const SPONSOR_TAB_THRESHOLD = 16;
const REVIEW_USAGE_DAYS_THRESHOLD = 20;
const SPONSOR_USAGE_DAYS_THRESHOLD = 40;

/**
 * Based on how many Tabs the user has saved and how long they have actively used the extension,
 * declares which support links should be shown
 * @param {Object} [param0={}] an object with the following keys
 * @param {TabContainer[]} [param0.allTabs=[]] - the Tabs saved by the user
 * @param {number} [param0.usageDays=0] - how many distinct days the user has used the extension
 * @return {{review: boolean, sponsor: boolean}} an object describing which links should be shown
 */
function shouldShowReviewOrSponsor({
	allTabs = [],
	usageDays = 0,
} = {}) {
	return {
		review: !ISSAFARI &&
			(
				allTabs.length >= REVIEW_TAB_THRESHOLD ||
				usageDays >= REVIEW_USAGE_DAYS_THRESHOLD
			),
		sponsor: allTabs.length >= SPONSOR_TAB_THRESHOLD ||
			usageDays >= SPONSOR_USAGE_DAYS_THRESHOLD,
	};
}
const EDGE_LINK =
	"https://microsoftedge.microsoft.com/addons/detail/again-why-salesforce/dfdjpokbfeaamjcomllncennmfhpldmm#description";
const CHROME_LINK =
	"https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi/reviews";
const FIREFOX_LINK =
	"https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/";
/**
 * Based on which browser the user is currently using, opens the extension's store link
 * @return undefined - nothing is really returned
 */
function openCorrectBrowserReviewLink() {
	if (ISEDGE) {
		return open(EDGE_LINK);
	}
	if (ISCHROME) {
		return open(CHROME_LINK);
	}
	if (ISFIREFOX) {
		return open(FIREFOX_LINK);
	}
}
const SPONSOR_DOMAIN = "https://alfredoit.dev";
const SPONSOR_PATH = "/sponsor/?email=againwhysalesforce@duck.com";
const SPONSOR_MAP = {
	it: `${SPONSOR_DOMAIN}/it${SPONSOR_PATH}`,
	default: `${SPONSOR_DOMAIN}/en${SPONSOR_PATH}`,
};
/**
 * Based on which language the user has set the extension to, opens the appropriate sponsor link
 * @param {TranslationService} [translator=null] - the TranslationService instance
 */
function openSponsorLink(translator = null) {
	open(
		SPONSOR_MAP[translator?.currentLanguage] ?? SPONSOR_MAP.default,
	);
}
/**
 * Using all the parameters, show the review / sponsor svgs by removing the hidden class; then add event listeners to open the correct links
 * @param {Object} [param0={}] an object with the following keys
 * @param {TabContainer[]} [param0.allTabs=null] - the TabContainer with all the user's Tabs
 * @param {number} [param0.usageDays=0] - how many distinct days the user has used the extension
 * @param {TranslationService} [param0.translator=null] - the TranslationService instance
 * @param {HTMLElement} [param0.reviewSvg=null] - the HTMLElement for the review svg
 * @param {HTMLElement} [param0.sponsorSvg=null] - the HTMLElement for the sponsor svg
 * @throws Error when even a single parameter was not passed correctly
 * @exports for tests
 */
export function showReviewOrSponsor({
	allTabs = null,
	usageDays = 0,
	translator = null,
	reviewSvg = null,
	sponsorSvg = null,
} = {}) {
	if (
		allTabs == null ||
		translator == null ||
		reviewSvg == null ||
		sponsorSvg == null
	) {
		throw new Error("error_required_params");
	}
	const whatToShow = shouldShowReviewOrSponsor({ allTabs, usageDays });
	if (whatToShow.review) {
		reviewSvg.classList.remove(HIDDEN_CLASS);
		reviewSvg.addEventListener("click", openCorrectBrowserReviewLink);
	}
	if (whatToShow.sponsor) {
		sponsorSvg.classList.remove(HIDDEN_CLASS);
		sponsorSvg.addEventListener(
			"click",
			() => openSponsorLink(translator),
		);
	}
}

/**
 * Class to take care of the review-sponsor svgs
 */
class ReviewSponsorAws extends HTMLElement {
	/**
	 * Creates everything used by the class
	 */
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: "open" });
		const result = generateReviewSponsorSvgs();
		shadow.appendChild(result.root);
		const linkEl = injectStyle(
			"awsf-rev-spons",
			{ link: BROWSER.runtime.getURL("./review-sponsor.css") },
		);
		this.shadowRoot.appendChild(linkEl);
		this._showReviewOrSponsor(result);
	}

	/**
	 * Retrieves the EXTENSION_USAGE_DAYS setting to find the number of days the extension has been actively used
	 * @return {number} the number of days the extension has been actively used
	 */
	async _getExtensionUsageDays() {
		const usageSettings = await getSettings([
			EXTENSION_USAGE_DAYS,
		]);
		return usageSettings.enabled;
	}

	/**
	 * Retrieves the TranslationService and the TabContainer then shows the review or sponsor button (or both) based on how many Tabs have been saved
	 * @param {Object} result - what was generated by generateReviewSponsorSvgs
	 */
	async _showReviewOrSponsor(result) {
		const [translator, allTabs, usageDays] = await Promise.all([
			ensureTranslatorAvailability(),
			ensureAllTabsAvailability(),
			this._getExtensionUsageDays(),
		]);
		showReviewOrSponsor(Object.assign(result, {
			allTabs,
			translator,
			usageDays,
		}));
		// add titles and alts
		const reviewMsg = await translator.translate("write_review");
		result.reviewLink.title = reviewMsg;
		result.reviewSvg.alt = reviewMsg;
		const sponsorMsg = await translator.translate("send_tip");
		result.sponsorLink.title = sponsorMsg;
		result.sponsorSvg.alt = sponsorMsg;
	}
}

customElements.define("review-sponsor-aws", ReviewSponsorAws);
