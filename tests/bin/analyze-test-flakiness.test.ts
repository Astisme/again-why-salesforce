import {
	assert,
	assertEquals,
	assertRejects,
	assertStringIncludes,
	assertThrows,
} from "@std/testing/asserts";
import { stub } from "@std/testing/mock";
import {
	aggregateTestCaseOutcomes,
	analyzeFlakiness,
	buildRunCommand,
	calculateExitCode,
	calculateTotals,
	createDenoDependencies,
	createTestCaseId,
	decodeXmlEntities,
	DEFAULT_JUNIT_DIRECTORY,
	DEFAULT_REPORT_PATH,
	DEFAULT_RUN_COUNT,
	DEFAULT_TEST_COMMAND,
	determineTestStatus,
	EXIT_CODES,
	JUNIT_PATH_PLACEHOLDER,
	parseArgs,
	parseJUnitTestCases,
	parseRunsValue,
	parseXmlAttributes,
	quoteShellArgument,
	renderSummary,
	runCli,
	UNNAMED_TEST_CASE_LABEL,
	writeReport,
	type AggregatedTestCaseOutcome,
	type AnalyzerDependencies,
	type AnalyzerOptions,
	type FlakinessReport,
	type RunReport,
} from "../../bin/analyze-test-flakiness.ts";

const XML_PASS_FAIL_SKIP = `<testsuite>
	<testcase classname="suite.alpha" name="passes" />
	<testcase classname="suite.alpha" name="fails"><failure message="boom" /></testcase>
	<testcase classname="suite.alpha" name="skips"><skipped /></testcase>
	<testcase name="entity &amp; &quot;quoted&quot;"><error /></testcase>
	<testcase classname="suite.alpha"></testcase>
</testsuite>`;

const XML_ALL_PASS = `<testsuite>
	<testcase classname="suite.alpha" name="passes" />
</testsuite>`;

const XML_FAIL_ONLY = `<testsuite>
	<testcase classname="suite.alpha" name="passes"><failure message="boom" /></testcase>
</testsuite>`;

/**
 * Creates a run report object for summary and exit-code tests.
 *
 * @param {RunReport[]} runs Per-run reports.
 * @param {AggregatedTestCaseOutcome[]} aggregated Aggregated testcase outcomes.
 * @returns {FlakinessReport} Flakiness report.
 */
function createReport(
	runs: RunReport[],
	aggregated: AggregatedTestCaseOutcome[],
): FlakinessReport {
	const totals = calculateTotals(runs, aggregated);
	const flakyTests = aggregated.filter((entry) => entry.isFlaky);
	return {
		generatedAt: "2026-04-01T00:00:00.000Z",
		options: {
			runs: runs.length,
			command: DEFAULT_TEST_COMMAND,
			reportPath: DEFAULT_REPORT_PATH,
			junitDirectory: DEFAULT_JUNIT_DIRECTORY,
		},
		runs,
		aggregatedTestCases: aggregated,
		flakyTests,
		totals,
	};
}

/**
 * Reads a report file and parses it as JSON.
 *
 * @param {string} reportPath Report file path.
 * @returns {Promise<FlakinessReport>} Parsed report payload.
 */
async function readReport(reportPath: string): Promise<FlakinessReport> {
	return JSON.parse(await Deno.readTextFile(reportPath));
}

/**
 * Overrides `Deno.args` for a test and returns a restore callback.
 *
 * @param {string[]} args Replacement CLI arguments.
 * @returns {() => void} Callback that restores the original descriptor.
 */
function overrideDenoArgs(args: string[]): () => void {
	const descriptor = Object.getOwnPropertyDescriptor(Deno, "args");
	Object.defineProperty(Deno, "args", {
		value: args,
		configurable: true,
	});
	return function restoreArgs(): void {
		if (descriptor !== undefined) {
			Object.defineProperty(Deno, "args", descriptor);
		}
	};
}

Deno.test("parseArgs returns defaults and supports no-report", () => {
	const defaults = parseArgs([]);
	assertEquals(defaults.helpRequested, false);
	assertEquals(defaults.options, {
		runs: DEFAULT_RUN_COUNT,
		command: DEFAULT_TEST_COMMAND,
		reportPath: DEFAULT_REPORT_PATH,
		junitDirectory: DEFAULT_JUNIT_DIRECTORY,
	});

	const noReport = parseArgs(["--no-report"]);
	assertEquals(noReport.options.reportPath, null);
});

