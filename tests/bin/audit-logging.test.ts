import {
	assert,
	assertEquals,
	assertRejects,
	assertThrows,
} from "@std/testing/asserts";
import {
	auditFile,
	getFindingFingerprint,
	getNewFindings,
	listJavaScriptFiles,
	loadBaseline,
	parseArgs,
	parseConsoleCalls,
	readLocaleKeys,
	runAuditCli,
	sortFindings,
	splitArguments,
	writeBaseline,
	writeReport,
} from "../../bin/audit-logging-lib.ts";

/**
 * Creates a temporary directory for test fixtures.
 *
 * @returns {Promise<string>} Temporary directory path.
 */
async function createTempDirectory(): Promise<string> {
	return await Deno.makeTempDir({ prefix: "audit-logging-test-" });
}

/**
 * Returns whether current test runtime has write permission.
 *
 * @returns {Promise<boolean>} `true` when write permission is granted.
 */
async function canWriteFileSystem(): Promise<boolean> {
	const permission = await Deno.permissions.query({ name: "write", path: "." });
	return permission.state === "granted";
}

/**
 * Writes a UTF-8 text file and creates parent directories if needed.
 *
 * @param {string} path Target file path.
 * @param {string} content File content.
 * @returns {Promise<void>}
 */
async function writeFile(path: string, content: string): Promise<void> {
	const url = new URL(`file://${path}`);
	const directory = path.slice(0, path.lastIndexOf("/"));
	if (directory.length > 0) {
		await Deno.mkdir(directory, { recursive: true });
	}
	await Deno.writeTextFile(url, content);
}

/**
 * Creates a minimal english locale file with provided keys.
 *
 * @param {string} path Locale file path.
 * @param {string[]} keys Locale keys.
 * @returns {Promise<void>}
 */
async function writeLocale(path: string, keys: string[]): Promise<void> {
	const locale: Record<string, { message: string }> = {};
	for (const key of keys) {
		locale[key] = { message: key };
	}
	await writeFile(path, `${JSON.stringify(locale, null, 2)}\n`);
}

Deno.test("parseArgs returns defaults", () => {
	const options = parseArgs([]);
	assertEquals(options.srcDir, "src");
	assertEquals(options.localeFile, "src/_locales/en/messages.json");
	assertEquals(options.reportFile, "logging-audit-report.json");
	assertEquals(options.baselineFile, "logging-audit-baseline.json");
	assertEquals(options.failOnSeverity, "none");
	assertEquals(options.failOnNewSeverity, "error");
	assertEquals(options.updateBaseline, false);
});

Deno.test("parseArgs accepts overrides and rejects unknown flags", () => {
	const options = parseArgs([
		"--src-dir=fixtures/src",
		"--locale-file=fixtures/locale.json",
		"--report-file=fixtures/report.json",
		"--baseline-file=fixtures/baseline.json",
		"--fail-on-severity=warning",
		"--fail-on-new-severity=info",
		"--update-baseline",
	]);
	assertEquals(options.srcDir, "fixtures/src");
	assertEquals(options.localeFile, "fixtures/locale.json");
	assertEquals(options.reportFile, "fixtures/report.json");
	assertEquals(options.baselineFile, "fixtures/baseline.json");
	assertEquals(options.failOnSeverity, "warning");
	assertEquals(options.failOnNewSeverity, "info");
	assertEquals(options.updateBaseline, true);

	assertThrows(
		() => parseArgs(["--fail-on-severity=critical"]),
		Error,
		"Invalid value",
	);
	assertThrows(
		() => parseArgs(["--unknown"]),
		Error,
		"Unknown argument",
	);
});

Deno.test("splitArguments preserves nested expressions", () => {
	const args = splitArguments(
		"'audit.key', { detail: compute(1, 2) }, [1, 2, 3], new Error('x')",
	);
	assertEquals(args, [
		"'audit.key'",
		"{ detail: compute(1, 2) }",
		"[1, 2, 3]",
		"new Error('x')",
	]);
});

