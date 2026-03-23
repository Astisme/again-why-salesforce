import {
	assert,
	assertEquals,
	assertRejects,
	assertStringIncludes,
} from "@std/testing/asserts";
import { stub } from "@std/testing/mock";
import {
	buildBaseline,
	buildFindings,
	computeLineNumber,
	defaultProjectRoot,
	diffAgainstBaseline,
	extractLiteralString,
	findClosingParenIndex,
	findConsoleCallSites,
	hasContextPayload,
	isKeyLike,
	isNoisyLiteral,
	listFilesRecursive,
	loadBaseline,
	severityRank,
	shouldFail,
	sortFindings,
	splitTopLevelArgs,
	summarizeFindings,
	type AuditFinding,
	type LogCallSite,
	type AuditReport,
} from "../../bin/audit-logging-lib.ts";
import { main, parseArgs } from "../../bin/audit-logging.ts";

/**
 * Creates a reusable finding object for assertions.
 */
function createFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
	return {
		file: "src/a.js",
		line: 1,
		logLevel: "warn",
		issueCode: "NON_KEY_LITERAL",
		severity: "warn",
		message: "m",
		messageValue: "value",
		suggestedFix: "fix",
		fingerprint: "src/a.js|1|warn|NON_KEY_LITERAL|value",
		...overrides,
	};
}

/**
 * Creates a NotFound error instance for stubbing.
 */
function createNotFoundError(): Error {
	return new Deno.errors.NotFound("not found");
}

Deno.test("splitTopLevelArgs handles nested values and strings", () => {
	const args = splitTopLevelArgs(`"a", fn(1, 2), { b: [1, 2] }, 'c,d', ` + "`x,y`");
	assertEquals(args, ["\"a\"", "fn(1, 2)", "{ b: [1, 2] }", "'c,d'", "`x,y`"]);
	assertEquals(splitTopLevelArgs("'a\\\\\\'b', \"x\\\\\\\"y\""), ["'a\\\\\\'b'", "\"x\\\\\\\"y\""]);
	assertEquals(splitTopLevelArgs(""), []);
});

Deno.test("findClosingParenIndex and computeLineNumber work for escaped strings", () => {
	const source = "line1\nconsole.log(\"x\\\"y\", fn(1, 2))\nline3";
	const start = source.indexOf("console.log(") + "console.log(".length;
	const end = findClosingParenIndex(source, start);
	assert(end > start);
	assertEquals(source[end], ")");
	assertEquals(computeLineNumber(source, source.indexOf("console.log(")), 2);
	assertEquals(findClosingParenIndex("console.log(\"x\"", "console.log(".length), -1);
});

Deno.test("findConsoleCallSites returns sorted callsites with parsed args", () => {
	const content = [
		"console.warn('missing.key')",
		"console.error('log.error', err)",
		"console.log('alpha', { value: 1 })",
	].join("\n");
	const sites = findConsoleCallSites("src/file.js", content);
	assertEquals(sites.length, 3);
	assertEquals(sites[0].logLevel, "warn");
	assertEquals(sites[1].logLevel, "error");
	assertEquals(sites[2].logLevel, "log");
	assertEquals(sites[0].args[0], "'missing.key'");

	const sameLine = findConsoleCallSites(
		"src/file.js",
		"console.warn('a');console.error('b');console.error('a')",
	);
	assertEquals(sameLine.map((site) => site.logLevel), ["error", "error", "warn"]);
	assertEquals(sameLine.map((site) => site.argsText), ["'a'", "'b'", "'a'"]);

	const incomplete = findConsoleCallSites("src/file.js", "console.warn('oops'");
	assertEquals(incomplete.length, 0);
});

Deno.test("literal helpers classify keys and noise", () => {
	assertEquals(extractLiteralString("'a.b'"), "a.b");
	assertEquals(extractLiteralString('"abc"'), "abc");
	assertEquals(extractLiteralString("value"), null);
	assertEquals(isKeyLike("key.value-1"), true);
	assertEquals(isKeyLike("not a key"), false);
	assertEquals(isNoisyLiteral("debug"), true);
	assertEquals(isNoisyLiteral(" useful "), false);
});

