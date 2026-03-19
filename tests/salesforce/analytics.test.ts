import {
	assertEquals,
	assertExists,
	assertStringIncludes,
} from "@std/testing/asserts";

const PREVENT_ANALYTICS = "prevent_analytics";
const QUEUE_ANALYTICS = "https://queue.simpleanalyticscdn.com";
const ANALYTICS_CDN = "https://simpleanalyticscdn.com";

/**
 * Returns the ISO string for the current UTC day at midnight.
 *
 * @return {string} Today's UTC start-of-day timestamp.
 */
function startOfTodayIso() {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	return today.toJSON();
}

/**
 * Returns the ISO string for the previous UTC day at midnight.
 *
 * @return {string} Yesterday's UTC start-of-day timestamp.
 */
function startOfYesterdayIso() {
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
	yesterday.setUTCHours(0, 0, 0, 0);
	return yesterday.toJSON();
}

/**
 * Runs the real analytics module inside a fresh worker after setting the target browser UA.
 *
 * @param {{
 *   browserName: "firefox" | "chrome",
 *   consent?: boolean | null,
 *   consentError?: boolean,
 *   initialSettings: any[],
 *   steps: Array<{
 *     existingCspContent?: string,
 *     settingsBeforeCall?: any[],
 *     silenceInfo?: boolean,
 *     useDocumentElementOnly?: boolean
 *   }>
 * }} scenario Worker setup and per-invocation steps to execute.
 * @return {Promise<{
 *   messages: any[],
 *   finalSettings: any[],
 *   results: Array<{
 *     headChildrenCount: number,
 *     cspContent: string | null,
 *     beaconPath: string | null
 *   }>
 * }>} The worker's recorded runtime messages and DOM results.
 */
type AnalyticsSetting = {
	id: string;
	enabled?: boolean;
	date?: string;
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
		new URL("./analytics-browser-worker.ts", import.meta.url).href,
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
		"set",
	]);
});

Deno.test("checkInsertAnalytics inserts beacon for a new Firefox user with consent", async () => {
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
			.map((message) => message.set[0].enabled ?? "date"),
		[false, "date"],
	);
	assertEquals(result.finalSettings[0].id, PREVENT_ANALYTICS);
	assertEquals(typeof result.finalSettings[0].date, "string");
});

Deno.test("checkInsertAnalytics skips a second beacon on the same day", async () => {
	const result = await runAnalyticsWorker({
		browserName: "firefox",
		consent: true,
		initialSettings: [{
			id: PREVENT_ANALYTICS,
			enabled: false,
			date: startOfTodayIso(),
		}],
		steps: [{}],
	});

	assertEquals(result.results[0].headChildrenCount, 0);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"check-permission-granted",
	]);
	assertEquals(result.finalSettings[0].date, startOfTodayIso());
});

Deno.test("checkInsertAnalytics appends analytics domains to an existing CSP", async () => {
	const result = await runAnalyticsWorker({
		browserName: "firefox",
		consent: true,
		initialSettings: [{
			id: PREVENT_ANALYTICS,
			enabled: false,
			date: startOfYesterdayIso(),
		}],
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
		"set",
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
		"set",
	]);
	assertEquals(result.results[0].headChildrenCount, 2);
	assertEquals(result.results[0].beaconPath, "/new-user");
});

Deno.test("checkInsertAnalytics repeated Chrome calls go from new user to standard user", async () => {
	// First call starts from an empty setting, so the beacon should use /new-user.
	// We then simulate the next day and call again; the second beacon should use /
	// because the stored analytics setting now identifies a standard user.
	const result = await runAnalyticsWorker({
		browserName: "chrome",
		consent: true,
		initialSettings: [],
		steps: [
			{},
			{
				settingsBeforeCall: [{
					id: PREVENT_ANALYTICS,
					enabled: false,
					date: startOfYesterdayIso(),
				}],
			},
		],
	});

	assertEquals(result.results.map((step) => step.beaconPath), [
		"/new-user",
		"/",
	]);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"set",
		"get-settings",
		"set",
	]);
});

Deno.test("checkInsertAnalytics repeated Chrome calls on the same day stop after the first new-user beacon", async () => {
	// The first call should create the new-user beacon and persist today's date.
	// A second invocation on the same day should see that stored date and skip entirely.
	const result = await runAnalyticsWorker({
		browserName: "chrome",
		consent: true,
		initialSettings: [],
		steps: [{}, {}],
	});

	assertEquals(result.results.map((step) => step.beaconPath), [
		"/new-user",
		null,
	]);
	assertEquals(result.results[1].headChildrenCount, 0);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"set",
		"get-settings",
	]);
});

Deno.test("checkInsertAnalytics repeated Chrome calls keep standard user beacons standard", async () => {
	// Both calls start from a stored analytics date in the past, so both invocations
	// represent returning users and should emit the standard / beacon path.
	const result = await runAnalyticsWorker({
		browserName: "chrome",
		consent: true,
		initialSettings: [{
			id: PREVENT_ANALYTICS,
			enabled: false,
			date: startOfYesterdayIso(),
		}],
		steps: [
			{},
			{
				settingsBeforeCall: [{
					id: PREVENT_ANALYTICS,
					enabled: false,
					date: startOfYesterdayIso(),
				}],
			},
		],
	});

	assertEquals(result.results.map((step) => step.beaconPath), ["/", "/"]);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"set",
		"get-settings",
		"set",
	]);
});

Deno.test("checkInsertAnalytics repeated Chrome calls on the same day stop after the first standard-user beacon", async () => {
	// A returning user from a previous day should emit the standard beacon once.
	// After that first call updates the stored date to today, the second same-day call should skip.
	const result = await runAnalyticsWorker({
		browserName: "chrome",
		consent: true,
		initialSettings: [{
			id: PREVENT_ANALYTICS,
			enabled: false,
			date: startOfYesterdayIso(),
		}],
		steps: [{}, {}],
	});

	assertEquals(result.results.map((step) => step.beaconPath), ["/", null]);
	assertEquals(result.results[1].headChildrenCount, 0);
	assertEquals(result.messages.map((message) => message.what), [
		"get-settings",
		"set",
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
