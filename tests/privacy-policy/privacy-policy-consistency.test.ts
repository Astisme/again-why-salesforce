import {
	assert,
	assertArrayIncludes,
	assertEquals,
} from "@std/testing/asserts";
import {
	type CheckerReport,
	DEFAULT_CHECKER_FILE_PATHS,
	extractCodeSignals,
	extractPolicySection,
	extractPolicySignals,
	getReportExitCode,
	parseManifestPermissions,
	renderReport,
	resolveLocalStorageArgument,
	runPrivacyPolicyConsistencyChecker,
	runPrivacyPolicyConsistencyCli,
} from "../../bin/privacy-policy-consistency-check.ts";

const CHECKER_PATH_ORDER = [
	DEFAULT_CHECKER_FILE_PATHS.policy,
	DEFAULT_CHECKER_FILE_PATHS.manifest,
	DEFAULT_CHECKER_FILE_PATHS.analytics,
	DEFAULT_CHECKER_FILE_PATHS.oncePerDay,
	DEFAULT_CHECKER_FILE_PATHS.constants,
	DEFAULT_CHECKER_FILE_PATHS.functions,
	DEFAULT_CHECKER_FILE_PATHS.themeHandler,
	DEFAULT_CHECKER_FILE_PATHS.themeSelector,
	DEFAULT_CHECKER_FILE_PATHS.permissionsPage,
	DEFAULT_CHECKER_FILE_PATHS.settingsOptions,
];

/**
 * Builds a minimal fixture set that satisfies all checker rules.
 *
 * @return {Record<string, string>} Fixture contents keyed by file path.
 */
function createPassingFixtureByPath(): Record<string, string> {
	const policy = [
		"# Privacy",
		"",
		"## 1. Analytics & User Counting",
		"- We rely on Simple Analytics to estimate usage.",
		"- You'll only send 1 ping per day, and a special ping is sent when you install the extension.",
		"- You can opt-out of analytics in Settings.",
		"",
		"## 2. Local Storage",
		"- We use localStorage for theme behavior.",
		"- Theme keys: `usingTheme` and `userTheme`.",
		"- Permission preference key: `noPerm`.",
		"",
		"## 3. Browser Storage",
		"- Browser sync is used.",
		"",
		"## 4. Tab Data (In-Memory)",
		"- While running, tab data stays in memory (key: `againWhySalesforce`, variable: `WHY_KEY`).",
		"",
		"## 5. Settings & Decoration Preferences",
		"| Key                          | Variable Name           | Description |",
		"| ---------------------------- | ----------------------- | ----------- |",
		"| `settings`                   | `SETTINGS_KEY`          | settings    |",
		"| `settings-tab_generic_style` | `GENERIC_TAB_STYLE_KEY` | generic     |",
		"| `settings-tab_org_style`     | `ORG_TAB_STYLE_KEY`     | org         |",
		"| `_locale`                    | `LOCALE_KEY`            | locale      |",
		"",
		"## 8. Security Measures",
		"- Least-Privilege applies to all permissions.",
		"- Optional permissions are requested at the moment you interact with the feature.",
	].join("\n");
	const analytics = [
		'import { PREVENT_ANALYTICS } from "/core/constants.js";',
		'const analyticscdnhost = "simpleanalyticscdn.com";',
		"const queueanalytics = `https://queue.${analyticscdnhost}`;",
		"function hasSentAnalyticsToday(date) {",
		"\treturn date != null && Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24)) <= 0;",
		"}",
		"export async function checkInsertAnalytics() {",
		"\tconst preventAnalytics = await getSettings(PREVENT_ANALYTICS);",
		"\tconst isNewUser = preventAnalytics?.date == null;",
		"\tconst shouldPreventAnalytics = preventAnalytics?.enabled === true;",
		"\tif (shouldPreventAnalytics || hasSentAnalyticsToday(preventAnalytics?.date)) {",
		"\t\treturn;",
		"\t}",
		"\tconst apiUrl = new URL(`${queueanalytics}/noscript.gif`);",
		'\tapiUrl.searchParams.set("hostname", "extension.again.whysalesforce");',
		'\tapiUrl.searchParams.set("path", isNewUser ? "/new-user" : "/");',
		"}",
	].join("\n");
	return {
		[DEFAULT_CHECKER_FILE_PATHS.policy]: policy,
		[DEFAULT_CHECKER_FILE_PATHS.manifest]: JSON.stringify({
			permissions: ["storage"],
			optional_permissions: ["downloads", "cookies"],
			optional_host_permissions: ["*://*.my.salesforce.com/*"],
		}),
		[DEFAULT_CHECKER_FILE_PATHS.analytics]: analytics,
		[DEFAULT_CHECKER_FILE_PATHS.oncePerDay]: `
function wasCalledToday(today) {
	return sessionStorage.getItem("k") === today;
}
export function executeOncePerDay() {
	const today = "2026-01-01";
	if (wasCalledToday(today)) {
		return;
	}
	checkInsertAnalytics();
}`,
		[DEFAULT_CHECKER_FILE_PATHS.constants]: `
export const WHY_KEY = "againWhySalesforce";
export const SETTINGS_KEY = "settings";
export const TAB_GENERIC_STYLE = "tab_generic_style";
export const TAB_ORG_STYLE = "tab_org_style";
export const GENERIC_TAB_STYLE_KEY = \`${"${SETTINGS_KEY}-${TAB_GENERIC_STYLE}"}\`;
export const ORG_TAB_STYLE_KEY = \`${"${SETTINGS_KEY}-${TAB_ORG_STYLE}"}\`;
export const LOCALE_KEY = "_locale";
export const DO_NOT_REQUEST_FRAME_PERMISSION = "noPerm";`,
		[DEFAULT_CHECKER_FILE_PATHS.functions]: `
export function requestCookiesPermission() {
	return requestPermissions({
		permissions: ["cookies"],
		origins: EXTENSION_OPTIONAL_HOST_PERM,
	});
}
export function areFramePatternsAllowed() {
	return localStorage.getItem(DO_NOT_REQUEST_FRAME_PERMISSION) === "true";
}`,
		[DEFAULT_CHECKER_FILE_PATHS.themeHandler]: `
localStorage.setItem("usingTheme", "dark");
localStorage.setItem("userTheme", "system");`,
		[DEFAULT_CHECKER_FILE_PATHS.themeSelector]: `
const current = localStorage.getItem("usingTheme");`,
		[DEFAULT_CHECKER_FILE_PATHS.permissionsPage]: `
localStorage.setItem(DO_NOT_REQUEST_FRAME_PERMISSION, "true");`,
		[DEFAULT_CHECKER_FILE_PATHS.settingsOptions]: `
const allCheckboxes = {
	[PREVENT_ANALYTICS]: document.getElementById(PREVENT_ANALYTICS),
};`,
	};
}

