#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

/**
 * Flakiness analyzer configuration.
 */
export interface AnalyzerConfig {
	runs: number;
	command: string;
	junitDirectory: string;
}

/**
 * Parsed testcase outcome for one run.
 */
export interface ParsedTestCaseOutcome {
	id: string;
	name: string;
	classname: string;
	outcome: TestOutcome;
}

/**
 * Test outcome values parsed from JUnit XML.
 */
export type TestOutcome = "passed" | "failed" | "skipped";

/**
 * Run command details.
 */
export interface RunCommand {
	command: string;
	junitPath: string;
}

/**
 * Captured command execution result.
 */
export interface CommandExecutionResult {
	code: number;
	stdout: string;
	stderr: string;
}

/**
 * Per-run analysis output.
 */
export interface RunAnalysis {
	runNumber: number;
	commandExitCode: number;
	junitPath: string;
	junitReportFound: boolean;
	testcases: ParsedTestCaseOutcome[];
}

/**
 * Aggregated testcase outcomes across all runs.
 */
export interface AggregatedTestcaseResult {
	id: string;
	name: string;
	classname: string;
	passedRuns: number[];
	failedRuns: number[];
	skippedRuns: number[];
}

/**
 * Final analyzer report.
 */
export interface FlakinessReport {
	totalRuns: number;
	totalObservedTestcases: number;
	runsWithoutJUnitReport: number;
	runExitCodes: number[];
	flakyTests: AggregatedTestcaseResult[];
	stableFailingTests: AggregatedTestcaseResult[];
	stablePassingTests: AggregatedTestcaseResult[];
}

/**
 * Dependencies required by analyzer runtime.
 */
export interface AnalyzerDependencies {
	runCommand: (command: string) => Promise<CommandExecutionResult>;
	ensureDirectory: (directoryPath: string) => Promise<void>;
	removeFile: (filePath: string) => Promise<void>;
	fileExists: (filePath: string) => Promise<boolean>;
	readFile: (filePath: string) => Promise<string>;
}

/**
 * Output handlers for CLI entrypoint.
 */
export interface CliIo {
	writeStdout: (message: string) => void;
	writeStderr: (message: string) => void;
}

/**
 * Successful CLI parse result.
 */
export interface CliParseSuccess {
	kind: "ok";
	config: AnalyzerConfig;
}

/**
 * Help CLI parse result.
 */
export interface CliParseHelp {
	kind: "help";
}

/**
 * Invalid CLI parse result.
 */
export interface CliParseError {
	kind: "error";
	message: string;
}

/**
 * CLI parse outcomes.
 */
export type CliParseResult = CliParseSuccess | CliParseHelp | CliParseError;

const TEXT_DECODER = new TextDecoder();
const DEFAULT_RUN_COUNT = 10;
const MINIMUM_RUN_COUNT = 2;
const DEFAULT_TEST_COMMAND = "deno test tests";
const DEFAULT_JUNIT_DIRECTORY = ".tmp/test-flakiness";
const DEFAULT_JUNIT_FILE_PREFIX = "run";
const DEFAULT_JUNIT_FILE_EXTENSION = "xml";
const DEFAULT_TESTCASE_NAME = "unnamed-testcase";
const OPTION_RUNS = "--runs";
const OPTION_COMMAND = "--command";
const OPTION_JUNIT_DIRECTORY = "--junit-dir";
const OPTION_HELP = "--help";
const OPTION_HELP_SHORT = "-h";
const XML_TESTCASE_PATTERN = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
const XML_FAILURE_PATTERN = /<(?:failure|error)\b/;
const XML_SKIPPED_PATTERN = /<skipped\b/;
const JUNIT_PATH_PATTERN =
	/(?:^|\s)--junit-path(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s]+))/;

/**
 * CLI exit code constants.
 */
export const EXIT_CODES = Object.freeze({
	success: 0,
	invalidArguments: 1,
	flakyTestsFound: 2,
	analysisError: 3,
});

const SUMMARY_LABELS = Object.freeze({
	title: "Test Flakiness Analyzer",
	totalRuns: "Total runs",
	totalObserved: "Observed testcases",
	flaky: "Flaky testcases",
	stableFailing: "Stable failing testcases",
	stablePassing: "Stable passing testcases",
	missingReports: "Runs without JUnit report",
	flakySection: "Flaky tests:",
	stableFailingSection: "Stable failures:",
	noFlaky: "No flaky tests detected.",
});