Deno.test("parseArgs parses explicit values and help", () => {
	const parsed = parseArgs([
		"--runs",
		"5",
		"--command",
		"deno test --allow-read tests --junit-path {junitPath}",
		"--report",
		"tmp/report.json",
		"--junit-dir",
		"tmp/reports",
	]);
	assertEquals(parsed.helpRequested, false);
	assertEquals(parsed.options.runs, 5);
	assertEquals(parsed.options.command, "deno test --allow-read tests --junit-path {junitPath}");
	assertEquals(parsed.options.reportPath, "tmp/report.json");
	assertEquals(parsed.options.junitDirectory, "tmp/reports");

	const help = parseArgs(["-h"]);
	assertEquals(help.helpRequested, true);
});

Deno.test("parseArgs validates invalid flags and runs", () => {
	assertThrows(() => parseArgs(["--unknown"]), Error, "Unknown argument");
	assertThrows(() => parseArgs(["--runs"]), Error, "Missing value");
	assertThrows(() => parseArgs(["--runs", "-1"]), Error, "Invalid value");
	assertThrows(() => parseArgs(["--command", "  "]), Error, "must not be empty");
	assertThrows(() => parseArgs(["--report", "   "]), Error, "must not be empty");
	assertThrows(() => parseArgs(["--junit-dir", "  "]), Error, "must not be empty");
	assertThrows(() => parseRunsValue("1"), Error, "greater than or equal to 2");
	assertThrows(() => parseRunsValue("abc"), Error, "greater than or equal to 2");
});

Deno.test("buildRunCommand appends, preserves, and replaces junit path", () => {
	const appended = buildRunCommand("deno test --allow-read tests", "tmp/report 1.xml");
	assertStringIncludes(appended, "--junit-path");
	assertStringIncludes(appended, "'tmp/report 1.xml'");

	const withPlaceholder = buildRunCommand(
		`deno test --allow-read tests --junit-path ${JUNIT_PATH_PLACEHOLDER}`,
		"tmp/report.xml",
	);
	assertStringIncludes(withPlaceholder, "--junit-path 'tmp/report.xml'");

	const preserved = buildRunCommand(
		"deno test --allow-read tests --junit-path existing.xml",
		"tmp/ignored.xml",
	);
	assertEquals(
		preserved,
		"deno test --allow-read tests --junit-path existing.xml",
	);
});

Deno.test("quoteShellArgument escapes single quote values", () => {
	assertEquals(quoteShellArgument("plain"), "'plain'");
	assertEquals(quoteShellArgument("a'b"), "'a'\"'\"'b'");
});

Deno.test("decodeXmlEntities and parseXmlAttributes decode xml entities", () => {
	assertEquals(decodeXmlEntities("a&amp;b&lt;c&gt;d&quot;e&apos;f&noop;"), "a&b<c>d\"e'f&noop;");
	assertEquals(
		parseXmlAttributes('name="alpha &amp; beta" classname="suite&quot;one"'),
		{ name: "alpha & beta", classname: 'suite"one' },
	);
});

Deno.test("parseJUnitTestCases extracts pass, fail, skip, error, and unnamed tests", () => {
	const parsed = parseJUnitTestCases(XML_PASS_FAIL_SKIP);
	assertEquals(parsed.length, 5);
	assertEquals(parsed[0], {
		id: "suite.alpha::passes",
		name: "passes",
		className: "suite.alpha",
		status: "pass",
	});
	assertEquals(parsed[1].status, "fail");
	assertEquals(parsed[2].status, "skipped");
	assertEquals(parsed[3], {
		id: 'entity & "quoted"',
		name: 'entity & "quoted"',
		className: "",
		status: "fail",
	});
	assertEquals(parsed[4].name, UNNAMED_TEST_CASE_LABEL);
	assertEquals(parsed[4].status, "pass");
});

Deno.test("parseJUnitTestCases tolerates missing testcase close tag", () => {
	const parsed = parseJUnitTestCases("<testsuite><testcase classname=\"suite\" name=\"broken\">");
	assertEquals(parsed.length, 1);
	assertEquals(parsed[0], {
		id: "suite::broken",
		name: "broken",
		className: "suite",
		status: "pass",
	});
});

Deno.test("determineTestStatus and createTestCaseId handle edge cases", () => {
	assertEquals(determineTestStatus("<system-out>ok</system-out>"), "pass");
	assertEquals(determineTestStatus("<failure />"), "fail");
	assertEquals(determineTestStatus("<error />"), "fail");
	assertEquals(determineTestStatus("<skipped />"), "skipped");
	assertEquals(createTestCaseId("suite", "case"), "suite::case");
	assertEquals(createTestCaseId("", "case"), "case");
});

