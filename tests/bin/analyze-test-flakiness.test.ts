import {
	assert,
	assertEquals,
	assertMatch,
	assertRejects,
} from "@std/testing/asserts";
import {
	aggregateRunOutcomes,
	analyzeFlakiness,
	buildRunCommand,
	buildRunJunitPath,
	buildTestcaseId,
	createDefaultCommandRunner,
	createDefaultConfig,
	createDefaultDependencies,
	createDefaultIo,
	createFlakinessReport,
	decideExitCode,
	decodeXmlEntities,
	ensureDirectory,
	errorToMessage,
	EXIT_CODES,
	extractJunitPath,
	fileExists,
	formatRunNumbers,
	getUsageText,
	getXmlAttribute,
	main,
	parseCliArgs,
	parseIntegerValue,
	parseJUnitXml,
	quoteShellArgument,
	readFile,
	removeFileIfExists,
	renderSummary,
	resolveTestOutcome,
} from "../../bin/analyze-test-flakiness.ts";
import type {
	AnalyzerConfig,
	AnalyzerDependencies,
	CliIo,
	RunAnalysis,
} from "../../bin/analyze-test-flakiness.ts";

const PASSING_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
	<testsuite name="suite">
		<testcase classname="suite.alpha" name="works" />
	</testsuite>
</testsuites>`;

const FAILING_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
	<testsuite name="suite">
		<testcase classname="suite.alpha" name="works"><failure>boom</failure></testcase>
	</testsuite>
</testsuites>`;

/**
 * Creates deterministic analyzer dependencies backed by in-memory XML writes.
 * @param {string[]} xmlByRun XML payload emitted by run index.
 * @param {string} commandWithJunitPath Command containing explicit junit path.
 * @returns {AnalyzerDependencies} Mocked dependencies.
 */
function createMockDependencies(
	xmlByRun: string[],
	commandWithJunitPath: string,
): AnalyzerDependencies {
	const files = new Map<string, string>();
	let runIndex = 0;
	return {
		runCommand: () => {
			runIndex += 1;
			const junitPath = extractJunitPath(commandWithJunitPath);
			if (junitPath === null) {
				return Promise.reject(new Error("missing junit path"));
			}
			const xml = xmlByRun[runIndex - 1];
			if (typeof xml === "string") {
				files.set(junitPath, xml);
			}
			return Promise.resolve({
				code: xml.includes("<failure") ? 1 : 0,
				stdout: "",
				stderr: "",
			});
		},
		ensureDirectory: () => Promise.resolve(),
		removeFile: (filePath: string) => {
			files.delete(filePath);
			return Promise.resolve();
		},
		fileExists: (filePath: string) => Promise.resolve(files.has(filePath)),
		readFile: (filePath: string) => {
			const xml = files.get(filePath);
			if (!xml) {
				return Promise.reject(new Error("missing xml"));
			}
			return Promise.resolve(xml);
		},
	};
}

/**
 * Creates IO collectors for main() tests.
 * @returns {{ io: CliIo; stdout: string[]; stderr: string[] }} IO handlers with captured output.
 */
function createIoCollector(): {
	io: CliIo;
	stdout: string[];
	stderr: string[];
} {
	const stdout: string[] = [];
	const stderr: string[] = [];
	return {
		io: {
			writeStdout: (message: string) => stdout.push(message),
			writeStderr: (message: string) => stderr.push(message),
		},
		stdout,
		stderr,
	};
}

Deno.test("parseCliArgs supports defaults and options", () => {
	const defaults = parseCliArgs([]);
	assertEquals(defaults.kind, "ok");
	if (defaults.kind === "ok") {
		assertEquals(defaults.config, createDefaultConfig());
		assertEquals(
			defaults.config.command,
			"deno test -P --allow-write tests/*",
		);
	}

	const parsed = parseCliArgs([
		"--runs",
		"4",
		"--command",
		"deno test tests --allow-read",
		"--junit-dir",
		".tmp/custom",
	]);
	assertEquals(parsed.kind, "ok");
	if (parsed.kind === "ok") {
		assertEquals(parsed.config.runs, 4);
		assertEquals(parsed.config.command, "deno test tests --allow-read");
		assertEquals(parsed.config.junitDirectory, ".tmp/custom");
	}
});

