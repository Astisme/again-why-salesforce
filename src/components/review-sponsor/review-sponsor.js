import { showReviewOrSponsor } from "/functions.js";
import { ensureAllTabsAvailability } from "/tabContainer.js";
import ensureTranslatorAvailability from "/translator.js";
import { generateReviewSponsorSvgs } from "/salesforce/generator.js";

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
		const linkEl = document.createElement("link");
		linkEl.setAttribute("rel", "stylesheet");
		linkEl.setAttribute(
			"href",
			new URL("./review-sponsor.css", import.meta.url),
		);
		this.shadowRoot.appendChild(linkEl);
		this._showReviewOrSponsor(result);
	}

	async _showReviewOrSponsor(result) {
		const translator = await ensureTranslatorAvailability();
		showReviewOrSponsor(Object.assign(result, {
			allTabs: await ensureAllTabsAvailability(),
			translator,
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
