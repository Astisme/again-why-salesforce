import { BROWSER, HIDDEN_CLASS } from "../../core/constants.js";
import { injectStyle } from "../../core/functions.js";
import { generateHelpWith_i_popup } from "../../salesforce/generator.js";
import ensureTranslatorAvailability from "../../core/translator.js";

/**
 * Class to take care of the Help button in the settings
 */
class HelpAws extends HTMLElement {
	/**
	 * getter to know which attributes this class looks at
	 * @return {string[]} all the attributes which should be monitored
	 */
	static get observedAttributes() {
		return [
			"href",
			"target",
			"rel",
			"data-show-right",
			"data-show-left",
			"data-show-bottom",
			"data-show-top", // default is to show at the top
		];
	}

	/**
	 * Creates everything used by the class
	 */
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: "open" });
		const { root, anchor, tooltip, linkTip } = generateHelpWith_i_popup();
		shadow.appendChild(root);
		this._anchor = anchor;
		this._tooltip = tooltip;
		this._linkTip = linkTip;
		const linkEl = injectStyle(
			"awsf-help",
			{ link: BROWSER.runtime.getURL("/components/help/help.css") },
		);
		this.shadowRoot.appendChild(linkEl);
		this._tooltip.dataset.showRight = this.dataset.showRight ?? "false";
		this._tooltip.dataset.showLeft = this.dataset.showLeft ?? "false";
		this._tooltip.dataset.showBottom = this.dataset.showBottom ?? "false";
		this._tooltip.dataset.showTop = this.dataset.showTop ?? "false";
		if (
			this._tooltip.dataset.showRight === "false" &&
			this._tooltip.dataset.showLeft === "false" &&
			this._tooltip.dataset.showBottom === "false" &&
			this._tooltip.dataset.showTop === "false"
		) {
			this._tooltip.dataset.showRight = true;
		}
	}

	/**
	 * On first connect, sync any attributes already set on the host
	 * @return Promise fulfilled when everything has been setup
	 */
	connectedCallback() {
		this._syncLink();
		return this._addAssistiveText();
	}

	/**
	 * Whenever href, target, or rel changes, re-sync the anchor
	 *
	 * @param {Event} _ - the event connected to this function
	 * @param {string} oldValue - the old attribute value
	 * @param {string} newValue - the new attribute value
	 */
	attributeChangedCallback(_, oldValue, newValue) {
		if (oldValue !== newValue) {
			this._syncLink();
		}
	}

	/**
	 * Read host attributes or fall back to sensible defaults
	 */
	_syncLink() {
		const href = this.getAttribute("href");
		this._linkTip.classList.toggle(HIDDEN_CLASS, !href);
		this._anchor.href = href ?? "#";
		const target = this.getAttribute("target");
		target
			? this._anchor.setAttribute("target", target)
			: this._anchor.removeAttribute("target");
		const rel = this.getAttribute("rel");
		rel
			? this._anchor.setAttribute("rel", rel)
			: this._anchor.removeAttribute("rel");
	}

	/**
	 * Ensures the icon-only anchor has an accessible name.
	 */
	async _addAssistiveText() {
		const translator = await ensureTranslatorAvailability();
		const helpMsg = await translator.translate("help");
		this._anchor.title = helpMsg;
		this._anchor.setAttribute("aria-label", helpMsg);
	}
}

customElements.define("help-aws", HelpAws);
