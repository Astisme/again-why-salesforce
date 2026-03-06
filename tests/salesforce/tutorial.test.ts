import { createReadySalesforceSession, EXTENSION_ROOT_ID } from "./helpers.ts";

Deno.test(
	"Tutorial namespace and styles are wired in Salesforce Chrome session",
	{ sanitizeOps: false, sanitizeResources: false },
	async () => {
		const { browser, page } = await createReadySalesforceSession({
			dialogAction: "accept",
		});
		try {
			await page.waitForSelector(EXTENSION_ROOT_ID, { timeout: 60000 });

			const extensionLoaded = await page.evaluate(
				(selector) => Boolean(document.querySelector(selector)),
				EXTENSION_ROOT_ID,
			);
			if (!extensionLoaded) {
				throw new Error(
					"Extension root not found in Salesforce Setup page",
				);
			}

			const bundledContent = await Deno.readTextFile(
				"./src/salesforce/bundledContent.js",
			);
			const tutorialCss = await Deno.readTextFile(
				"./src/salesforce/css/tutorial.css",
			);

			const requiredTokens = [
				"awsf-tutorial",
				"awsf-tutorial-highlight",
				"awsf-tutorial-pill",
				"awsf-tutorial-pill-shortcut",
				"awsf-tutorial-in",
			];
			for (const token of requiredTokens) {
				if (
					!bundledContent.includes(token) &&
					!tutorialCss.includes(token)
				) {
					throw new Error(`Missing tutorial token: ${token}`);
				}
			}

			if (
				bundledContent.includes("tut-v7") ||
				tutorialCss.includes("tut-v7")
			) {
				throw new Error(
					"Legacy tutorial namespace tut-v7 is still present",
				);
			}
		} finally {
			await browser.close();
		}
	},
);
