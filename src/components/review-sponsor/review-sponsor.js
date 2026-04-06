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
import ensureTranslatorAvailability from "../../core/translator.js";
import { generateReviewSponsorSvgs } from "../../salesforce/generator.js";

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
 * @param {HTMLAnchorElement} [param0.reviewLink=null] - the anchor wrapping the review svg
 * @param {HTMLAnchorElement} [param0.sponsorLink=null] - the anchor wrapping the sponsor svg
 * @throws Error when even a single parameter was not passed correctly
 * @exports for tests
 */
export function showReviewOrSponsor({
	allTabs = null,
	usageDays = 0,
	translator = null,
	reviewSvg = null,
	sponsorSvg = null,
	reviewLink = null,
	sponsorLink = null,
} = {}) {
	if (
		allTabs == null ||
		translator == null ||
		reviewSvg == null ||
		sponsorSvg == null ||
		reviewLink == null ||
		sponsorLink == null
	) {
		throw new Error("error_required_params");
	}
	const whatToShow = shouldShowReviewOrSponsor({ allTabs, usageDays });
	reviewSvg.classList.toggle(HIDDEN_CLASS, !whatToShow.review);
	sponsorSvg.classList.toggle(HIDDEN_CLASS, !whatToShow.sponsor);
	reviewSvg.setAttribute("aria-hidden", String(!whatToShow.review));
	sponsorSvg.setAttribute("aria-hidden", String(!whatToShow.sponsor));
	reviewLink.setAttribute("aria-hidden", String(!whatToShow.review));
	sponsorLink.setAttribute("aria-hidden", String(!whatToShow.sponsor));
	reviewLink.tabIndex = whatToShow.review ? 0 : -1;
	sponsorLink.tabIndex = whatToShow.sponsor ? 0 : -1;
	if (whatToShow.review) {
		reviewLink.addEventListener("click", (event) => {
			event.preventDefault();
			openCorrectBrowserReviewLink();
		});
	}
	if (whatToShow.sponsor) {
		sponsorLink.addEventListener("click", (event) => {
			event.preventDefault();
			openSponsorLink(translator);
		});
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
			{
				link: BROWSER.runtime.getURL(
					"/components/review-sponsor/review-sponsor.css",
				),
			},
		);
		this.shadowRoot.appendChild(linkEl);
		this._reviewSponsorResult = result;
		this._readyPromise = null;
	}

	/**
	 * Starts the async initialization when the element is connected to the DOM.
	 */
	connectedCallback() {
		this._ensureReadyPromise();
	}

	/**
	 * Resolves when the component has finished loading its async metadata.
	 * @return {Promise<void>} Promise resolved after async setup completes.
	 */
	whenReady() {
		return this._ensureReadyPromise();
	}

	/**
	 * Creates and memoizes the async initialization Promise.
	 * @return {Promise<void>} Promise resolved after async setup completes.
	 */
	_ensureReadyPromise() {
		if (this._readyPromise == null) {
			this._readyPromise = this._showReviewOrSponsor(
				this._reviewSponsorResult,
			);
		}
		return this._readyPromise;
	}

	/**
	 * Retrieves the EXTENSION_USAGE_DAYS setting to find the number of days the extension has been actively used
	 * @return {Promise<number>} the number of days the extension has been actively used
	 */
	async _getExtensionUsageDays() {
		const usageSettings = await getSettings([
			EXTENSION_USAGE_DAYS,
		]);
		return usageSettings?.enabled;
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
		// add accessible names to icon-only links
		const [reviewMsg, sponsorMsg] = await Promise.all([
			translator.translate("write_review"),
			translator.translate("send_tip"),
		]);
		result.reviewLink.title = reviewMsg;
		result.reviewLink.setAttribute("aria-label", reviewMsg);
		result.reviewSvg.setAttribute("focusable", "false");
		result.sponsorLink.title = sponsorMsg;
		result.sponsorLink.setAttribute("aria-label", sponsorMsg);
		result.sponsorSvg.setAttribute("focusable", "false");
	}
}

customElements.define("review-sponsor-aws", ReviewSponsorAws);