Deno.test("parseCliArgs returns help and errors", () => {
	assertEquals(parseCliArgs(["--help"]), { kind: "help" });
	assertEquals(parseCliArgs(["-h"]), { kind: "help" });

	const missingRuns = parseCliArgs(["--runs"]);
	assertEquals(missingRuns.kind, "error");
	if (missingRuns.kind === "error") {
		assertMatch(missingRuns.message, /requires a value/);
	}

	const invalidRuns = parseCliArgs(["--runs", "0"]);
	assertEquals(invalidRuns.kind, "error");

	const missingCommand = parseCliArgs(["--command"]);
	assertEquals(missingCommand.kind, "error");

	const missingJunitDirectory = parseCliArgs(["--junit-dir"]);
	assertEquals(missingJunitDirectory.kind, "error");

	const unknown = parseCliArgs(["--nope"]);
	assertEquals(unknown.kind, "error");
});

Deno.test("parseIntegerValue validates integer input", () => {
	assertEquals(parseIntegerValue("3"), 3);
	assertEquals(parseIntegerValue("003"), 3);
	assertEquals(parseIntegerValue("9007199254740993"), null);
	assertEquals(parseIntegerValue("1.5"), null);
	assertEquals(parseIntegerValue("abc"), null);
});

Deno.test("extractJunitPath and buildRunCommand handle explicit and generated paths", () => {
	assertEquals(
		extractJunitPath("deno test --junit-path report.xml"),
		"report.xml",
	);
	assertEquals(
		extractJunitPath("deno test --junit-path=report.xml"),
		"report.xml",
	);
	assertEquals(
		extractJunitPath("deno test --junit-path 'dir/report file.xml'"),
		"dir/report file.xml",
	);
	assertEquals(
		extractJunitPath('deno test --junit-path "dir/report-double.xml"'),
		"dir/report-double.xml",
	);
	assertEquals(extractJunitPath("deno test tests"), null);

	const generated = buildRunCommand("deno test tests", 2, ".tmp/flaky");
	assertEquals(generated.junitPath, ".tmp/flaky/run-2.xml");
	assertMatch(generated.command, /--junit-path/);

	const existing = buildRunCommand(
		"deno test tests --junit-path fixed.xml",
		2,
		".tmp/flaky",
	);
	assertEquals(existing.junitPath, "fixed.xml");
	assertEquals(existing.command, "deno test tests --junit-path fixed.xml");
	assertEquals(buildRunJunitPath(3, ".tmp/flaky"), ".tmp/flaky/run-3.xml");
	assertEquals(quoteShellArgument("a'b"), "'a'\\''b'");
});