Deno.test("aggregateTestCaseOutcomes counts skipped tests", () => {
	const aggregated = aggregateTestCaseOutcomes([
		{
			runNumber: 1,
			command: "deno test",
			exitCode: 0,
			junitPath: "run-1.xml",
			hadJUnitReport: true,
			testCases: [
				{
					id: "suite::skip-me",
					name: "skip-me",
					className: "suite",
					status: "skipped",
				},
			],
		},
	]);
	assertEquals(aggregated.length, 1);
	assertEquals(aggregated[0].skippedCount, 1);
	assertEquals(aggregated[0].isFlaky, false);
});

Deno.test("analyzeFlakiness aggregates flaky testcase and missing junit runs", async () => {
	const logs: string[] = [];
	const executedCommands: string[] = [];
	let ensureDirectoryCalls = 0;
	const options: AnalyzerOptions = {
		runs: 3,
		command: "deno test --allow-read tests",
		reportPath: null,
		junitDirectory: "tmp/junit",
	};
	const dependencies: AnalyzerDependencies = {
		executeCommand(command: string) {
			executedCommands.push(command);
			return Promise.resolve({ code: 0, stdout: "", stderr: "" });
		},
		readTextFile(path: string) {
			if (path.endsWith("run-1.xml")) {
				return Promise.resolve(XML_ALL_PASS);
			}
			if (path.endsWith("run-2.xml")) {
				return Promise.resolve(XML_FAIL_ONLY);
			}
			return Promise.resolve(null);
		},
		ensureDirectory() {
			ensureDirectoryCalls += 1;
			return Promise.resolve();
		},
		log(message: string) {
			logs.push(message);
		},
		now() {
			return new Date("2026-04-01T10:00:00.000Z");
		},
	};

	const report = await analyzeFlakiness(options, dependencies);
	assertEquals(ensureDirectoryCalls, 1);
	assertEquals(executedCommands.length, 3);
	assertEquals(logs.length, 3);
	assertEquals(report.generatedAt, "2026-04-01T10:00:00.000Z");
	assertEquals(report.totals, {
		totalRuns: 3,
		runsWithNonZeroExit: 0,
		runsWithoutJUnitReport: 1,
		testCaseCount: 1,
		flakyCount: 1,
	});
	assertEquals(report.flakyTests.length, 1);
	assertEquals(report.flakyTests[0].id, "suite.alpha::passes");
	assertEquals(report.flakyTests[0].passCount, 1);
	assertEquals(report.flakyTests[0].failCount, 1);
});

Deno.test("renderSummary and calculateExitCode reflect report states", () => {
	const flakyReport = createReport(
		[
			{
				runNumber: 1,
				command: "deno test",
				exitCode: 0,
				junitPath: "run-1.xml",
				hadJUnitReport: true,
				testCases: [
					{ id: "suite::case", name: "case", className: "suite", status: "pass" },
				],
			},
			{
				runNumber: 2,
				command: "deno test",
				exitCode: 1,
				junitPath: "run-2.xml",
				hadJUnitReport: true,
				testCases: [
					{ id: "suite::case", name: "case", className: "suite", status: "fail" },
				],
			},
		],
		[
			{
				id: "suite::case",
				name: "case",
				className: "suite",
				passCount: 1,
				failCount: 1,
				skippedCount: 0,
				isFlaky: true,
				statusesByRun: ["pass", "fail"],
			},
		],
	);
	const flakySummary = renderSummary(flakyReport);
	assertStringIncludes(flakySummary, "Flaky tests: 1");
	assertStringIncludes(flakySummary, "- suite::case (pass: 1, fail: 1, skipped: 0)");
	assertStringIncludes(flakySummary, "Runs with non-zero exit: 1");
	assertEquals(calculateExitCode(flakyReport), EXIT_CODES.FLAKY_TESTS_FOUND);

	const errorReport = createReport(
		[
			{
				runNumber: 1,
				command: "deno test",
				exitCode: 0,
				junitPath: "run-1.xml",
				hadJUnitReport: false,
				testCases: [],
			},
		],
		[],
	);
	assertStringIncludes(renderSummary(errorReport), "Runs without JUnit report: 1");
	assertEquals(calculateExitCode(errorReport), EXIT_CODES.ERROR);

	const successReport = createReport(
		[
			{
				runNumber: 1,
				command: "deno test",
				exitCode: 0,
				junitPath: "run-1.xml",
				hadJUnitReport: true,
				testCases: [
					{ id: "suite::stable", name: "stable", className: "suite", status: "pass" },
				],
			},
		],
		[
			{
				id: "suite::stable",
				name: "stable",
				className: "suite",
				passCount: 1,
				failCount: 0,
				skippedCount: 0,
				isFlaky: false,
				statusesByRun: ["pass"],
			},
		],
	);
	assertStringIncludes(renderSummary(successReport), "No flaky tests detected.");
	assertEquals(calculateExitCode(successReport), EXIT_CODES.SUCCESS);
});

