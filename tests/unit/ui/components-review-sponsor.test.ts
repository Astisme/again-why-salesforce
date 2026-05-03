import {
	assert,
	assertEquals,
	assertFalse,
	assertThrows,
} from "@std/testing/asserts";
import { MockElement } from "./mock-dom.test.ts";
import { installMockDom } from "../../happydom.test.ts";
import { createReviewSponsorModule } from "../../../src/components/review-sponsor/review-sponsor-runtime.js";

const CHROME_REVIEW_LINK =
	"https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi/reviews";
const EDGE_REVIEW_LINK =
	"https://microsoftedge.microsoft.com/addons/detail/again-why-salesforce/dfdjpokbfeaamjcomllncennmfhpldmm#description";
const FIREFOX_REVIEW_LINK =
	"https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/";

type ReviewSponsorResult = {
	reviewLink: MockElement;
	reviewSvg: MockElement;
	root: MockElement;
	sponsorLink: MockElement;
	sponsorSvg: MockElement;
};

type ReviewSponsorClass = {
	new (): ReviewSponsorInstance;
	prototype: ReviewSponsorInstance;
};

type ReviewSponsorInstance = MockElement & {
	_ensureReadyPromise: () => Promise<void>;
	_getExtensionUsageDays: () => Promise<number>;
	_showReviewOrSponsor: (result: ReviewSponsorResult) => Promise<void>;
	connectedCallback: () => void;
	whenReady: () => Promise<void>;
};

/**
 * HTMLElement replacement with shadow-root support.
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
	reviewSvg.classList.add("hidden");
	sponsorSvg.classList.add("hidden");
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
 * Creates a custom-elements registry that stores the review-sponsor constructor.
 *
 * @return {{
 *   getConstructor: () => ReviewSponsorClass | null;
 *   registry: { define: (name: string, constructor: ReviewSponsorClass) => void; };
 * }}
 */
function createStoredCustomElementsRegistry() {
	let constructor: ReviewSponsorClass | null = null;
	return {
		getConstructor: () => constructor,
		registry: {
			define(name: string, registeredConstructor: unknown) {
				if (
					name === "review-sponsor-aws" &&
					typeof registeredConstructor === "function"
				) {
					constructor = registeredConstructor as ReviewSponsorClass;
				}
			},
		},
	};
}

/**
 * Creates a review-sponsor module fixture with injected dependencies.
 *
 * @param {{
 *   generated?: ReviewSponsorResult;
 *   isChrome?: boolean;
 *   isEdge?: boolean;
 *   isFirefox?: boolean;
 *   isSafari?: boolean;
 *   tabs?: unknown[];
 *   translatorLanguage?: string;
 *   usageDays?: number;
 * }} [options={}] Fixture options.
 * @return {{
 *   getConstructor: () => ReviewSponsorClass | null;
 *   injectCalls: Array<{ id: string; link: string }>;
 *   openCalls: string[];
 *   settingsCalls: string[][];
 *   showReviewOrSponsor: (options?: {
 *     allTabs?: unknown[] | null;
 *     usageDays?: number;
 *     translatorLanguage?: string | null;
 *     reviewSvg?: HTMLElement | null;
 *     sponsorSvg?: HTMLElement | null;
 *     reviewLink?: HTMLAnchorElement | null;
 *     sponsorLink?: HTMLAnchorElement | null;
 *   }) => void;
 *   translateCalls: string[];
 * }}
 */