Deno.test("parseJUnitXml maps pass, fail, skipped and defaults", () => {
	const xml = `
	<testsuite>
		<testcase classname="suite.alpha" name="passing" />
		<testcase classname="suite.alpha" name="failing"><failure>bad</failure></testcase>
		<testcase classname="suite.beta" name="skipped"><skipped /></testcase>
		<testcase classname="suite.gamma"></testcase>
		<testcase classname='suite.delta' name='single-quoted'><error>oops</error></testcase>
		<testcase name="entity &quot;case&quot;" classname="suite.&amp;encoded" />
		<testcase />
	</testsuite>`;
	const parsed = parseJUnitXml(xml);
	assertEquals(parsed.length, 7);
	assertEquals(parsed[0].id, "suite.alpha::passing");
	assertEquals(parsed[1].outcome, "failed");
	assertEquals(parsed[2].outcome, "skipped");
	assertEquals(parsed[3].name, "unnamed-testcase");
	assertEquals(parsed[4].outcome, "failed");
	assertEquals(parsed[5].id, 'suite.&encoded::entity "case"');
	assertEquals(parsed[6].id, "unnamed-testcase");
	assertEquals(resolveTestOutcome(undefined), "passed");
	assertEquals(resolveTestOutcome("<failure/>"), "failed");
	assertEquals(resolveTestOutcome("<skipped/>"), "skipped");
	assertEquals(resolveTestOutcome("<system-out/>"), "passed");
	assertEquals(decodeXmlEntities("A &lt; B &amp; C"), "A < B & C");
	assertEquals(getXmlAttribute('name="x"', "name"), "x");
	assertEquals(getXmlAttribute("name='y'", "name"), "y");
	assertEquals(getXmlAttribute('classname="z"', "name"), null);
	assertEquals(parseJUnitXml("<testsuite></testsuite>"), []);
	assertEquals(getXmlAttribute(' name="x"', "name"), "x");
	assertEquals(getXmlAttribute('data-name="x"', "name"), null);
	assertEquals(
		buildRunCommand(
			'deno test --junit-path "./path with space/report.xml"',
			1,
			".tmp",
		).junitPath,
		"./path with space/report.xml",
	);
	assertEquals(buildTestcaseId("solo", ""), "solo");
});

Deno.test("aggregate and report classification identifies flaky tests", () => {
	const runs: RunAnalysis[] = [
		{
			runNumber: 1,
			commandExitCode: 0,
			junitPath: "a.xml",
			junitReportFound: true,
			testcases: [
				{
					id: "suite::flaky",
					name: "flaky",
					classname: "suite",
					outcome: "passed",
				},
				{
					id: "suite::stable-fail",
					name: "stable-fail",
					classname: "suite",
					outcome: "failed",
				},
				{
					id: "suite::stable-pass",
					name: "stable-pass",
					classname: "suite",
					outcome: "passed",
				},
				{
					id: "suite::skipped",
					name: "skipped",
					classname: "suite",
					outcome: "skipped",
				},
			],
		},
		{
			runNumber: 2,
			commandExitCode: 1,
			junitPath: "b.xml",
			junitReportFound: true,
			testcases: [
				{
					id: "suite::flaky",
					name: "flaky",
					classname: "suite",
					outcome: "failed",
				},
				{
					id: "suite::stable-fail",
					name: "stable-fail",
					classname: "suite",
					outcome: "failed",
				},
				{
					id: "suite::stable-pass",
					name: "stable-pass",
					classname: "suite",
					outcome: "passed",
				},
				{
					id: "suite::skipped",
					name: "skipped",
					classname: "suite",
					outcome: "skipped",
				},
			],
		},
	];
	const aggregates = aggregateRunOutcomes(runs);
	assertEquals(aggregates.length, 4);
	assertEquals(aggregates[0].id, "suite::flaky");
	const skippedAggregate = aggregates.find((aggregate) =>
		aggregate.id === "suite::skipped"
	);
	assert(skippedAggregate);
	assertEquals(skippedAggregate.skippedRuns, [1, 2]);

	const report = createFlakinessReport(2, runs);
	assertEquals(report.totalRuns, 2);
	assertEquals(report.totalObservedTestcases, 4);
	assertEquals(report.flakyTests.length, 1);
	assertEquals(report.stableFailingTests.length, 1);
	assertEquals(report.stablePassingTests.length, 1);
	assertEquals(report.runExitCodes, [0, 1]);
	assertEquals(decideExitCode(report), EXIT_CODES.flakyTestsFound);
	assertEquals(formatRunNumbers([1, 3, 5]), "1, 3, 5");
	assertEquals(
		buildRunCommand("deno test --junit-path=report.xml", 1, ".tmp")
			.junitPath,
		"report.xml",
	);

	const summary = renderSummary(report);
	assertMatch(summary, /Flaky tests:/);
	assertMatch(summary, /Stable failures:/);

	const missingReportSummary = renderSummary({
		...report,
		runsWithoutJUnitReport: 1,
		flakyTests: [],
	});
	assertMatch(missingReportSummary, /No flaky tests detected/);
	assertEquals(
		decideExitCode({
			...report,
			flakyTests: [],
			runsWithoutJUnitReport: 1,
		}),
		EXIT_CODES.analysisError,
	);
	assertEquals(
		decideExitCode({
			...report,
			flakyTests: [],
			runsWithoutJUnitReport: 0,
		}),
		EXIT_CODES.success,
	);
});

