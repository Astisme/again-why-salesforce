import {
	assert,
	assertEquals,
	assertFalse,
	assertThrows,
} from "@std/testing/asserts";
import { MockElement } from "../action/mock-dom.test.ts";
import { installMockDom } from "../happydom.test.ts";
import { loadIsolatedModule } from "../load-isolated-module.test.ts";
import { mockStorage } from "../mocks.test.ts";
import {
	EXTENSION_USAGE_DAYS,
	HIDDEN_CLASS,
	SETTINGS_KEY,
	WHY_KEY,
} from "/constants.js";

const CHROME_REVIEW_LINK =
	"https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi/reviews";

type ReviewSponsorClass = CustomElementConstructor & {
	new (): ReviewSponsorInstance;
	prototype: ReviewSponsorInstance;
};

type ReviewSponsorInstance = MockElement & {
	_getExtensionUsageDays: () => Promise<number>;
	_showReviewOrSponsor: (result: ReviewSponsorResult) => Promise<void>;
	whenReady: () => Promise<void>;
};

type ReviewSponsorDependencies = {
	BROWSER: {
		runtime: {
			getURL: (path: string) => string;
		};
	};
	EXTENSION_USAGE_DAYS: string;
	HIDDEN_CLASS: string;
	ISCHROME: boolean;
	ISEDGE: boolean;
	ISFIREFOX: boolean;
	ISSAFARI: boolean;
	ensureAllTabsAvailability: () => Promise<Record<string, string>[]>;
	ensureTranslatorAvailability: () => Promise<{
		currentLanguage: string;
		translate: (message: string) => Promise<string>;
	}>;
	generateReviewSponsorSvgs: () => ReviewSponsorResult;
	getSettings: (keys: string[]) => Promise<{ enabled: number }>;
	injectStyle: (
		id: string,
		options: { link: string },
	) => MockElement | HTMLElement;
};

type ReviewSponsorResult = {
	reviewLink: MockElement | HTMLElement;
	reviewSvg: MockElement | HTMLElement;
	root: MockElement | HTMLElement;
	sponsorLink: MockElement | HTMLElement;
	sponsorSvg: MockElement | HTMLElement;
};

type ToggleableClassList = {
	add: (...tokens: string[]) => void;
	contains: (token: string) => boolean;
	remove: (...tokens: string[]) => void;
	toggle?: (token: string, force?: boolean) => boolean;
};

/**
 * HTMLElement replacement with shadow-root support for isolated tests.
 */
class MockReviewSponsorHTMLElement extends MockElement {
	/**
	 * Creates the host element.
	 */
	constructor() {
		super("review-sponsor-aws");
	}
}

/**
 * Creates a typed fixture set for `showReviewOrSponsor`.
 *
 * @return {{
 *   reviewSvg: HTMLElement;
 *   sponsorSvg: HTMLElement;
 *   reviewLink: HTMLAnchorElement;
 *   sponsorLink: HTMLAnchorElement;
 * }}
 */
function createElements() {
	const reviewSvg = document.createElement("div");
	const sponsorSvg = document.createElement("div");
	for (const element of [reviewSvg, sponsorSvg]) {
		element.classList.toggle ??= (token: string, force?: boolean) => {
			const shouldAdd = force ?? !element.classList.contains(token);
			if (shouldAdd) {
				element.classList.add(token);
				return true;
			}
			element.classList.remove(token);
			return false;
		};
	}
	reviewSvg.classList.add(HIDDEN_CLASS);
	sponsorSvg.classList.add(HIDDEN_CLASS);
	const reviewLink = document.createElement("a");
	const sponsorLink = document.createElement("a");
	return {
		reviewSvg,
		sponsorSvg,
		reviewLink,
		sponsorLink,
	};
}

/**
 * Creates a custom-elements registry that stores the review-sponsor
 * constructor for isolated tests.
 *
 * @return {{ getConstructor: () => ReviewSponsorClass | null; registry: CustomElementRegistry; }}
 */
function createStoredCustomElementsRegistry() {
	let constructor: ReviewSponsorClass | null = null;
	return {
		getConstructor: () => constructor,
		registry: {
			define(
				name: string,
				registeredConstructor: CustomElementConstructor,
			) {
				if (
					name === "review-sponsor-aws" &&
					isReviewSponsorClass(registeredConstructor)
				) {
					constructor = registeredConstructor;
				}
			},
			get(_name: string) {
				return undefined;
			},
			getName(_constructor: CustomElementConstructor) {
				return null;
			},
			upgrade(_root: Node) {},
			whenDefined(_name: string) {
				return Promise.resolve(class extends HTMLElement {});
			},
		} satisfies CustomElementRegistry,
	};
}

