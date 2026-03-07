import { createReadySalesforceSession } from "../tests/salesforce/helpers.ts";

try {
	const { browser, page } = await createReadySalesforceSession({
		dialogAction: "accept",
		resetTutorial: true,
		startTutorial: true,
	});
	console.log("ready", page.url());
	await browser.close();
} catch (error) {
	console.error("DIAG ERROR", error);
	if (error instanceof Error) {
		console.error(error.stack);
	}
	Deno.exit(1);
}
