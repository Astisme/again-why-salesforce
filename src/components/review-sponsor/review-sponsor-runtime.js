const REVIEW_TAB_THRESHOLD = 8;
const SPONSOR_TAB_THRESHOLD = 16;
const REVIEW_USAGE_DAYS_THRESHOLD = 20;
const SPONSOR_USAGE_DAYS_THRESHOLD = 40;
const EDGE_LINK =
	"https://microsoftedge.microsoft.com/addons/detail/again-why-salesforce/dfdjpokbfeaamjcomllncennmfhpldmm#description";
const CHROME_LINK =
	"https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi/reviews";
const FIREFOX_LINK =
	"https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/";
const SPONSOR_DOMAIN = "https://alfredoit.dev";
const SPONSOR_PATH = "/sponsor/?email=againwhysalesforce@duck.com";
const SPONSOR_MAP = {
	it: `${SPONSOR_DOMAIN}/it${SPONSOR_PATH}`,
	default: `${SPONSOR_DOMAIN}/en${SPONSOR_PATH}`,
};
let hiddenClassRuntime;
let isChromeRuntime;
let isEdgeRuntime;
let isFirefoxRuntime;
let isSafariRuntime;
let openRuntime;

/**
 * Based on how many Tabs the user has saved and how long they have actively used the extension,
 * declares which support links should be shown.
 *
 * @param {Object} [param0={}] Input values.
 * @param {unknown[]} [param0.allTabs=[]] Saved tabs.
 * @param {number} [param0.usageDays=0] Distinct usage days.
 * @return {{review: boolean, sponsor: boolean}} Visibility map.
 */
function shouldShowReviewOrSponsor({
	allTabs = [],
	usageDays = 0,
} = {}) {
	return {
		review: !isSafariRuntime &&
			(
				allTabs.length >= REVIEW_TAB_THRESHOLD ||
				usageDays >= REVIEW_USAGE_DAYS_THRESHOLD
			),
		sponsor: allTabs.length >= SPONSOR_TAB_THRESHOLD ||
			usageDays >= SPONSOR_USAGE_DAYS_THRESHOLD,
	};
}

/**
 * Based on which browser the user is currently using, opens the extension's store link.
 */
function openCorrectBrowserReviewLink() {
	if (isEdgeRuntime) {
		return openRuntime(EDGE_LINK);
	}
	if (isChromeRuntime) {
		return openRuntime(CHROME_LINK);
	}
	if (isFirefoxRuntime) {
		return openRuntime(FIREFOX_LINK);
	}
}

/**
 * Based on language, opens the appropriate sponsor link.
 *
 * @param {string|null} [translatorLanguage=null] Preferred language code.
 */
function openSponsorLink(translatorLanguage = null) {
	openRuntime(
		SPONSOR_MAP[translatorLanguage] ?? SPONSOR_MAP.default,
	);
}

/**
 * Shows review/sponsor controls and binds click listeners.
 *
 * @param {Object} [param0={}] Input values.
 * @param {unknown[] | null} [param0.allTabs=null] Saved tab list.
 * @param {number} [param0.usageDays=0] Distinct usage days.
 * @param {string | null} [param0.translatorLanguage=null] Preferred language code.
 * @param {HTMLElement | null} [param0.reviewSvg=null] Review SVG element.
 * @param {HTMLElement | null} [param0.sponsorSvg=null] Sponsor SVG element.
 * @param {HTMLAnchorElement | null} [param0.reviewLink=null] Review link.
 * @param {HTMLAnchorElement | null} [param0.sponsorLink=null] Sponsor link.
 */
