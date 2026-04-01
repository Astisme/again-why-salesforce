#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

const LINE_BREAK = "\n";
const RUN_LOG_PREFIX = "run";
const SUMMARY_TITLE = "Test Flakiness Analyzer";
const SUMMARY_FLAKY_PREFIX = "-";
const SUMMARY_NONE_MESSAGE = "No flaky tests detected.";
const SUMMARY_REPORT_WRITE_PREFIX = "Wrote report:";
const DEFAULT_OUTPUT_ENCODING = "utf-8";
const SHELL_BINARY = "bash";
const SHELL_EXECUTE_FLAG = "-lc";
const TESTCASE_START_PATTERN = /<testcase\b([^>]*?)(\/?)>/g;
const TESTCASE_CLOSE_TAG = "</testcase>";
const XML_ATTRIBUTE_PATTERN = /([A-Za-z_][\w:.-]*)="([^"]*)"/g;
const XML_ENTITY_PATTERN = /&([a-z]+);/g;
const JUNIT_PATH_FLAG_PATTERN = /(?:^|\s)--junit-path(?:=|\s|$)/;
const HELP_TEXT = [
	"Usage: deno run --allow-run --allow-read --allow-write bin/analyze-test-flakiness.ts [options]",
	"",
	"Options:",
	"  --runs, -r <count>        Number of test runs (default: 10)",
	"  --command, -c <command>   Base test command (default: deno test --allow-read tests)",
	"  --report, -o <path>       Output JSON report path (default: test-flakiness-report.json)",
	"  --no-report               Skip writing the JSON report file",
	"  --junit-dir <path>        Directory for per-run JUnit XML files (default: .tmp/test-flakiness)",
	"  --help, -h                Show this help text",
	"",
	"Tip: Use {junitPath} in --command to place the generated JUnit file explicitly.",
].join(LINE_BREAK);

export const DEFAULT_RUN_COUNT = 10;
export const DEFAULT_TEST_COMMAND = "deno test --allow-read tests";
export const DEFAULT_REPORT_PATH = "test-flakiness-report.json";
export const DEFAULT_JUNIT_DIRECTORY = ".tmp/test-flakiness";
export const JUNIT_PATH_PLACEHOLDER = "{junitPath}";
export const TESTCASE_IDENTIFIER_SEPARATOR = "::";
export const UNNAMED_TEST_CASE_LABEL = "unnamed-testcase";

export const EXIT_CODES = {
	SUCCESS: 0,
	ERROR: 1,
	FLAKY_TESTS_FOUND: 2,
} as const;

export type TestStatus = "pass" | "fail" | "skipped";

export interface AnalyzerOptions {
	runs: number;
	command: string;
	reportPath: string | null;
	junitDirectory: string;
}

export interface ParsedCliInput {
	helpRequested: boolean;
	options: AnalyzerOptions;
}

export interface CommandExecutionResult {
	code: number;
	stdout: string;
	stderr: string;
}

export interface ParsedTestCase {
	id: string;
	name: string;
	className: string;
	status: TestStatus;
}

export interface RunReport {
	runNumber: number;
	command: string;
	exitCode: number;
	junitPath: string;
	hadJUnitReport: boolean;
	testCases: ParsedTestCase[];
}

export interface AggregatedTestCaseOutcome {
	id: string;
	name: string;
	className: string;
	passCount: number;
	failCount: number;
	skippedCount: number;
	isFlaky: boolean;
	statusesByRun: TestStatus[];
}

export interface FlakinessTotals {
	totalRuns: number;
	runsWithNonZeroExit: number;
	runsWithoutJUnitReport: number;
	testCaseCount: number;
	flakyCount: number;
}

export interface FlakinessReport {
	generatedAt: string;
	options: AnalyzerOptions;
	runs: RunReport[];
	aggregatedTestCases: AggregatedTestCaseOutcome[];
	flakyTests: AggregatedTestCaseOutcome[];
	totals: FlakinessTotals;
}

export interface AnalyzerDependencies {
	executeCommand(command: string): Promise<CommandExecutionResult>;
	readTextFile(path: string): Promise<string | null>;
	ensureDirectory(path: string): Promise<void>;
	log(message: string): void;
	now(): Date;
}