function createReviewSponsorFixture({
	generated = {
		reviewLink: new MockElement("a"),
		reviewSvg: new MockElement("svg"),
		root: new MockElement("div"),
		sponsorLink: new MockElement("a"),
		sponsorSvg: new MockElement("svg"),
	},
	isChrome = false,
	isEdge = false,
	isFirefox = false,
	isSafari = false,
	tabs = [],
	translatorLanguage = "en",
	usageDays = 0,
}: {
	generated?: ReviewSponsorResult;
	isChrome?: boolean;
	isEdge?: boolean;
	isFirefox?: boolean;
	isSafari?: boolean;
	tabs?: unknown[];
	translatorLanguage?: string;
	usageDays?: number;
} = {}) {
	const registry = createStoredCustomElementsRegistry();
	const injectCalls: Array<{ id: string; link: string }> = [];
	const openCalls: string[] = [];
	const settingsCalls: string[][] = [];
	const translateCalls: string[] = [];

	const { showReviewOrSponsor } = createReviewSponsorModule({
		browser: {
			runtime: {
				getURL: (path: string) => `chrome-extension://test${path}`,
			},
		},
		extensionUsageDays: "extension_usage_days",
		hiddenClass: "hidden",
		isChrome,
		isEdge,
		isFirefox,
		isSafari,
		getSettingsFn: (keys: string[]) => {
			settingsCalls.push(keys);
			return Promise.resolve({ enabled: usageDays });
		},
		injectStyleFn: (id: string, options: { link: string }) => {
			injectCalls.push({ id, link: options.link });
			return new MockElement("link") as never;
		},
		ensureAllTabsAvailabilityFn: () => Promise.resolve(tabs),
		getTranslationsFn: (message: string) => {
			translateCalls.push(message);
			return Promise.resolve(`translated:${message}`);
		},
		getTranslatorAttributeFn: (attribute: string) =>
			attribute === "currentLanguage" ? translatorLanguage : null,
		generateReviewSponsorSvgsFn: () => generated as never,
		customElementsRef: registry.registry,
		openFn: (url: string | URL) => {
			openCalls.push(String(url));
			return null;
		},
		HTMLElementRef: MockReviewSponsorHTMLElement as never,
	});

	return {
		getConstructor: registry.getConstructor,
		injectCalls,
		openCalls,
		settingsCalls,
		showReviewOrSponsor,
		translateCalls,
	};
}

