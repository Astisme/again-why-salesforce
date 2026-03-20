import { assertEquals } from "@std/testing/asserts";
import { buildAnalyticsBeaconContract } from "/salesforce/event-taxonomy.js";

/**
 * Asserts the normalized contract generated for a new user event.
 */
Deno.test("buildAnalyticsBeaconContract returns new-user taxonomy contract", () => {
	const result = buildAnalyticsBeaconContract({
		httpsPrefix: "https://",
		extensionVersion: "2.0.0",
		isNewUser: true,
	});

	assertEquals(result.eventName, "new-user");
	assertEquals(result.eventType, "install");
	assertEquals(result.eventPath, "/new-user");
	assertEquals(
		result.queueEndpoint,
		"https://queue.simpleanalyticscdn.com",
	);
	assertEquals(
		result.cspSources,
		"https://queue.simpleanalyticscdn.com https://simpleanalyticscdn.com",
	);
	assertEquals(
		result.cspMetaContent,
		"default-src 'self'; img-src 'self' https://queue.simpleanalyticscdn.com;",
	);
	assertEquals(
		result.beaconUrl,
		"https://queue.simpleanalyticscdn.com/noscript.gif",
	);
	assertEquals(result.queryParams, {
		hostname: "extension.again.whysalesforce",
		path: "/new-user",
		utm_source: "2.0.0",
		eventName: "new-user",
		eventType: "install",
	});
});

/**
 * Asserts the normalized contract generated for a returning user event.
 */
Deno.test(
	"buildAnalyticsBeaconContract returns returning-user taxonomy contract",
	() => {
		const result = buildAnalyticsBeaconContract({
			httpsPrefix: "https://",
			extensionVersion: "2.0.0",
			isNewUser: false,
		});

		assertEquals(result.eventName, "returning-user");
		assertEquals(result.eventType, "usage");
		assertEquals(result.eventPath, "/");
		assertEquals(result.queryParams.path, "/");
		assertEquals(result.queryParams.eventName, "returning-user");
		assertEquals(result.queryParams.eventType, "usage");
	},
);
