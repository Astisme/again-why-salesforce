import { createReviewSponsorModule } from "./review-sponsor-runtime.js";

const reviewSponsorModule = createReviewSponsorModule();

/**
 * Shows review or sponsor prompt using runtime defaults.
 *
 * @return {Promise<void> | void} the promise from the module
 */
export function showReviewOrSponsor() {
	return reviewSponsorModule.showReviewOrSponsor();
}