Deno.test("parseConsoleCalls extracts levels, lines and multiline calls", () => {
	const source = [
		"const a = 1;",
		"console.log('first.key', { a });",
		"console.warn(",
		"  'warn.key',",
		"  { reason: 'x' },",
		");",
		"console.trace('trace.key');",
	].join("\n");
	const calls = parseConsoleCalls(source);
	assertEquals(calls.length, 3);
	assertEquals(calls[0].level, "log");
	assertEquals(calls[0].line, 2);
	assertEquals(calls[1].level, "warn");
	assertEquals(calls[1].line, 3);
	assertEquals(calls[2].level, "trace");
	assertEquals(calls[2].args, ["'trace.key'"]);
});

Deno.test("auditFile flags unknown keys, missing keys, payload and trace pairing", () => {
	const source = [
		"console.error('known.error');",
		"console.warn('unknown.warn');",
		"console.info(variableMessage);",
		"console.trace('trace.only');",
	].join("\n");
	const localeKeys = new Set<string>(["known.error"]);
	const result = auditFile("src/example.js", source, localeKeys);

	assertEquals(result.callsites, 4);
	const codes = result.findings.map((finding) => finding.code).sort();
	assert(codes.includes("MISSING_CONTEXT_PAYLOAD"));
	assert(codes.includes("UNKNOWN_LOCALE_KEY"));
	assert(codes.includes("MISSING_MESSAGE_KEY"));
	assert(codes.includes("TRACE_WITHOUT_WARN_OR_ERROR") === false);
});

Deno.test("auditFile flags trace-only files", () => {
	const source = "console.trace('trace.sample');";
	const localeKeys = new Set<string>(["trace.sample"]);
	const result = auditFile("src/trace.js", source, localeKeys);
	assertEquals(result.callsites, 1);
	assertEquals(result.findings.length, 1);
	assertEquals(result.findings[0].code, "TRACE_WITHOUT_WARN_OR_ERROR");
});

Deno.test("baseline helpers diff findings by fingerprint", async () => {
	if (!await canWriteFileSystem()) {
		return;
	}
	const findings = sortFindings([
		{
			file: "src/a.js",
			line: 1,
			level: "warn",
			severity: "error",
			code: "UNKNOWN_LOCALE_KEY",
			message: "m",
			messageRef: "x",
			suggestedFix: "s",
		},
		{
			file: "src/b.js",
			line: 2,
			level: "error",
			severity: "error",
			code: "MISSING_CONTEXT_PAYLOAD",
			message: "m",
			messageRef: "y",
			suggestedFix: "s",
		},
	]);

	const baseline = {
		version: 1 as const,
		fingerprints: [getFindingFingerprint(findings[0])],
	};
	const newFindings = getNewFindings(findings, baseline);
	assertEquals(newFindings.length, 1);
	assertEquals(newFindings[0].file, "src/b.js");

	const tmpDir = await createTempDirectory();
	const baselinePath = `${tmpDir}/baseline.json`;
	await writeBaseline(baselinePath, findings);
	const loaded = await loadBaseline(baselinePath);
	assertEquals(loaded.version, 1);
	assertEquals(loaded.fingerprints.length, 2);

	const missing = await loadBaseline(`${tmpDir}/missing.json`);
	assertEquals(missing.fingerprints.length, 0);
});