/**
 * Creates a deterministic file reader from fixture data.
 *
 * @param {Record<string, string>} fixtureByPath - Fixture map.
 * @param {string[]} seenPaths - Collector for requested paths.
 * @return {(path: string) => Promise<string>} Reader function.
 */
function createFixtureReader(
	fixtureByPath: Record<string, string>,
	seenPaths: string[],
): (path: string) => Promise<string> {
	return (path: string): Promise<string> => {
		seenPaths.push(path);
		const value = fixtureByPath[path];
		if (value == null) {
			return Promise.reject(new Error(`missing fixture for ${path}`));
		}
		return Promise.resolve(value);
	};
}

/**
 * Returns one claim status from a report.
 *
 * @param {CheckerReport} report - Checker report.
 * @param {string} claimId - Claim identifier.
 * @return {string} Claim status.
 */
function getClaimStatus(report: CheckerReport, claimId: string): string {
	const claim = report.claims.find((entry) => entry.id === claimId);
	assert(claim != null);
	return claim.status;
}

Deno.test("runPrivacyPolicyConsistencyChecker supports default dependencies", async () => {
	const fixtureByPath = createPassingFixtureByPath();
	const seenPaths: string[] = [];
	const report = await runPrivacyPolicyConsistencyChecker({
		readTextFile: createFixtureReader(fixtureByPath, seenPaths),
	});

	assertEquals(report.status, "pass");
	assertEquals(
		seenPaths,
		CHECKER_PATH_ORDER,
	);
	assert(report.claims.every((claim) => claim.status === "pass"));
});

