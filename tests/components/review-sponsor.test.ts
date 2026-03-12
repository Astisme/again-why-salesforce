import {
	assert,
	assertEquals,
	assertFalse,
	assertThrows,
} from "@std/testing/asserts";
import { createMockElement } from "../happydom.ts";
import {
	showReviewOrSponsor,
} from "/components/review-sponsor/review-sponsor.js";

Deno.test("show review or sponsor block", async (t) => {
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
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			showReviewOrSponsor({
				allTabs: Array(7),
				translator: {},
				reviewSvg,
				sponsorSvg,
			});
			assertEquals(reviewSvg.classList.removed.length, 0);
			assertFalse("click" in reviewSvg.events);
			assertEquals(sponsorSvg.classList.removed.length, 0);
			assertFalse("click" in sponsorSvg.events);
		},
	);

	await t.step(
		"shows review when shouldShowReviewOrSponsor returns review",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			showReviewOrSponsor({
				allTabs: Array(8),
				translator: {},
				reviewSvg,
				sponsorSvg,
			});
			assertEquals(reviewSvg.classList.removed.length, 1);
			assert("click" in reviewSvg.events);
			assertEquals(sponsorSvg.classList.removed.length, 0);
			assertFalse("click" in sponsorSvg.events);
		},
	);

	await t.step(
		"shows sponsor and review when shouldShowReviewOrSponsor returns sponsor",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			const translator = {};
			showReviewOrSponsor({
				allTabs: Array(16),
				translator,
				reviewSvg,
				sponsorSvg,
			});
			assertEquals(reviewSvg.classList.removed.length, 1);
			assert("click" in reviewSvg.events);
			assertEquals(sponsorSvg.classList.removed.length, 1);
			assert("click" in sponsorSvg.events);
		},
	);

	await t.step(
		"shows review after 20 days of actual use even without enough tabs",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			showReviewOrSponsor({
				allTabs: [],
				usageDays: 20,
				translator: {},
				reviewSvg,
				sponsorSvg,
			});
			assertEquals(reviewSvg.classList.removed.length, 1);
			assert("click" in reviewSvg.events);
			assertEquals(sponsorSvg.classList.removed.length, 0);
			assertFalse("click" in sponsorSvg.events);
		},
	);

	await t.step(
		"shows sponsor after 40 days of actual use even without enough tabs",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			showReviewOrSponsor({
				allTabs: [],
				usageDays: 40,
				translator: {},
				reviewSvg,
				sponsorSvg,
			});
			assertEquals(reviewSvg.classList.removed.length, 1);
			assert("click" in reviewSvg.events);
			assertEquals(sponsorSvg.classList.removed.length, 1);
			assert("click" in sponsorSvg.events);
		},
	);
});
