import { createReviewSponsorModule } from "./review-sponsor-runtime.js";

let reviewSponsorModule;

/**
 * Returns the lazily-created review/sponsor module singleton.
 *
 * @return {{ showReviewOrSponsor: () => Promise<void> | void }} Review/sponsor module API.
 */
export function getModule() {
	reviewSponsorModule ??= createReviewSponsorModule();
	return reviewSponsorModule;
}

/**
 * Test-only controls for the review/sponsor module lifecycle.
 */
export const __testHooks = {
	getModule,
	resetModule() {
		reviewSponsorModule = undefined;
	},
	setModule(module) {
		reviewSponsorModule = module;
	},
};

/**
 * Shows review or sponsor prompt using runtime defaults.
 *
 * @return {Promise<void> | void} the promise from the module
 */
export function showReviewOrSponsor() {
	return getModule().showReviewOrSponsor();
}
