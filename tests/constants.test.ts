import { assertEquals, assertRejects } from "@std/testing/asserts";
import { loadIsolatedModule } from "./load-isolated-module.test.ts";

type BrowserLike = {
	i18n: {
		getMessage: (key: string) => string;
	};
	runtime: {
		getManifest: () => {
			homepage_url: string;
			optional_host_permissions: string[];
			version: string;
		};
	};
};

type ConstantsModule = {
	BROWSER: BrowserLike;
	BROWSER_NAME: string | undefined;
	CONTEXT_MENU_PATTERNS: string[];
	EXTENSION_GITHUB_LINK: string;
	EXTENSION_LABEL: string;
	EXTENSION_OPTIONAL_HOST_PERM: string[];
	EXTENSION_VERSION: string;
	ISCHROME: boolean;
	ISEDGE: boolean;
	ISFIREFOX: boolean;
	ISSAFARI: boolean;
};

type ConstantsDependencies = {
	browser: BrowserLike;
	chrome: BrowserLike;
	navigator: {
		userAgent: string;
	};
};

/**
 * Creates a browser stub with manifest and i18n access.
 *
 * @param {string} label Prefix returned by `getMessage`.
 * @param {string} homepageUrl Homepage URL returned by `getManifest`.
 * @return {BrowserLike} Browser stub.
 */
function createBrowser(
	label: string,
	homepageUrl = "https://github.com/acme/repo",
) {
	return {
		i18n: {
			getMessage: (key: string) => `${label}:${key}`,
		},
		runtime: {
			getManifest: () => ({
				homepage_url: homepageUrl,
				optional_host_permissions: ["https://*.example.com/*"],
				version: "1.2.3",
			}),
		},
	};
}

/**
 * Loads the constants module with a specific user agent and manifest homepage.
 *
 * @param {string} userAgent User agent to expose through `navigator`.
 * @param {string} homepageUrl Homepage URL returned by the chosen browser manifest.
 * @return {Promise<ConstantsModule>} Imported constants module.
 */
function loadConstants(
	userAgent: string,
	homepageUrl = "https://github.com/acme/repo",
) {
	return loadIsolatedModule<ConstantsModule, ConstantsDependencies>({
		modulePath: new URL("../src/core/constants.js", import.meta.url),
		dependencies: {
			browser: createBrowser("browser", homepageUrl),
			chrome: createBrowser("chrome", homepageUrl),
			navigator: { userAgent },
		},
	});
}

/**
 * Runs the constants module in a dedicated worker with explicit browser globals.
 *
 * @param {{
 *   userAgent: string;
 *   homepageUrl?: string;
 * }} options Worker execution options.
 * @return {Promise<{ browserName: string | undefined; errorMessage: string | null }>} Worker response.
 */
async function runConstantsWorker({
	userAgent,
	homepageUrl = "https://github.com/acme/repo",
}: {
	userAgent: string;
	homepageUrl?: string;
}) {
	const worker = new Worker(
		new URL("./constants-worker.test.ts", import.meta.url).href,
		{ type: "module" },
	);
	try {
		const result = new Promise<
			{ browserName: string | undefined; errorMessage: string | null }
		>((resolve, reject) => {
			worker.onmessage = (event) => resolve(event.data);
			worker.onerror = (event) => {
				event.preventDefault();
				reject(event.error ?? new Error(event.message));
			};
		});
		worker.postMessage({ userAgent, homepageUrl });
		return await result;
	} finally {
		worker.terminate();
	}
}

Deno.test("constants prefers the browser API for Firefox and exposes manifest data", async () => {
	const fixture = await loadConstants("Mozilla/5.0 Firefox/140.0");
	try {
		const module = fixture.module;

		assertEquals(module.BROWSER_NAME, "firefox");
		assertEquals(module.ISFIREFOX, true);
		assertEquals(module.ISCHROME, false);
		assertEquals(module.EXTENSION_LABEL, "browser:extension_label");
		assertEquals(module.EXTENSION_VERSION, "1.2.3");
		assertEquals(
			module.EXTENSION_GITHUB_LINK,
			"https://github.com/acme/repo",
		);
		assertEquals(module.EXTENSION_OPTIONAL_HOST_PERM, [
			"https://*.example.com/*",
		]);
		assertEquals(module.CONTEXT_MENU_PATTERNS, [
			"https://*.my.salesforce-setup.com/lightning/setup/*",
			"https://*.lightning.force.com/lightning/setup/*",
		]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("constants detect Edge and still use the chrome API", async () => {
	const fixture = await loadConstants("Mozilla/5.0 Edg/120.0");
	try {
		const module = fixture.module;

		assertEquals(module.BROWSER_NAME, "edge");
		assertEquals(module.ISEDGE, true);
		assertEquals(module.ISCHROME, true);
		assertEquals(module.EXTENSION_LABEL, "chrome:extension_label");
		assertEquals(
			module.BROWSER.i18n.getMessage("extension_label"),
			"chrome:extension_label",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("constants detect Chrome", async () => {
	const fixture = await loadConstants(
		"Mozilla/5.0 Chrome/120.0 Safari/537.36",
	);
	try {
		const module = fixture.module;

		assertEquals(module.BROWSER_NAME, "chrome");
		assertEquals(module.ISCHROME, true);
		assertEquals(module.ISEDGE, false);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("constants detect Safari", async () => {
	const fixture = await loadConstants(
		"Mozilla/5.0 Version/17.0 Safari/605.1.15",
	);
	try {
		const module = fixture.module;

		assertEquals(module.BROWSER_NAME, "safari");
		assertEquals(module.ISSAFARI, true);
		assertEquals(module.ISCHROME, false);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("constants fall back to the browser API when no browser name is detected", async () => {
	const fixture = await loadConstants("CustomAgent/1.0");
	try {
		const module = fixture.module;

		assertEquals(module.BROWSER_NAME, undefined);
		assertEquals(module.EXTENSION_LABEL, "browser:extension_label");
	} finally {
		fixture.cleanup();
	}
});

Deno.test("constants reject non-GitHub homepages", async () => {
	await assertRejects(
		async () => {
			const fixture = await loadConstants(
				"Mozilla/5.0 Firefox/140.0",
				"https://example.com/not-github",
			);
			fixture.cleanup();
		},
		Error,
		"no_manifest_github",
	);
});

Deno.test("constants worker detects Edge and Safari and rejects invalid homepages", async () => {
	const edgeResult = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Edg/120.0",
	});
	assertEquals(edgeResult.browserName, "edge");
	assertEquals(edgeResult.errorMessage, null);

	const chromeResult = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Chrome/120.0 Safari/537.36",
	});
	assertEquals(chromeResult.browserName, "chrome");
	assertEquals(chromeResult.errorMessage, null);

	const safariResult = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Version/17.0 Safari/605.1.15",
	});
	assertEquals(safariResult.browserName, "safari");
	assertEquals(safariResult.errorMessage, null);

	const invalidHomepageResult = await runConstantsWorker({
		userAgent: "Mozilla/5.0 Firefox/140.0",
		homepageUrl: "https://example.com/not-github",
	});
	assertEquals(invalidHomepageResult.errorMessage, "no_manifest_github");
});
