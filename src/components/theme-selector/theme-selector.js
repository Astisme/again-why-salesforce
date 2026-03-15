import { HIDDEN_CLASS } from "/constants.js";
import { handleSwitchColorTheme } from "/action/themeHandler.js";

const html = document.documentElement;
const invisible = "invisible";
let styleInjected = false;

/**
 * Ensures the theme selector stylesheet is loaded only once.
 * @return {void}
 */
function ensureStyles() {
	if (styleInjected) {
		return;
	}
	const existing = document.head?.querySelector(
		'link[data-awsf-theme-selector="true"]',
	);
	if (existing != null) {
		styleInjected = true;
		return;
	}
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = new URL("./theme-selector.css", import.meta.url);
	link.dataset.awsfThemeSelector = "true";
	document.head?.append(link);
	styleInjected = true;
}

/**
 * Custom element that renders the theme toggle buttons and keeps them in sync
 * with the current document theme.
 */
export class ThemeSelectorAws extends HTMLElement {
	observer = new MutationObserver(() => this.syncVisibleButton());

	/**
	 * Initializes the component markup, listeners, and theme observer.
	 * @return {void}
	 */
	connectedCallback() {
		ensureStyles();
		if (!this.querySelector("[data-theme-target]")) {
			this.render();
		}
		this.addEventListener("click", this.handleClick);
		this.observer.observe(html, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		this.syncVisibleButton();
	}

	/**
	 * Cleans up listeners and observers when the element is removed.
	 * @return {void}
	 */
	disconnectedCallback() {
		this.removeEventListener("click", this.handleClick);
		this.observer.disconnect();
	}

	/**
	 * Renders the light and dark theme toggle buttons.
	 * @return {void}
	 */
	render() {
		this.innerHTML = `
			<button
				type="button"
				class="visibility-transition hidden invisible"
				data-theme-target="light"
				data-i18n="theme_light+-+title+-+ariaLabel"
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 20 20"
					xmlns="http://www.w3.org/2000/svg"
				>
					<g transform="translate(-2 -2)">
						<path
							class="primary"
							d="M12,3V4M5.64,5.64l.7.7M3,12H4m1.64,6.36.7-.7M12,21V20m6.36-1.64-.7-.7M21,12H20M18.36,5.64l-.7.7M12,8a4,4,0,1,0,4,4A4,4,0,0,0,12,8Z"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						/>
						<circle
							class="secondary"
							cx="4"
							cy="4"
							r="4"
							transform="translate(8 8)"
						/>
					</g>
				</svg>
			</button>
			<button
				type="button"
				class="visibility-transition"
				data-theme-target="dark"
				data-i18n="theme_dark+-+title+-+ariaLabel"
			>
				<svg
					aria-hidden="true"
					viewBox="-0.14 0 20.03 20.03"
					xmlns="http://www.w3.org/2000/svg"
				>
					<g transform="translate(-2.25 -2)">
						<path
							class="primary"
							d="M21,12A9,9,0,0,1,3.25,14.13,6.9,6.9,0,0,0,8,16,7,7,0,0,0,11.61,3H12a9,9,0,0,1,9,9Z"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						/>
						<path
							class="secondary"
							d="M21,12A9,9,0,0,1,3.25,14.13,6.9,6.9,0,0,0,8,16,7,7,0,0,0,11.61,3H12a9,9,0,0,1,9,9Z"
						/>
					</g>
				</svg>
			</button>
		`;
	}

	/**
	 * Reads the currently active theme from the document or persisted settings.
	 * @return {string} the active theme name
	 */
	getCurrentTheme() {
		return html.dataset.theme ?? localStorage.getItem("usingTheme") ??
			"light";
	}

	/**
	 * Shows the button for switching away from the current theme and hides the other one.
	 * @return {void}
	 */
	syncVisibleButton() {
		const lightButton = this.querySelector('[data-theme-target="light"]');
		const darkButton = this.querySelector('[data-theme-target="dark"]');
		const buttonToShow = this.getCurrentTheme() === "light"
			? darkButton
			: lightButton;
		const buttonToHide = buttonToShow === lightButton
			? darkButton
			: lightButton;
		buttonToShow?.classList.remove(invisible, HIDDEN_CLASS);
		buttonToHide?.classList.add(invisible, HIDDEN_CLASS);
	}

	/**
	 * Handles theme toggle clicks and dispatches the pre-toggle lifecycle event.
	 * @param {MouseEvent} e - the click event fired on the component
	 * @return {void}
	 */
	handleClick = (e) => {
		if (!e.target.closest("button")) {
			return;
		}
		const lightButton = this.querySelector('[data-theme-target="light"]');
		const darkButton = this.querySelector('[data-theme-target="dark"]');
		const buttonToShow = this.getCurrentTheme() === "light"
			? lightButton
			: darkButton;
		const buttonToHide = buttonToShow === lightButton
			? darkButton
			: lightButton;
		buttonToHide?.classList.add(invisible, HIDDEN_CLASS);
		buttonToShow?.classList.remove(HIDDEN_CLASS);
		setTimeout(() => {
			buttonToShow?.classList.remove(invisible);
		}, 200);
		this.dispatchEvent(
			new CustomEvent("before-theme-toggle", {
				bubbles: true,
				composed: true,
			}),
		);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => handleSwitchColorTheme());
		});
	};
}

customElements.define("theme-selector-aws", ThemeSelectorAws);