/**
 * Returns usage help text.
 * @returns {string} Usage text.
 */
export function getUsageText(): string {
	return [
		"Usage: deno run --allow-run --allow-read --allow-write bin/analyze-test-flakiness.ts [options]",
		"",
		"Options:",
		`  ${OPTION_RUNS} <count>       Number of repeated runs (default: ${DEFAULT_RUN_COUNT})`,
		`  ${OPTION_COMMAND} <command>  Test command to execute (default: ${DEFAULT_TEST_COMMAND})`,
		`  ${OPTION_JUNIT_DIRECTORY} <dir>  Directory for generated JUnit reports (default: ${DEFAULT_JUNIT_DIRECTORY})`,
		`  ${OPTION_HELP}, ${OPTION_HELP_SHORT}            Show this help message`,
	].join("\n");
}

/**
 * Builds the default analyzer config.
 * @returns {AnalyzerConfig} Default config values.
 */
export function createDefaultConfig(): AnalyzerConfig {
	return {
		runs: DEFAULT_RUN_COUNT,
		command: DEFAULT_TEST_COMMAND,
		junitDirectory: DEFAULT_JUNIT_DIRECTORY,
	};
}

/**
 * Parses and validates an integer CLI value.
 * @param {string} value Raw CLI value.
 * @returns {number | null} Parsed integer, or null when invalid.
 */
export function parseIntegerValue(value: string): number | null {
	if (!/^\d+$/.test(value)) {
		return null;
	}
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Parses CLI args into analyzer config.
 * @param {string[]} args Raw CLI args.
 * @returns {CliParseResult} Parse result.
 */
export function parseCliArgs(args: string[]): CliParseResult {
	const config = createDefaultConfig();
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === OPTION_HELP || argument === OPTION_HELP_SHORT) {
			return { kind: "help" };
		}
		if (argument === OPTION_RUNS) {
			const value = args[index + 1];
			if (!value) {
				return { kind: "error", message: `${OPTION_RUNS} requires a value.` };
			}
			const parsedRuns = parseIntegerValue(value);
			if (parsedRuns === null || parsedRuns < MINIMUM_RUN_COUNT) {
				return {
					kind: "error",
					message: `${OPTION_RUNS} must be an integer >= ${MINIMUM_RUN_COUNT}.`,
				};
			}
			config.runs = parsedRuns;
			index += 1;
			continue;
		}
		if (argument === OPTION_COMMAND) {
			const value = args[index + 1];
			if (!value) {
				return { kind: "error", message: `${OPTION_COMMAND} requires a value.` };
			}
			config.command = value;
			index += 1;
			continue;
		}
		if (argument === OPTION_JUNIT_DIRECTORY) {
			const value = args[index + 1];
			if (!value) {
				return {
					kind: "error",
					message: `${OPTION_JUNIT_DIRECTORY} requires a value.`,
				};
			}
			config.junitDirectory = value;
			index += 1;
			continue;
		}
		return { kind: "error", message: `Unknown option: ${argument}` };
	}
	return { kind: "ok", config };
}

/**
 * Quotes a value for safe shell interpolation.
 * @param {string} value Raw argument value.
 * @returns {string} Single-quoted shell-safe value.
 */
export function quoteShellArgument(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}

/**
 * Attempts to extract junit report path from a command.
 * @param {string} command Raw command string.
 * @returns {string | null} Explicit junit path, if present.
 */
export function extractJunitPath(command: string): string | null {
	const match = command.match(JUNIT_PATH_PATTERN);
	if (!match) {
		return null;
	}
	return (match[1] ?? match[2] ?? match[3]) as string;
}

/**
 * Builds a junit output path for a specific run.
 * @param {number} runNumber Current run number.
 * @param {string} junitDirectory Report output directory.
 * @returns {string} Expected junit report path.
 */
export function buildRunJunitPath(
	runNumber: number,
	junitDirectory: string,
): string {
	return `${junitDirectory}/${DEFAULT_JUNIT_FILE_PREFIX}-${runNumber}.${DEFAULT_JUNIT_FILE_EXTENSION}`;
}

/**
 * Builds run command details and expected junit path.
 * @param {string} command Base test command.
 * @param {number} runNumber Current run number.
 * @param {string} junitDirectory Output directory for generated reports.
 * @returns {RunCommand} Command string and report path.
 */
