import { assertEquals, assertExists } from "@std/testing/asserts";
import { loadIsolatedModule } from "../load-isolated-module.test.ts";

type RuntimeListener = (
	message: {
		theme?: string | null;
		what?: string;
	},
	sender: unknown,
	sendResponse: (response: null) => void,
) => void;

type LogoDependencies = {
	BROWSER: {
		runtime: {
			onMessage: {
				addListener: (listener: RuntimeListener) => void;
			};
		};
	};
	WHAT_THEME: string;
	initTheme: () => void;
};

/**
 * Loads the popup logo script and captures its listener registration.
 *
 * @return {Promise<{ html: { dataset: Record<string, string>; }; initThemeCalls: number; listener: RuntimeListener | null; responses: null[]; }>} Isolated module fixtures.
 */
async function loadLogoModule() {
	const html = {
		dataset: {} as Record<string, string>,
	};
	let listener: RuntimeListener | null = null;
	let initThemeCalls = 0;
	const responses: null[] = [];

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		LogoDependencies
	>({
		modulePath: new URL("../../src/action/logo/logo.js", import.meta.url),
		dependencies: {
			BROWSER: {
				runtime: {
					onMessage: {
						addListener: (registeredListener) => {
							listener = registeredListener;
						},
					},
				},
			},
			WHAT_THEME: "theme",
			initTheme: () => {
				initThemeCalls++;
			},
		},
		globals: {
			document: {
				documentElement: html,
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"../themeHandler.js",
		]),
	});

	return { cleanup, html, initThemeCalls, listener, responses };
}

Deno.test("logo initializes theme handling and reacts only to theme messages", async () => {
	const { cleanup, html, initThemeCalls, listener, responses } =
		await loadLogoModule();
	const registeredListener = listener as RuntimeListener | null;
	try {
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
	} finally {
		cleanup();
	}
});
