/// <reference lib="dom" />
import "../../mocks.test.ts";
import { assertEquals } from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";

type ThemeSelectorElement = HTMLElement & {
	connectedCallback?: () => void;
	getCurrentTheme?: () => string;
	ownerDocument: Document | null;
	tagName: string;
};

/**
 * Creates a small localStorage mock for the component tests.
 *
 * @return {Storage} Storage-compatible mock.
 */
function createLocalStorageMock() {
	const values = new Map<string, string>();
	return {
		clear() {
			values.clear();
		},
		getItem(key: string) {
			return values.get(key) ?? null;
		},
		key(index: number) {
			return [...values.keys()][index] ?? null;
		},
		get length() {
			return values.size;
		},
		removeItem(key: string) {
			values.delete(key);
		},
		setItem(key: string, value: string) {
			values.set(key, value);
		},
	} satisfies Storage;
}

/**
 * Installs the custom-elements hooks needed to instantiate the theme selector
 * with the local mock DOM.
 *
 * @param {Document} document Active mock document.
 * @return {void}
 */
function installCustomElementsRegistry(document: Document) {
	const constructors = new Map<string, CustomElementConstructor>();
	const registry = {
		define(name: string, constructor: CustomElementConstructor) {
			constructors.set(name, constructor);
		},
		get(name: string) {
			return constructors.get(name);
		},
		getName(constructor: CustomElementConstructor) {
			for (
				const [name, registeredConstructor] of constructors.entries()
			) {
				if (registeredConstructor === constructor) {
					return name;
				}
			}
			return null;
		},
		upgrade(_root: Node) {},
		whenDefined(name: string) {
			const constructor = constructors.get(name);
			return Promise.resolve(
				constructor ?? class extends HTMLElement {},
			);
		},
	} satisfies CustomElementRegistry;
	const originalCreateElement = document.createElement.bind(document);
	document.createElement = (tagName: string) => {
		const constructor = constructors.get(tagName);
		if (constructor == null) {
			return originalCreateElement(tagName);
		}
		const element = new constructor() as ThemeSelectorElement;
		element.tagName = tagName.toUpperCase();
		element.ownerDocument = document;
		return element;
	};
	Object.defineProperty(globalThis, "customElements", {
		value: registry,
		configurable: true,
		writable: true,
	});
}

/**
 * Seeds the component with real button nodes because the local mock DOM does
 * not parse `innerHTML`.
 *
 * @param {ThemeSelectorElement} component Theme selector element under test.
 * @return {void}
 */
function appendThemeButtons(component: ThemeSelectorElement) {
	component.innerHTML = "";
	const lightButton = document.createElement("button");
	lightButton.classList.add("visibility-transition", "hidden", "invisible");
	lightButton.setAttribute("data-theme-target", "light");
	const darkButton = document.createElement("button");
	darkButton.classList.add("visibility-transition");
	darkButton.setAttribute("data-theme-target", "dark");
	component.append(lightButton, darkButton);
}

Deno.test("ThemeSelectorAws reuses an existing stylesheet link", async () => {
	const { cleanup } = installMockDom();
	const originalLocalStorage = globalThis.localStorage;
	const testLocalStorage = createLocalStorageMock();
	globalThis.localStorage = testLocalStorage;
	installCustomElementsRegistry(document);

	try {
		const existingLink = document.createElement("link");
		existingLink.setAttribute("data-awsf-theme-selector", "true");
		document.head.append(existingLink);

		await import("/components/theme-selector/theme-selector.js");

		const component = document.createElement(
			"theme-selector-aws",
		) as ThemeSelectorElement;
		appendThemeButtons(component);
		document.body.append(component);
		component.connectedCallback?.();

		assertEquals(
			document.head.querySelectorAll('[data-awsf-theme-selector="true"]')
				.length,
			1,
		);

		document.body.innerHTML = "";
		document.head.innerHTML = "";
		testLocalStorage.clear();
		Reflect.deleteProperty(document.documentElement.dataset, "theme");

		const defaultComponent = document.createElement(
			"theme-selector-aws",
		) as ThemeSelectorElement;
		appendThemeButtons(defaultComponent);
		document.body.append(defaultComponent);
		defaultComponent.connectedCallback?.();
		document.documentElement.dataset.theme = "light";

		assertEquals(defaultComponent.getCurrentTheme?.(), "light");
	} finally {
		globalThis.localStorage = originalLocalStorage;
		cleanup();
	}
});
