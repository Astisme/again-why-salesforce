import {
	assertEquals,
	assertGreater,
	assertStringIncludes,
} from "@std/testing/asserts";
import {
	analyzeMetricsCoverage,
	getInstrumentationRules,
	readTextIfExistsStrict,
	runCli,
	runCliWithDependencies,
	serializeMetricsCoverageReport,
} from "../../bin/metrics-coverage.ts";

/**
 * Creates a deterministic virtual file reader for analyzer tests.
 *
 * @param {Record<string, string>} files - Relative fixture files keyed by repository-style path.
 * @return {(rootDir: string, relativePath: string) => Promise<string | null>} Reader compatible with analyzer injection.
 */
function createVirtualReader(files: Record<string, string>) {
	return (
		_rootDir: string,
		relativePath: string,
	): Promise<string | null> => Promise.resolve(files[relativePath] ?? null);
}

/**
 * Builds minimal source fixtures that satisfy all analyzer source rules.
 *
 * @return {Record<string, string>} Fixture source files keyed by relative path.
 */
function buildCoveredSourceFixtures() {
	return {
		"src/salesforce/analytics.js": [
			"function getTechnicalAndInteractionConsent() {}",
			"function setDateForPingToday() {}",
			"function sendPingToAnalytics() {",
			"\tconst apiUrl = new URL(\"noscript.gif\", \"https://queue.simpleanalyticscdn.com\");",
			"\tsetDateForPingToday();",
			"}",
			"async function checkInsertAnalytics() {",
			"\tconst consentGranted = true;",
			"\tconst shouldPreventAnalytics = consentGranted == null ? true : false;",
			"\tawait syncAnalyticsSetting({ id: PREVENT_ANALYTICS, enabled: shouldPreventAnalytics });",
			"}",
		].join("\n"),
		"src/salesforce/update-settings.js": [
			"export function getUsageDaysUpdate(settings = [], today = \"2026-03-11\") {",
			"\tconst lastActiveDay = \"2026-03-10\";",
			"\tif (lastActiveDay !== today) {",
			"\t\treturn { usageDays: 2, set: [] };",
			"\t}",
			"\treturn { usageDays: 1, set: null };",
			"}",
			"",
			"export async function updateExtensionUsageDays() {",
			"\tconst usageSettings = [];",
			"\tconst calculated = getUsageDaysUpdate(usageSettings);",
			"\tawait sendExtensionMessage({ what: \"set\", set: calculated.set });",
			"\treturn calculated.usageDays;",
			"}",
		].join("\n"),
		"src/salesforce/once-a-day.js": [
			"export function executeOncePerDay() {",
			"\tconst today = \"2026-03-11\";",
			"\tif (wasCalledToday(today)) {",
			"\t\treturn;",
			"\t}",
			"\tcheckInsertAnalytics();",
			"\tupdateExtensionUsageDays();",
			"}",
		].join("\n"),
	};
}

/**
 * Builds minimal test fixtures from the analyzer's explicit test-title rules.
 *
 * @param {Record<string, string[]>} [titleOverrides={}] - Optional file-level title overrides.
 * @return {Record<string, string>} Fixture test files keyed by relative path.
 */
function buildTestFixtures(
	titleOverrides: Record<string, string[]> = {},
) {
	const rules = getInstrumentationRules();
	const titlesByPath = new Map<string, string[]>();
	for (const rule of rules) {
		const existing = titlesByPath.get(rule.tests.path) ?? [];
		for (const title of rule.tests.requiredTitles) {
			if (!existing.includes(title)) {
				existing.push(title);
			}
		}
		titlesByPath.set(rule.tests.path, existing);
	}

	const files: Record<string, string> = {};
	for (const [path, titles] of titlesByPath.entries()) {
		const selectedTitles = titleOverrides[path] ?? titles;
		files[path] = selectedTitles
			.map((title) =>
				`Deno.test("${title}", () => {\n\t// static metrics fixture\n});`,
			)
			.join("\n\n");
	}
	return files;
}

