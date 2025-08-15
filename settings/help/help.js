class HelpAws extends HTMLElement {
	static get observedAttributes() {
		return ["href", "target", "rel", "data-show-top"];
	}

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
		this._tooltip.setAttribute(
			"data-show-top",
			this.getAttribute("data-show-top") ?? "true",
		);
		this._linkTip = this.shadowRoot.querySelector(".link-tip");
	}

	connectedCallback() {
		// On first connect, sync any attributes already set on the host
		this._syncLink();
	}

	attributeChangedCallback(_, oldValue, newValue) {
		// Whenever href, target, or rel changes, re-sync the anchor
		if (oldValue !== newValue) {
			this._syncLink();
		}
	}

	_syncLink() {
		// Read host attributes or fall back to sensible defaults
		const elHref = this.getAttribute("href");
		if (elHref != null) {
			this._linkTip.classList.remove("hidden");
		} else {
			this._linkTip.classList.add("hidden");
		}
		const href = elHref ?? "#";
		const target = this.getAttribute("target") ?? "_blank";
		const rel = this.getAttribute("rel");

		this._anchor.setAttribute("href", href);

		if (target !== null) {
			this._anchor.setAttribute("target", target);
		} else {
			this._anchor.removeAttribute("target");
		}

		if (rel !== null) {
			this._anchor.setAttribute("rel", rel);
		} else {
			this._anchor.removeAttribute("rel");
		}
	}
}

customElements.define("help-aws", HelpAws);