Deno.test("writeReport writes JSON payload", async () => {
	const tempDir = await Deno.makeTempDir();
	const reportPath = `${tempDir}/flaky-report.json`;
	const report = createReport([], []);
	try {
		await writeReport(reportPath, report);
		const parsed = await readReport(reportPath);
		assertEquals(parsed.generatedAt, report.generatedAt);
		assertEquals(parsed.totals.flakyCount, 0);
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test("createDenoDependencies ensures directories, reads missing files, and executes commands", async () => {
	const dependencies = createDenoDependencies();
	const tempDir = await Deno.makeTempDir();
	const missingFilePath = `${tempDir}/missing.xml`;
	const nestedDirPath = `${tempDir}/nested/dir`;
	try {
		await dependencies.ensureDirectory(nestedDirPath);
		const stats = await Deno.stat(nestedDirPath);
		assert(stats.isDirectory);

		const missingRead = await dependencies.readTextFile(missingFilePath);
		assertEquals(missingRead, null);

		const commandResult = await dependencies.executeCommand("printf hello");
		assertEquals(commandResult.code, 0);
		assertEquals(commandResult.stdout, "hello");
		assertEquals(commandResult.stderr, "");
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test("createDenoDependencies rethrows non-NotFound read errors", async () => {
	const dependencies = createDenoDependencies();
	const readTextFileStub = stub(
		Deno,
		"readTextFile",
		() => Promise.reject(new Error("boom")),
	);
	try {
		await assertRejects(
			() => dependencies.readTextFile("ignored-path"),
			Error,
			"boom",
		);
	} finally {
		readTextFileStub.restore();
	}
});

Deno.test("runCli exits with success on help", async () => {
	const exits: number[] = [];
	const restoreArgs = overrideDenoArgs(["--help"]);
	const exitStub = stub(Deno, "exit", (code?: number): never => {
		exits.push(code ?? 0);
		throw new Error(`exit:${code ?? 0}`);
	});
	try {
		await assertRejects(() => runCli(), Error, "exit:0");
		assertEquals(exits, [0]);
	} finally {
		exitStub.restore();
		restoreArgs();
	}
});

Deno.test("runCli exits with error on invalid args", async () => {
	const exits: number[] = [];
	const restoreArgs = overrideDenoArgs(["--runs", "abc"]);
	const exitStub = stub(Deno, "exit", (code?: number): never => {
		exits.push(code ?? 0);
		throw new Error(`exit:${code ?? 0}`);
	});
	try {
		await assertRejects(() => runCli(), Error, "exit:1");
		assertEquals(exits, [1]);
	} finally {
		exitStub.restore();
		restoreArgs();
	}
});

Deno.test("runCli runs analyzer and writes report before exiting", async () => {
	const exits: number[] = [];
	const tempDir = await Deno.makeTempDir();
	const reportPath = `${tempDir}/cli-report.json`;
	const junitDir = `${tempDir}/junit`;
	const restoreArgs = overrideDenoArgs([
		"--runs",
		"2",
		"--command",
		"printf done",
		"--junit-dir",
		junitDir,
		"--report",
		reportPath,
	]);
	const exitStub = stub(Deno, "exit", (code?: number): never => {
		exits.push(code ?? 0);
		throw new Error(`exit:${code ?? 0}`);
	});
	try {
		await assertRejects(() => runCli(), Error, "exit:1");
		const report = await readReport(reportPath);
		assertEquals(report.totals.totalRuns, 2);
		assertEquals(report.totals.runsWithoutJUnitReport, 2);
		assertEquals(report.totals.flakyCount, 0);
		assertEquals(exits, [1]);
	} finally {
		exitStub.restore();
		restoreArgs();
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test("entrypoint executes with --help", async () => {
	const output = await new Deno.Command("deno", {
		args: [
			"run",
			"--allow-run",
			"--allow-read",
			"--allow-write",
			"bin/analyze-test-flakiness.ts",
			"--help",
		],
		stdout: "piped",
		stderr: "piped",
	}).output();
	const decoder = new TextDecoder();
	assertEquals(output.code, 0);
	assertStringIncludes(decoder.decode(output.stdout), "Usage:");
	assertEquals(decoder.decode(output.stderr), "");
});
