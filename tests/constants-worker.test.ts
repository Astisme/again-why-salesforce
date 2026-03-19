type WorkerRequest = {
	homepageUrl: string;
	userAgent: string;
};

type WorkerResponse = {
	browserName: string | undefined;
	errorMessage: string | null;
};

/**
 * Creates a browser-like runtime object for constants module loading.
 *
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
function createBrowser(homepageUrl: string) {
	return {
		i18n: {
			getMessage: (key: string) => key,
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
	const { userAgent, homepageUrl } = event.data;
	Object.defineProperty(globalThis, "navigator", {
		value: { userAgent },
		configurable: true,
		writable: true,
	});
	Object.defineProperty(globalThis, "browser", {
		value: createBrowser(homepageUrl),
		configurable: true,
		writable: true,
	});
	Object.defineProperty(globalThis, "chrome", {
		value: createBrowser(homepageUrl),
		configurable: true,
		writable: true,
	});
	try {
		const module = await import("/constants.js");
		self.postMessage(
			{
				browserName: module.BROWSER_NAME as string | undefined,
				errorMessage: null,
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
