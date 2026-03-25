import {
	assertEquals,
	assertExists,
	assertStringIncludes,
} from "@std/testing/asserts";

const EXTENSION_LAST_ACTIVE_DAY = "extension_last_active_day";
const PREVENT_ANALYTICS = "prevent_analytics";
const QUEUE_ANALYTICS = "https://queue.simpleanalyticscdn.com";
const ANALYTICS_CDN = "https://simpleanalyticscdn.com";

type AnalyticsSetting = {
	id: string;
	enabled?: boolean | string;
};

type AnalyticsMessage = {
	what: string;
	set?: AnalyticsSetting[];
};

type AnalyticsWorkerResult = {
	messages: AnalyticsMessage[];
	finalSettings: AnalyticsSetting[];
	results: Array<{
		headChildrenCount: number;
		cspContent: string | null;
		beaconPath: string | null;
	}>;
};

/**
 * Runs the real analytics module inside a fresh worker after setting the target browser UA.
 *
 * @param {{
 *   browserName: "firefox" | "chrome",
 *   consent?: boolean | null,
 *   consentError?: boolean,
 *   initialSettings: AnalyticsSetting[],
 *   steps: Array<{
 *     existingCspContent?: string,
 *     settingsBeforeCall?: AnalyticsSetting[],
 *     silenceInfo?: boolean,
 *     useDocumentElementOnly?: boolean
 *   }>
 * }} scenario Worker setup and per-invocation steps to execute.
 * @return {Promise<AnalyticsWorkerResult>} The worker's recorded runtime messages and DOM results.
 */
async function runAnalyticsWorker(scenario: {
	browserName: "firefox" | "chrome";
	consent?: boolean | null;
	consentError?: boolean;
	initialSettings: AnalyticsSetting[];
	steps: Array<{
		existingCspContent?: string;
		settingsBeforeCall?: AnalyticsSetting[];
		silenceInfo?: boolean;
		useDocumentElementOnly?: boolean;
	}>;
}): Promise<AnalyticsWorkerResult> {
	const worker = new Worker(
		new URL("./analytics-browser-worker.test.ts", import.meta.url).href,
		{ type: "module" },
	);

	try {
		const resultPromise = new Promise<AnalyticsWorkerResult>((
			resolve,
			reject,
		) => {
			worker.onmessage = (event) => resolve(event.data);
			worker.onerror = (event) => {
				event.preventDefault();
				reject(event.error ?? new Error(event.message));
			};
		});
		worker.postMessage(scenario);
		return await resultPromise;
	} finally {
		worker.terminate();
	}
}

Deno.test("checkInsertAnalytics syncs opt-out on Firefox consent denial", async () => {
	const result = await runAnalyticsWorker({
		browserName: "firefox",
		consent: false,
		initialSettings: [{ id: PREVENT_ANALYTICS, enabled: false }],
		steps: [{}],
	});

	assertEquals(result.results[0].headChildrenCount, 0);
	assertEquals(result.finalSettings, [{
		id: PREVENT_ANALYTICS,
		enabled: true,
	}]);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"check-permission-granted",
		"get-settings",
		"set",
	]);
});

Deno.test("checkInsertAnalytics inserts a new-user beacon on Firefox when no active day exists", async () => {
	const result = await runAnalyticsWorker({
		browserName: "firefox",
		consent: true,
		initialSettings: [],
		steps: [{}],
	});

	assertEquals(result.results[0].headChildrenCount, 2);
	assertEquals(
		result.results[0].cspContent,
		`default-src 'self'; img-src 'self' ${QUEUE_ANALYTICS};`,
	);
	assertEquals(result.results[0].beaconPath, "/new-user");
	assertEquals(
		result.messages
			.filter(
				(
					message,
				): message is AnalyticsMessage & { set: AnalyticsSetting[] } =>
					message.what === "set" && message.set != null,
			)
			.map((message) => message.set[0].enabled),
		[false],
	);
	assertEquals(result.finalSettings, [{
		id: PREVENT_ANALYTICS,
		enabled: false,
	}]);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"check-permission-granted",
		"get-settings",
		"set",
	]);
});

Deno.test("checkInsertAnalytics appends analytics domains to an existing CSP for returning users", async () => {
	const result = await runAnalyticsWorker({
		browserName: "firefox",
		consent: true,
		initialSettings: [
			{ id: PREVENT_ANALYTICS, enabled: false },
			{ id: EXTENSION_LAST_ACTIVE_DAY, enabled: "2026-03-24" },
		],
		steps: [{
			existingCspContent: "default-src 'self'; img-src 'self';",
		}],
	});

	assertExists(result.results[0].cspContent);
	assertStringIncludes(result.results[0].cspContent, QUEUE_ANALYTICS);
	assertStringIncludes(result.results[0].cspContent, ANALYTICS_CDN);
	assertEquals(result.results[0].beaconPath, "/");
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"check-permission-granted",
		"get-settings",
	]);
});

Deno.test("checkInsertAnalytics falls back to the local opt-out if Firefox consent check fails", async () => {
	const result = await runAnalyticsWorker({
		browserName: "firefox",
		consentError: true,
		initialSettings: [{ id: PREVENT_ANALYTICS, enabled: true }],
		steps: [{
			silenceInfo: true,
		}],
	});

	assertEquals(result.results[0].headChildrenCount, 0);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"check-permission-granted",
		"get-settings",
	]);
	assertEquals(result.finalSettings, [{
		id: PREVENT_ANALYTICS,
		enabled: true,
	}]);
});

Deno.test("checkInsertAnalytics on Chrome skips Firefox consent checks", async () => {
	const result = await runAnalyticsWorker({
		browserName: "chrome",
		consent: true,
		initialSettings: [],
		steps: [{}],
	});

	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"get-settings",
	]);
	assertEquals(result.results[0].headChildrenCount, 2);
	assertEquals(result.results[0].beaconPath, "/new-user");
});

Deno.test("checkInsertAnalytics infers returning users from EXTENSION_LAST_ACTIVE_DAY on Chrome", async () => {
	const result = await runAnalyticsWorker({
		browserName: "chrome",
		consent: true,
		initialSettings: [{
			id: EXTENSION_LAST_ACTIVE_DAY,
			enabled: "2026-03-24",
		}],
		steps: [{}],
	});

	assertEquals(result.results.map((step) => step.beaconPath), ["/"]);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"get-settings",
	]);
});

Deno.test("checkInsertAnalytics appends analytics tags when document.head is unavailable", async () => {
	const result = await runAnalyticsWorker({
		browserName: "chrome",
		initialSettings: [],
		steps: [{
			useDocumentElementOnly: true,
		}],
	});

	assertEquals(result.results[0].headChildrenCount, 2);
	assertEquals(result.results[0].beaconPath, "/new-user");
});