function showReviewOrSponsor({
	allTabs = null,
	usageDays = 0,
	translatorLanguage = null,
	reviewSvg = null,
	sponsorSvg = null,
	reviewLink = null,
	sponsorLink = null,
} = {}) {
	if (
		allTabs == null ||
		reviewSvg == null ||
		sponsorSvg == null ||
		reviewLink == null ||
		sponsorLink == null
	) {
		throw new Error("error_required_params");
	}
	const whatToShow = shouldShowReviewOrSponsor({ allTabs, usageDays });
	reviewSvg.classList.toggle(hiddenClassRuntime, !whatToShow.review);
	sponsorSvg.classList.toggle(hiddenClassRuntime, !whatToShow.sponsor);
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
			openSponsorLink(translatorLanguage);
		});
	}
}

/**
 * Creates and registers review/sponsor UI behavior with injected dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ runtime: { getURL: (path: string) => string } }} options.browser Browser runtime wrapper.
 * @param {string} options.extensionUsageDays Setting key that stores usage-day count.
 * @param {string} options.hiddenClass CSS class used to hide inactive controls.
 * @param {boolean} options.isChrome Browser flag.
 * @param {boolean} options.isEdge Browser flag.
 * @param {boolean} options.isFirefox Browser flag.
 * @param {boolean} options.isSafari Browser flag.
 * @param {(keys: string[]) => Promise<{ enabled?: number } | null | undefined>} options.getSettingsFn Settings reader.
 * @param {(id: string, options: { link: string }) => unknown} options.injectStyleFn Style injector.
 * @param {() => Promise<Array<unknown>>} options.ensureAllTabsAvailabilityFn Tabs resolver.
 * @param {(message: string) => Promise<string>} options.getTranslationsFn Translator helper.
 * @param {(attribute: string) => string | null} options.getTranslatorAttributeFn Translator attribute resolver.
 * @param {() => {
 *   reviewLink: {
 *     addEventListener: (type: string, listener: (event: Event) => void) => void;
 *     setAttribute: (name: string, value: string) => void;
 *     tabIndex: number;
 *     title: string;
 *   };
 *   reviewSvg: {
 *     classList: { toggle: (name: string, force?: boolean) => void };
 *     setAttribute: (name: string, value: string) => void;
 *   };
 *   root: { appendChild: (child: unknown) => unknown };
 *   sponsorLink: {
 *     addEventListener: (type: string, listener: (event: Event) => void) => void;
 *     setAttribute: (name: string, value: string) => void;
 *     tabIndex: number;
 *     title: string;
 *   };
 *   sponsorSvg: {
 *     classList: { toggle: (name: string, force?: boolean) => void };
 *     setAttribute: (name: string, value: string) => void;
 *   };
 * }} options.generateReviewSponsorSvgsFn SVG factory.
 * @param {{ define: (name: string, constructor: unknown) => void }} [options.customElementsRef=customElements] Custom-elements registry.
 * @param {(url: string | URL) => unknown} [options.openFn=open] Link opener.
 * @param {typeof HTMLElement} [options.HTMLElementRef=HTMLElement] Base HTMLElement constructor.
 * @return {{
 *   ReviewSponsorAws: typeof HTMLElement;
 *   showReviewOrSponsor: (options?: {
 *     allTabs?: Array<unknown> | null;
 *     usageDays?: number;
 *     translatorLanguage?: string | null;
 *     reviewSvg?: {
 *       classList: { toggle: (name: string, force?: boolean) => void };
 *       setAttribute: (name: string, value: string) => void;
 *     } | null;
 *     sponsorSvg?: {
 *       classList: { toggle: (name: string, force?: boolean) => void };
 *       setAttribute: (name: string, value: string) => void;
 *     } | null;
 *     reviewLink?: {
 *       addEventListener: (type: string, listener: (event: Event) => void) => void;
 *       setAttribute: (name: string, value: string) => void;
 *       tabIndex: number;
 *     } | null;
 *     sponsorLink?: {
 *       addEventListener: (type: string, listener: (event: Event) => void) => void;
 *       setAttribute: (name: string, value: string) => void;
 *       tabIndex: number;
 *     } | null;
 *   }) => void;
 * }} Public API for runtime and tests.
 */
