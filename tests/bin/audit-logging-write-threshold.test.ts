import { assertEquals } from "@std/testing/asserts";
import type { AuditReport } from "../../bin/audit-logging-lib.ts";
import { shouldWriteReport } from "../../bin/audit-logging.ts";

/**
 * Creates a report with a configurable findings count.
 */
function createReport(findingsCount: number): AuditReport {
	return {
		findings: Array.from({ length: findingsCount }, (_, index) => ({
			file: "src/sample.js",
			line: index + 1,
			logLevel: "warn",
			issueCode: "NON_KEY_LITERAL",
			severity: "warn",
			message:
				"Log uses a non-locale string literal instead of a message key.",
			messageValue: "sample",
			suggestedFix:
				"Replace the literal with an existing locale key and pass details as structured args.",
			fingerprint: `fp-${index}`,
		})),
	};
}

Deno.test("shouldWriteReport returns false when there are no findings", () => {
	assertEquals(shouldWriteReport(createReport(0)), false);
});

Deno.test("shouldWriteReport returns false when there is one finding", () => {
	assertEquals(shouldWriteReport(createReport(1)), false);
});

Deno.test("shouldWriteReport returns true when there are more than one findings", () => {
	assertEquals(shouldWriteReport(createReport(2)), true);
});
