import { assertEquals } from "@std/testing/asserts";
import { stub } from "@std/testing/mock";
import type { AuditFinding, AuditReport } from "../../bin/audit-logging-lib.ts";
import { suppressTraceFindingsForConsoleAliases } from "../../bin/audit-logging.ts";

/**
 * Creates a finding with defaults suitable for suppression checks.
 */
function createFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
	return {
		file: "src/salesforce/toast.js",
		line: 49,
		logLevel: "trace",
		issueCode: "TRACE_WITHOUT_WARN_OR_ERROR",
		severity: "warn",
		message: "trace log appears in a file without any warn/error logs.",
		messageValue: null,
		suggestedFix:
			"Add corresponding warn/error logging for error paths or remove unnecessary trace.",
		fingerprint:
			"src/salesforce/toast.js|49|trace|TRACE_WITHOUT_WARN_OR_ERROR|",
		...overrides,
	};
}

Deno.test("suppresses trace findings when console warn/error aliases are invoked", async () => {
	const report: AuditReport = {
		findings: [createFinding()],
	};
	const readTextFileStub = stub(
		Deno,
		"readTextFile",
		(path: string | URL): Promise<string> => {
			assertEquals(String(path), "/repo/src/salesforce/toast.js");
			return Promise.resolve([
				"function consoleToastedMessage(message, status) {",
				"\tlet logFn = null;",
				"\tif (status === 'error') {",
				"\t\tlogFn = console.error;",
				"\t}",
				"\tlogFn?.(message);",
				"}",
			].join("\n"));
		},
	);

	try {
		const normalized = await suppressTraceFindingsForConsoleAliases(
			report,
			"/repo",
		);
		assertEquals(normalized.findings.length, 0);
	} finally {
		readTextFileStub.restore();
	}
});

Deno.test("keeps trace findings when warn/error aliases are never invoked", async () => {
	const report: AuditReport = {
		findings: [createFinding()],
	};
	const readTextFileStub = stub(
		Deno,
		"readTextFile",
		(): Promise<string> =>
			Promise.resolve(
				"let logFn = null;\nlogFn = console.error;\nlogFn = console.warn;",
			),
	);

	try {
		const normalized = await suppressTraceFindingsForConsoleAliases(
			report,
			"/repo",
		);
		assertEquals(normalized.findings.length, 1);
		assertEquals(
			normalized.findings[0].issueCode,
			"TRACE_WITHOUT_WARN_OR_ERROR",
		);
	} finally {
		readTextFileStub.restore();
	}
});

Deno.test("keeps non-trace findings while suppressing trace findings", async () => {
	const report: AuditReport = {
		findings: [
			createFinding(),
			createFinding({
				line: 50,
				logLevel: "warn",
				issueCode: "NON_KEY_LITERAL",
				messageValue: "not.locale.key",
				fingerprint:
					"src/salesforce/toast.js|50|warn|NON_KEY_LITERAL|not.locale.key",
			}),
		],
	};
	const readTextFileStub = stub(
		Deno,
		"readTextFile",
		(): Promise<string> =>
			Promise.resolve(
				"let logFn = null;\nlogFn = console.warn;\nlogFn('x');",
			),
	);

	try {
		const normalized = await suppressTraceFindingsForConsoleAliases(
			report,
			"/repo",
		);
		assertEquals(normalized.findings.length, 1);
		assertEquals(normalized.findings[0].issueCode, "NON_KEY_LITERAL");
	} finally {
		readTextFileStub.restore();
	}
});
