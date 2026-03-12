import { assert, assertEquals, assertFalse } from "@std/testing/asserts";
import "/components/theme-selector/theme-selector.js";

Deno.test("ThemeSelectorAws", async (t) => {
	const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
	const originalMutationObserver = globalThis.MutationObserver;
	const originalSetTimeout = globalThis.setTimeout;
	const originalClearTimeout = globalThis.clearTimeout;
	const restoreGlobals = () => {
		globalThis.requestAnimationFrame = originalRequestAnimationFrame;
		globalThis.MutationObserver = originalMutationObserver;
		globalThis.setTimeout = originalSetTimeout;
		globalThis.clearTimeout = originalClearTimeout;
		document.body.innerHTML = "";
		document.head.querySelector('[data-awsf-theme-selector="true"]')
			?.remove();
		delete document.documentElement.dataset.theme;
		localStorage.clear();
	};

	await t.step(
		"renders both theme buttons and shows the dark toggle in light mode",
		() => {
			restoreGlobals();
			globalThis.MutationObserver = class {
				observe() {}
				disconnect() {}
			};
			document.documentElement.dataset.theme = "light";
			const component = document.createElement("theme-selector-aws");
			document.body.append(component);

			const buttons = component.querySelectorAll("button");
			const lightButton = component.querySelector(
				'[data-theme-target="light"]',
			);
			const darkButton = component.querySelector(
				'[data-theme-target="dark"]',
			);

			assertEquals(buttons.length, 2);
			assert(lightButton.classList.contains("hidden"));
			assertFalse(darkButton.classList.contains("hidden"));
		},
	);

	await t.step(
		"dispatches the before-theme-toggle event and swaps visible buttons on click",
		() => {
			restoreGlobals();
			globalThis.MutationObserver = class {
				observe() {}
				disconnect() {}
			};
			globalThis.requestAnimationFrame = () => 1;
			globalThis.setTimeout = (callback) => {
				callback();
				return 1;
			};
			globalThis.clearTimeout = () => {};
			document.documentElement.dataset.theme = "light";
			const component = document.createElement("theme-selector-aws");
			document.body.append(component);

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
			component.handleClick({ target: darkButton });

			assert(eventFired);
			assertFalse(lightButton.classList.contains("hidden"));
			assert(darkButton.classList.contains("hidden"));
		},
	);

	restoreGlobals();
});
