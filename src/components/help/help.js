import { HIDDEN_CLASS } from "/constants.js";
import { generateHelpWith_i_popup } from "/salesforce/generator.js";

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
		const linkEl = document.createElement("link");
		linkEl.setAttribute("rel", "stylesheet");
		linkEl.setAttribute("href", new URL("./help.css", import.meta.url));
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
	 */
	connectedCallback() {
		this._syncLink();
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
}

customElements.define("help-aws", HelpAws);