Deno.test("hasContextPayload detects object, errors, and context-like identifiers", () => {
	assertEquals(hasContextPayload(["'key'", "{ id: 1 }"]), true);
	assertEquals(hasContextPayload(["'key'", "new Error('x')"]), true);
	assertEquals(hasContextPayload(["'key'", "error"]), true);
	assertEquals(hasContextPayload(["'key'", "details"]), true);
	assertEquals(hasContextPayload(["'key'", "ctx"]), false);
	assertEquals(hasContextPayload(["'key'"]), false);
});

Deno.test("buildFindings emits issue coverage including trace pairing logic", () => {
	const localeKeys = new Set(["log.good", "log.error"]);
	const callSites = [
		{ file: "src/trace-only.js", line: 1, logLevel: "trace", argsText: "", args: [] },
		{ file: "src/noisy.js", line: 1, logLevel: "log", argsText: "'debug'", args: ["'debug'"] },
		{ file: "src/empty-literal.js", line: 1, logLevel: "log", argsText: "''", args: ["''"] },
		{ file: "src/empty.js", line: 1, logLevel: "log", argsText: "", args: [] },
		{ file: "src/non-key.js", line: 1, logLevel: "info", argsText: "'hello world'", args: ["'hello world'"] },
		{ file: "src/missing.js", line: 1, logLevel: "log", argsText: "'missing.key'", args: ["'missing.key'"] },
		{ file: "src/critical-missing-key.js", line: 1, logLevel: "warn", argsText: "userMessage", args: ["userMessage"] },
		{ file: "src/critical-missing-context.js", line: 2, logLevel: "error", argsText: "'log.error'", args: ["'log.error'"] },
		{ file: "src/trace-paired.js", line: 1, logLevel: "trace", argsText: "'log.good'", args: ["'log.good'"] },
		{ file: "src/trace-paired.js", line: 2, logLevel: "warn", argsText: "'log.error', { id: 1 }", args: ["'log.error'", "{ id: 1 }"] },
	] as LogCallSite[];
	const findings = buildFindings([...callSites], localeKeys);
	const codes = new Set(findings.map((finding) => finding.issueCode));
	assert(codes.has("TRACE_WITHOUT_WARN_OR_ERROR"));
	assert(codes.has("NOISY_LOG"));
	assert(codes.has("EMPTY_LOG"));
	assert(codes.has("NON_KEY_LITERAL"));
	assert(codes.has("MISSING_LOCALE_KEY"));
	assert(codes.has("MISSING_KEY_FOR_CRITICAL_LOG"));
	assert(codes.has("MISSING_CONTEXT_FOR_CRITICAL_LOG"));
	assertEquals(findings.some((finding) => finding.file === "src/trace-paired.js" && finding.issueCode === "TRACE_WITHOUT_WARN_OR_ERROR"), false);
});

Deno.test("sortFindings and summarizeFindings produce deterministic counts", () => {
	const unsorted = [
		createFinding({ file: "src/z.js", line: 2, severity: "info", issueCode: "NOISY_LOG", fingerprint: "z2" }),
		createFinding({ file: "src/a.js", line: 1, severity: "error", issueCode: "MISSING_LOCALE_KEY", fingerprint: "a1" }),
		createFinding({ file: "src/a.js", line: 1, severity: "warn", issueCode: "EMPTY_LOG", fingerprint: "a2" }),
		createFinding({ file: "src/a.js", line: 1, severity: "warn", issueCode: "EMPTY_LOG", fingerprint: "a0" }),
		createFinding({ file: "src/a.js", line: 1, logLevel: "error", severity: "warn", issueCode: "EMPTY_LOG", fingerprint: "a3" }),
	];
	const sorted = sortFindings(unsorted);
	assertEquals(sorted.map((finding) => finding.fingerprint), ["a3", "a0", "a2", "a1", "z2"]);
	const summary = summarizeFindings(sorted);
	assertEquals(summary.totalFindings, 5);
	assertEquals(summary.bySeverity.error, 1);
	assertEquals(summary.bySeverity.warn, 3);
	assertEquals(summary.bySeverity.info, 1);
	assertEquals(summary.byIssueCode.MISSING_LOCALE_KEY, 1);
	assertEquals(summary.byIssueCode.EMPTY_LOG, 3);
	assertEquals(summary.byIssueCode.NOISY_LOG, 1);
});