/**
 * Builds a fully covered fixture reader.
 *
 * @return {(rootDir: string, relativePath: string) => Promise<string | null>} Reader for covered fixtures.
 */
function buildCoveredReader() {
	return createVirtualReader({
		...buildCoveredSourceFixtures(),
		...buildTestFixtures(),
	});
}

Deno.test("analyzeMetricsCoverage reports covered status when all rule expectations are present", async () => {
	const report = await analyzeMetricsCoverage("/virtual", buildCoveredReader());
	assertEquals(report.totals.targets, 5);
	assertEquals(report.totals.covered, 5);
	assertEquals(report.totals.partial, 0);
	assertEquals(report.totals.uncovered, 0);
	assertEquals(
		report.matrix.every((target) => target.status === "covered"),
		true,
	);
	assertGreater(report.matrix[0].sourceLocations.length, 0);
	assertGreater(report.matrix[0].validatingTests.length, 0);
});

Deno.test("analyzeMetricsCoverage reports partial status when some validating tests are missing", async () => {
	const analyticsPath = "tests/salesforce/analytics.test.ts";
	const report = await analyzeMetricsCoverage(
		"/virtual",
		createVirtualReader({
			...buildCoveredSourceFixtures(),
			...buildTestFixtures({
				[analyticsPath]: [
					"syncs opt-out on Firefox consent denial",
					"inserts beacon for a new Firefox user with consent",
				],
			}),
		}),
	);
	const beaconTarget = report.matrix.find((entry) =>
		entry.id === "analytics-beacon-insertion"
	);
	const consentTarget = report.matrix.find((entry) =>
		entry.id === "analytics-consent-opt-out"
	);
	assertEquals(beaconTarget?.status, "partial");
	assertEquals(consentTarget?.status, "partial");
	assertGreater((beaconTarget?.missingTestTitles.length ?? 0), 0);
	assertGreater((consentTarget?.missingTestTitles.length ?? 0), 0);
	assertGreater(report.totals.partial, 0);
});

Deno.test("analyzeMetricsCoverage reports uncovered status when source or test files are missing", async () => {
	const report = await analyzeMetricsCoverage(
		"/virtual",
		createVirtualReader({
			"src/salesforce/analytics.js": "function sendPingToAnalytics() {}",
		}),
	);
	assertEquals(report.totals.covered, 0);
	assertEquals(report.totals.uncovered, 5);
	for (const target of report.matrix) {
		assertEquals(target.status, "uncovered");
	}
});

Deno.test("serializeMetricsCoverageReport stays deterministic for identical inputs", async () => {
	const report = await analyzeMetricsCoverage("/virtual", buildCoveredReader());
	const prettyOne = serializeMetricsCoverageReport(report, true);
	const prettyTwo = serializeMetricsCoverageReport(report, true);
	const compact = serializeMetricsCoverageReport(report, false);
	assertEquals(prettyOne, prettyTwo);
	assertStringIncludes(prettyOne, "\n\t\"totals\"");
	assertEquals(compact.includes("\n"), false);
});

Deno.test("runCliWithDependencies supports help and compact output flags", async () => {
	const outputs: string[] = [];
	const calls: string[] = [];
	const log = (message: string) => {
		outputs.push(message);
	};
	const analyze = async (rootDir: string) => {
		calls.push(rootDir);
		return await analyzeMetricsCoverage("/virtual", buildCoveredReader());
	};

	const helpCode = await runCliWithDependencies(["--help"], { analyze, log });
	assertEquals(helpCode, 0);
	assertStringIncludes(outputs[0], "Usage: deno run --allow-read bin/metrics-coverage.ts");

	outputs.length = 0;
	const compactCode = await runCliWithDependencies(
		["--root", "/virtual-root", "--compact"],
		{ analyze, log },
	);
	assertEquals(compactCode, 0);
	assertEquals(outputs.length, 1);
	assertEquals(outputs[0].includes("\n"), false);
	assertEquals(calls.includes("/virtual-root"), true);

	outputs.length = 0;
	const missingRootValueCode = await runCliWithDependencies(["--root"], {
		analyze,
		log,
	});
	assertEquals(missingRootValueCode, 0);
	assertEquals(outputs.length, 1);

	outputs.length = 0;
	const rootFollowedByFlagCode = await runCliWithDependencies(
		["--root", "--compact"],
		{ analyze, log },
	);
	assertEquals(rootFollowedByFlagCode, 0);
	assertEquals(outputs.length, 1);
	assertEquals(outputs[0].includes("\n"), false);
	assertEquals(calls.includes(Deno.cwd()), true);
});

