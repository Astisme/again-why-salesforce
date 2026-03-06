import {
	createReadySalesforceSession,
	ensureFavouriteButtonVisible,
	EXTENSION_NAME,
} from "./helpers.ts";

const EXT_BUTTON_ID = `#${EXTENSION_NAME}-button`;
const EXT_STAR_ID = `#${EXTENSION_NAME}-star`;
const EXT_SLASHED_STAR_ID = `#${EXTENSION_NAME}-slashed-star`;

Deno.test(
	"Star Toggle Functionality",
	{ sanitizeOps: false, sanitizeResources: false },
	async () => {
		const { browser, page } = await createReadySalesforceSession({ dialogAction: "dismiss" });
		try {
			await ensureFavouriteButtonVisible(page);
			await page.waitForSelector(EXT_BUTTON_ID, { timeout: 30000 });

			const initialStarVisible = await page.$(EXT_STAR_ID).then((el) =>
				el?.isIntersectingViewport()
			);
			const initialSlashedVisible = await page.$(EXT_SLASHED_STAR_ID).then((el) =>
				el?.isIntersectingViewport()
			);

			await page.click(initialStarVisible ? EXT_STAR_ID : EXT_SLASHED_STAR_ID);
			await page.waitForTimeout(300);

			const afterToggleStarVisible = await page.$(EXT_STAR_ID).then((el) =>
				el?.isIntersectingViewport()
			);
			if (initialStarVisible === afterToggleStarVisible) {
				throw new Error("Star state did not toggle");
			}

			await page.click(
				afterToggleStarVisible ? EXT_STAR_ID : EXT_SLASHED_STAR_ID,
			);
			await page.waitForTimeout(300);

			const finalStarVisible = await page.$(EXT_STAR_ID).then((el) =>
				el?.isIntersectingViewport()
			);
			const finalSlashedVisible = await page.$(EXT_SLASHED_STAR_ID).then((el) =>
				el?.isIntersectingViewport()
			);
			if (
				initialStarVisible !== finalStarVisible ||
				initialSlashedVisible !== finalSlashedVisible
			) {
				throw new Error("Toggle did not return to original state");
			}
		} finally {
			await browser.close();
		}
	},
);
