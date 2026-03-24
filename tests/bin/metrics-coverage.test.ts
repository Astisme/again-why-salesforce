import {
	assertEquals,
	assertGreater,
	assertStringIncludes,
} from "@std/testing/asserts";
import {
	analyzeMetricsCoverage,
	getInstrumentationRules,
	runCli,
	serializeMetricsCoverageReport,
} from "../../bin/metrics-coverage.ts";

/**
 * Writes a fixture tree into a temporary directory.
 *
 * @param {Record<string, string>} files - Relative fixture paths and file contents.
 * @return {Promise<string>} Temporary root directory path.
 */
async function writeFixtureTree(files: Record<string, string>) {
	const rootDir = await Deno.makeTempDir();
	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = `${rootDir}/${relativePath}`;
		const parentPath = absolutePath.split("/").slice(0, -1).join("/");
		await Deno.mkdir(parentPath, { recursive: true });
		await Deno.writeTextFile(absolutePath, content);
	}
	return rootDir;
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
 * Removes a temporary fixture directory.
 *
 * @param {string} rootDir - Temporary directory to remove.
 * @return {Promise<void>} Promise resolved after recursive deletion.
 */
async function removeFixtureTree(rootDir: string) {
	await Deno.remove(rootDir, { recursive: true });
}

/**
 * Builds the absolute repository root from this test file location.
 *
 * @return {string} Absolute repository root path.
 */
function getRepoRootPath() {
	return new URL("../../", import.meta.url).pathname;
}

Deno.test("analyzeMetricsCoverage reports covered status when all rule expectations are present", async () => {
	const rootDir = await writeFixtureTree({
		...buildCoveredSourceFixtures(),
		...buildTestFixtures(),
	});
	try {
		const report = await analyzeMetricsCoverage(rootDir);
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
	} finally {
		await removeFixtureTree(rootDir);
	}
});

Deno.test("analyzeMetricsCoverage reports partial status when some validating tests are missing", async () => {
	const analyticsPath = "tests/salesforce/analytics.test.ts";
	const rootDir = await writeFixtureTree({
		...buildCoveredSourceFixtures(),
		...buildTestFixtures({
			[analyticsPath]: [
				"syncs opt-out on Firefox consent denial",
				"inserts beacon for a new Firefox user with consent",
			],
		}),
	});
	try {
		const report = await analyzeMetricsCoverage(rootDir);
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
	} finally {
		await removeFixtureTree(rootDir);
	}
});

Deno.test("analyzeMetricsCoverage reports uncovered status when source or test files are missing", async () => {
	const rootDir = await writeFixtureTree({
		"src/salesforce/analytics.js": "function sendPingToAnalytics() {}",
	});
	try {
		const report = await analyzeMetricsCoverage(rootDir);
		assertEquals(report.totals.covered, 0);
		assertEquals(report.totals.uncovered, 5);
		for (const target of report.matrix) {
			assertEquals(target.status, "uncovered");
		}
	} finally {
		await removeFixtureTree(rootDir);
	}
});

Deno.test("serializeMetricsCoverageReport stays deterministic for identical inputs", async () => {
	const rootDir = await writeFixtureTree({
		...buildCoveredSourceFixtures(),
		...buildTestFixtures(),
	});
	try {
		const report = await analyzeMetricsCoverage(rootDir);
		const prettyOne = serializeMetricsCoverageReport(report, true);
		const prettyTwo = serializeMetricsCoverageReport(report, true);
		const compact = serializeMetricsCoverageReport(report, false);
		assertEquals(prettyOne, prettyTwo);
		assertStringIncludes(prettyOne, "\n\t\"totals\"");
		assertEquals(compact.includes("\n"), false);
	} finally {
		await removeFixtureTree(rootDir);
	}
});

Deno.test("runCli supports help and compact output flags", async () => {
	const rootDir = await writeFixtureTree({
		...buildCoveredSourceFixtures(),
		...buildTestFixtures(),
	});
	const originalConsoleLog = console.log;
	const outputs: string[] = [];
	console.log = (...parts: unknown[]) => {
		outputs.push(parts.map((part) => String(part)).join(" "));
	};
	try {
		const helpCode = await runCli(["--help"]);
		assertEquals(helpCode, 0);
		assertStringIncludes(outputs[0], "Usage: deno run --allow-read bin/metrics-coverage.ts");

		outputs.length = 0;
		const compactCode = await runCli(["--root", rootDir, "--compact"]);
		assertEquals(compactCode, 0);
		assertEquals(outputs.length, 1);
		assertEquals(outputs[0].includes("\n"), false);

		outputs.length = 0;
		const missingRootValueCode = await runCli(["--root"]);
		assertEquals(missingRootValueCode, 0);
		assertEquals(outputs.length, 1);
	} finally {
		console.log = originalConsoleLog;
		await removeFixtureTree(rootDir);
	}
});

Deno.test("analyzeMetricsCoverage rethrows non-NotFound read errors", async () => {
	const rootDir = await Deno.makeTempDir();
	try {
		await Deno.mkdir(`${rootDir}/src/salesforce/analytics.js`, {
			recursive: true,
		});
		let errorThrown = false;
		try {
			await analyzeMetricsCoverage(rootDir);
		} catch (error) {
			errorThrown = error instanceof Error;
		}
		assertEquals(errorThrown, true);
	} finally {
		await removeFixtureTree(rootDir);
	}
});

Deno.test("analyzeMetricsCoverage sorts source locations deterministically for same-line matches", async () => {
	const rootDir = await writeFixtureTree({
		"src/salesforce/analytics.js":
			"function sendPingToAnalytics(){const x='noscript.gif';setDateForPingToday();getTechnicalAndInteractionConsent();const consentGranted=null;syncAnalyticsSetting({id: PREVENT_ANALYTICS, enabled: shouldPreventAnalytics});}",
		"src/salesforce/update-settings.js":
			"export function getUsageDaysUpdate(){const lastActiveDay='x';const today='y';if(lastActiveDay !== today){return { usageDays: 1, set: []};}return {usageDays:0,set:null};} export async function updateExtensionUsageDays(){const usageSettings=[];getUsageDaysUpdate(usageSettings);await sendExtensionMessage({what:\"set\"});return 0;}",
		"src/salesforce/once-a-day.js":
			"export function executeOncePerDay(){const today='2026-03-11';if(wasCalledToday(today)){return;}checkInsertAnalytics();updateExtensionUsageDays();}",
		...buildTestFixtures(),
	});
	try {
		const report = await analyzeMetricsCoverage(rootDir);
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
	} finally {
		await removeFixtureTree(rootDir);
	}
});

Deno.test("metrics coverage CLI entrypoint emits JSON when run directly", async () => {
	const command = new Deno.Command("deno", {
		args: [
			"run",
			"--allow-read",
			"bin/metrics-coverage.ts",
			"--root",
			getRepoRootPath(),
			"--compact",
		],
		cwd: getRepoRootPath(),
		stdout: "piped",
		stderr: "piped",
	});
	const result = await command.output();
	const stdout = new TextDecoder().decode(result.stdout);
	assertEquals(result.code, 0);
	assertStringIncludes(stdout, "\"totals\"");
	assertStringIncludes(stdout, "\"matrix\"");
});
