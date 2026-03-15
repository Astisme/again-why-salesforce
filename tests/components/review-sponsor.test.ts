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
import { HIDDEN_CLASS } from "/constants.js";

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
			reviewSvg.classList.add(HIDDEN_CLASS);
			sponsorSvg.classList.add(HIDDEN_CLASS);
			const reviewLink = createMockElement();
			const sponsorLink = createMockElement();
			showReviewOrSponsor({
				allTabs: Array(7),
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertEquals(reviewSvg.classList.list.length, 1);
			assertFalse("click" in reviewLink.events);
			assertEquals(sponsorSvg.classList.list.length, 1);
			assertFalse("click" in sponsorLink.events);
		},
	);

	await t.step(
		"shows review when shouldShowReviewOrSponsor returns review",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			reviewSvg.classList.add(HIDDEN_CLASS);
			sponsorSvg.classList.add(HIDDEN_CLASS);
			const reviewLink = createMockElement();
			const sponsorLink = createMockElement();
			showReviewOrSponsor({
				allTabs: Array(8),
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertEquals(reviewSvg.classList.list.length, 0);
			assert("click" in reviewLink.events);
			assertEquals(sponsorSvg.classList.list.length, 1);
			assertFalse("click" in sponsorLink.events);
		},
	);

	await t.step(
		"shows sponsor and review when shouldShowReviewOrSponsor returns sponsor",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			reviewSvg.classList.add(HIDDEN_CLASS);
			sponsorSvg.classList.add(HIDDEN_CLASS);
			const translator = {};
			const reviewLink = createMockElement();
			const sponsorLink = createMockElement();
			showReviewOrSponsor({
				allTabs: Array(16),
				translator,
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertEquals(reviewSvg.classList.list.length, 0);
			assert("click" in reviewLink.events);
			assertEquals(sponsorSvg.classList.list.length, 0);
			assert("click" in sponsorLink.events);
		},
	);

	await t.step(
		"shows review after 20 days of actual use even without enough tabs",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			reviewSvg.classList.add(HIDDEN_CLASS);
			sponsorSvg.classList.add(HIDDEN_CLASS);
			const reviewLink = createMockElement();
			const sponsorLink = createMockElement();
			showReviewOrSponsor({
				allTabs: [],
				usageDays: 20,
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertEquals(reviewSvg.classList.list.length, 0);
			assert("click" in reviewLink.events);
			assertEquals(sponsorSvg.classList.list.length, 1);
			assertFalse("click" in sponsorLink.events);
		},
	);

	await t.step(
		"shows sponsor after 40 days of actual use even without enough tabs",
		() => {
			const reviewSvg = createMockElement();
			const sponsorSvg = createMockElement();
			reviewSvg.classList.add(HIDDEN_CLASS);
			sponsorSvg.classList.add(HIDDEN_CLASS);
			const reviewLink = createMockElement();
			const sponsorLink = createMockElement();
			showReviewOrSponsor({
				allTabs: [],
				usageDays: 40,
				translator: {},
				reviewSvg,
				sponsorSvg,
				reviewLink,
				sponsorLink,
			});
			assertEquals(reviewSvg.classList.list.length, 0);
			assert("click" in reviewLink.events);
			assertEquals(sponsorSvg.classList.list.length, 0);
			assert("click" in sponsorLink.events);
		},
	);
});