Deno.test("runAuditCli writes deterministic report and honors baseline-gated exit", async () => {
	if (!await canWriteFileSystem()) {
		return;
	}
	const tmpDir = await createTempDirectory();
	const srcDir = `${tmpDir}/src`;
	const localePath = `${tmpDir}/locales/en/messages.json`;
	const reportPath = `${tmpDir}/report.json`;
	const baselinePath = `${tmpDir}/baseline.json`;
	const filePath = `${srcDir}/module.js`;

	await writeLocale(localePath, ["known.warn", "known.error"]);
	await writeFile(
		filePath,
		[
			"console.warn('known.warn', { reason: 'x' });",
			"console.error('known.error');",
		].join("\n"),
	);

	const firstRun = await runAuditCli({
		srcDir,
		localeFile: localePath,
		reportFile: reportPath,
		baselineFile: baselinePath,
		failOnSeverity: "none",
		failOnNewSeverity: "none",
		updateBaseline: true,
	});
	assertEquals(firstRun.exitCode, 0);
	assertEquals(firstRun.report.findings.length, 1);
	assertEquals(firstRun.report.summary.totalFindings, 1);

	const reportRaw = await Deno.readTextFile(reportPath);
	const report = JSON.parse(reportRaw) as {
		findings: Array<{ code: string; file: string }>;
		summary: { filesScanned: number; callsitesScanned: number; totalFindings: number };
	};
	assertEquals(report.findings[0].code, "MISSING_CONTEXT_PAYLOAD");
	assertEquals(report.findings[0].file, filePath);
	assertEquals(report.summary.filesScanned, 1);
	assertEquals(report.summary.callsitesScanned, 2);
	assertEquals(report.summary.totalFindings, 1);

	await writeFile(
		filePath,
		[
			"console.warn('known.warn');",
			"console.error('known.error');",
		].join("\n"),
	);

	const secondRun = await runAuditCli({
		srcDir,
		localeFile: localePath,
		reportFile: reportPath,
		baselineFile: baselinePath,
		failOnSeverity: "none",
		failOnNewSeverity: "error",
		updateBaseline: false,
	});

	assertEquals(secondRun.report.findings.length, 2);
	assertEquals(secondRun.newFindings.length, 1);
	assertEquals(secondRun.exitCode, 1);
	assertEquals(secondRun.newFindings[0].code, "MISSING_CONTEXT_PAYLOAD");
});

Deno.test("writeReport serializes provided payload", async () => {
	if (!await canWriteFileSystem()) {
		return;
	}
	const tmpDir = await createTempDirectory();
	const reportPath = `${tmpDir}/custom-report.json`;
	await writeReport(reportPath, {
		version: 1,
		generatedAt: "2026-03-23T00:00:00.000Z",
		findings: [],
		summary: {
			filesScanned: 0,
			callsitesScanned: 0,
			findingsBySeverity: {
				info: 0,
				warning: 0,
				error: 0,
			},
			findingsByCode: {},
			totalFindings: 0,
			newFindings: 0,
		},
	});
	const raw = await Deno.readTextFile(reportPath);
	assert(raw.includes("\"generatedAt\": \"2026-03-23T00:00:00.000Z\""));
});

Deno.test("listJavaScriptFiles walks directories recursively and sorts output", async () => {
	if (!await canWriteFileSystem()) {
		return;
	}
	const tmpDir = await createTempDirectory();
	await writeFile(`${tmpDir}/src/b.js`, "console.log('x');");
	await writeFile(`${tmpDir}/src/a.js`, "console.log('x');");
	await writeFile(`${tmpDir}/src/nested/c.js`, "console.log('x');");
	await writeFile(`${tmpDir}/src/nested/ignore.ts`, "const x = 1;");

	const files = await listJavaScriptFiles(`${tmpDir}/src`);
	assertEquals(files, [
		`${tmpDir}/src/a.js`,
		`${tmpDir}/src/b.js`,
		`${tmpDir}/src/nested/c.js`,
	]);
});

Deno.test("readLocaleKeys loads english keys and ignores value payload", async () => {
	if (!await canWriteFileSystem()) {
		return;
	}
	const tmpDir = await createTempDirectory();
	const localePath = `${tmpDir}/messages.json`;
	await writeFile(
		localePath,
		JSON.stringify({
			"z.key": { message: "z" },
			"a.key": { message: "a" },
		}),
	);
	const keys = await readLocaleKeys(localePath);
	assertEquals(keys.has("a.key"), true);
	assertEquals(keys.has("z.key"), true);
	assertEquals(keys.size, 2);
});

