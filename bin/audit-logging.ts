import { join } from "@std/path";
import {
	type AuditFinding,
	type AuditReport,
	defaultProjectRoot,
	type FindingSeverity,
	type IssueCode,
	runAudit,
	shouldFail,
} from "./audit-logging-lib.ts";

/**
 * Static audit scope:
 * - scans files under `src` ending with `.js`
 * - inspects `console.log/info/warn/error/trace` callsites
 * - reports quality/completeness issues without changing runtime behavior
 */

/**
 * Parsed command line options for the audit CLI.
 */
interface CliOptions {
	srcDir: string;
	localeFile: string;
	reportFile: string;
	failSeverity: FindingSeverity;
}

const TRACE_WITHOUT_WARN_OR_ERROR_CODE: IssueCode =
	"TRACE_WITHOUT_WARN_OR_ERROR";
const WARN_OR_ERROR_LEVELS = ["warn", "error"] as const;
const CONSOLE_LEVEL_REFERENCE_PATTERN =
	/\b([A-Za-z_$][\w$]*)\s*=\s*console\.(warn|error)\b/g;

/**
 * Executes the logging audit CLI workflow.
 */
export async function main(args: string[]): Promise<number> {
	const projectRoot = defaultProjectRoot();
	const options = parseArgs(args, projectRoot);
	const { report } = await runAudit({
		srcDir: options.srcDir,
		projectRoot,
		localeFile: options.localeFile,
	});
	const normalizedReport = await suppressTraceFindingsForConsoleAliases(
		report,
		projectRoot,
	);
	if (shouldWriteReport(normalizedReport)) {
		await writeJson(options.reportFile, normalizedReport);
	}
	return shouldFail(normalizedReport.findings, options.failSeverity) ? 1 : 0;
}

/**
 * Parses CLI args into normalized options.
 */
export function parseArgs(args: string[], projectRoot: string): CliOptions {
	const defaults = {
		srcDir: join(projectRoot, "src"),
		localeFile: join(projectRoot, "src", "_locales", "en", "messages.json"),
		reportFile: join(projectRoot, "logging-audit-report.json"),
		failSeverity: "warn" as FindingSeverity,
	};
	const parsed = {
		...defaults,
	};
	for (const arg of args) {
		if (arg.startsWith("--src-dir=")) {
			parsed.srcDir = resolvePath(
				projectRoot,
				arg.slice("--src-dir=".length),
			);
			continue;
		}
		if (arg.startsWith("--locale-file=")) {
			parsed.localeFile = resolvePath(
				projectRoot,
				arg.slice("--locale-file=".length),
			);
			continue;
		}
		if (arg.startsWith("--report-file=")) {
			parsed.reportFile = resolvePath(
				projectRoot,
				arg.slice("--report-file=".length),
			);
			continue;
		}
		if (arg.startsWith("--fail-severity=")) {
			const severity = arg.slice("--fail-severity=".length);
			if (
				severity === "info" || severity === "warn" ||
				severity === "error"
			) {
				parsed.failSeverity = severity;
				continue;
			}
			throw new Error(`Invalid --fail-severity value: ${severity}`);
		}
		throw new Error(`Unknown argument: ${arg}`);
	}
	return parsed;
}

/**
 * Resolves relative paths against project root.
 */
function resolvePath(projectRoot: string, pathValue: string): string {
	if (pathValue.startsWith("/")) {
		return pathValue;
	}
	return join(projectRoot, pathValue);
}

/**
 * Writes pretty JSON output with a trailing newline.
 */
async function writeJson(path: string, data: unknown): Promise<void> {
	await Deno.writeTextFile(path, `${JSON.stringify(data, null, "\t")}\n`);
}

/**
 * Returns whether the audit report should be persisted.
 */
export function shouldWriteReport(report: AuditReport): boolean {
	return report.findings.length > 1;
}

/**
 * Removes trace findings when warn/error are emitted through alias calls.
 */
export async function suppressTraceFindingsForConsoleAliases(
	report: AuditReport,
	projectRoot: string,
): Promise<AuditReport> {
	const traceFiles = collectTraceIssueFiles(report.findings);
	if (traceFiles.size === 0) {
		return report;
	}
	const filesWithConsoleAliases = await findFilesWithConsoleAliases(
		traceFiles,
		projectRoot,
	);
	if (filesWithConsoleAliases.size === 0) {
		return report;
	}
	return {
		...report,
		findings: report.findings.filter((finding) =>
			!isSuppressedTraceFinding(finding, filesWithConsoleAliases)
		),
	};
}

/**
 * Collects files that currently contain trace pairing findings.
 */
function collectTraceIssueFiles(findings: AuditFinding[]): Set<string> {
	const traceFiles = new Set<string>();
	for (const finding of findings) {
		if (finding.issueCode === TRACE_WITHOUT_WARN_OR_ERROR_CODE) {
			traceFiles.add(finding.file);
		}
	}
	return traceFiles;
}

/**
 * Finds files where console warn/error methods are called through aliases.
 */
async function findFilesWithConsoleAliases(
	relativePaths: Set<string>,
	projectRoot: string,
): Promise<Set<string>> {
	const filesWithAliases = new Set<string>();
	for (const relativePath of relativePaths) {
		const absolutePath = join(projectRoot, relativePath);
		try {
			const fileContent = await Deno.readTextFile(absolutePath);
			if (containsCalledWarnOrErrorAlias(fileContent)) {
				filesWithAliases.add(relativePath);
			}
		} catch {
			// Ignore missing or unreadable files and keep original findings.
		}
	}
	return filesWithAliases;
}

/**
 * Returns true when a variable assigned to console.warn/error is invoked.
 */
function containsCalledWarnOrErrorAlias(content: string): boolean {
	const aliasNames = collectWarnOrErrorAliases(content);
	if (aliasNames.size === 0) {
		return false;
	}
	for (const aliasName of aliasNames) {
		const callPattern = createAliasCallPattern(aliasName);
		if (callPattern.test(content)) {
			return true;
		}
	}
	return false;
}

/**
 * Collects alias variable names that receive warn/error console methods.
 */
function collectWarnOrErrorAliases(content: string): Set<string> {
	const aliases = new Set<string>();
	for (
		const match of content.matchAll(CONSOLE_LEVEL_REFERENCE_PATTERN)
	) {
		const aliasName = match.at(1);
		const level = match.at(2);
		if (
			aliasName != null &&
			level != null &&
			WARN_OR_ERROR_LEVELS.includes(level as "warn" | "error")
		) {
			aliases.add(aliasName);
		}
	}
	return aliases;
}

/**
 * Builds a regex that matches optional or direct function calls.
 */
function createAliasCallPattern(aliasName: string): RegExp {
	return new RegExp(
		`\\b${escapeForRegularExpression(aliasName)}\\s*(?:\\?\\.)?\\s*\\(`,
	);
}

/**
 * Escapes user-provided text for use inside a regular expression pattern.
 */
function escapeForRegularExpression(value: string): string {
	return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns true when a trace finding should be removed after alias checks.
 */
function isSuppressedTraceFinding(
	finding: AuditFinding,
	filesWithConsoleAliases: Set<string>,
): boolean {
	return finding.issueCode === TRACE_WITHOUT_WARN_OR_ERROR_CODE &&
		filesWithConsoleAliases.has(finding.file);
}

if (import.meta.main) {
	const exitCode = await main(Deno.args);
	Deno.exit(exitCode);
}
