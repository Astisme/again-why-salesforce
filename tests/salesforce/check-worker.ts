import { launchSalesforceBrowser } from "./helpers.ts";

const { browser } = await launchSalesforceBrowser();
try {
	const target = await browser.waitForTarget(
		(t) =>
			t.type() === "service_worker" &&
			t.url().startsWith("chrome-extension://"),
		{ timeout: 30000 },
	);
	const worker = await target.worker();
	if (worker == null) {
		console.log("worker-null");
	} else {
		const info = await worker.evaluate(() => ({
			hasChrome: typeof globalThis.chrome !== "undefined",
			hasRuntime: typeof globalThis.chrome?.runtime !== "undefined",
			hasStorage: typeof globalThis.chrome?.storage !== "undefined",
			storageKeys: globalThis.chrome?.storage
				? Object.keys(globalThis.chrome.storage)
				: [],
			runtimeKeys: globalThis.chrome?.runtime
				? Object.keys(globalThis.chrome.runtime).slice(0, 20)
				: [],
		}));
		console.log(JSON.stringify(info, null, 2));
	}
} finally {
	await browser.close();
}
