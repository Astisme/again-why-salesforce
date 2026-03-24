#!/usr/bin/env -S deno run --allow-read

const COVERED = "covered";
const PARTIAL = "partial";
const UNCOVERED = "uncovered";

type CoverageStatus = "covered" | "partial" | "uncovered";

type SourceMatcher = {
	id: string;
	description: string;
	pattern: RegExp;
};

type SourceRule = {
	path: string;
	matchers: SourceMatcher[];
};

type TestRule = {
	path: string;
	requiredTitles: string[];
};

type InstrumentationTargetRule = {
	id: string;
	title: string;
	description: string;
	source: SourceRule;
	tests: TestRule;
};

type SourceLocation = {
	matcherId: string;
	description: string;
	path: string;
	line: number;
};

type TestLocation = {
	path: string;
	line: number;
	title: string;
};

type CoverageTargetResult = {
	id: string;
	title: string;
	description: string;
	status: CoverageStatus;
	sourceLocations: SourceLocation[];
	validatingTests: TestLocation[];
	missingSourceMatchers: string[];
	missingTestTitles: string[];
};

type MetricsCoverageReport = {
	totals: {
		targets: number;
		covered: number;
		partial: number;
		uncovered: number;
	};
	scope: {
		assumptions: string[];
		sourceFiles: string[];
		testFiles: string[];
	};
	matrix: CoverageTargetResult[];
};

type TextFileReader = (
	rootDir: string,
	relativePath: string,
) => Promise<string | null>;

type CliAnalyzer = (rootDir: string) => Promise<MetricsCoverageReport>;
type CliLogger = (message: string) => void;

const SCOPE_ASSUMPTIONS = [
	"Metrics instrumentation scope is limited to analytics beacon and usage-day tracking flows.",
	"Analyzer is static and pattern-based; runtime behavior is not executed.",
	"Coverage is inferred from named Deno.test cases mapped to explicit instrumentation rules.",
];

/**
 * Returns explicit instrumentation target rules for static analysis.
 *
 * @return {InstrumentationTargetRule[]} Rule definitions in deterministic order.
 */