Deno.test("baseline helpers load, diff and validate schema", async () => {
	const baselinePath = "/tmp/baseline-valid.json";
	const invalidPath = "/tmp/baseline-invalid.json";
	const readTextFileStub = stub(Deno, "readTextFile", (path: string | URL): Promise<string> => {
		const normalizedPath = String(path);
		if (normalizedPath === baselinePath) {
			return Promise.resolve(JSON.stringify({ version: 1, fingerprints: ["b", "a"] }));
		}
		if (normalizedPath === invalidPath) {
			return Promise.resolve(JSON.stringify({ version: 2, fingerprints: [] }));
		}
		return Promise.reject(createNotFoundError());
	});

	try {
		const loaded = await loadBaseline(baselinePath);
		assertEquals(loaded.fingerprints, ["a", "b"]);
		await assertRejects(() => loadBaseline(invalidPath), Error, "Invalid baseline schema");
	} finally {
		readTextFileStub.restore();
	}

	const findings = [
		createFinding({ fingerprint: "a" }),
		createFinding({ fingerprint: "c", severity: "error", issueCode: "MISSING_LOCALE_KEY" }),
	];
	const baseline = buildBaseline([createFinding({ fingerprint: "a" }), createFinding({ fingerprint: "a" })]);
	assertEquals(baseline.fingerprints, ["a"]);
	const diff = diffAgainstBaseline(findings, { version: 1, fingerprints: ["a", "b"] });
	assertEquals(diff.newFindings.map((finding) => finding.fingerprint), ["c"]);
	assertEquals(diff.resolvedFingerprints, ["b"]);
	assertEquals(diff.persistedFindings.map((finding) => finding.fingerprint), ["a"]);
});

Deno.test("severity and fail gating follow threshold and baseline behavior", () => {
	assertEquals(severityRank("error"), 3);
	assertEquals(severityRank("warn"), 2);
	assertEquals(severityRank("info"), 1);

	const findings = [
		createFinding({ severity: "info", fingerprint: "i" }),
		createFinding({ severity: "warn", fingerprint: "w" }),
	];
	assertEquals(shouldFail(findings, "warn"), true);
	assertEquals(shouldFail(findings, "error"), false);
	assertEquals(shouldFail(findings, "info"), true);
	assertEquals(
		shouldFail(findings, "warn", {
			newFindings: [createFinding({ severity: "info", fingerprint: "n1" })],
			resolvedFingerprints: [],
			persistedFindings: [],
		}),
		false,
	);
});

Deno.test("defaultProjectRoot and listFilesRecursive return expected values", async () => {
	const root = defaultProjectRoot();
	assert(root.endsWith("again-why-salesforce"));
	const files = await listFilesRecursive(`${root}/src`);
	assert(files.length > 0);
	assert(files.every((file) => file.endsWith(".js")));
});

Deno.test("parseArgs parses known args and rejects invalid ones", () => {
	const projectRoot = "/repo";
	const parsed = parseArgs([
		"--src-dir=src",
		"--locale-file=src/_locales/en/messages.json",
		"--report-file=out.json",
		"--baseline-file=base.json",
		"--fail-severity=error",
		"--update-baseline",
	], projectRoot);
	assertEquals(parsed.srcDir, "/repo/src");
	assertEquals(parsed.localeFile, "/repo/src/_locales/en/messages.json");
	assertEquals(parsed.reportFile, "/repo/out.json");
	assertEquals(parsed.baselineFile, "/repo/base.json");
	assertEquals(parsed.failSeverity, "error");
	assertEquals(parsed.updateBaseline, true);

	assertThrowsParse(() => parseArgs(["--unknown=x"], projectRoot), "Unknown argument");
	assertThrowsParse(() => parseArgs(["--fail-severity=critical"], projectRoot), "Invalid --fail-severity value");
});

