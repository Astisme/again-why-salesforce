import { assertEquals } from "@std/testing/asserts";

type ConstantsWorkerResult = {
	browserMessage?: string;
	browserName: string | undefined;
	contextMenuPatterns?: string[];
	contextMenuPatternsRegex?: string[];
	extensionGithubLink?: string;
	extensionLabel?: string;
	extensionOptionalHostPerm?: string[];
	extensionVersion?: string;
	errorMessage: string | null;
	isChrome?: boolean;
	isEdge?: boolean;
	isFirefox?: boolean;
	isSafari?: boolean;
	salesforceLightningPattern?: RegExp;
};

/**
 * Runs the constants module in a dedicated worker with explicit browser globals.
 *
 * @param {{
 *   browserLabel?: string;
 *   chromeLabel?: string;
 *   userAgent: string;
 *   homepageUrl?: string;
 * }} options Worker execution options.
 * @return {Promise<ConstantsWorkerResult>} Worker response.
 */
async function runConstantsWorker({
	browserLabel = "browser",
	chromeLabel = "chrome",
	userAgent,
	homepageUrl = "https://github.com/acme/repo",
}: {
	browserLabel?: string;
	chromeLabel?: string;
	userAgent: string;
	homepageUrl?: string;
}) {
	const worker = new Worker(
		new URL("./constants-worker.test.ts", import.meta.url).href,
		{ type: "module" },
	);
	try {
		const result = new Promise<ConstantsWorkerResult>((resolve, reject) => {
			worker.onmessage = (event) => resolve(event.data);
			worker.onerror = (event) => {
				event.preventDefault();
				reject(event.error ?? new Error(event.message));
			};
		});
		worker.postMessage({
			browserLabel,
			chromeLabel,
			homepageUrl,
			userAgent,
		});
		return await result;
	} finally {
		worker.terminate();
	}
}

Deno.test("constants prefer browser API for Firefox and expose manifest data", async () => {
	const result = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Firefox/140.0",
	});

	assertEquals(result.errorMessage, null);
	assertEquals(result.browserName, "firefox");
	assertEquals(result.isFirefox, true);
	assertEquals(result.isChrome, false);
	assertEquals(result.extensionLabel, "browser:extension_label");
	assertEquals(result.extensionVersion, "1.2.3");
	assertEquals(result.extensionGithubLink, "https://github.com/acme/repo");
	assertEquals(result.extensionOptionalHostPerm, [
		"https://*.example.com/*",
	]);
	assertEquals(result.contextMenuPatterns, [
		"https://*.my.salesforce-setup.com/lightning/setup/*",
		"https://*.lightning.force.com/lightning/setup/*",
	]);
	assertEquals(result.contextMenuPatternsRegex, [
		"https://.*.my.salesforce-setup.com/lightning/setup/.*",
		"https://.*.lightning.force.com/lightning/setup/.*",
	]);
});

Deno.test("constants detect Edge and still use the chrome API", async () => {
	const result = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Edg/120.0",
	});

	assertEquals(result.errorMessage, null);
	assertEquals(result.browserName, "edge");
	assertEquals(result.isEdge, true);
	assertEquals(result.isChrome, true);
	assertEquals(result.extensionLabel, "chrome:extension_label");
	assertEquals(result.browserMessage, "chrome:extension_label");
});

Deno.test("constants detect Chrome", async () => {
	const result = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Chrome/120.0 Safari/537.36",
	});

	assertEquals(result.errorMessage, null);
	assertEquals(result.browserName, "chrome");
	assertEquals(result.isChrome, true);
	assertEquals(result.isEdge, false);
});

Deno.test("constants detect Safari", async () => {
	const result = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Version/17.0 Safari/605.1.15",
	});

	assertEquals(result.errorMessage, null);
	assertEquals(result.browserName, "safari");
	assertEquals(result.isSafari, true);
	assertEquals(result.isChrome, false);
});

Deno.test("constants fall back to browser API when user-agent browser cannot be detected", async () => {
	const result = await runConstantsWorker({
		userAgent: "CustomAgent/1.0",
	});

	assertEquals(result.errorMessage, null);
	assertEquals(result.browserName, undefined);
	assertEquals(result.extensionLabel, "browser:extension_label");
});

Deno.test("constants reject non-GitHub homepages", async () => {
	const result = await runConstantsWorker({
		homepageUrl: "https://example.com/not-github",
		userAgent: "Mozilla/5.0 Firefox/140.0",
	});

	assertEquals(result.errorMessage, "no_manifest_github");
});

Deno.test("constants expose escaped Salesforce host patterns and reject lookalike lightning domains", async () => {
	const result = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Firefox/140.0",
	});
	const pattern = result.salesforceLightningPattern;

	assertEquals(pattern?.test("https://acme.lightning.force.com/lightning/page/home"), true);
	assertEquals(
		pattern?.test(
			"https://acme.lightning.force.com:8443/lightning/page/home",
		),
		true,
	);
	assertEquals(
		pattern?.test(
			"https://acme.lightning.force.com.attacker.test/lightning/page/home",
		),
		false,
	);
	assertEquals(
		pattern?.test(
			"https://acme.lightning-force.com/lightning/page/home",
		),
		false,
	);
});