export function buildRunCommand(
	command: string,
	runNumber: number,
	junitDirectory: string,
): RunCommand {
	const existingJunitPath = extractJunitPath(command);
	if (existingJunitPath) {
		return {
			command,
			junitPath: existingJunitPath,
		};
	}
	const junitPath = buildRunJunitPath(runNumber, junitDirectory);
	return {
		command: `${command} --junit-path ${quoteShellArgument(junitPath)}`,
		junitPath,
	};
}

/**
 * Escapes regex-sensitive characters in a pattern fragment.
 * @param {string} value Raw string value.
 * @returns {string} Regex-safe value.
 */
export function escapeRegexPattern(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts an XML attribute value from a testcase element.
 * @param {string} attributes Attribute string segment.
 * @param {string} key Attribute name.
 * @returns {string | null} Attribute value if found.
 */
export function getXmlAttribute(attributes: string, key: string): string | null {
	const escapedKey = escapeRegexPattern(key);
	const pattern = new RegExp(
		`(?:^|\\s)${escapedKey}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
	);
	const match = attributes.match(pattern);
	if (!match) {
		return null;
	}
	return (match[1] ?? match[2]) as string;
}

/**
 * Decodes common XML entities.
 * @param {string} value Encoded XML value.
 * @returns {string} Decoded value.
 */
export function decodeXmlEntities(value: string): string {
	return value
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");
}

/**
 * Resolves testcase outcome from testcase XML content.
 * @param {string | undefined} body Testcase inner XML.
 * @returns {TestOutcome} Parsed testcase outcome.
 */
export function resolveTestOutcome(body: string | undefined): TestOutcome {
	if (!body) {
		return "passed";
	}
	if (XML_FAILURE_PATTERN.test(body)) {
		return "failed";
	}
	if (XML_SKIPPED_PATTERN.test(body)) {
		return "skipped";
	}
	return "passed";
}

/**
 * Builds testcase identifier used for aggregation.
 * @param {string} name Testcase name.
 * @param {string} classname Testcase classname.
 * @returns {string} Stable testcase identifier.
 */
export function buildTestcaseId(name: string, classname: string): string {
	if (!classname) {
		return name;
	}
	return `${classname}::${name}`;
}

/**
 * Parses testcase outcomes from JUnit XML.
 * @param {string} xml JUnit XML payload.
 * @returns {ParsedTestCaseOutcome[]} Parsed outcomes.
 */
export function parseJUnitXml(xml: string): ParsedTestCaseOutcome[] {
	const outcomes: ParsedTestCaseOutcome[] = [];
	for (const match of xml.matchAll(XML_TESTCASE_PATTERN)) {
		const attributes = match[1] as string;
		const body = match[2];
		const rawName = getXmlAttribute(attributes, "name") ?? DEFAULT_TESTCASE_NAME;
		const rawClassname = getXmlAttribute(attributes, "classname") ?? "";
		const name = decodeXmlEntities(rawName);
		const classname = decodeXmlEntities(rawClassname);
		outcomes.push({
			id: buildTestcaseId(name, classname),
			name,
			classname,
			outcome: resolveTestOutcome(body),
		});
	}
	return outcomes;
}

/**
 * Creates an empty aggregate container.
 * @param {ParsedTestCaseOutcome} testcase Seed testcase metadata.
 * @returns {AggregatedTestcaseResult} Empty aggregate item.
 */
export function createEmptyAggregate(
	testcase: ParsedTestCaseOutcome,
): AggregatedTestcaseResult {
	return {
		id: testcase.id,
		name: testcase.name,
		classname: testcase.classname,
		passedRuns: [],
		failedRuns: [],
		skippedRuns: [],
	};
}

/**
 * Aggregates testcase outcomes by testcase identifier.
 * @param {RunAnalysis[]} runs Run analysis list.
 * @returns {AggregatedTestcaseResult[]} Aggregated outcomes.
 */
export function aggregateRunOutcomes(runs: RunAnalysis[]): AggregatedTestcaseResult[] {
	const aggregates = new Map<string, AggregatedTestcaseResult>();
	for (const run of runs) {
		for (const testcase of run.testcases) {
			const aggregate = aggregates.get(testcase.id) ??
				createEmptyAggregate(testcase);
			if (testcase.outcome === "passed") {
				aggregate.passedRuns.push(run.runNumber);
			} else if (testcase.outcome === "failed") {
				aggregate.failedRuns.push(run.runNumber);
			} else {
				aggregate.skippedRuns.push(run.runNumber);
			}
			aggregates.set(testcase.id, aggregate);
		}
	}
	return [...aggregates.values()].sort((left, right) =>
		left.id.localeCompare(right.id)
	);
}

/**
 * Creates a report from run analyses.
 * @param {number} totalRuns Total configured run count.
 * @param {RunAnalysis[]} runs Collected runs.
 * @returns {FlakinessReport} Flakiness report.
 */
export function createFlakinessReport(
	totalRuns: number,
	runs: RunAnalysis[],
): FlakinessReport {
	const aggregates = aggregateRunOutcomes(runs);
	const flakyTests = aggregates.filter((testcase) =>
		testcase.passedRuns.length > 0 && testcase.failedRuns.length > 0
	);
	const stableFailingTests = aggregates.filter((testcase) =>
		testcase.passedRuns.length === 0 && testcase.failedRuns.length > 0
	);
	const stablePassingTests = aggregates.filter((testcase) =>
		testcase.passedRuns.length > 0 && testcase.failedRuns.length === 0
	);
	const runsWithoutJUnitReport = runs.filter((run) => !run.junitReportFound).length;
	return {
		totalRuns,
		totalObservedTestcases: aggregates.length,
		runsWithoutJUnitReport,
		runExitCodes: runs.map((run) => run.commandExitCode),
		flakyTests,
		stableFailingTests,
		stablePassingTests,
	};
}

/**
 * Formats run numbers for summary output.
 * @param {number[]} runs Run numbers.
 * @returns {string} Comma-separated run list.
 */
export function formatRunNumbers(runs: number[]): string {
	return runs.join(", ");
}

/**
 * Renders a human-readable report summary.
 * @param {FlakinessReport} report Flakiness report.
 * @returns {string} Summary output.
 */
export function renderSummary(report: FlakinessReport): string {
	const lines: string[] = [
		SUMMARY_LABELS.title,
		`${SUMMARY_LABELS.totalRuns}: ${report.totalRuns}`,
		`${SUMMARY_LABELS.totalObserved}: ${report.totalObservedTestcases}`,
		`${SUMMARY_LABELS.flaky}: ${report.flakyTests.length}`,
		`${SUMMARY_LABELS.stableFailing}: ${report.stableFailingTests.length}`,
		`${SUMMARY_LABELS.stablePassing}: ${report.stablePassingTests.length}`,
		`${SUMMARY_LABELS.missingReports}: ${report.runsWithoutJUnitReport}`,
	];
	if (report.flakyTests.length === 0) {
		lines.push(SUMMARY_LABELS.noFlaky);
	} else {
		lines.push(SUMMARY_LABELS.flakySection);
		for (const testcase of report.flakyTests) {
			lines.push(
				`- ${testcase.id} (pass: ${formatRunNumbers(testcase.passedRuns)}; fail: ${formatRunNumbers(testcase.failedRuns)})`,
			);
		}
	}
	if (report.stableFailingTests.length > 0) {
		lines.push(SUMMARY_LABELS.stableFailingSection);
		for (const testcase of report.stableFailingTests) {
			lines.push(
				`- ${testcase.id} (fail: ${formatRunNumbers(testcase.failedRuns)})`,
			);
		}
	}
	return lines.join("\n");
}

/**
 * Decides process exit code from report.
 * @param {FlakinessReport} report Flakiness report.
 * @returns {number} Process exit code.
 */
export function decideExitCode(report: FlakinessReport): number {
	if (report.runsWithoutJUnitReport > 0) {
		return EXIT_CODES.analysisError;
	}
	if (report.flakyTests.length > 0) {
		return EXIT_CODES.flakyTestsFound;
	}
	return EXIT_CODES.success;
}

/**
 * Creates a default command execution function.
 * @returns {(command: string) => Promise<CommandExecutionResult>} Runner.
 */
export function createDefaultCommandRunner() {
	return async (command: string): Promise<CommandExecutionResult> => {
		const output = await new Deno.Command("bash", {
			args: ["-lc", command],
			stdout: "piped",
			stderr: "piped",
		}).output();
		return {
			code: output.code,
			stdout: TEXT_DECODER.decode(output.stdout),
			stderr: TEXT_DECODER.decode(output.stderr),
		};
	};
}

/**
 * Ensures a directory exists.
 * @param {string} directoryPath Target directory path.
 * @returns {Promise<void>}
 */
export async function ensureDirectory(directoryPath: string): Promise<void> {
	await Deno.mkdir(directoryPath, { recursive: true });
}

/**
 * Removes a file if present.
 * @param {string} filePath Target file path.
 * @returns {Promise<void>}
 */
export async function removeFileIfExists(filePath: string): Promise<void> {
	try {
		await Deno.remove(filePath);
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			return;
		}
		throw error;
	}
}

/**
 * Checks whether a file exists.
 * @param {string} filePath File path.
 * @returns {Promise<boolean>} True when file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await Deno.stat(filePath);
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			return false;
		}
		throw error;
	}
}

/**
 * Reads a UTF-8 file.
 * @param {string} filePath File path.
 * @returns {Promise<string>} File contents.
 */
export async function readFile(filePath: string): Promise<string> {
	return await Deno.readTextFile(filePath);
}

/**
 * Builds default runtime dependencies.
 * @returns {AnalyzerDependencies} Runtime dependencies.
 */
export function createDefaultDependencies(): AnalyzerDependencies {
	return {
		runCommand: createDefaultCommandRunner(),
		ensureDirectory,
		removeFile: removeFileIfExists,
		fileExists,
		readFile,
	};
}

/**
 * Builds default CLI output handlers.
 * @returns {CliIo} Output handlers.
 */
export function createDefaultIo(): CliIo {
	return {
		writeStdout: (message: string) => console.log(message),
		writeStderr: (message: string) => console.error(message),
	};
}

/**
 * Executes repeated test runs and builds flakiness report.
 * @param {AnalyzerConfig} config Analyzer configuration.
 * @param {AnalyzerDependencies} dependencies Runtime dependencies.
 * @returns {Promise<FlakinessReport>} Final report.
 */
export async function analyzeFlakiness(
	config: AnalyzerConfig,
	dependencies: AnalyzerDependencies = createDefaultDependencies(),
): Promise<FlakinessReport> {
	const runs: RunAnalysis[] = [];
	await dependencies.ensureDirectory(config.junitDirectory);
	for (let runNumber = 1; runNumber <= config.runs; runNumber += 1) {
		const runCommand = buildRunCommand(
			config.command,
			runNumber,
			config.junitDirectory,
		);
		await dependencies.removeFile(runCommand.junitPath);
		const commandResult = await dependencies.runCommand(runCommand.command);
		const junitReportFound = await dependencies.fileExists(runCommand.junitPath);
		const testcases = junitReportFound
			? parseJUnitXml(await dependencies.readFile(runCommand.junitPath))
			: [];
		runs.push({
			runNumber,
			commandExitCode: commandResult.code,
			junitPath: runCommand.junitPath,
			junitReportFound,
			testcases,
		});
	}
	return createFlakinessReport(config.runs, runs);
}

/**
 * Converts unknown errors to messages.
 * @param {unknown} error Unknown error.
 * @returns {string} Error message.
 */
export function errorToMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

/**
 * CLI main entrypoint.
 * @param {string[]} args Raw CLI args.
 * @param {AnalyzerDependencies} dependencies Runtime dependencies.
 * @param {CliIo} io Output handlers.
 * @returns {Promise<number>} Exit code.
 */
export async function main(
	args: string[] = Deno.args,
	dependencies: AnalyzerDependencies = createDefaultDependencies(),
	io: CliIo = createDefaultIo(),
): Promise<number> {
	const parsed = parseCliArgs(args);
	if (parsed.kind === "help") {
		io.writeStdout(getUsageText());
		return EXIT_CODES.success;
	}
	if (parsed.kind === "error") {
		io.writeStderr(`${parsed.message}\n${getUsageText()}`);
		return EXIT_CODES.invalidArguments;
	}
	try {
		const report = await analyzeFlakiness(parsed.config, dependencies);
		io.writeStdout(renderSummary(report));
		return decideExitCode(report);
	} catch (error) {
		io.writeStderr(`Analyzer execution failed: ${errorToMessage(error)}`);
		return EXIT_CODES.analysisError;
	}
}

if (import.meta.main) {
	Deno.exit(await main());
}