Deno.test("runPrivacyPolicyConsistencyChecker fails each scoped claim when evidence is missing", async (t) => {
	const cases: Array<{
		id: string;
		mutate: (fixtureByPath: Record<string, string>) => void;
	}> = [
		{
			id: "analytics_opt_out_behavior",
			mutate: (fixtureByPath) => {
				fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.settingsOptions] =
					"const x = {};";
			},
		},
		{
			id: "analytics_ping_cadence_and_path",
			mutate: (fixtureByPath) => {
				fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.analytics] =
					fixtureByPath[
						DEFAULT_CHECKER_FILE_PATHS.analytics
					].replace('"/new-user"', '"/install"');
			},
		},
		{
			id: "analytics_endpoint_and_domain",
			mutate: (fixtureByPath) => {
				fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.analytics] =
					fixtureByPath[
						DEFAULT_CHECKER_FILE_PATHS.analytics
					].replace("simpleanalyticscdn.com", "example.com");
			},
		},
		{
			id: "storage_locations_and_keys",
			mutate: (fixtureByPath) => {
				fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.policy] =
					fixtureByPath[
						DEFAULT_CHECKER_FILE_PATHS.policy
					].replace("`noPerm`", "`differentKey`");
			},
		},
		{
			id: "cookie_permission_usage_boundaries",
			mutate: (fixtureByPath) => {
				fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.manifest] = JSON
					.stringify({
						permissions: ["storage", "cookies"],
						optional_permissions: ["downloads"],
						optional_host_permissions: [
							"*://*.my.salesforce.com/*",
						],
					});
			},
		},
	];

	for (const testCase of cases) {
		await t.step(testCase.id, async () => {
			const fixtureByPath = createPassingFixtureByPath();
			testCase.mutate(fixtureByPath);
			const seenPaths: string[] = [];
			const report = await runPrivacyPolicyConsistencyChecker({
				readTextFile: createFixtureReader(fixtureByPath, seenPaths),
			});
			assertEquals(report.status, "fail");
			assertEquals(getClaimStatus(report, testCase.id), "fail");
		});
	}
});

Deno.test("runPrivacyPolicyConsistencyChecker captures file-load errors in report", async () => {
	const fixtureByPath = createPassingFixtureByPath();
	delete fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.analytics];
	const seenPaths: string[] = [];

	const report = await runPrivacyPolicyConsistencyChecker({
		readTextFile: createFixtureReader(fixtureByPath, seenPaths),
	});

	assertEquals(report.status, "fail");
	assert(report.load_errors.length > 0);
	assertArrayIncludes(report.load_errors, [
		`unable_to_read:analytics:${DEFAULT_CHECKER_FILE_PATHS.analytics}:missing fixture for ${DEFAULT_CHECKER_FILE_PATHS.analytics}`,
	]);
});

Deno.test("runPrivacyPolicyConsistencyChecker captures non-Error load failures", async () => {
	const fixtureByPath = createPassingFixtureByPath();
	const report = await runPrivacyPolicyConsistencyChecker({
		readTextFile: (path: string): Promise<string> => {
			if (path === DEFAULT_CHECKER_FILE_PATHS.analytics) {
				return Promise.reject("raw-failure");
			}
			const value = fixtureByPath[path];
			if (value == null) {
				return Promise.reject("missing");
			}
			return Promise.resolve(value);
		},
	});

	assertEquals(report.status, "fail");
	assertArrayIncludes(report.load_errors, [
		`unable_to_read:analytics:${DEFAULT_CHECKER_FILE_PATHS.analytics}:raw-failure`,
	]);
});

Deno.test("runPrivacyPolicyConsistencyChecker keeps load_errors deterministic by checker path order", async () => {
	const fixtureByPath = createPassingFixtureByPath();
	delete fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.manifest];
	delete fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.analytics];

	const report = await runPrivacyPolicyConsistencyChecker({
		readTextFile: (path: string): Promise<string> => {
			const value = fixtureByPath[path];
			if (value != null) {
				return Promise.resolve(value);
			}
			if (path === DEFAULT_CHECKER_FILE_PATHS.analytics) {
				return new Promise((_resolve, reject) => {
					setTimeout(
						() => reject(new Error(`missing fixture for ${path}`)),
						5,
					);
				});
			}
			if (path === DEFAULT_CHECKER_FILE_PATHS.manifest) {
				return new Promise((_resolve, reject) => {
					setTimeout(
						() => reject(new Error(`missing fixture for ${path}`)),
						0,
					);
				});
			}
			return Promise.reject(new Error(`missing fixture for ${path}`));
		},
	});

	assertEquals(report.status, "fail");
	assertEquals(report.load_errors, [
		`unable_to_read:manifest:${DEFAULT_CHECKER_FILE_PATHS.manifest}:missing fixture for ${DEFAULT_CHECKER_FILE_PATHS.manifest}`,
		`unable_to_read:analytics:${DEFAULT_CHECKER_FILE_PATHS.analytics}:missing fixture for ${DEFAULT_CHECKER_FILE_PATHS.analytics}`,
	]);
});