interface AggregateAccumulator {
	id: string;
	name: string;
	className: string;
	passCount: number;
	failCount: number;
	skippedCount: number;
	statusesByRun: TestStatus[];
}

/**
 * Parses command-line arguments into analyzer options.
 *
 * @param {string[]} args Command-line arguments.
 * @returns {ParsedCliInput} Parsed CLI input.
 */
export function parseArgs(args: string[]): ParsedCliInput {
	const options: AnalyzerOptions = {
		runs: DEFAULT_RUN_COUNT,
		command: DEFAULT_TEST_COMMAND,
		reportPath: DEFAULT_REPORT_PATH,
		junitDirectory: DEFAULT_JUNIT_DIRECTORY,
	};
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === "--help" || argument === "-h") {
			return { helpRequested: true, options };
		}
		if (argument === "--runs" || argument === "-r") {
			const value = readFlagValue(args, index, argument);
			options.runs = parseRunsValue(value);
			index += 1;
			continue;
		}
		if (argument === "--command" || argument === "-c") {
			const value = readFlagValue(args, index, argument);
			options.command = value.trim();
			if (options.command.length === 0) {
				throw new Error("--command must not be empty");
			}
			index += 1;
			continue;
		}
		if (argument === "--report" || argument === "-o") {
			const value = readFlagValue(args, index, argument);
			options.reportPath = value.trim();
			if (options.reportPath.length === 0) {
				throw new Error("--report must not be empty");
			}
			index += 1;
			continue;
		}
		if (argument === "--junit-dir") {
			const value = readFlagValue(args, index, argument);
			options.junitDirectory = value.trim();
			if (options.junitDirectory.length === 0) {
				throw new Error("--junit-dir must not be empty");
			}
			index += 1;
			continue;
		}
		if (argument === "--no-report") {
			options.reportPath = null;
			continue;
		}
		throw new Error(`Unknown argument: ${argument}`);
	}
	return { helpRequested: false, options };
}

/**
 * Reads a value for a flag and validates that it exists.
 *
 * @param {string[]} args Full CLI argument list.
 * @param {number} index Current argument index.
 * @param {string} flagName Name of the flag being read.
 * @returns {string} Flag value.
 */
export function readFlagValue(
	args: string[],
	index: number,
	flagName: string,
): string {
	const value = args[index + 1];
	if (value === undefined) {
		throw new Error(`Missing value for ${flagName}`);
	}
	if (value.startsWith("-")) {
		throw new Error(`Invalid value for ${flagName}: ${value}`);
	}
	return value;
}

/**
 * Parses and validates the number of runs.
 *
 * @param {string} value CLI value to parse.
 * @returns {number} Parsed run count.
 */
export function parseRunsValue(value: string): number {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed < 2) {
		throw new Error("--runs must be an integer greater than or equal to 2");
	}
	return parsed;
}

/**
 * Escapes a shell argument for safe execution in `bash -lc`.
 *
 * @param {string} value Raw argument value.
 * @returns {string} Shell-escaped argument.
 */
export function quoteShellArgument(value: string): string {
	return `'${value.replaceAll("'", `'"'"'`)}'`;
}

/**
 * Builds the per-run command including the JUnit output path.
 *
 * @param {string} baseCommand Base test command.
 * @param {string} junitPath JUnit report path for this run.
 * @returns {string} Command ready to execute.
 */
export function buildRunCommand(baseCommand: string, junitPath: string): string {
	if (baseCommand.includes(JUNIT_PATH_PLACEHOLDER)) {
		return baseCommand.replaceAll(
			JUNIT_PATH_PLACEHOLDER,
			quoteShellArgument(junitPath),
		);
	}
	if (JUNIT_PATH_FLAG_PATTERN.test(baseCommand)) {
		return baseCommand;
	}
	return `${baseCommand} --junit-path ${quoteShellArgument(junitPath)}`;
}

/**
 * Decodes supported XML entities from attribute or text values.
 *
 * @param {string} value Raw XML value.
 * @returns {string} Decoded value.
 */