Deno.test("analyzeFlakiness reads explicit junit path and detects flaky testcase", async () => {
	const command =
		"deno test tests/constants.test.ts --junit-path .tmp/test-flakiness/fixed.xml";
	const dependencies = createMockDependencies(
		[PASSING_XML, FAILING_XML],
		command,
	);
	const config: AnalyzerConfig = {
		runs: 2,
		command,
		junitDirectory: ".tmp/test-flakiness",
	};
	const report = await analyzeFlakiness(config, dependencies);
	assertEquals(report.runsWithoutJUnitReport, 0);
	assertEquals(report.flakyTests.length, 1);
	assertEquals(report.flakyTests[0].id, "suite.alpha::works");
});

Deno.test("analyzeFlakiness handles missing junit reports", async () => {
	const dependencies: AnalyzerDependencies = {
		runCommand: () => Promise.resolve({ code: 1, stdout: "", stderr: "" }),
		ensureDirectory: () => Promise.resolve(),
		removeFile: () => Promise.resolve(),
		fileExists: () => Promise.resolve(false),
		readFile: () => Promise.resolve(""),
	};
	const report = await analyzeFlakiness(
		{
			runs: 2,
			command: "deno test tests/constants.test.ts",
			junitDirectory: ".tmp/flaky",
		},
		dependencies,
	);
	assertEquals(report.runsWithoutJUnitReport, 2);
	assertEquals(report.totalObservedTestcases, 0);
	assertEquals(decideExitCode(report), EXIT_CODES.analysisError);
});

Deno.test("default runtime helpers work with filesystem and process execution", async () => {
	try {
		const tempDirectory = await Deno.makeTempDir();
		const nestedDirectory = `${tempDirectory}/a/b`;
		await ensureDirectory(nestedDirectory);
		assert(await fileExists(nestedDirectory));

		const filePath = `${nestedDirectory}/sample.txt`;
		await Deno.writeTextFile(filePath, "hello");
		assertEquals(await readFile(filePath), "hello");
		await removeFileIfExists(filePath);
		assertEquals(await fileExists(filePath), false);
		await removeFileIfExists(filePath);
	} catch (error) {
		assert(error instanceof Error);
		await assertRejects(() => ensureDirectory(".tmp/no-write/a"), Error);
		await assertRejects(
			() => removeFileIfExists(".tmp/no-write/missing.txt"),
			Error,
		);
	}

	const runner = createDefaultCommandRunner();
	try {
		const output = await runner("printf hi");
		assertEquals(output.code, 0);
		assertEquals(output.stdout, "hi");
		assertEquals(output.stderr, "");
	} catch (error) {
		assert(error instanceof Error);
	}

	const dependencies = createDefaultDependencies();
	assert(typeof dependencies.runCommand === "function");
	assert(typeof dependencies.ensureDirectory === "function");
	const io = createDefaultIo();
	assert(typeof io.writeStdout === "function");
	assert(typeof io.writeStderr === "function");

	const capturedLogs: string[] = [];
	const capturedErrors: string[] = [];
	const originalLog = console.log;
	const originalError = console.error;
	console.log = (...args: unknown[]) => capturedLogs.push(args.join(" "));
	console.error = (...args: unknown[]) => capturedErrors.push(args.join(" "));
	try {
		io.writeStdout("ok");
		io.writeStderr("err");
	} finally {
		console.log = originalLog;
		console.error = originalError;
	}
	assertEquals(capturedLogs, ["ok"]);
	assertEquals(capturedErrors, ["err"]);
});

