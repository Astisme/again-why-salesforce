import { assertEquals, assertExists } from "@std/testing/asserts";
import { MockElement } from "./mock-dom.test.ts";
import { registerHelpComponent } from "../../../src/components/help/help-runtime.js";

type HelpComponentClass = {
	new (): HelpInstance;
	observedAttributes: string[];
};

type HelpInstance = MockElement & {
	_anchor: MockElement;
	_linkTip: MockElement;
	_tooltip: MockElement;
	connectedCallback: () => Promise<void>;
	attributeChangedCallback: (
		name: Event | null,
		oldValue: string | null,
		newValue: string | null,
	) => void;
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

Deno.test("help component syncs link attributes and accessibility text in isolation", async () => {
	let registeredName = "";
	let registeredConstructor: HelpComponentClass | null = null;
	const injectCalls: { id: string; link: string }[] = [];
	let translateCalls = 0;

	registerHelpComponent({
		browser: {
			runtime: {
				getURL: (path: string) => `chrome-extension://test${path}`,
			},
		},
			customElementsRef: {
				define: (name: string, constructor: unknown) => {
					registeredName = name;
					registeredConstructor = constructor as HelpComponentClass;
				},
			},
			generateHelpWithPopupFn: () => ({
				anchor: new MockElement("a"),
				linkTip: new MockElement("span"),
				root: new MockElement("div"),
				tooltip: new MockElement("div"),
			}) as never,
		getTranslationsFn: () => {
			translateCalls++;
			return Promise.resolve("Help");
		},
		hiddenClass: "hidden",
			injectStyleFn: (id: string, options: { link: string }) => {
				injectCalls.push({ id, link: options.link });
				return new MockElement("link") as never;
			},
			HTMLElementRef: MockHelpHTMLElement as unknown as never,
		});

	assertEquals(registeredName, "help-aws");
	const HelpConstructor = registeredConstructor as
		| HelpComponentClass
		| null;
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

	await component.connectedCallback();

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
	component.attributeChangedCallback(
		null,
		"https://docs.example.com/help",
		null,
	);

	assertEquals(component._anchor.href, "#");
	assertEquals(component._anchor.getAttribute("target"), null);
	assertEquals(component._anchor.getAttribute("rel"), null);
	assertEquals(component._linkTip.classList.contains("hidden"), true);
});