export function decodeXmlEntities(value: string): string {
	return value.replaceAll(XML_ENTITY_PATTERN, (entity, namedEntity) => {
		if (namedEntity === "amp") {
			return "&";
		}
		if (namedEntity === "lt") {
			return "<";
		}
		if (namedEntity === "gt") {
			return ">";
		}
		if (namedEntity === "quot") {
			return '"';
		}
		if (namedEntity === "apos") {
			return "'";
		}
		return entity;
	});
}

/**
 * Parses XML attributes from a testcase element.
 *
 * @param {string} attributesText Raw attribute text.
 * @returns {Record<string, string>} Parsed attributes.
 */
export function parseXmlAttributes(attributesText: string): Record<string, string> {
	const attributes: Record<string, string> = {};
	for (const match of attributesText.matchAll(XML_ATTRIBUTE_PATTERN)) {
		const attributeName = match[1];
		const attributeValue = match[2];
		attributes[attributeName] = decodeXmlEntities(attributeValue);
	}
	return attributes;
}

/**
 * Creates a stable testcase identifier from classname and testcase name.
 *
 * @param {string} className Testcase class name.
 * @param {string} name Testcase name.
 * @returns {string} Stable testcase identifier.
 */
export function createTestCaseId(className: string, name: string): string {
	const trimmedClassName = className.trim();
	if (trimmedClassName.length === 0) {
		return name;
	}
	return `${trimmedClassName}${TESTCASE_IDENTIFIER_SEPARATOR}${name}`;
}

/**
 * Determines testcase status from testcase element contents.
 *
 * @param {string} testcaseBody Inner testcase XML.
 * @returns {TestStatus} Derived testcase status.
 */
export function determineTestStatus(testcaseBody: string): TestStatus {
	if (testcaseBody.includes("<failure") || testcaseBody.includes("<error")) {
		return "fail";
	}
	if (testcaseBody.includes("<skipped")) {
		return "skipped";
	}
	return "pass";
}

/**
 * Parses JUnit XML and extracts testcase statuses.
 *
 * @param {string} junitXml JUnit XML content.
 * @returns {ParsedTestCase[]} Parsed testcase results.
 */
export function parseJUnitTestCases(junitXml: string): ParsedTestCase[] {
	const testCases: ParsedTestCase[] = [];
	TESTCASE_START_PATTERN.lastIndex = 0;
	let testcaseStartMatch = TESTCASE_START_PATTERN.exec(junitXml);
	while (testcaseStartMatch !== null) {
		const attributesText = testcaseStartMatch[1];
		const isSelfClosing = testcaseStartMatch[2] === "/";
		const bodyStartIndex = testcaseStartMatch.index +
			testcaseStartMatch[0].length;
		let testcaseBody = "";
		if (!isSelfClosing) {
			const bodyEndIndex = junitXml.indexOf(TESTCASE_CLOSE_TAG, bodyStartIndex);
			if (bodyEndIndex === -1) {
				testcaseBody = junitXml.slice(bodyStartIndex);
			} else {
				testcaseBody = junitXml.slice(bodyStartIndex, bodyEndIndex);
				TESTCASE_START_PATTERN.lastIndex = bodyEndIndex +
					TESTCASE_CLOSE_TAG.length;
			}
		}
		const attributes = parseXmlAttributes(attributesText);
		const name = (attributes.name?.trim() || UNNAMED_TEST_CASE_LABEL);
		const className = (attributes.classname?.trim() || "");
		testCases.push({
			id: createTestCaseId(className, name),
			name,
			className,
			status: determineTestStatus(testcaseBody),
		});
		testcaseStartMatch = TESTCASE_START_PATTERN.exec(junitXml);
	}
	return testCases;
}

/**
 * Aggregates testcase results across runs and marks flaky tests.
 *
 * @param {RunReport[]} runs Per-run test results.
 * @returns {AggregatedTestCaseOutcome[]} Aggregated testcase outcomes.
 */
