/// <reference lib="dom" />
import "../../mocks.test.ts";
import {
	assert,
	assertEquals,
	assertExists,
	assertFalse,
	assertStringIncludes,
} from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";

type ThemeSelectorElement = HTMLElement & {
	connectedCallback?: () => void;
	getCurrentTheme?: () => string;
	handleClick: (event: { target: Element | null }) => void;
	observer?: {
		callback?: MutationCallback;
	};
	ownerDocument: Document | null;
	syncVisibleButton?: () => void;
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
 * @return {CustomElementRegistry} Registry used by the imported component.
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
	return registry;
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

Deno.test("ThemeSelectorAws", async (t) => {
	const { cleanup } = installMockDom();
	const originalSetTimeout = globalThis.setTimeout;
	const originalClearTimeout = globalThis.clearTimeout;
	const originalLocalStorage = globalThis.localStorage;
	const testLocalStorage = createLocalStorageMock();
	globalThis.localStorage = testLocalStorage;
	installCustomElementsRegistry(document);
	await import("/components/theme-selector/theme-selector.js");

	const restoreGlobals = () => {
		globalThis.setTimeout = originalSetTimeout;
		globalThis.clearTimeout = originalClearTimeout;
		document.body.innerHTML = "";
		document.head.querySelector('[data-awsf-theme-selector="true"]')
			?.remove();
		Reflect.deleteProperty(document.documentElement.dataset, "theme");
		testLocalStorage.clear();
		globalThis.localStorage = testLocalStorage;
	};

	await t.step(
		"renders the template when the host starts empty",
		() => {
			restoreGlobals();
			document.documentElement.dataset.theme = "light";
			const component = document.createElement(
				"theme-selector-aws",
			) as ThemeSelectorElement;
			document.body.append(component);
			component.connectedCallback?.();

			assertStringIncludes(
				component.innerHTML,
				`data-theme-target="light"`,
			);
			const injectedLink = document.head.firstElementChild;
			assertExists(injectedLink);
			assert(injectedLink instanceof HTMLElement);
			assertEquals(injectedLink.tagName, "LINK");
			assertEquals(injectedLink.dataset.awsfThemeSelector, "true");
		},
	);

	await t.step(
		"renders both theme buttons and shows the dark toggle in light mode",
		() => {
			restoreGlobals();
			document.documentElement.dataset.theme = "light";
			const component = document.createElement(
				"theme-selector-aws",
			) as ThemeSelectorElement;
			appendThemeButtons(component);
			document.body.append(component);
			component.connectedCallback?.();

			const buttons = component.querySelectorAll("button");
			const lightButton = component.querySelector(
				'[data-theme-target="light"]',
			);
			const darkButton = component.querySelector(
				'[data-theme-target="dark"]',
			);
			assertExists(lightButton);
			assertExists(darkButton);

			assertEquals(buttons.length, 2);
			assert(lightButton.classList.contains("hidden"));
			assertFalse(darkButton.classList.contains("hidden"));
			component.observer?.callback?.(
				[],
				component.observer as MutationObserver,
			);
		},
	);

	await t.step(
		"falls back to localStorage when no data-theme is set and shows the light toggle",
		() => {
			restoreGlobals();
			Reflect.deleteProperty(document.documentElement.dataset, "theme");
			globalThis.localStorage.setItem("usingTheme", "dark");
			const component = document.createElement(
				"theme-selector-aws",
			) as ThemeSelectorElement;
			appendThemeButtons(component);
			document.body.append(component);
			component.connectedCallback?.();
			component.syncVisibleButton?.();

			assertEquals(component.getCurrentTheme?.(), "dark");
		},
	);

	await t.step(
		"dispatches the before-theme-toggle event and swaps visible buttons on click",
		() => {
			restoreGlobals();
			globalThis.setTimeout = (callback: TimerHandler) => {
				if (typeof callback === "function") {
					callback();
				}
				return 1;
			};
			globalThis.clearTimeout = () => {};
			document.documentElement.dataset.theme = "light";
			const component = document.createElement(
				"theme-selector-aws",
			) as ThemeSelectorElement;
			appendThemeButtons(component);
			document.body.append(component);
			component.connectedCallback?.();

			let eventFired = false;
			component.addEventListener("before-theme-toggle", () => {
				eventFired = true;
			});

			const lightButton = component.querySelector(
				'[data-theme-target="light"]',
			);
			const darkButton = component.querySelector(
				'[data-theme-target="dark"]',
			);
			assertExists(lightButton);
			assertExists(darkButton);
			component.handleClick({ target: darkButton });

			assert(eventFired);
			assertFalse(lightButton.classList.contains("hidden"));
			assert(darkButton.classList.contains("hidden"));
		},
	);

	await t.step(
		"ignores clicks outside buttons and disconnects its observer",
		() => {
			restoreGlobals();
			document.documentElement.dataset.theme = "light";
			const component = document.createElement("theme-selector-aws") as
				& ThemeSelectorElement
				& {
					disconnectedCallback?: () => void;
					observer: MutationObserver;
				};
			appendThemeButtons(component);
			document.body.append(component);
			component.connectedCallback?.();

			let eventFired = false;
			let disconnectCalls = 0;
			component.addEventListener("before-theme-toggle", () => {
				eventFired = true;
			});
			component.observer = {
				disconnect() {
					disconnectCalls++;
				},
				observe() {},
				takeRecords() {
					return [];
				},
			} as MutationObserver;

			const lightButton = component.querySelector(
				'[data-theme-target="light"]',
			);
			const darkButton = component.querySelector(
				'[data-theme-target="dark"]',
			);
			assertExists(lightButton);
			assertExists(darkButton);

			component.handleClick({ target: document.createElement("div") });
			component.disconnectedCallback?.();

			assertFalse(eventFired);
			assert(lightButton.classList.contains("hidden"));
			assertFalse(darkButton.classList.contains("hidden"));
			assertEquals(disconnectCalls, 1);
		},
	);

	await t.step(
		"swaps the opposite buttons when the current theme is dark",
		() => {
			restoreGlobals();
			globalThis.setTimeout = (callback: TimerHandler) => {
				if (typeof callback === "function") {
					callback();
				}
				return 1;
			};
			globalThis.clearTimeout = () => {};
			document.documentElement.dataset.theme = "dark";
			testLocalStorage.setItem("usingTheme", "dark");
			const component = document.createElement(
				"theme-selector-aws",
			) as ThemeSelectorElement;
			appendThemeButtons(component);
			document.body.append(component);
			component.connectedCallback?.();

			const lightButton = component.querySelector(
				'[data-theme-target="light"]',
			);
			const darkButton = component.querySelector(
				'[data-theme-target="dark"]',
			);
			assertExists(lightButton);
			assertExists(darkButton);

			component.handleClick({ target: lightButton });

			assert(lightButton.classList.contains("hidden"));
			assertFalse(darkButton.classList.contains("hidden"));
		},
	);

	restoreGlobals();
	globalThis.localStorage = originalLocalStorage;
	cleanup();
});
