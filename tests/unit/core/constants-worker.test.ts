type WorkerRequest = {
	browserLabel?: string;
	chromeLabel?: string;
	homepageUrl: string;
	userAgent: string;
};

type WorkerResponse = {
	browserMessage?: string;
	contextMenuPatterns?: string[];
	contextMenuPatternsRegex?: string[];
	browserName: string | undefined;
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
 * Creates a browser-like runtime object for constants module loading.
 *
 * @param {string} label Prefix returned by `getMessage`.
 * @param {string} homepageUrl Manifest homepage URL.
 * @return {{
 *   i18n: { getMessage: (key: string) => string };
 *   runtime: { getManifest: () => {
 *     homepage_url: string;
 *     optional_host_permissions: string[];
 *     version: string;
 *   }};
 * }} Browser-like object.
 */
function createBrowser(label: string, homepageUrl: string) {
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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const {
		userAgent,
		homepageUrl,
		browserLabel = "browser",
		chromeLabel = "chrome",
	} = event.data;
	Object.defineProperty(globalThis, "navigator", {
		value: { userAgent },
		configurable: true,
		writable: true,
	});
	Object.defineProperty(globalThis, "browser", {
		value: createBrowser(browserLabel, homepageUrl),
		configurable: true,
		writable: true,
	});
	Object.defineProperty(globalThis, "chrome", {
		value: createBrowser(chromeLabel, homepageUrl),
		configurable: true,
		writable: true,
	});
	try {
		const module = await import("../../../src/core/constants.js");
		self.postMessage(
			{
				browserMessage: module.BROWSER.i18n.getMessage(
					"extension_label",
				),
				browserName: module.BROWSER_NAME as string | undefined,
				contextMenuPatterns: module.CONTEXT_MENU_PATTERNS as string[],
				contextMenuPatternsRegex: module
					.CONTEXT_MENU_PATTERNS_REGEX as string[],
				errorMessage: null,
				extensionGithubLink: module.EXTENSION_GITHUB_LINK as string,
				extensionLabel: module.EXTENSION_LABEL as string,
				extensionOptionalHostPerm: module
					.EXTENSION_OPTIONAL_HOST_PERM as string[],
				extensionVersion: module.EXTENSION_VERSION as string,
				isChrome: module.ISCHROME as boolean,
				isEdge: module.ISEDGE as boolean,
				isFirefox: module.ISFIREFOX as boolean,
				isSafari: module.ISSAFARI as boolean,
				salesforceLightningPattern: module
					.SALESFORCE_LIGHTNING_PATTERN as RegExp,
			} satisfies WorkerResponse,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		self.postMessage(
			{
				browserName: undefined,
				errorMessage: message,
			} satisfies WorkerResponse,
		);
	}
};