/**
 * Narrows a custom-element constructor to the review-sponsor shape used in tests.
 *
 * @param {CustomElementConstructor} constructor Constructor registered for the element.
 * @return {constructor is ReviewSponsorClass} `true` when the constructor exposes the expected methods.
 */
function isReviewSponsorClass(
	constructor: CustomElementConstructor,
): constructor is ReviewSponsorClass {
	return typeof constructor.prototype._getExtensionUsageDays === "function" &&
		typeof constructor.prototype._showReviewOrSponsor === "function";
}

/**
 * Loads the review-sponsor module with browser flags overridden for branch tests.
 *
 * @param {{
 *   isChrome?: boolean;
 *   isEdge?: boolean;
 *   isFirefox?: boolean;
 *   isSafari?: boolean;
 * }} [options={}] Browser flag overrides.
 * @return {Promise<{
 *   cleanup: () => void;
 *   getConstructor: () => ReviewSponsorClass | null;
 *   openCalls: string[];
 *   showReviewOrSponsor: (input: {
 *     allTabs?: object[];
 *     reviewLink?: HTMLElement;
 *     reviewSvg?: HTMLElement;
 *     sponsorLink?: HTMLElement;
 *     sponsorSvg?: HTMLElement;
 *     translator?: { currentLanguage?: string } | null;
 *     usageDays?: number;
 *   }) => void;
 * }>} Loaded module handles.
 */
async function loadReviewSponsorBranchModule(
	{
		isChrome = false,
		isEdge = false,
		isFirefox = false,
		isSafari = false,
	}: {
		isChrome?: boolean;
		isEdge?: boolean;
		isFirefox?: boolean;
		isSafari?: boolean;
	} = {},
) {
	const registry = createStoredCustomElementsRegistry();
	const openCalls: string[] = [];
	const result = await loadIsolatedModule<
		{
			showReviewOrSponsor: (input: {
				allTabs?: object[];
				reviewLink?: HTMLElement;
				reviewSvg?: HTMLElement;
				sponsorLink?: HTMLElement;
				sponsorSvg?: HTMLElement;
				translator?: { currentLanguage?: string } | null;
				usageDays?: number;
			}) => void;
		},
		ReviewSponsorDependencies
	>({
		modulePath: new URL(
			"../../src/components/review-sponsor/review-sponsor.js",
			import.meta.url,
		),
		dependencies: {
			BROWSER: {
				runtime: {
					getURL: (path) => `chrome-extension://test${path}`,
				},
			},
			EXTENSION_USAGE_DAYS: "extension_usage_days",
			HIDDEN_CLASS: "hidden",
			ISCHROME: isChrome,
			ISEDGE: isEdge,
			ISFIREFOX: isFirefox,
			ISSAFARI: isSafari,
			ensureAllTabsAvailability: () => Promise.resolve([]),
			ensureTranslatorAvailability: () =>
				Promise.resolve({
					currentLanguage: "en",
					translate: (message) => Promise.resolve(message),
				}),
			generateReviewSponsorSvgs: () => {
				const root = document.createElement("div");
				const reviewLink = document.createElement("a");
				const sponsorLink = document.createElement("a");
				const reviewSvg = document.createElement("svg");
				const sponsorSvg = document.createElement("svg");
				for (const element of [reviewSvg, sponsorSvg]) {
					element.classList.toggle ??= (
						token: string,
						force?: boolean,
					) => {
						const shouldAdd = force ??
							!element.classList.contains(token);
						if (shouldAdd) {
							element.classList.add(token);
							return true;
						}
						element.classList.remove(token);
						return false;
					};
				}
				reviewLink.appendChild(reviewSvg);
				sponsorLink.appendChild(sponsorSvg);
				root.appendChild(reviewLink);
				root.appendChild(sponsorLink);
				return {
					reviewLink,
					reviewSvg,
					root,
					sponsorLink,
					sponsorSvg,
				};
			},
			getSettings: (keys) => {
				const settingId = keys[0];
				const settings = mockStorage[SETTINGS_KEY] ?? [];
				const matched = settings.find((setting) =>
					setting.id === settingId
				);
				return Promise.resolve({
					enabled: Number(matched?.enabled ?? 0),
				});
			},
			injectStyle: () => document.createElement("link"),
		},
		globals: {
			HTMLElement: MockReviewSponsorHTMLElement,
			customElements: registry.registry,
			open: (url?: string | URL) => {
				openCalls.push(String(url));
				return null;
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"/functions.js",
			"/tabContainer.js",
			"/translator.js",
			"/salesforce/generator.js",
		]),
	});
	return {
		cleanup: result.cleanup,
		getConstructor: registry.getConstructor,
		openCalls,
		showReviewOrSponsor: result.module.showReviewOrSponsor,
	};
}

