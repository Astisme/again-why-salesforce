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
import {
	appendThemeButtons,
	createLocalStorageMock,
	installCustomElementsRegistry,
	type ThemeSelectorElement,
} from "./theme-selector-test-helpers.ts";

Deno.test("ThemeSelectorAws", async (t) => {
	const { cleanup } = installMockDom();
	const originalSetTimeout = globalThis.setTimeout;
	const originalClearTimeout = globalThis.clearTimeout;
	const originalLocalStorage = globalThis.localStorage;
	const testLocalStorage = createLocalStorageMock();
	globalThis.localStorage = testLocalStorage;
	installCustomElementsRegistry(document);
	try {
		await import(
			"../../../src/components/theme-selector/theme-selector.js"
		);

		/**
		 * Resets mutable globals and document state before each sub-test.
		 *
		 * @return {void}
		 */
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
				Reflect.deleteProperty(
					document.documentElement.dataset,
					"theme",
				);
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
				const component = document.createElement(
					"theme-selector-aws",
				) as
					& ThemeSelectorElement
					& {
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

				component.handleClick({
					target: document.createElement("div"),
				});
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
	} finally {
		globalThis.setTimeout = originalSetTimeout;
		globalThis.clearTimeout = originalClearTimeout;
		globalThis.localStorage = originalLocalStorage;
		cleanup();
	}
});