export function aggregateTestCaseOutcomes(
	runs: RunReport[],
): AggregatedTestCaseOutcome[] {
	const accumulatorMap = new Map<string, AggregateAccumulator>();
	for (const run of runs) {
		for (const testCase of run.testCases) {
			const existing = accumulatorMap.get(testCase.id) ?? {
				id: testCase.id,
				name: testCase.name,
				className: testCase.className,
				passCount: 0,
				failCount: 0,
				skippedCount: 0,
				statusesByRun: [],
			};
			if (testCase.status === "pass") {
				existing.passCount += 1;
			}
			if (testCase.status === "fail") {
				existing.failCount += 1;
			}
			if (testCase.status === "skipped") {
				existing.skippedCount += 1;
			}
			existing.statusesByRun.push(testCase.status);
			accumulatorMap.set(testCase.id, existing);
		}
	}
	return [...accumulatorMap.values()].map((entry) => ({
		...entry,
		isFlaky: entry.passCount > 0 && entry.failCount > 0,
	})).toSorted((left, right) => left.id.localeCompare(right.id));
}

/**
 * Computes report totals from runs and aggregated testcase outcomes.
 *
 * @param {RunReport[]} runs Per-run test results.
 * @param {AggregatedTestCaseOutcome[]} aggregatedTestCases Aggregated testcase outcomes.
 * @returns {FlakinessTotals} Summary totals.
 */
export function calculateTotals(
	runs: RunReport[],
	aggregatedTestCases: AggregatedTestCaseOutcome[],
): FlakinessTotals {
	const runsWithNonZeroExit = runs.filter((run) => run.exitCode !== 0).length;
	const runsWithoutJUnitReport = runs.filter((run) => !run.hadJUnitReport).length;
	const flakyCount = aggregatedTestCases.filter((testCase) => testCase.isFlaky).length;
	return {
		totalRuns: runs.length,
		runsWithNonZeroExit,
		runsWithoutJUnitReport,
		testCaseCount: aggregatedTestCases.length,
		flakyCount,
	};
}

/**
 * Selects an analyzer exit code based on report outcomes.
 *
 * @param {FlakinessReport} report Analyzer report.
 * @returns {number} Exit code.
 */
export function calculateExitCode(report: FlakinessReport): number {
	if (report.totals.flakyCount > 0) {
		return EXIT_CODES.FLAKY_TESTS_FOUND;
	}
	if (report.totals.runsWithoutJUnitReport > 0) {
		return EXIT_CODES.ERROR;
	}
	return EXIT_CODES.SUCCESS;
}

/**
 * Renders a human-readable summary of the flakiness report.
 *
 * @param {FlakinessReport} report Analyzer report.
 * @returns {string} Text summary.
 */
export function renderSummary(report: FlakinessReport): string {
	const lines = [
		SUMMARY_TITLE,
		`Runs: ${report.totals.totalRuns}`,
		`Command: ${report.options.command}`,
		`Observed testcases: ${report.totals.testCaseCount}`,
		`Flaky tests: ${report.totals.flakyCount}`,
	];
	if (report.totals.flakyCount === 0) {
		lines.push(SUMMARY_NONE_MESSAGE);
	} else {
		for (const testCase of report.flakyTests) {
			lines.push(
			`${SUMMARY_FLAKY_PREFIX} ${testCase.id} (pass: ${testCase.passCount}, fail: ${testCase.failCount}, skipped: ${testCase.skippedCount})`,
			);
		}
	}
	if (report.totals.runsWithoutJUnitReport > 0) {
		lines.push(`Runs without JUnit report: ${report.totals.runsWithoutJUnitReport}`);
	}
	if (report.totals.runsWithNonZeroExit > 0) {
		lines.push(`Runs with non-zero exit: ${report.totals.runsWithNonZeroExit}`);
	}
	return lines.join(LINE_BREAK);
}

/**
 * Writes the report file to disk.
 *
 * @param {string} reportPath Destination report path.
 * @param {FlakinessReport} report Analyzer report.
 * @returns {Promise<void>}
 */
export async function writeReport(
	reportPath: string,
	report: FlakinessReport,
): Promise<void> {
	await Deno.writeTextFile(reportPath, `${JSON.stringify(report, null, 2)}${LINE_BREAK}`);
}

