/// <reference lib="dom" />
import "../../mocks.test.ts";
import { assertEquals } from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";
import {
	appendThemeButtons,
	createLocalStorageMock,
	installCustomElementsRegistry,
	type ThemeSelectorElement,
} from "./theme-selector-test-helpers.ts";

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

		await import(
			"../../../src/components/theme-selector/theme-selector.js"
		);

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
