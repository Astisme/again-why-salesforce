/**
 * Class to take care of the Help button in the settings
 */
class HelpAws extends HTMLElement {
  /**
   * getter to know which attributes this class looks at
   */
	static get observedAttributes() {
		return ["href", "target", "rel", "data-show-top"];
	}

  /**
   * Creates everything used by the class
   */
	constructor() {
		super();
		const tpl = document.getElementById("help-template");
		const shadow = this.attachShadow({ mode: "open" });
		shadow.appendChild(tpl.content.cloneNode(true));
		this._anchor = shadow.querySelector("a.button");
		this._tooltip = this.shadowRoot.querySelector(".tooltip");
		const linkEl = document.createElement("link");
		linkEl.setAttribute("rel", "stylesheet");
		linkEl.setAttribute("href", new URL("./help.css", import.meta.url));
		this.shadowRoot.appendChild(linkEl);
		this._tooltip.dataset.showTop = this.dataset.showTop ?? "true";
		this._linkTip = this.shadowRoot.querySelector(".link-tip");
	}

  /**
   * On first connect, sync any attributes already set on the host 
   */
	connectedCallback() {
		this._syncLink();
	}

  /**
   * Whenever href, target, or rel changes, re-sync the anchor
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
		const elHref = this.getAttribute("href");
		if (elHref == null) {
			this._linkTip.classList.add("hidden");
		} else {
			this._linkTip.classList.remove("hidden");
		}
		const href = elHref ?? "#";
		const target = this.getAttribute("target") ?? "_blank";
		const rel = this.getAttribute("rel");
		this._anchor.setAttribute("href", href);
		if (target === null) {
			this._anchor.removeAttribute("target");
		} else {
			this._anchor.setAttribute("target", target);
		}
		if (rel === null) {
			this._anchor.removeAttribute("rel");
		} else {
			this._anchor.setAttribute("rel", rel);
		}
	}
}

customElements.define("help-aws", HelpAws);