Deno.test("helper functions cover parse and resolution branches", () => {
	const parsedManifest = parseManifestPermissions(
		JSON.stringify({ permissions: ["storage"], optional_permissions: [] }),
	);
	assertEquals(parsedManifest.permissions, ["storage"]);
	assertEquals(parsedManifest.optional_permissions, []);
	assertEquals(parseManifestPermissions("not-json").permissions, []);
	const parsedInvalidShape = parseManifestPermissions(
		JSON.stringify({
			permissions: "storage",
			optional_permissions: "cookies",
			optional_host_permissions: {},
		}),
	);
	assertEquals(parsedInvalidShape.permissions, []);
	assertEquals(parsedInvalidShape.optional_permissions, []);
	assertEquals(parsedInvalidShape.optional_host_permissions, []);

	const constantMap = new Map<string, string>([
		["DO_NOT_REQUEST_FRAME_PERMISSION", "noPerm"],
		["EMPTY_VALUE", undefined as unknown as string],
	]);
	assertEquals(
		resolveLocalStorageArgument('"usingTheme"', constantMap),
		"usingTheme",
	);
	assertEquals(
		resolveLocalStorageArgument(
			"DO_NOT_REQUEST_FRAME_PERMISSION",
			constantMap,
		),
		"noPerm",
	);
	assertEquals(resolveLocalStorageArgument("EMPTY_VALUE", constantMap), null);
	assertEquals(
		resolveLocalStorageArgument("computeKey()", constantMap),
		null,
	);

	const codeSignals = extractCodeSignals({
		policy: "",
		manifest: "{}",
		analytics: "",
		oncePerDay: "",
		constants: 'export const SETTINGS_KEY = "settings";',
		functions: "",
		themeHandler: "",
		themeSelector: "",
		permissionsPage: "",
		settingsOptions: "",
	});
	assertEquals(
		codeSignals.constantKeyMap.get("GENERIC_TAB_STYLE_KEY"),
		undefined,
	);
	assertEquals(
		codeSignals.constantKeyMap.get("ORG_TAB_STYLE_KEY"),
		undefined,
	);
});

Deno.test("policy helpers cover fallback section and alternate cadence wording", () => {
	const noSection = extractPolicySection("# Heading", 2);
	assertEquals(noSection, "");

	const signals = extractPolicySignals(
		[
			"## 1. Analytics & User Counting",
			"- We rely on Simple Analytics.",
			"- You can opt-out from settings analytics controls.",
			"- You will only send one ping per day and a special ping on install.",
			"## 2. Local Storage",
			"- localStorage for theme values: `usingTheme`.",
			"## 8. Security Measures",
			"- Least-Privilege model.",
			"- requested at the moment you interact.",
		].join("\n"),
	);
	assertEquals(signals.hasAnalyticsDailyPingClaim, true);
});

Deno.test("runPrivacyPolicyConsistencyCli writes JSON and exits with matching code", async () => {
	const fixtureByPath = createPassingFixtureByPath();
	const outputLines: string[] = [];
	const exitCodes: number[] = [];
	const seenPaths: string[] = [];

	const report = await runPrivacyPolicyConsistencyCli({
		readTextFile: createFixtureReader(fixtureByPath, seenPaths),
		writeLine: (line) => outputLines.push(line),
		exit: (code) => exitCodes.push(code),
	});

	assertEquals(report.status, "pass");
	assertEquals(exitCodes, [0]);
	assertEquals(outputLines.length, 1);
	assertEquals(JSON.parse(outputLines[0]), JSON.parse(renderReport(report)));
	assertEquals(getReportExitCode(report), 0);

	fixtureByPath[DEFAULT_CHECKER_FILE_PATHS.settingsOptions] = "const x = {};";
	outputLines.length = 0;
	exitCodes.length = 0;
	const failedReport = await runPrivacyPolicyConsistencyCli({
		readTextFile: createFixtureReader(fixtureByPath, []),
		writeLine: (line) => outputLines.push(line),
		exit: (code) => exitCodes.push(code),
	});
	assertEquals(failedReport.status, "fail");
	assertEquals(exitCodes, [1]);
	assertEquals(getReportExitCode(failedReport), 1);
});