Deno.test("show review or sponsor block", async (t) => {
	const { cleanup } = installMockDom();

	try {
		const baseFixture = createReviewSponsorFixture();

		await t.step("throws when required params are missing", () => {
			assertThrows(
				() => baseFixture.showReviewOrSponsor({}),
				Error,
				"error_required_params",
			);
		});

		await t.step(
			"shows none when shouldShowReviewOrSponsor returns none",
			() => {
				const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
					createElements();
				baseFixture.showReviewOrSponsor({
					allTabs: Array(7),
					reviewSvg,
					sponsorSvg,
					reviewLink,
					sponsorLink,
				});
				assert(reviewSvg.classList.contains("hidden"));
				assert(sponsorSvg.classList.contains("hidden"));
				assertEquals(reviewLink.getAttribute("aria-hidden"), "true");
				assertEquals(sponsorLink.getAttribute("aria-hidden"), "true");
				assertEquals(reviewLink.tabIndex, -1);
				assertEquals(sponsorLink.tabIndex, -1);
			},
		);

		await t.step(
			"shows review and opens the chrome link",
			() => {
				const fixture = createReviewSponsorFixture({ isChrome: true });
				const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
					createElements();
				fixture.showReviewOrSponsor({
					allTabs: Array(8),
					reviewSvg,
					sponsorSvg,
					reviewLink,
					sponsorLink,
				});
				assertFalse(reviewSvg.classList.contains("hidden"));
				assert(sponsorSvg.classList.contains("hidden"));
				assertEquals(reviewLink.tabIndex, 0);
				assertEquals(sponsorLink.tabIndex, -1);
				reviewLink.click();
				assertEquals(fixture.openCalls[0], CHROME_REVIEW_LINK);
			},
		);

		await t.step(
			"shows sponsor and opens locale-aware sponsor link",
			() => {
				const fixture = createReviewSponsorFixture();
				const { reviewSvg, sponsorSvg, reviewLink, sponsorLink } =
					createElements();
				fixture.showReviewOrSponsor({
					allTabs: Array(16),
					translatorLanguage: "it",
					reviewSvg,
					sponsorSvg,
					reviewLink,
					sponsorLink,
				});
				assertFalse(reviewSvg.classList.contains("hidden"));
				assertFalse(sponsorSvg.classList.contains("hidden"));
				sponsorLink.click();
				assert(fixture.openCalls[0].includes("/it/"));
			},
		);

		await t.step(
			"uses usage-day thresholds when there are few tabs",
			() => {
				const reviewFixture = createReviewSponsorFixture();
				const reviewElements = createElements();
				reviewFixture.showReviewOrSponsor({
					allTabs: [],
					usageDays: 20,
					...reviewElements,
				});
				assertFalse(
					reviewElements.reviewSvg.classList.contains("hidden"),
				);
				assert(reviewElements.sponsorSvg.classList.contains("hidden"));

				const sponsorFixture = createReviewSponsorFixture();
				const sponsorElements = createElements();
				sponsorFixture.showReviewOrSponsor({
					allTabs: [],
					usageDays: 40,
					...sponsorElements,
				});
				assertFalse(
					sponsorElements.reviewSvg.classList.contains("hidden"),
				);
				assertFalse(
					sponsorElements.sponsorSvg.classList.contains("hidden"),
				);
			},
		);

		await t.step(
			"opens edge and firefox review links and hides safari review",
			() => {
				const edgeFixture = createReviewSponsorFixture({
					isEdge: true,
				});
				const edgeElements = createElements();
				edgeFixture.showReviewOrSponsor({
					allTabs: Array(8),
					...edgeElements,
				});
				edgeElements.reviewLink.click();
				assertEquals(edgeFixture.openCalls[0], EDGE_REVIEW_LINK);

				const firefoxFixture = createReviewSponsorFixture({
					isFirefox: true,
				});
				const firefoxElements = createElements();
				firefoxFixture.showReviewOrSponsor({
					allTabs: Array(16),
					...firefoxElements,
				});
				firefoxElements.reviewLink.click();
				firefoxElements.sponsorLink.click();
				assertEquals(firefoxFixture.openCalls[0], FIREFOX_REVIEW_LINK);
				assertEquals(
					firefoxFixture.openCalls[1],
					"https://alfredoit.dev/en/sponsor/?email=againwhysalesforce@duck.com",
				);

				const safariFixture = createReviewSponsorFixture({
					isSafari: true,
				});
				const safariElements = createElements();
				safariFixture.showReviewOrSponsor({
					allTabs: Array(8),
					...safariElements,
				});
				assert(safariElements.reviewSvg.classList.contains("hidden"));
				assertEquals(safariElements.reviewLink.tabIndex, -1);
			},
		);
	} finally {
		cleanup();
	}
});

Deno.test("ReviewSponsorAws loads async metadata and opens expected links", async () => {
	const generated = {
		reviewLink: new MockElement("a"),
		reviewSvg: new MockElement("svg"),
		root: new MockElement("div"),
		sponsorLink: new MockElement("a"),
		sponsorSvg: new MockElement("svg"),
	} satisfies ReviewSponsorResult;

	const fixture = createReviewSponsorFixture({
		generated,
		isChrome: true,
		tabs: Array.from(
			{ length: 20 },
			(_value, index) => ({ id: String(index) }),
		),
		translatorLanguage: "fr",
		usageDays: 45,
	});

	const ReviewSponsorConstructor = fixture.getConstructor();
	assert(ReviewSponsorConstructor != null);

	const component = new ReviewSponsorConstructor();
	component.connectedCallback();
	component.connectedCallback();
	await component.whenReady();

	assertEquals(fixture.settingsCalls, [["extension_usage_days"]]);
	assertEquals(fixture.injectCalls, [{
		id: "awsf-rev-spons",
		link:
			"chrome-extension://test/components/review-sponsor/review-sponsor.css",
	}]);
	assertEquals(fixture.translateCalls, ["write_review", "send_tip"]);
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

	assertEquals(fixture.openCalls[0], CHROME_REVIEW_LINK);
	assert(fixture.openCalls[1].includes("/en/"));
});
