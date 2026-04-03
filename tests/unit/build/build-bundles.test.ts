import { assertEquals, assertStringIncludes } from "@std/testing/asserts";

/**
 * Reads a repository file using a URL resolved from this test file.
 *
 * @param {string} relativePath - Repository-relative path from project root.
 * @return {Promise<string>} File contents.
 */
function readRepoFile(relativePath: string) {
	return Deno.readTextFile(
		new URL(`../../../${relativePath}`, import.meta.url),
	);
}

/**
 * Asserts that a value does not contain an unexpected substring.
 *
 * @param {string} value - Full text to inspect.
 * @param {string} disallowedSubstring - Substring that must not be present.
 */
function assertStringNotIncludes(
	value: string,
	disallowedSubstring: string,
) {
	assertEquals(value.includes(disallowedSubstring), false);
}

Deno.test("build script bundles popup and options into generated outputs", async () => {
	const buildScript = await readRepoFile("bin/build.ts");
	assertStringIncludes(buildScript, "./src/entrypoints/popup.js");
	assertStringIncludes(buildScript, "./src/generated/bundledPopup.js");
	assertStringIncludes(buildScript, "./src/entrypoints/options.js");
	assertStringIncludes(buildScript, "./src/generated/bundledOptions.js");
});

Deno.test("popup and options entrypoints import required UI modules", async () => {
	const popupEntrypoint = await readRepoFile("src/entrypoints/popup.js");
	const optionsEntrypoint = await readRepoFile("src/entrypoints/options.js");

	assertStringIncludes(popupEntrypoint, "../action/popup/popup.js");
	assertStringIncludes(
		popupEntrypoint,
		"../components/review-sponsor/review-sponsor.js",
	);
	assertStringIncludes(optionsEntrypoint, "../settings/options.js");
	assertStringIncludes(optionsEntrypoint, "../components/help/help.js");
	assertStringIncludes(
		optionsEntrypoint,
		"../components/review-sponsor/review-sponsor.js",
	);
});

Deno.test("theme selector stylesheet path resolves from generated bundles", async () => {
	const themeSelectorComponent = await readRepoFile(
		"src/components/theme-selector/theme-selector.js",
	);
	assertStringIncludes(
		themeSelectorComponent,
		"../components/theme-selector/theme-selector.css",
	);
	assertStringIncludes(themeSelectorComponent, "import.meta.url");
});

Deno.test("popup and options html load generated bundles instead of unbundled scripts", async () => {
	const popupHtml = await readRepoFile("src/action/popup/popup.html");
	const optionsHtml = await readRepoFile("src/settings/options.html");

	assertStringIncludes(popupHtml, "/generated/bundledPopup.js");
	assertStringNotIncludes(popupHtml, "/entrypoints/popup.js");
	assertStringNotIncludes(
		popupHtml,
		"/components/review-sponsor/review-sponsor.js",
	);
	assertStringIncludes(optionsHtml, "/generated/bundledOptions.js");
	assertStringNotIncludes(optionsHtml, "/entrypoints/options.js");
	assertStringNotIncludes(optionsHtml, "/components/help/help.js");
	assertStringNotIncludes(
		optionsHtml,
		"/components/review-sponsor/review-sponsor.js",
	);
});

Deno.test("zip script includes generated popup and options bundles", async () => {
	const zipScript = await readRepoFile("bin/zip-extension.bash");
	assertStringIncludes(zipScript, "generated/bundled*.js");
	assertStringIncludes(zipScript, "action/popup/popup.js");
	assertStringIncludes(zipScript, "settings/options.js");
	assertStringIncludes(zipScript, "components/*/*.js");
});
