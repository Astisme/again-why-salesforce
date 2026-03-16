// @ts-nocheck
import Window from "happydom";

/**
 * Installs Happy DOM globals for tests that need a fuller browser environment.
 *
 * @return {void}
 */
function installHappyDomGlobals() {
	const window = new Window();
	globalThis.window = window;
	globalThis.document = window.document;
	globalThis.HTMLElement = window.HTMLElement;
	globalThis.CustomEvent = window.CustomEvent;
	globalThis.customElements = window.customElements;
}

installHappyDomGlobals();
