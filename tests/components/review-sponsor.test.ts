import {
	assert,
	assertEquals,
	assertFalse,
	assertThrows,
} from "@std/testing/asserts";
import { stub } from "@std/testing/mock";

import { createMockElement } from "../mocks.ts";
import { showReviewOrSponsor } from "/components/review-sponsor/review-sponsor.js";

const generateReviewSponsorSvgsStub = stub(
    globalThis as any,
    "generateReviewSponsorSvgs",
    () => {},
);

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
});

generateReviewSponsorSvgsStub.restore();