export function getInstrumentationRules(): InstrumentationTargetRule[] {
	return [
		{
			id: "analytics-beacon-insertion",
			title: "Analytics beacon insertion",
			description:
				"Simple Analytics beacon and CSP insertion in analytics telemetry flow.",
			source: {
				path: "src/salesforce/analytics.js",
				matchers: [
					{
						id: "send-ping-function",
						description: "sendPingToAnalytics function exists",
						pattern: /sendPingToAnalytics\s*\(/,
					},
					{
						id: "beacon-url",
						description: "noscript beacon URL is assembled",
						pattern: /noscript\.gif/,
					},
					{
						id: "persist-ping-date",
						description: "analytics ping date is persisted",
						pattern: /setDateForPingToday\s*\(\)/,
					},
				],
			},
			tests: {
				path: "tests/salesforce/analytics.test.ts",
				requiredTitles: [
					"inserts beacon for a new Firefox user with consent",
					"skips a second beacon on the same day",
					"appends analytics domains to an existing CSP",
				],
			},
		},
		{
			id: "analytics-consent-opt-out",
			title: "Analytics consent and opt-out",
			description:
				"Firefox consent evaluation and PREVENT_ANALYTICS synchronization logic.",
			source: {
				path: "src/salesforce/analytics.js",
				matchers: [
					{
						id: "consent-check",
						description: "technical and interaction consent is read",
						pattern: /getTechnicalAndInteractionConsent\s*\(\)/,
					},
					{
						id: "opt-out-fallback",
						description: "local opt-out fallback branch exists",
						pattern: /consentGranted\s*==\s*null/,
					},
					{
						id: "opt-out-sync",
						description: "PREVENT_ANALYTICS enabled flag is synchronized",
						pattern: /id:\s*PREVENT_ANALYTICS[\s\S]*enabled:\s*shouldPreventAnalytics/,
					},
				],
			},
			tests: {
				path: "tests/salesforce/analytics.test.ts",
				requiredTitles: [
					"syncs opt-out on Firefox consent denial",
					"falls back to the local opt-out if Firefox consent check fails",
					"on Chrome skips Firefox consent checks",
				],
			},
		},
		{
			id: "usage-days-update-persistence",
			title: "Usage-days persistence",
			description:
				"Persisted usage-days telemetry update path through settings messaging.",
			source: {
				path: "src/salesforce/update-settings.js",
				matchers: [
					{
						id: "update-function",
						description: "updateExtensionUsageDays entrypoint exists",
						pattern: /export\s+async\s+function\s+updateExtensionUsageDays/,
					},
					{
						id: "usage-calculation-call",
						description: "getUsageDaysUpdate is called from updater",
						pattern: /getUsageDaysUpdate\s*\(\s*usageSettings\s*\)/,
					},
					{
						id: "settings-write",
						description: "updated usage telemetry is persisted",
						pattern: /sendExtensionMessage\s*\([\s\S]*what:\s*"set"/,
					},
				],
			},
			tests: {
				path: "tests/salesforce/update-settings.test.ts",
				requiredTitles: [
					"initializes missing usage tracking at zero",
					"increments usage days on a new day",
					"persists the usage settings",
				],
			},
		},
		{
			id: "usage-days-daily-calculation",
			title: "Usage-days daily calculation",
			description:
				"Daily distinct-use-day calculation and non-increment branch behavior.",
			source: {
				path: "src/salesforce/update-settings.js",
				matchers: [
					{
						id: "calculation-function",
						description: "getUsageDaysUpdate function exists",
						pattern: /export\s+function\s+getUsageDaysUpdate/,
					},
					{
						id: "new-day-branch",
						description: "new day branch increments usage",
						pattern: /lastActiveDay\s*!==\s*today/,
					},
				],
			},
			tests: {
				path: "tests/salesforce/update-settings.test.ts",
				requiredTitles: [
					"does not increment twice on the same day",
					"handles null settings input",
				],
			},
		},
		{
			id: "once-a-day-telemetry-trigger",
			title: "Once-a-day telemetry trigger",
			description:
				"Daily gating that triggers analytics check and usage-days update once per day.",
			source: {
				path: "src/salesforce/once-a-day.js",
				matchers: [
					{
						id: "execute-function",
						description: "executeOncePerDay entrypoint exists",
						pattern: /export\s+function\s+executeOncePerDay/,
					},
					{
						id: "daily-guard",
						description: "same-day guard branch exists",
						pattern: /wasCalledToday\s*\(\s*today\s*\)/,
					},
					{
						id: "analytics-trigger",
						description: "analytics trigger is called",
						pattern: /checkInsertAnalytics\s*\(\s*\)/,
					},
					{
						id: "usage-days-trigger",
						description: "usage-days trigger is called",
						pattern: /updateExtensionUsageDays\s*\(\s*\)/,
					},
				],
			},
			tests: {
				path: "tests/salesforce/once-a-day.test.ts",
				requiredTitles: [
					"formats the local calendar day",
					"runs the first time but not the second",
				],
			},
		},
	];
}

/**
 * Reads a file as UTF-8 text if it exists.
 *
 * @param {string} rootDir - Root directory for relative file resolution.
 * @param {string} relativePath - Path to read relative to rootDir.
 * @return {Promise<string|null>} File content when found, otherwise null.
 */
async function readTextIfExists(
	rootDir: string,
	relativePath: string,
): Promise<string | null> {
	const absolutePath = `${rootDir}/${relativePath}`;
	try {
		return await Deno.readTextFile(absolutePath);
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			return null;
		}
		throw error;
	}
}

/**
 * Reads a file as UTF-8 text and rethrows non-NotFound failures.
 *
 * @param {string} rootDir - Root directory for relative file resolution.
 * @param {string} relativePath - Path to read relative to rootDir.
 * @return {Promise<string|null>} File content when found, otherwise null.
 */
export async function readTextIfExistsStrict(
	rootDir: string,
	relativePath: string,
): Promise<string | null> {
	return await readTextIfExists(rootDir, relativePath);
}

/**
 * Converts a character index into a 1-based line number.
 *
 * @param {string} content - File text content.
 * @param {number} index - Character index of a match.
 * @return {number} 1-based line number.
 */
function toLineNumber(content: string, index: number): number {
	return content.slice(0, index).split("\n").length;
}

/**
 * Extracts named Deno.test declarations from a test file.
 *
 * @param {string} filePath - Relative file path for metadata.
 * @param {string} content - Raw test file content.
 * @return {TestLocation[]} Parsed test definitions.
 */
function extractTestLocations(filePath: string, content: string): TestLocation[] {
	const results: TestLocation[] = [];
	const pattern = /Deno\.test\(\s*["'`]([^"'`]+)["'`]/g;
	let match = pattern.exec(content);
	while (match != null) {
		results.push({
			path: filePath,
			line: toLineNumber(content, match.index),
			title: match[1],
		});
		match = pattern.exec(content);
	}
	return results;
}

/**
 * Finds source matcher hits and missing matcher ids for one rule.
 *
 * @param {SourceRule} sourceRule - Source matching rule.
 * @param {string|null} content - Source file content, if readable.
 * @return {{ locations: SourceLocation[]; missingMatcherIds: string[] }} Match result payload.
 */
function evaluateSourceRule(
	sourceRule: SourceRule,
	content: string | null,
): { locations: SourceLocation[]; missingMatcherIds: string[] } {
	if (content == null) {
		return {
			locations: [],
			missingMatcherIds: sourceRule.matchers.map((matcher) => matcher.id),
		};
	}

	const locations: SourceLocation[] = [];
	const missingMatcherIds: string[] = [];
	for (const matcher of sourceRule.matchers) {
		const hit = matcher.pattern.exec(content);
		if (hit == null || hit.index == null) {
			missingMatcherIds.push(matcher.id);
			continue;
		}
		locations.push({
			matcherId: matcher.id,
			description: matcher.description,
			path: sourceRule.path,
			line: toLineNumber(content, hit.index),
		});
	}

	locations.sort((a, b) => a.line - b.line || a.matcherId.localeCompare(b.matcherId));
	return { locations, missingMatcherIds };
}

/**
 * Finds test cases that validate one instrumentation target.
 *
 * @param {TestRule} testRule - Test matching rule.
 * @param {TestLocation[]} tests - Parsed tests from the designated file.
 * @return {{ validatingTests: TestLocation[]; missingTitles: string[] }} Matching test payload.
 */
function evaluateTestRule(
	testRule: TestRule,
	tests: TestLocation[],
): { validatingTests: TestLocation[]; missingTitles: string[] } {
	const validatingTests: TestLocation[] = [];
	const missingTitles: string[] = [];
	for (const expectedTitle of testRule.requiredTitles) {
		const matching = tests.filter((testCase) =>
			testCase.title.includes(expectedTitle)
		);
		if (matching.length === 0) {
			missingTitles.push(expectedTitle);
			continue;
		}
		for (const testCase of matching) {
			validatingTests.push(testCase);
		}
	}

	const unique = new Map<string, TestLocation>();
	for (const testCase of validatingTests) {
		unique.set(`${testCase.path}:${testCase.line}:${testCase.title}`, testCase);
	}
	const uniqueTests = [...unique.values()];
	uniqueTests.sort((a, b) => a.line - b.line);

	return {
		validatingTests: uniqueTests,
		missingTitles,
	};
}

/**
 * Converts source and test match completeness into a coverage status label.
 *
 * @param {boolean} hasSourceMatches - Whether at least one source matcher was found.
 * @param {number} missingSourceCount - Missing source matcher count.
 * @param {number} missingTestCount - Missing test title count.
 * @param {number} validatingTestCount - Matched validating test count.
 * @return {CoverageStatus} Status classification.
 */
function resolveStatus(
	hasSourceMatches: boolean,
	missingSourceCount: number,
	missingTestCount: number,
	validatingTestCount: number,
): CoverageStatus {
	if (!hasSourceMatches || validatingTestCount === 0) {
		return UNCOVERED;
	}
	if (missingSourceCount === 0 && missingTestCount === 0) {
		return COVERED;
	}
	return PARTIAL;
}

/**
 * Builds a static metrics coverage report from explicit instrumentation rules.
 *
 * @param {string} [rootDir=Deno.cwd()] - Root directory to analyze.
 * @return {Promise<MetricsCoverageReport>} Coverage matrix report.
 */
export async function analyzeMetricsCoverage(
	rootDir = Deno.cwd(),
	readText: TextFileReader = readTextIfExists,
): Promise<MetricsCoverageReport> {
	const rules = getInstrumentationRules();
	const sourcePaths = [...new Set(rules.map((rule) => rule.source.path))];
	const testPaths = [...new Set(rules.map((rule) => rule.tests.path))];

	const sourceContentByPath = new Map<string, string | null>();
	for (const sourcePath of sourcePaths) {
		sourceContentByPath.set(sourcePath, await readText(rootDir, sourcePath));
	}

	const testCasesByPath = new Map<string, TestLocation[]>();
	for (const testPath of testPaths) {
		const testContent = await readText(rootDir, testPath);
		const testCases = testContent == null ? [] : extractTestLocations(testPath, testContent);
		testCasesByPath.set(testPath, testCases);
	}

	const matrix: CoverageTargetResult[] = [];
	for (const rule of rules) {
		const sourceContent = sourceContentByPath.get(rule.source.path) ?? null;
		const sourceEvaluation = evaluateSourceRule(rule.source, sourceContent);
		const tests = testCasesByPath.get(rule.tests.path) as TestLocation[];
		const testEvaluation = evaluateTestRule(rule.tests, tests);

		const status = resolveStatus(
			sourceEvaluation.locations.length > 0,
			sourceEvaluation.missingMatcherIds.length,
			testEvaluation.missingTitles.length,
			testEvaluation.validatingTests.length,
		);

		matrix.push({
			id: rule.id,
			title: rule.title,
			description: rule.description,
			status,
			sourceLocations: sourceEvaluation.locations,
			validatingTests: testEvaluation.validatingTests,
			missingSourceMatchers: sourceEvaluation.missingMatcherIds,
			missingTestTitles: testEvaluation.missingTitles,
		});
	}

	const totals = {
		targets: matrix.length,
		covered: matrix.filter((entry) => entry.status === COVERED).length,
		partial: matrix.filter((entry) => entry.status === PARTIAL).length,
		uncovered: matrix.filter((entry) => entry.status === UNCOVERED).length,
	};

	return {
		totals,
		scope: {
			assumptions: SCOPE_ASSUMPTIONS,
			sourceFiles: sourcePaths,
			testFiles: testPaths,
		},
		matrix,
	};
}

/**
 * Serializes the report to deterministic JSON for CI/PR consumption.
 *
 * @param {MetricsCoverageReport} report - Coverage report to serialize.
 * @param {boolean} [pretty=true] - Whether to pretty-print JSON.
 * @return {string} Serialized JSON payload.
 */
export function serializeMetricsCoverageReport(
	report: MetricsCoverageReport,
	pretty = true,
): string {
	return JSON.stringify(report, null, pretty ? "\t" : undefined);
}

/**
 * Parses known CLI flags.
 *
 * @param {string[]} args - Command-line arguments.
 * @return {{ rootDir: string; pretty: boolean; help: boolean }} Parsed options.
 */
function parseArgs(
	args: string[],
): { rootDir: string; pretty: boolean; help: boolean } {
	const options = {
		rootDir: Deno.cwd(),
		pretty: true,
		help: false,
	};
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--help" || arg === "-h") {
			options.help = true;
			continue;
		}
		if (arg === "--compact") {
			options.pretty = false;
			continue;
		}
		if (arg === "--root") {
			const rootValue = getFlagValue(args, index);
			if (rootValue != null) {
				options.rootDir = rootValue;
				index += 1;
			}
			continue;
		}
	}
	return options;
}

/**
 * Returns the next CLI token when it is a value and not another flag.
 *
 * @param {string[]} args - Full command-line argument list.
 * @param {number} index - Current index of the option flag.
 * @return {string|null} Value token when present, otherwise null.
 */
function getFlagValue(args: string[], index: number): string | null {
	const value = args[index + 1];
	if (value == null || value.startsWith("--")) {
		return null;
	}
	return value;
}

/**
 * Builds the CLI usage output.
 *
 * @return {string} Human-readable usage text.
 */
function getUsage() {
	return [
		"Usage: deno run --allow-read bin/metrics-coverage.ts [--root <path>] [--compact]",
		"",
		"Options:",
		"  --root <path>  Analyze a specific repository root (default: current directory).",
		"  --compact      Emit minified JSON instead of pretty JSON.",
		"  -h, --help     Show this help text.",
	].join("\n");
}

/**
 * Executes the CLI entrypoint.
 *
 * @param {string[]} [args=Deno.args] - Command-line arguments.
 * @return {Promise<number>} Process exit code.
 */
export async function runCli(args: string[] = Deno.args): Promise<number> {
	return await runCliWithDependencies(args);
}

/**
 * Executes the CLI entrypoint with injected dependencies for deterministic tests.
 *
 * @param {string[]} args - Command-line arguments.
 * @param {{ analyze?: CliAnalyzer; log?: CliLogger }} [dependencies={}] - Optional dependency overrides.
 * @return {Promise<number>} Process exit code.
 */
export async function runCliWithDependencies(
	args: string[],
	dependencies: { analyze?: CliAnalyzer; log?: CliLogger } = {},
): Promise<number> {
	const analyze = dependencies.analyze ?? analyzeMetricsCoverage;
	const log = dependencies.log ?? console.log;
	const options = parseArgs(args);
	if (options.help) {
		log(getUsage());
		return 0;
	}
	const report = await analyze(options.rootDir);
	log(serializeMetricsCoverageReport(report, options.pretty));
	return 0;
}

if (import.meta.main) {
	const code = await runCli(Deno.args);
	Deno.exit(code);
}