Deno.test("show review or sponsor block", async (t) => {
	const { cleanup } = installMockDom();
	const reviewSponsorModule = await loadReviewSponsorBranchModule();
	const { showReviewOrSponsor, openCalls } = reviewSponsorModule;

	await t.step("throws when required params are missing", () => {
		assertThrows(
			() => showReviewOrSponsor({}),
			Error,
			"error_required_params",
		);
	});

	await t.step(
		"shows none when shouldShowReviewOrSponsor returns none",
		() => {
			const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
				createElements();
			showReviewOrSponsor({
				allTabs: Array(7),
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assert(reviewSvg.classList.contains(HIDDEN_CLASS));
			assert(sponsorSvg.classList.contains(HIDDEN_CLASS));
			assertEquals(reviewLink.getAttribute("aria-hidden"), "true");
			assertEquals(sponsorLink.getAttribute("aria-hidden"), "true");
			assertEquals(reviewLink.tabIndex, -1);
			assertEquals(sponsorLink.tabIndex, -1);
		},
	);

	await t.step(
		"shows review when shouldShowReviewOrSponsor returns review",
		() => {
			const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
				createElements();
			openCalls.length = 0;
			showReviewOrSponsor({
				allTabs: Array(8),
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertFalse(reviewSvg.classList.contains(HIDDEN_CLASS));
			assert(reviewLink.tabIndex === 0);
			assert(sponsorSvg.classList.contains(HIDDEN_CLASS));
			assertEquals(sponsorLink.tabIndex, -1);
			reviewLink.click();
			assertEquals(openCalls.length, 0);
		},
	);

	await t.step(
		"shows sponsor and review when shouldShowReviewOrSponsor returns sponsor",
		() => {
			const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
				createElements();
			const translator = { currentLanguage: "it" };
			openCalls.length = 0;
			showReviewOrSponsor({
				allTabs: Array(16),
				translator,
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertFalse(reviewSvg.classList.contains(HIDDEN_CLASS));
			assertFalse(sponsorSvg.classList.contains(HIDDEN_CLASS));
			sponsorLink.click();
			assertEquals(openCalls.length, 1);
			assert(openCalls[0].includes("/it/"));
		},
	);

	await t.step(
		"shows review after 20 days of actual use even without enough tabs",
		() => {
			const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
				createElements();
			showReviewOrSponsor({
				allTabs: [],
				usageDays: 20,
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertFalse(reviewSvg.classList.contains(HIDDEN_CLASS));
			assert(sponsorSvg.classList.contains(HIDDEN_CLASS));
			assertEquals(reviewLink.tabIndex, 0);
			assertEquals(sponsorLink.tabIndex, -1);
		},
	);

	await t.step(
		"shows sponsor after 40 days of actual use even without enough tabs",
		() => {
			const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
				createElements();
			showReviewOrSponsor({
				allTabs: [],
				usageDays: 40,
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertFalse(reviewSvg.classList.contains(HIDDEN_CLASS));
			assertFalse(sponsorSvg.classList.contains(HIDDEN_CLASS));
			assertEquals(reviewLink.tabIndex, 0);
			assertEquals(sponsorLink.tabIndex, 0);
		},
	);

	await t.step(
		"opens Edge and Firefox review links and defaults sponsor language in isolation",
		async () => {
			{
				const edgeModule = await loadReviewSponsorBranchModule({
					isEdge: true,
				});
				const edgeElements = createElements();
				try {
					edgeModule.showReviewOrSponsor({
						allTabs: Array(8),
						translator: {},
						...edgeElements,
					});
					edgeElements.reviewLink.click();
					assertEquals(
						edgeModule.openCalls[0],
						"https://microsoftedge.microsoft.com/addons/detail/again-why-salesforce/dfdjpokbfeaamjcomllncennmfhpldmm#description",
					);
				} finally {
					edgeModule.cleanup();
				}
			}

			{
				const firefoxModule = await loadReviewSponsorBranchModule({
					isFirefox: true,
				});
				const firefoxElements = createElements();
				try {
					firefoxModule.showReviewOrSponsor({
						allTabs: Array(16),
						translator: {},
						...firefoxElements,
					});
					firefoxElements.reviewLink.click();
					firefoxElements.sponsorLink.click();
					assertEquals(
						firefoxModule.openCalls[0],
						"https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/",
					);
					assertEquals(
						firefoxModule.openCalls[1],
						"https://alfredoit.dev/en/sponsor/?email=againwhysalesforce@duck.com",
					);
				} finally {
					firefoxModule.cleanup();
				}
			}

			{
				const safariModule = await loadReviewSponsorBranchModule({
					isSafari: true,
				});
				const safariElements = createElements();
				try {
					safariModule.showReviewOrSponsor({
						allTabs: Array(8),
						translator: {},
						...safariElements,
					});
					assert(
						safariElements.reviewSvg.classList.contains(
							HIDDEN_CLASS,
						),
					);
					assertEquals(safariElements.reviewLink.tabIndex, -1);
				} finally {
					safariModule.cleanup();
				}
			}
		},
	);

	await t.step(
		"constructs the custom element and populates direct-import metadata",
		async () => {
			const ReviewSponsorConstructor = reviewSponsorModule
				.getConstructor();
			assert(ReviewSponsorConstructor != null);
			const originalFetch = globalThis.fetch;
			const originalWhy = structuredClone(mockStorage[WHY_KEY]);
			const originalSettings = structuredClone(mockStorage[SETTINGS_KEY]);
			openCalls.length = 0;
			mockStorage[WHY_KEY] = Array.from(
				{ length: 20 },
				(_value, index) => ({
					label: `Tab ${index}`,
					org: "acme",
					url: `/setup/${index}`,
				}),
			);
			mockStorage[SETTINGS_KEY] = [
				{ enabled: "en", id: "picked-language" },
				{ enabled: false, id: "persist_sort" },
				{ enabled: 45, id: EXTENSION_USAGE_DAYS },
			];
			const originalCreateElementNS = document.createElementNS.bind(
				document,
			);
			document.createElementNS =
				((namespace: string, tagName: string) => {
					const element = originalCreateElementNS(namespace, tagName);
					const classList = element.classList as ToggleableClassList;
					classList.toggle ??= function (
						token: string,
						force?: boolean,
					) {
						const shouldAdd = force ?? !this.contains(token);
						if (shouldAdd) {
							this.add(token);
							return true;
						}
						this.remove(token);
						return false;
					};
					return element;
				}) as typeof document.createElementNS;
			const originalAttachShadow =
				ReviewSponsorConstructor.prototype.attachShadow;
			Object.defineProperty(
				ReviewSponsorConstructor.prototype,
				"attachShadow",
				{
					value(this: HTMLElement) {
						const shadowRoot = document.createElement(
							"shadow-root",
						);
						Object.defineProperty(this, "shadowRoot", {
							value: shadowRoot,
							configurable: true,
							writable: true,
						});
						return shadowRoot;
					},
					configurable: true,
					writable: true,
				},
			);
			globalThis.fetch = ((path: string | URL | Request) => {
				const url = String(path);
				if (url.includes("/_locales/")) {
					return Promise.resolve({
						json: () =>
							Promise.resolve({
								send_tip: { message: "Send tip" },
								write_review: { message: "Write review" },
							}),
					} as Response);
				}
				return originalFetch(path);
			}) as typeof globalThis.fetch;

			try {
				const component = new ReviewSponsorConstructor();
				await component.whenReady();

				assertEquals(await component._getExtensionUsageDays(), 45);
				assertEquals(component.shadowRoot?.children.length, 2);

				const links = component.shadowRoot?.querySelectorAll("a") ?? [];
				const reviewLink = links[0] as HTMLAnchorElement | undefined;
				const sponsorLink = links[1] as HTMLAnchorElement | undefined;
				const reviewSvg = reviewLink?.querySelector("svg");
				assert(reviewLink != null);
				assert(sponsorLink != null);
				assert(reviewSvg != null);

				assertEquals(reviewLink.title, "write_review");
				assertEquals(
					reviewLink.getAttribute("aria-label"),
					"write_review",
				);
				assertEquals(reviewSvg.getAttribute("focusable"), "false");
			} finally {
				document.createElementNS = originalCreateElementNS;
				if (originalAttachShadow == null) {
					Reflect.deleteProperty(
						ReviewSponsorConstructor.prototype,
						"attachShadow",
					);
				} else {
					Object.defineProperty(
						ReviewSponsorConstructor.prototype,
						"attachShadow",
						{
							value: originalAttachShadow,
							configurable: true,
							writable: true,
						},
					);
				}
				globalThis.fetch = originalFetch;
				mockStorage[WHY_KEY] = originalWhy;
				mockStorage[SETTINGS_KEY] = originalSettings;
			}
		},
	);

	reviewSponsorModule.cleanup();
	cleanup();
});

Deno.test("ReviewSponsorAws loads async metadata and opens the expected links in isolation", async () => {
	const registry = createStoredCustomElementsRegistry();
	const injectCalls: Array<{ id: string; link: string }> = [];
	const openCalls: string[] = [];
	const settingsCalls: string[][] = [];
	const translateCalls: string[] = [];
	const generated = {
		reviewLink: new MockElement("a"),
		reviewSvg: new MockElement("svg"),
		root: new MockElement("div"),
		sponsorLink: new MockElement("a"),
		sponsorSvg: new MockElement("svg"),
	} satisfies ReviewSponsorResult;

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		ReviewSponsorDependencies
	>({
		modulePath: new URL(
			"../../src/components/review-sponsor/review-sponsor.js",
			import.meta.url,
		),
		dependencies: {
			BROWSER: {
				runtime: {
					getURL: (path) => `chrome-extension://test${path}`,
				},
			},
			EXTENSION_USAGE_DAYS: "extension_usage_days",
			HIDDEN_CLASS: "hidden",
			ISCHROME: true,
			ISEDGE: false,
			ISFIREFOX: false,
			ISSAFARI: false,
			ensureAllTabsAvailability: () =>
				Promise.resolve(Array.from(
					{ length: 20 },
					(_value, index) => ({ id: String(index) }),
				)),
			ensureTranslatorAvailability: () =>
				Promise.resolve({
					currentLanguage: "fr",
					translate: (message) => {
						translateCalls.push(message);
						return Promise.resolve(`translated:${message}`);
					},
				}),
			generateReviewSponsorSvgs: () => generated,
			getSettings: (keys) => {
				settingsCalls.push(keys);
				return Promise.resolve({ enabled: 45 });
			},
			injectStyle: (id, options) => {
				injectCalls.push({ id, link: options.link });
				return new MockElement("link");
			},
		},
		globals: {
			HTMLElement: MockReviewSponsorHTMLElement,
			customElements: registry.registry,
			open: (url?: string | URL) => {
				openCalls.push(String(url));
				return null;
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"/functions.js",
			"/tabContainer.js",
			"/translator.js",
			"/salesforce/generator.js",
		]),
	});

	try {
		const ReviewSponsorConstructor = registry.getConstructor();
		assert(ReviewSponsorConstructor != null);

		const component = new ReviewSponsorConstructor();
		await component.whenReady();

		assertEquals(settingsCalls, [["extension_usage_days"]]);
		assertEquals(injectCalls, [{
			id: "awsf-rev-spons",
			link:
				"chrome-extension://test/components/review-sponsor/review-sponsor.css",
		}]);
		assertEquals(translateCalls, ["write_review", "send_tip"]);
		assertEquals(component.shadowRoot?.children.length, 2);
		assertEquals(await component._getExtensionUsageDays(), 45);
		assertEquals(generated.reviewLink.title, "translated:write_review");
		assertEquals(
			generated.reviewLink.getAttribute("aria-label"),
			"translated:write_review",
		);
		assertEquals(generated.reviewSvg.getAttribute("focusable"), "false");
		assertEquals(generated.sponsorLink.title, "translated:send_tip");
		assertEquals(
			generated.sponsorLink.getAttribute("aria-label"),
			"translated:send_tip",
		);
		assertEquals(generated.sponsorSvg.getAttribute("focusable"), "false");

		generated.reviewLink.click();
		generated.sponsorLink.click();

		assertEquals(openCalls[0], CHROME_REVIEW_LINK);
		assert(openCalls[1].includes("/en/"));
	} finally {
		cleanup();
	}
});