Deno.test("main writes report and uses baseline diff for exit code", async () => {
	const root = defaultProjectRoot();
	const reportPath = `${root}/logging-audit-report.tmp.json`;
	const baselinePath = `${root}/logging-audit-baseline.tmp.json`;
	const writes = new Map<string, string>();
	const originalReadTextFile = Deno.readTextFile;

	const readTextFileStub = stub(Deno, "readTextFile", (path: string | URL): Promise<string> => {
		const normalizedPath = String(path);
		if (normalizedPath === baselinePath) {
			return Promise.resolve(JSON.stringify({ version: 1, fingerprints: ["never-match"] }));
		}
		return originalReadTextFile(path);
	});
	const writeTextFileStub = stub(
		Deno,
		"writeTextFile",
		(path: string | URL, data: string | ReadableStream<string>): Promise<void> => {
			assert(typeof data === "string");
			writes.set(String(path), data);
			return Promise.resolve();
		},
	);

	try {
		const exitCode = await main([
			`--src-dir=${root}/src`,
			`--locale-file=${root}/src/_locales/en/messages.json`,
			`--report-file=${reportPath}`,
			`--baseline-file=${baselinePath}`,
			"--fail-severity=error",
		]);
		assertEquals(writes.has(reportPath), true);
		const report = JSON.parse(writes.get(reportPath) ?? "{}") as AuditReport;
		assertStringIncludes(report.rootDir, ".");
		assert(report.summary.totalFindings >= 0);
		assertEquals(report.baseline?.newFindings, report.summary.totalFindings);
		assertEquals(exitCode, report.summary.bySeverity.error > 0 ? 1 : 0);
	} finally {
		readTextFileStub.restore();
		writeTextFileStub.restore();
	}
});

Deno.test("main updates baseline and handles missing baseline file", async () => {
	const root = defaultProjectRoot();
	const reportPath = `${root}/logging-audit-report.tmp2.json`;
	const baselinePath = `${root}/logging-audit-baseline.tmp2.json`;
	const writes = new Map<string, string>();
	const originalReadTextFile = Deno.readTextFile;

	const readTextFileStub = stub(Deno, "readTextFile", (path: string | URL): Promise<string> => {
		const normalizedPath = String(path);
		if (normalizedPath === baselinePath) {
			return Promise.reject(createNotFoundError());
		}
		return originalReadTextFile(path);
	});
	const writeTextFileStub = stub(
		Deno,
		"writeTextFile",
		(path: string | URL, data: string | ReadableStream<string>): Promise<void> => {
			assert(typeof data === "string");
			writes.set(String(path), data);
			return Promise.resolve();
		},
	);

	try {
		const exitCode = await main([
			`--src-dir=${root}/src`,
			`--locale-file=${root}/src/_locales/en/messages.json`,
			`--report-file=${reportPath}`,
			`--baseline-file=${baselinePath}`,
			"--update-baseline",
			"--fail-severity=error",
		]);
		assertEquals(writes.has(reportPath), true);
		assertEquals(writes.has(baselinePath), true);
		const baseline = JSON.parse(writes.get(baselinePath) ?? "{}") as { version: number; fingerprints: string[] };
		assertEquals(baseline.version, 1);
		assert(Array.isArray(baseline.fingerprints));
		assert(exitCode === 0 || exitCode === 1);
	} finally {
		readTextFileStub.restore();
		writeTextFileStub.restore();
	}
});

/**
 * Asserts that parseArgs throws an Error with a message fragment.
 */
function assertThrowsParse(callback: () => unknown, messagePart: string): void {
	try {
		callback();
		throw new Error("Expected parse to throw");
	} catch (error) {
		assert(error instanceof Error);
		assertStringIncludes(error.message, messagePart);
	}
}
