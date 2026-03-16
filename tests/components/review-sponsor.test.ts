import {
	assert,
	assertEquals,
	assertFalse,
	assertThrows,
} from "@std/testing/asserts";
import { installMockDom } from "../happydom.ts";
import "../mocks.ts";
import { HIDDEN_CLASS } from "/constants.js";

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
 * Provides the minimal custom-elements registry surface needed at module import time.
 *
 * @return {CustomElementRegistry}
 */
function createCustomElementsRegistry() {
	return {
		define(_name: string, _constructor: CustomElementConstructor) {},
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
	} satisfies CustomElementRegistry;
}

Deno.test("show review or sponsor block", async (t) => {
	const { cleanup } = installMockDom();
	Object.defineProperty(globalThis, "customElements", {
		value: createCustomElementsRegistry(),
		configurable: true,
		writable: true,
	});
	const { showReviewOrSponsor } = await import(
		"/components/review-sponsor/review-sponsor.js"
	);
	const openCalls: string[] = [];
	const originalOpen = globalThis.open;
	globalThis.open = ((url?: string | URL) => {
		openCalls.push(String(url));
		return null;
	}) as typeof globalThis.open;

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

	globalThis.open = originalOpen;
	cleanup();
});
