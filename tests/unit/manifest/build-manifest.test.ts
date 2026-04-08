import {
	assertEquals,
	assertExists,
	assertStringIncludes,
} from "@std/testing/asserts";
import {
	buildManifestForBrowser,
	runBuildManifest,
} from "../../../src/manifest/build-manifest-runtime.mjs";

/**
 * Creates a manifest fixture containing every field touched by the build script.
 *
 * @return {Record<string, unknown>} Mutable manifest fixture.
 */
function createManifestFixture() {
	return {
		minimum_chrome_version: "120",
		background: {
			service_worker: "background.js",
			scripts: ["background.js"],
			type: "module",
		},
		browser_specific_settings: {
			gecko: { id: "firefox@example.com" },
			safari: { strict_min_version: "14" },
		},
		commands: {
			"cmd-save-as-tab": {
				suggested_key: { default: "Ctrl+1" },
			},
			"cmd-remove-tab": {
				suggested_key: { default: "Ctrl+2" },
			},
			"cmd-update-tab": {
				suggested_key: { default: "Ctrl+3" },
			},
			"cmd-open-other-org": {
				suggested_key: { default: "Ctrl+4" },
			},
			"cmd-export-all": {
				suggested_key: { default: "Ctrl+5" },
			},
		},
		permissions: ["downloads", "storage"],
		optional_permissions: ["downloads", "cookies"],
		incognito: "split",
	};
}

/**
 * Executes the manifest builder with an isolated manifest and process argv.
 *
 * @param {string} browserName Browser argument passed to the script.
 * @return {Promise<{ errors: string[]; manifest: Record<string, unknown>; thrown: Error | null; writes: { contents: string; path: string; }[]; }>} Execution result.
 */
function runBuild(browserName: string) {
	const manifest = createManifestFixture();
	const errors: string[] = [];
	const writes: { contents: string; path: string }[] = [];
	let thrown: Error | null = null;

	try {
		runBuildManifest({
			argv: ["deno", "build-manifest.mjs", browserName],
			logger: {
				error: (message: string) => {
					errors.push(message);
				},
			},
			manifest,
			writeFileSyncFn: (path: string, contents: string) => {
				writes.push({ contents, path });
			},
		});
	} catch (error) {
		thrown = error as Error;
	}

	return { errors, manifest, thrown, writes };
}

Deno.test("build-manifest keeps Chromium-only command shortcuts and writes the file", async () => {
	const { manifest, thrown, writes } = await runBuild("chrome");

	assertEquals(thrown, null);
	assertEquals(writes.length, 1);
	assertEquals(writes[0].path, "./src/manifest.json");
	assertEquals(
		(manifest.background as Record<string, unknown>).scripts,
		undefined,
	);
	assertEquals(manifest.browser_specific_settings, undefined);
	assertExists(
		(manifest.commands as Record<string, Record<string, unknown>>)[
			"cmd-save-as-tab"
		]
			.suggested_key,
	);
	assertEquals(
		(manifest.commands as Record<string, Record<string, unknown>>)[
			"cmd-export-all"
		]
			.suggested_key,
		undefined,
	);
});

Deno.test("build-manifest treats Edge like Chromium and strips Firefox-specific fields", async () => {
	const { manifest, thrown, writes } = await runBuild("edge");

	assertEquals(thrown, null);
	assertEquals(writes.length, 1);
	assertEquals(
		(manifest.background as Record<string, unknown>).scripts,
		undefined,
	);
	assertEquals(manifest.browser_specific_settings, undefined);
});

Deno.test("build-manifest removes Firefox-incompatible fields", async () => {
	const { manifest, thrown, writes } = await runBuild("firefox");

	assertEquals(thrown, null);
	assertEquals(writes.length, 1);
	assertEquals(manifest.minimum_chrome_version, undefined);
	assertEquals(
		(manifest.background as Record<string, unknown>).service_worker,
		undefined,
	);
	assertEquals(
		(manifest.browser_specific_settings as Record<string, unknown>).safari,
		undefined,
	);
});

Deno.test("build-manifest removes Safari-incompatible permissions and background fields", async () => {
	const { manifest, thrown, writes } = await runBuild("safari");

	assertEquals(thrown, null);
	assertEquals(writes.length, 1);
	assertEquals(manifest.minimum_chrome_version, undefined);
	assertEquals(
		(manifest.background as Record<string, unknown>).type,
		undefined,
	);
	assertEquals(
		(manifest.background as Record<string, unknown>).scripts,
		undefined,
	);
	assertEquals(manifest.incognito, undefined);
	assertEquals(manifest.permissions, ["storage"]);
	assertEquals(manifest.optional_permissions, ["cookies"]);
	assertEquals(
		(manifest.browser_specific_settings as Record<string, unknown>).gecko,
		undefined,
	);
});

Deno.test("build-manifest reports invalid browser arguments", async () => {
	const { errors, thrown, writes } = await runBuild("opera");

	assertEquals(writes.length, 0);
	assertExists(thrown);
	assertStringIncludes(thrown.message, "Unknown browser: opera");
	assertEquals(errors.length, 1);
	assertStringIncludes(errors[0], "Usage:");
});

Deno.test("build-manifest reports invalid browser arguments even with missing argv labels", () => {
	const errors: string[] = [];
	const manifest = createManifestFixture();

	try {
		buildManifestForBrowser({
			argv: [],
			browser: "opera",
			logger: {
				error: (message: string) => {
					errors.push(message);
				},
			},
			manifest,
		});
	} catch (error) {
		assertStringIncludes((error as Error).message, "Unknown browser: opera");
	}

	assertEquals(errors.length, 1);
	assertStringIncludes(errors[0], "Usage:");
});