Deno.test("runCli supports help without explicit dependency injection", async () => {
	const code = await runCli(["--help"]);
	assertEquals(code, 0);
});

Deno.test("analyzeMetricsCoverage rethrows injected read errors", async () => {
	let errorThrown = false;
	const brokenReader = () => Promise.reject(new Error("unexpected read failure"));
	try {
		await analyzeMetricsCoverage("/virtual", brokenReader);
	} catch (error) {
		errorThrown = error instanceof Error;
	}
	assertEquals(errorThrown, true);
});

Deno.test("analyzeMetricsCoverage sorts source locations deterministically for same-line matches", async () => {
	const report = await analyzeMetricsCoverage(
		"/virtual",
		createVirtualReader({
			"src/salesforce/analytics.js":
				"function sendPingToAnalytics(){const x='noscript.gif';setDateForPingToday();getTechnicalAndInteractionConsent();const consentGranted=null;syncAnalyticsSetting({id: PREVENT_ANALYTICS, enabled: shouldPreventAnalytics});}",
			"src/salesforce/update-settings.js":
				"export function getUsageDaysUpdate(){const lastActiveDay='x';const today='y';if(lastActiveDay !== today){return { usageDays: 1, set: []};}return {usageDays:0,set:null};} export async function updateExtensionUsageDays(){const usageSettings=[];getUsageDaysUpdate(usageSettings);await sendExtensionMessage({what:\"set\"});return 0;}",
			"src/salesforce/once-a-day.js":
				"export function executeOncePerDay(){const today='2026-03-11';if(wasCalledToday(today)){return;}checkInsertAnalytics();updateExtensionUsageDays();}",
			...buildTestFixtures(),
		}),
	);
	const target = report.matrix.find((entry) =>
		entry.id === "analytics-beacon-insertion"
	);
	const matcherIds = (target?.sourceLocations ?? []).map((location) =>
		location.matcherId
	);
	assertEquals(matcherIds, [
		"beacon-url",
		"persist-ping-date",
		"send-ping-function",
	]);
});

Deno.test("readTextIfExistsStrict returns null for missing files", async () => {
	const content = await readTextIfExistsStrict(Deno.cwd(), "path/that/does/not/exist.js");
	assertEquals(content, null);
});

Deno.test("readTextIfExistsStrict rethrows non-NotFound read errors", async () => {
	let didThrow = false;
	try {
		await readTextIfExistsStrict(Deno.cwd(), "src/salesforce");
	} catch (error) {
		didThrow = error instanceof Error;
	}
	assertEquals(didThrow, true);
});

Deno.test("metrics coverage CLI entrypoint emits JSON when run directly", async () => {
	const runPermission = await Deno.permissions.query({
		name: "run",
		command: "deno",
	});
	if (runPermission.state !== "granted") {
		return;
	}

	const command = new Deno.Command("deno", {
		args: [
			"run",
			"--allow-read",
			"bin/metrics-coverage.ts",
			"--root",
			Deno.cwd(),
			"--compact",
		],
		cwd: Deno.cwd(),
		stdout: "piped",
		stderr: "piped",
	});
	const result = await command.output();
	const stdout = new TextDecoder().decode(result.stdout);
	assertEquals(result.code, 0);
	assertStringIncludes(stdout, "\"totals\"");
	assertStringIncludes(stdout, "\"matrix\"");
});