export function createReviewSponsorModule({
	browser,
	extensionUsageDays,
	hiddenClass,
	isChrome,
	isEdge,
	isFirefox,
	isSafari,
	getSettingsFn,
	injectStyleFn,
	ensureAllTabsAvailabilityFn,
	getTranslationsFn,
	getTranslatorAttributeFn,
	generateReviewSponsorSvgsFn,
	customElementsRef = customElements,
	openFn = open,
	HTMLElementRef = HTMLElement,
}) {
	hiddenClassRuntime = hiddenClass;
	isChromeRuntime = isChrome;
	isEdgeRuntime = isEdge;
	isFirefoxRuntime = isFirefox;
	isSafariRuntime = isSafari;
	openRuntime = openFn;

	/**
	 * Class to take care of the review-sponsor svgs.
	 */
	class ReviewSponsorAws extends HTMLElementRef {
		/**
		 * Creates everything used by the class.
		 */
		constructor() {
			super();
			const shadow = this.attachShadow({ mode: "open" });
			const result = generateReviewSponsorSvgsFn();
			shadow.appendChild(result.root);
			const linkEl = injectStyleFn(
				"awsf-rev-spons",
				{
					link: browser.runtime.getURL(
						"/components/review-sponsor/review-sponsor.css",
					),
				},
			);
			this.shadowRoot.appendChild(linkEl);
			this._reviewSponsorResult = result;
			this._readyPromise = null;
		}

		/**
		 * Starts async initialization when connected.
		 */
		connectedCallback() {
			this._ensureReadyPromise();
		}

		/**
		 * Resolves when the component has finished loading async metadata.
		 *
		 * @return {Promise<void>} Initialization promise.
		 */
		whenReady() {
			return this._ensureReadyPromise();
		}

		/**
		 * Creates and memoizes the async initialization Promise.
		 *
		 * @return {Promise<void>} Initialization promise.
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
		 * Retrieves extension usage days from settings.
		 *
		 * @return {Promise<number | undefined>} Usage days.
		 */
		async _getExtensionUsageDays() {
			const usageSettings = await getSettingsFn([
				extensionUsageDays,
			]);
			return usageSettings?.enabled;
		}

		/**
		 * Resolves metadata and applies visibility rules.
		 *
		 * @param {{
		 *   reviewLink: {
		 *     setAttribute: (name: string, value: string) => void;
		 *     title: string;
		 *   };
		 *   reviewSvg: { setAttribute: (name: string, value: string) => void; };
		 *   sponsorLink: {
		 *     setAttribute: (name: string, value: string) => void;
		 *     title: string;
		 *   };
		 *   sponsorSvg: { setAttribute: (name: string, value: string) => void; };
		 * }} result Rendered element references.
		 */
		async _showReviewOrSponsor(result) {
			const [
				reviewMsg,
				sponsorMsg,
				allTabs,
				usageDays,
				translatorLanguage,
			] = await Promise.all([
				getTranslationsFn("write_review"),
				getTranslationsFn("send_tip"),
				ensureAllTabsAvailabilityFn(),
				this._getExtensionUsageDays(),
				getTranslatorAttributeFn("currentLanguage"),
			]);
			showReviewOrSponsor(Object.assign(result, {
				allTabs,
				translatorLanguage,
				usageDays,
			}));
			result.reviewLink.title = reviewMsg;
			result.reviewLink.setAttribute("aria-label", reviewMsg);
			result.reviewSvg.setAttribute("focusable", "false");
			result.sponsorLink.title = sponsorMsg;
			result.sponsorLink.setAttribute("aria-label", sponsorMsg);
			result.sponsorSvg.setAttribute("focusable", "false");
		}
	}

	customElementsRef.define("review-sponsor-aws", ReviewSponsorAws);
	return {
		ReviewSponsorAws,
		showReviewOrSponsor,
	};
}
