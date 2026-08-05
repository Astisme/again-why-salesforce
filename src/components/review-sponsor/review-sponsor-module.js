"use strict";

const FALLBACK_CUSTOM_ELEMENTS = {
	/**
	 * Ignores custom element registration when no browser registry exists.
	 *
	 * @return {void}
	 */
	define() {},
};

/**
 * Minimal HTMLElement constructor fallback for non-browser analysis/test runtimes.
 */
const FALLBACK_HTML_ELEMENT = class {}; // NOSONAR

/**
 * Creates and registers review/sponsor UI behavior with injected dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ runtime: { getURL: (path: string) => string } }} options.browser Browser runtime wrapper.
 * @param {string} options.extensionUsageDays Setting key that stores usage-day count.
 * @param {string} options.hiddenClass CSS class used to hide inactive controls.
 * @param {(keys: string[]) => Promise<{ enabled?: number } | null | undefined>} options.getSettings Settings reader.
 * @param {(id: string, options: { link: string }) => unknown} options.injectStyle Style injector.
 * @param {() => Promise<Array<unknown>>} options.ensureAllTabsAvailability Tabs resolver.
 * @param {(message: string) => Promise<string>} options.getTranslations Translator helper.
 * @param {(options?: { allTabs?: unknown[]; usageDays?: number }) => { review: boolean; sponsor: boolean }} options.shouldShowReviewOrSponsor Visibility resolver.
 * @param {() => unknown} options.openCorrectBrowserReviewLink Review link opener.
 * @param {() => unknown} options.openSponsorLink Sponsor link opener.
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
 * }} options.generateReviewSponsorSvgs SVG factory.
 * @param {{ define: (name: string, constructor: unknown) => void }} [options.customElementsRef=customElements] Custom-elements registry.
 * @param {(url: string | URL) => unknown} [options.open=open] Link opener.
 * @param {typeof HTMLElement} [options.HTMLElementRef=HTMLElement] Base HTMLElement constructor.
 * @return {{
 *   ReviewSponsorAws: typeof HTMLElement;
 *   showReviewOrSponsor: (options?: {
 *     allTabs?: Array<unknown> | null;
 *     usageDays?: number;
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
	getSettings,
	injectStyle,
	ensureAllTabsAvailability,
	getTranslations,
	shouldShowReviewOrSponsor,
	openCorrectBrowserReviewLink,
	openSponsorLink,
	generateReviewSponsorSvgs,
	customElementsRef = globalThis.customElements ?? FALLBACK_CUSTOM_ELEMENTS,
	HTMLElementRef = globalThis.HTMLElement ?? FALLBACK_HTML_ELEMENT,
} = {}) {
	const hiddenClassRuntime = hiddenClass;

	/**
	 * Shows review/sponsor controls and binds click listeners.
	 *
	 * @param {Object} [param0={}] Input values.
	 * @param {unknown[] | null} [param0.allTabs=null] Saved tab list.
	 * @param {number} [param0.usageDays=0] Distinct usage days.
	 * @param {HTMLElement | null} [param0.reviewSvg=null] Review SVG element.
	 * @param {HTMLElement | null} [param0.sponsorSvg=null] Sponsor SVG element.
	 * @param {HTMLAnchorElement | null} [param0.reviewLink=null] Review link.
	 * @param {HTMLAnchorElement | null} [param0.sponsorLink=null] Sponsor link.
	 * @throws {Error} Throws when required UI elements or tab data are missing.
	 */
	function showReviewOrSponsor({
		allTabs = null,
		usageDays = 0,
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
		const whatToShow = shouldShowReviewOrSponsor({
			allTabs,
			usageDays,
		});
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
				openSponsorLink();
			});
		}
	}

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
			const result = generateReviewSponsorSvgs();
			shadow.appendChild(result.root);
			const linkEl = injectStyle(
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
			const usageSettings = await getSettings([
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
			] = await Promise.all([
				getTranslations("write_review"),
				getTranslations("send_tip"),
				ensureAllTabsAvailability(),
				this._getExtensionUsageDays(),
			]);
			showReviewOrSponsor(Object.assign(result, {
				allTabs,
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
