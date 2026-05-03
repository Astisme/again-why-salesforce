import { assertEquals, assertExists } from "@std/testing/asserts";
import { runLogo } from "../../../src/action/logo/logo-runtime.js";

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
 * @return {{ html: { dataset: Record<string, string>; }; initThemeCalls: number; listener: RuntimeListener | null; responses: null[]; }} Runtime fixtures.
 */
function loadLogoModule() {
	const html = {
		dataset: {} as Record<string, string>,
	};
	let listener: RuntimeListener | null = null;
	let initThemeCalls = 0;
	const responses: null[] = [];
	runLogo({
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
		initThemeFn: () => {
			initThemeCalls++;
		},
		whatTheme: "theme",
	});

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
