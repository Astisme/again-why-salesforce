import {
	assertEquals,
	assertExists,
} from "@std/testing/asserts";
import { MockElement } from "../action/mock-dom.ts";
import { loadIsolatedModule } from "../load-isolated-module.ts";

type HelpComponentClass = {
	new (): HelpInstance;
	observedAttributes: string[];
};

type HelpInstance = MockElement & {
	_anchor: MockElement;
	_linkTip: MockElement;
	_tooltip: MockElement;
	connectedCallback: () => void;
	attributeChangedCallback: (
		name: Event | null,
		oldValue: string | null,
		newValue: string | null,
	) => void;
};

type HelpDependencies = {
	BROWSER: {
		runtime: {
			getURL: (path: string) => string;
		};
	};
	HIDDEN_CLASS: string;
	ensureTranslatorAvailability: () => Promise<{
		translate: (message: string) => Promise<string>;
	}>;
	generateHelpWith_i_popup: () => {
		anchor: MockElement;
		linkTip: MockElement;
		root: MockElement;
		tooltip: MockElement;
	};
	injectStyle: (id: string, options: { link: string }) => MockElement;
};

/**
 * HTMLElement replacement with support for shadow DOM and host attributes.
 */
class MockHelpHTMLElement extends MockElement {
	/**
	 * Creates the host element.
	 */
	constructor() {
		super("help-aws");
	}
}

/**
 * Waits for pending microtasks triggered by async lifecycle work.
 *
 * @return {Promise<void>} Promise resolved after the queued async work completes.
 */
async function waitForMicrotask() {
	await Promise.resolve();
	await Promise.resolve();
}

Deno.test("help component syncs link attributes and accessibility text in isolation", async () => {
	let registeredName = "";
	let registeredConstructor: HelpComponentClass | null = null;
	const injectCalls: { id: string; link: string }[] = [];
	let translateCalls = 0;

	const { cleanup } = await loadIsolatedModule<Record<string, never>, HelpDependencies>({
		modulePath: new URL("../../src/components/help/help.js", import.meta.url),
		dependencies: {
			BROWSER: {
				runtime: {
					getURL: (path) => `chrome-extension://test${path}`,
				},
			},
			HIDDEN_CLASS: "hidden",
			ensureTranslatorAvailability: async () => ({
				translate: async () => {
					translateCalls++;
					return "Help";
				},
			}),
			generateHelpWith_i_popup: () => ({
				anchor: new MockElement("a"),
				linkTip: new MockElement("span"),
				root: new MockElement("div"),
				tooltip: new MockElement("div"),
			}),
			injectStyle: (id, options) => {
				injectCalls.push({ id, link: options.link });
				return new MockElement("link");
			},
		},
		globals: {
			HTMLElement: MockHelpHTMLElement,
			customElements: {
				define: (name: string, constructor: HelpComponentClass) => {
					registeredName = name;
					registeredConstructor = constructor;
				},
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"/functions.js",
			"/salesforce/generator.js",
			"/translator.js",
		]),
	});

	try {
		assertEquals(registeredName, "help-aws");
		const HelpConstructor = registeredConstructor as HelpComponentClass | null;
		assertExists(HelpConstructor);
		assertEquals(HelpConstructor.observedAttributes, [
			"href",
			"target",
			"rel",
			"data-show-right",
			"data-show-left",
			"data-show-bottom",
			"data-show-top",
		]);

		const component = new HelpConstructor() as HelpInstance;
		component.setAttribute("href", "https://docs.example.com/help");
		component.setAttribute("target", "_blank");
		component.setAttribute("rel", "noopener");

		component.connectedCallback();
		await waitForMicrotask();

		assertEquals(injectCalls, [{
			id: "awsf-help",
			link: "chrome-extension://test/components/help/help.css",
		}]);
		assertEquals(component._tooltip.dataset.showRight, "true");
		assertEquals(component._anchor.href, "https://docs.example.com/help");
		assertEquals(component._anchor.getAttribute("target"), "_blank");
		assertEquals(component._anchor.getAttribute("rel"), "noopener");
		assertEquals(component._linkTip.classList.contains("hidden"), false);
		assertEquals(component._anchor.title, "Help");
		assertEquals(component._anchor.getAttribute("aria-label"), "Help");
		assertEquals(translateCalls, 1);

		component.removeAttribute("href");
		component.removeAttribute("target");
		component.removeAttribute("rel");
		component.attributeChangedCallback(null, "https://docs.example.com/help", null);

		assertEquals(component._anchor.href, "#");
		assertEquals(component._anchor.getAttribute("target"), null);
		assertEquals(component._anchor.getAttribute("rel"), null);
		assertEquals(component._linkTip.classList.contains("hidden"), true);
	} finally {
		cleanup();
	}
});