Deno.test("auditFile catches empty log, empty key, noisy key and warning severity branches", () => {
	const source = [
		"console.log();",
		"console.warn();",
		"console.error(runtimeMessage);",
		"console.log(\"\");",
		"console.log( , { injected: true });",
		"console.info('debug.trace');",
		"console.log(messageRefVar);",
		"console.warn('known.warn', , context);",
		"console.error('known.error', RuntimeError);",
		"console.warn('known.warn', meta);",
	].join("\n");
	const localeKeys = new Set<string>(["known.error", "known.warn"]);
	const result = auditFile("src/quality.js", source, localeKeys);
	const codes = result.findings.map((finding) => finding.code).sort();

	assert(codes.includes("EMPTY_LOG"));
	assert(codes.includes("EMPTY_MESSAGE_KEY"));
	assert(codes.includes("NOISY_LOG"));
	assert(codes.includes("MISSING_MESSAGE_KEY"));
	assertEquals(
		result.findings.some((finding) =>
			finding.code === "MISSING_CONTEXT_PAYLOAD" && finding.messageRef === "known.error"
		),
		false,
	);
});

Deno.test("parseConsoleCalls matches comment text and skips broken calls", () => {
	const source = [
		"// console.error('ignored.comment');",
		"/* console.warn('ignored.block'); */",
		"console.log(`templated,key`, { value: \")\" });",
		"console.warn('ok', { x: 1 });",
		"console.log('line.comment', // comment\n{ x: 1 });",
		"console.log('block.comment', /* comment */ { y: 2 });",
		"console.error('broken'",
	].join("\n");
	const calls = parseConsoleCalls(source);
	assertEquals(calls.length, 6);
	assertEquals(calls[2].level, "log");
	assertEquals(calls[3].level, "warn");
});

Deno.test("splitArguments handles empty input and template expressions", () => {
	assertEquals(splitArguments("   "), []);
	const args = splitArguments("`k:${value}` , { x: 1 }, \"quoted\"");
	assertEquals(args, ["`k:${value}`", "{ x: 1 }", "\"quoted\""]);
});

Deno.test("sortFindings uses level, code and messageRef tie-breakers", () => {
	const findings = sortFindings([
		{
			file: "src/a.js",
			line: 1,
			level: "warn",
			severity: "warning",
			code: "ZZZ",
			message: "m",
			messageRef: "b",
			suggestedFix: "s",
		},
		{
			file: "src/a.js",
			line: 1,
			level: "error",
			severity: "error",
			code: "AAA",
			message: "m",
			messageRef: "a",
			suggestedFix: "s",
		},
		{
			file: "src/a.js",
			line: 1,
			level: "error",
			severity: "error",
			code: "AAA",
			message: "m",
			messageRef: "b",
			suggestedFix: "s",
		},
		{
			file: "src/a.js",
			line: 1,
			level: "error",
			severity: "error",
			code: "AAA",
			message: "m",
			messageRef: null,
			suggestedFix: "s",
		},
	]);
	assertEquals(findings[0].messageRef, null);
	assertEquals(findings[1].messageRef, "a");
	assertEquals(findings[2].messageRef, "b");
	assertEquals(findings[3].code, "ZZZ");
	assert(getFindingFingerprint(findings[0]).endsWith("|"));
});

Deno.test("sortFindings applies messageRef tie-break when all other fields match", () => {
	const findings = sortFindings([
		{
			file: "src/tie.js",
			line: 10,
			level: "error",
			severity: "error",
			code: "SAME",
			message: "m",
			messageRef: "z",
			suggestedFix: "s",
		},
		{
			file: "src/tie.js",
			line: 10,
			level: "error",
			severity: "error",
			code: "SAME",
			message: "m",
			messageRef: "a",
			suggestedFix: "s",
		},
	]);
	assertEquals(findings[0].messageRef, "a");
	assertEquals(findings[1].messageRef, "z");
});

Deno.test("loadBaseline throws on invalid JSON payload", async () => {
	if (!await canWriteFileSystem()) {
		return;
	}
	const tmpDir = await createTempDirectory();
	const baselinePath = `${tmpDir}/invalid.json`;
	await writeFile(baselinePath, "{invalid-json");
	await assertRejects(
		async () => {
			await loadBaseline(baselinePath);
		},
		SyntaxError,
	);
});
