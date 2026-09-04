import "../../mocks.test.ts";
import {
	assertEquals,
	assertExists,
	assertStrictEquals,
} from "@std/testing/asserts";
import {
	createLogoModule,
} from "../../../src/action/logo/logo-module.js";
import {
	__testHooks as logoTestHooks,
	runLogo as runLogoRuntime,
} from "../../../src/action/logo/logo-runtime.js";

type RuntimeListener = (
	message: {
		theme?: string | null;
		what?: string;
	},
	sender: unknown,
	sendResponse: (response: null) => void,
) => void;

/**
 * Loads the popup logo script and captures its listener registration.
 *
 * @param {boolean} [useRuntime=false] Whether to exercise runtime override wiring.
 * @return {{ html: { dataset: Record<string, string>; }; initThemeCalls: number; listener: RuntimeListener | null; responses: null[]; }} Runtime fixtures.
 */
function loadLogoModule(useRuntime = false) {
	const html = {
		dataset: {} as Record<string, string>,
	};
	let listener: RuntimeListener | null = null;
	let initThemeCalls = 0;
	const responses: null[] = [];
	const options = {
		browser: {
			runtime: {
				onMessage: {
					addListener: (registeredListener: RuntimeListener) => {
						listener = registeredListener;
					},
				},
			},
		},
		documentRef: {
			documentElement: html,
		},
		initTheme: () => {
			initThemeCalls++;
		},
		whatTheme: "theme",
	};
	if (useRuntime) {
		runLogoRuntime(options);
	} else {
		createLogoModule(options).runLogo();
	}

	return { html, initThemeCalls, listener, responses };
}

Deno.test("logo initializes theme handling and reacts only to theme messages", () => {
	const { html, initThemeCalls, listener, responses } = loadLogoModule();
	const registeredListener = listener as RuntimeListener | null;
	assertEquals(initThemeCalls, 1);
	assertExists(registeredListener);

	registeredListener(
		{
			what: "not-theme",
			theme: "dark",
		},
		null,
		(response) => {
			responses.push(response);
		},
	);
	assertEquals(html.dataset.theme, undefined);
	assertEquals(responses, []);

	registeredListener(
		{
			what: "theme",
			theme: "dark",
		},
		null,
		(response) => {
			responses.push(response);
		},
	);
	assertEquals(html.dataset.theme, "dark");
	assertEquals(responses, [null]);

	registeredListener(
		{
			what: "theme",
			theme: null,
		},
		null,
		(response) => {
			responses.push(response);
		},
	);
	assertEquals(html.dataset.theme, "dark");
	assertEquals(responses, [null]);
});

Deno.test("logo runtime delegates to its lazy module singleton", () => {
	let calls = 0;
	const listener: RuntimeListener = () => {};
	const module: ReturnType<typeof createLogoModule> = {
		runLogo: () => {
			calls++;
			return listener;
		},
	};
	try {
		logoTestHooks.resetModule();
		const defaultModule = logoTestHooks.getModule();
		assertStrictEquals(logoTestHooks.getModule(), defaultModule);
		logoTestHooks.setModule(module);

		assertStrictEquals(logoTestHooks.getModule(), module);
		assertStrictEquals(runLogoRuntime(), listener);
		assertEquals(calls, 1);
	} finally {
		logoTestHooks.resetModule();
	}
});

Deno.test("logo runtime applies explicit overrides without caching them", () => {
	const { initThemeCalls, listener } = loadLogoModule(true);

	assertEquals(initThemeCalls, 1);
	assertExists(listener);
});
