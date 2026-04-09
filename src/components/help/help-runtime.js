/**
 * Creates the help component class with explicit runtime dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ runtime: { getURL: (path: string) => string } }} options.browser Browser runtime wrapper.
 * @param {string} options.hiddenClass CSS class used to hide the optional link tip.
 * @param {(id: string, options: { link: string }) => unknown} options.injectStyleFn Style injector.
 * @param {() => {
 *   anchor: {
 *     href: string;
 *     setAttribute: (name: string, value: string) => void;
 *     removeAttribute: (name: string) => void;
 *     title: string;
 *   };
 *   linkTip: { classList: { toggle: (name: string, force?: boolean) => void } };
 *   root: { appendChild: (child: unknown) => unknown };
 *   tooltip: { dataset: Record<string, string> };
 * }} options.generateHelpWithPopupFn DOM factory for help UI.
 * @param {(message: string) => Promise<string>} options.getTranslationsFn Translation resolver.
 * @param {typeof HTMLElement} [options.HTMLElementRef=HTMLElement] Base HTMLElement constructor.
 * @return {typeof HTMLElement} Configured custom-element class.
 */
export function createHelpAwsClass({
	browser,
	hiddenClass,
	injectStyleFn,
	generateHelpWithPopupFn,
	getTranslationsFn,
	HTMLElementRef = HTMLElement,
}) {
	/**
	 * Class to take care of the Help button in the settings.
	 */
	return class HelpAws extends HTMLElementRef {
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
		 * Creates everything used by the class.
		 */
		constructor() {
			super();
			const shadow = this.attachShadow({ mode: "open" });
			const { root, anchor, tooltip, linkTip } =
				generateHelpWithPopupFn();
			shadow.appendChild(root);
			this._anchor = anchor;
			this._tooltip = tooltip;
			this._linkTip = linkTip;
			const linkEl = injectStyleFn(
				"awsf-help",
				{
					link: browser.runtime.getURL("/components/help/help.css"),
				},
			);
			this.shadowRoot.appendChild(linkEl);
			this._tooltip.dataset.showRight = this.dataset.showRight ?? "false";
			this._tooltip.dataset.showLeft = this.dataset.showLeft ?? "false";
			this._tooltip.dataset.showBottom = this.dataset.showBottom ??
				"false";
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
		 * On first connect, sync any attributes already set on the host.
		 *
		 * @return {Promise<void>} Promise fulfilled when everything has been setup.
		 */
		connectedCallback() {
			this._syncLink();
			return this._addAssistiveText();
		}

		/**
		 * Whenever href, target, or rel changes, re-sync the anchor.
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
		 * Read host attributes or fall back to sensible defaults.
		 */
		_syncLink() {
			const href = this.getAttribute("href");
			this._linkTip.classList.toggle(hiddenClass, !href);
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
		 *
		 * @return {Promise<void>} Promise fulfilled once the translated label has been applied.
		 */
		async _addAssistiveText() {
			const helpMsg = await getTranslationsFn("help");
			this._anchor.title = helpMsg;
			this._anchor.setAttribute("aria-label", helpMsg);
		}
	};
}

/**
 * Registers the help custom element and returns the constructor.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ runtime: { getURL: (path: string) => string } }} options.browser Browser runtime wrapper.
 * @param {{ define: (name: string, constructor: unknown) => void }} [options.customElementsRef=customElements] Custom-elements registry.
 * @param {() => {
 *   anchor: {
 *     href: string;
 *     setAttribute: (name: string, value: string) => void;
 *     removeAttribute: (name: string) => void;
 *     title: string;
 *   };
 *   linkTip: { classList: { toggle: (name: string, force?: boolean) => void } };
 *   root: { appendChild: (child: unknown) => unknown };
 *   tooltip: { dataset: Record<string, string> };
 * }} options.generateHelpWithPopupFn DOM factory for help UI.
 * @param {(message: string) => Promise<string>} options.getTranslationsFn Translation resolver.
 * @param {string} options.hiddenClass CSS class used to hide the optional link tip.
 * @param {(id: string, options: { link: string }) => unknown} options.injectStyleFn Style injector.
 * @param {typeof HTMLElement} [options.HTMLElementRef=HTMLElement] Base HTMLElement constructor.
 * @return {typeof HTMLElement} Registered constructor.
 */
export function registerHelpComponent({
	browser,
	customElementsRef = customElements,
	generateHelpWithPopupFn,
	getTranslationsFn,
	hiddenClass,
	injectStyleFn,
	HTMLElementRef = HTMLElement,
}) {
	const HelpAws = createHelpAwsClass({
		browser,
		generateHelpWithPopupFn,
		getTranslationsFn,
		hiddenClass,
		injectStyleFn,
		HTMLElementRef,
	});
	customElementsRef.define("help-aws", HelpAws);
	return HelpAws;
}