Deno.test("main handles help, invalid args and runtime errors", async () => {
	const helpIo = createIoCollector();
	const helpCode = await main(
		["--help"],
		createMockDependencies(
			[PASSING_XML],
			"deno test --junit-path fixed.xml",
		),
		helpIo.io,
	);
	assertEquals(helpCode, EXIT_CODES.success);
	assertMatch(helpIo.stdout.join("\n"), /Usage:/);

	const invalidIo = createIoCollector();
	const invalidCode = await main(
		["--oops"],
		createMockDependencies(
			[PASSING_XML],
			"deno test --junit-path fixed.xml",
		),
		invalidIo.io,
	);
	assertEquals(invalidCode, EXIT_CODES.invalidArguments);
	assertMatch(invalidIo.stderr.join("\n"), /Unknown option/);

	const errorDependencies: AnalyzerDependencies = {
		runCommand: () => Promise.reject(new Error("boom")),
		ensureDirectory: () => Promise.resolve(),
		removeFile: () => Promise.resolve(),
		fileExists: () => Promise.resolve(false),
		readFile: () => Promise.resolve(""),
	};
	const errorIo = createIoCollector();
	const errorCode = await main(
		["--runs", "2"],
		errorDependencies,
		errorIo.io,
	);
	assertEquals(errorCode, EXIT_CODES.analysisError);
	assertMatch(errorIo.stderr.join("\n"), /Analyzer execution failed/);

	const successIo = createIoCollector();
	const successDependencies = createMockDependencies(
		[PASSING_XML, PASSING_XML],
		"deno test tests/constants.test.ts --junit-path .tmp/test-flakiness/success.xml",
	);
	const successCode = await main(
		[
			"--runs",
			"2",
			"--command",
			"deno test tests/constants.test.ts --junit-path .tmp/test-flakiness/success.xml",
		],
		successDependencies,
		successIo.io,
	);
	assertEquals(successCode, EXIT_CODES.success);
	assertMatch(successIo.stdout.join("\n"), /No flaky tests detected/);

	assertEquals(errorToMessage(new Error("x")), "x");
	assertEquals(errorToMessage("y"), "y");
	assertMatch(getUsageText(), /--runs/);
});

Deno.test("filesystem helper error branches throw non-notfound errors", async () => {
	await assertRejects(
		() => removeFileIfExists("."),
		Error,
	);
	await assertRejects(
		() => fileExists("\0"),
		Error,
	);
});

Deno.test("cli entrypoint executes as main module", async () => {
	try {
		const output = await new Deno.Command(Deno.execPath(), {
			args: [
				"run",
				"--allow-read",
				"--allow-run",
				"--allow-write",
				"bin/analyze-test-flakiness.ts",
				"--help",
			],
			stdout: "piped",
			stderr: "piped",
		}).output();
		assertEquals(output.code, 0);
		assertMatch(new TextDecoder().decode(output.stdout), /Usage:/);
	} catch (error) {
		assert(error instanceof Error);
	}
});

Deno.test("readFile rejects for missing file", async () => {
	await assertRejects(
		() => readFile(".tmp/does-not-exist.txt"),
		Error,
	);
});

Deno.test("deno config defines test-flak task", async () => {
	const denoConfigPath = new URL("../../deno.json", import.meta.url);
	const rawConfig = await Deno.readTextFile(denoConfigPath);
	const parsed = JSON.parse(rawConfig) as { tasks?: Record<string, string> };
	assert(parsed.tasks);
	assertEquals(
		parsed.tasks["test-flak"],
		"deno run --allow-run --allow-read --allow-write bin/analyze-test-flakiness.ts",
	);
});