/**
 * Runs the analyzer for all iterations and returns the full report.
 *
 * @param {AnalyzerOptions} options Analyzer execution options.
 * @param {AnalyzerDependencies} dependencies Runtime dependencies.
 * @returns {Promise<FlakinessReport>} Analyzer report.
 */
export async function analyzeFlakiness(
	options: AnalyzerOptions,
	dependencies: AnalyzerDependencies,
): Promise<FlakinessReport> {
	await dependencies.ensureDirectory(options.junitDirectory);
	const runs: RunReport[] = [];
	for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
		const junitPath = `${options.junitDirectory}/run-${runNumber}.xml`;
		const command = buildRunCommand(options.command, junitPath);
		const commandResult = await dependencies.executeCommand(command);
		const junitXml = await dependencies.readTextFile(junitPath);
		const hadJUnitReport = junitXml !== null;
		const testCases = junitXml === null ? [] : parseJUnitTestCases(junitXml);
		dependencies.log(
			`[${RUN_LOG_PREFIX} ${runNumber}/${options.runs}] exit=${commandResult.code} testcases=${testCases.length}`,
		);
		runs.push({
			runNumber,
			command,
			exitCode: commandResult.code,
			junitPath,
			hadJUnitReport,
			testCases,
		});
	}
	const aggregatedTestCases = aggregateTestCaseOutcomes(runs);
	const flakyTests = aggregatedTestCases.filter((testCase) => testCase.isFlaky);
	const totals = calculateTotals(runs, aggregatedTestCases);
	return {
		generatedAt: dependencies.now().toISOString(),
		options,
		runs,
		aggregatedTestCases,
		flakyTests,
		totals,
	};
}

/**
 * Creates runtime dependencies backed by the Deno APIs.
 *
 * @returns {AnalyzerDependencies} Runtime dependencies.
 */
export function createDenoDependencies(): AnalyzerDependencies {
	const decoder = new TextDecoder(DEFAULT_OUTPUT_ENCODING);
	return {
		async executeCommand(command: string): Promise<CommandExecutionResult> {
			const output = await new Deno.Command(SHELL_BINARY, {
				args: [SHELL_EXECUTE_FLAG, command],
				stdout: "piped",
				stderr: "piped",
			}).output();
			return {
				code: output.code,
				stdout: decoder.decode(output.stdout),
				stderr: decoder.decode(output.stderr),
			};
		},
		async readTextFile(path: string): Promise<string | null> {
			try {
				return await Deno.readTextFile(path);
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					return null;
				}
				throw error;
			}
		},
		async ensureDirectory(path: string): Promise<void> {
			await Deno.mkdir(path, { recursive: true });
		},
		log(message: string): void {
			console.log(message);
		},
		now(): Date {
			return new Date();
		},
	};
}

/**
 * Prints CLI help text.
 *
 * @returns {void}
 */
export function printHelp(): void {
	console.log(HELP_TEXT);
}

/**
 * Executes the CLI entrypoint.
 *
 * @returns {Promise<void>}
 */
export async function runCli(): Promise<void> {
	let parsedInput: ParsedCliInput;
	try {
		parsedInput = parseArgs(Deno.args);
	} catch (error) {
		const message = (error as Error).message;
		console.error(message);
		printHelp();
		Deno.exit(EXIT_CODES.ERROR);
	}
	if (parsedInput.helpRequested) {
		printHelp();
		Deno.exit(EXIT_CODES.SUCCESS);
	}
	const dependencies = createDenoDependencies();
	const report = await analyzeFlakiness(parsedInput.options, dependencies);
	dependencies.log(renderSummary(report));
	if (parsedInput.options.reportPath !== null) {
		await writeReport(parsedInput.options.reportPath, report);
		dependencies.log(`${SUMMARY_REPORT_WRITE_PREFIX} ${parsedInput.options.reportPath}`);
	}
	Deno.exit(calculateExitCode(report));
}

// deno-coverage-ignore-start
if (import.meta.main) {
	await runCli();
}
// deno-coverage-ignore-stop
