import { dirname, fromFileUrl, join, relative } from "@std/path";

/**
 * Supported console logging levels.
 */
export type LogLevel = "log" | "info" | "warn" | "error" | "trace";

/**
 * Severity classification for audit findings.
 */
export type FindingSeverity = "info" | "warn" | "error";

/**
 * Standardized issue identifiers.
 */
export type IssueCode =
	| "NON_KEY_LITERAL"
	| "MISSING_LOCALE_KEY"
	| "EMPTY_LOG"
	| "NOISY_LOG"
	| "TRACE_WITHOUT_WARN_OR_ERROR";

/**
 * A detected logging issue.
 */
export interface AuditFinding {
	file: string;
	line: number;
	logLevel: LogLevel;
	issueCode: IssueCode;
	severity: FindingSeverity;
	message: string;
	messageValue: string | null;
	suggestedFix: string;
	fingerprint: string;
}

/**
 * Aggregated summary metrics.
 */
export interface AuditSummary {
	totalFindings: number;
	bySeverity: Record<FindingSeverity, number>;
	byIssueCode: Record<IssueCode, number>;
}

/**
 * Final report shape written by CLI.
 */
export interface AuditReport {
	findings: AuditFinding[];
}

/**
 * Runtime options for auditing source files.
 */
export interface AuditOptions {
	srcDir: string;
	projectRoot: string;
	localeFile: string;
}

/**
 * Raw discovered console callsite.
 */
export interface LogCallSite {
	file: string;
	line: number;
	logLevel: LogLevel;
	argsText: string;
	args: string[];
}

const CONSOLE_LEVELS: readonly LogLevel[] = [
	"log",
	"info",
	"warn",
	"error",
	"trace",
];
const NOISY_PATTERNS = [
	/^debug$/i,
	/^test$/i,
	/^todo$/i,
	/^here$/i,
	/^log$/i,
	/^tmp$/i,
];

/**
 * Returns true when the provided path points to a JavaScript source file.
 */
function isJavaScriptFile(path: string): boolean {
	return path.endsWith(".js");
}

/**
 * Recursively lists files under a directory with deterministic ordering.
 */
export async function listFilesRecursive(directory: string): Promise<string[]> {
	const discovered: string[] = [];
	for await (const entry of Deno.readDir(directory)) {
		const fullPath = join(directory, entry.name);
		if (entry.isDirectory) {
			discovered.push(...await listFilesRecursive(fullPath));
			continue;
		}
		if (entry.isFile && isJavaScriptFile(fullPath)) {
			discovered.push(fullPath);
		}
	}
	discovered.sort();
	return discovered;
}

/**
 * Loads English locale keys from messages.json.
 */
export async function loadLocaleKeys(localeFile: string): Promise<Set<string>> {
	const rawContent = await Deno.readTextFile(localeFile);
	const parsed = JSON.parse(rawContent) as Record<
		string,
		{ message?: string }
	>;
	return new Set(Object.keys(parsed));
}

/**
 * Finds all logging callsites in file content.
 */
export function findConsoleCallSites(
	file: string,
	content: string,
): LogCallSite[] {
	const sites: LogCallSite[] = [];
	for (const level of CONSOLE_LEVELS) {
		const token = `console.${level}(`;
		let searchFrom = 0;
		while (searchFrom < content.length) {
			const callStart = content.indexOf(token, searchFrom);
			if (callStart === -1) {
				break;
			}
			const argsStart = callStart + token.length;
			const callEnd = findClosingParenIndex(content, argsStart);
			if (callEnd === -1) {
				searchFrom = argsStart;
				continue;
			}
			const argsText = content.slice(argsStart, callEnd).trim();
			const line = computeLineNumber(content, callStart);
			sites.push({
				file,
				line,
				logLevel: level,
				argsText,
				args: splitTopLevelArgs(argsText),
			});
			searchFrom = callEnd + 1;
		}
	}
	sites.sort(compareCallSites);
	return sites;
}

/**
 * Locates the index of the matching closing parenthesis.
 */
export function findClosingParenIndex(
	content: string,
	argsStart: number,
): number {
	let depth = 1;
	let inSingle = false;
	let inDouble = false;
	let inTemplate = false;
	let escaped = false;
	for (let index = argsStart; index < content.length; index += 1) {
		const char = content[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (char === "\\") {
			escaped = true;
			continue;
		}
		if (inSingle) {
			if (char === "'") {
				inSingle = false;
			}
			continue;
		}
		if (inDouble) {
			if (char === '"') {
				inDouble = false;
			}
			continue;
		}
		if (inTemplate) {
			if (char === "`") {
				inTemplate = false;
			}
			continue;
		}
		if (char === "'") {
			inSingle = true;
			continue;
		}
		if (char === '"') {
			inDouble = true;
			continue;
		}
		if (char === "`") {
			inTemplate = true;
			continue;
		}
		if (char === "(") {
			depth += 1;
			continue;
		}
		if (char === ")") {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}
	return -1;
}

/**
 * Computes a 1-based line number for an index inside text content.
 */
export function computeLineNumber(content: string, index: number): number {
	let line = 1;
	for (let cursor = 0; cursor < index; cursor += 1) {
		if (content[cursor] === "\n") {
			line += 1;
		}
	}
	return line;
}

/**
 * Splits function arguments at top-level commas.
 */
export function splitTopLevelArgs(argsText: string): string[] {
	if (!argsText) {
		return [];
	}
	const args: string[] = [];
	let buffer = "";
	let parenDepth = 0;
	let braceDepth = 0;
	let bracketDepth = 0;
	let inSingle = false;
	let inDouble = false;
	let inTemplate = false;
	let escaped = false;
	for (const char of argsText) {
		if (escaped) {
			buffer += char;
			escaped = false;
			continue;
		}
		if (char === "\\") {
			buffer += char;
			escaped = true;
			continue;
		}
		if (inSingle) {
			buffer += char;
			if (char === "'") {
				inSingle = false;
			}
			continue;
		}
		if (inDouble) {
			buffer += char;
			if (char === '"') {
				inDouble = false;
			}
			continue;
		}
		if (inTemplate) {
			buffer += char;
			if (char === "`") {
				inTemplate = false;
			}
			continue;
		}
		if (char === "'") {
			inSingle = true;
			buffer += char;
			continue;
		}
		if (char === '"') {
			inDouble = true;
			buffer += char;
			continue;
		}
		if (char === "`") {
			inTemplate = true;
			buffer += char;
			continue;
		}
		if (char === "(") {
			parenDepth += 1;
			buffer += char;
			continue;
		}
		if (char === ")") {
			parenDepth -= 1;
			buffer += char;
			continue;
		}
		if (char === "{") {
			braceDepth += 1;
			buffer += char;
			continue;
		}
		if (char === "}") {
			braceDepth -= 1;
			buffer += char;
			continue;
		}
		if (char === "[") {
			bracketDepth += 1;
			buffer += char;
			continue;
		}
		if (char === "]") {
			bracketDepth -= 1;
			buffer += char;
			continue;
		}
		if (
			char === "," && parenDepth === 0 && braceDepth === 0 &&
			bracketDepth === 0
		) {
			const trimmed = buffer.trim();
			if (trimmed) {
				args.push(trimmed);
			}
			buffer = "";
			continue;
		}
		buffer += char;
	}
	const trailing = buffer.trim();
	if (trailing) {
		args.push(trailing);
	}
	return args;
}

/**
 * Runs the logging quality audit over the configured source directory.
 */
export async function runAudit(
	options: AuditOptions,
): Promise<{ report: AuditReport }> {
	const localeKeys = await loadLocaleKeys(options.localeFile);
	const files = await listFilesRecursive(options.srcDir);
	const findings: AuditFinding[] = [];
	for (const file of files) {
        if(file.endsWith("lightning-navigation.js") || file.includes("generated")) continue;
		const content = await Deno.readTextFile(file);
		const callSites = findConsoleCallSites(
			relative(options.projectRoot, file),
			content,
		);
		findings.push(...buildFindings(callSites, localeKeys));
	}
	const sortedFindings = sortFindings(findings);
	const report: AuditReport = {
		findings: sortedFindings,
	};
	return { report };
}

/**
 * Builds findings for callsites from a single file or mixed set.
 */
export function buildFindings(
	callSites: LogCallSite[],
	localeKeys: Set<string>,
): AuditFinding[] {
	const findings: AuditFinding[] = [];
	const filesWithWarnOrError = new Set<string>();
	const traceByFile = new Map<string, LogCallSite[]>();
	for (const site of callSites) {
		if (site.logLevel === "warn" || site.logLevel === "error") {
			filesWithWarnOrError.add(site.file);
		}
		if (site.logLevel === "trace") {
			const traces = traceByFile.get(site.file) ?? [];
			traces.push(site);
			traceByFile.set(site.file, traces);
		}
		const primaryArg = site.args.at(0) ?? "";
		const unquotedPrimary = extractLiteralString(primaryArg);
		if (site.args.length === 0 && site.logLevel !== "trace") {
			findings.push(createFinding(site, "EMPTY_LOG", null));
			continue;
		}
		if (unquotedPrimary !== null) {
			if (unquotedPrimary.trim().length === 0) {
				findings.push(
					createFinding(site, "EMPTY_LOG", unquotedPrimary),
				);
			}
			if (isNoisyLiteral(unquotedPrimary)) {
				findings.push(
					createFinding(site, "NOISY_LOG", unquotedPrimary),
				);
			}
			if (!localeKeys.has(unquotedPrimary)) {
				const issueCode = isKeyLike(unquotedPrimary)
					? "MISSING_LOCALE_KEY"
					: "NON_KEY_LITERAL";
				findings.push(createFinding(site, issueCode, unquotedPrimary));
			}
		}
	}
	for (const [file, traces] of traceByFile.entries()) {
		if (filesWithWarnOrError.has(file)) {
			continue;
		}
		for (const traceSite of traces) {
			findings.push(
				createFinding(traceSite, "TRACE_WITHOUT_WARN_OR_ERROR", null),
			);
		}
	}
	return sortFindings(findings);
}

/**
 * Determines if a literal resembles a locale key naming pattern.
 */
export function isKeyLike(value: string): boolean {
	return /^[A-Za-z0-9_.-]+$/.test(value);
}

/**
 * Detects low-signal log literals.
 */
export function isNoisyLiteral(value: string): boolean {
	const normalized = value.trim();
	return NOISY_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Extracts string literal content from single or double quoted values.
 */
export function extractLiteralString(arg: string): string | null {
	const trimmed = arg.trim();
	if (trimmed.length < 2) {
		return null;
	}
	const startsWithSingleQuote = trimmed.startsWith("'") &&
		trimmed.endsWith("'");
	const startsWithDoubleQuote = trimmed.startsWith('"') &&
		trimmed.endsWith('"');
	if (!startsWithSingleQuote && !startsWithDoubleQuote) {
		return null;
	}
	return trimmed.slice(1, -1);
}

/**
 * Heuristic check for contextual payload in critical logs.
 */
export function hasContextPayload(args: string[]): boolean {
	if (args.length < 2) {
		return false;
	}
	for (const arg of args.slice(1)) {
		const trimmed = arg.trim();
		if (trimmed.startsWith("{") || trimmed.startsWith("new Error(")) {
			return true;
		}
		if (/error|err|exception|details|context/i.test(trimmed)) {
			return true;
		}
	}
	return false;
}

/**
 * Sorts findings deterministically.
 */
export function sortFindings(findings: AuditFinding[]): AuditFinding[] {
	return [...findings].sort((left, right) => {
		if (left.file !== right.file) {
			return left.file.localeCompare(right.file);
		}
		if (left.line !== right.line) {
			return left.line - right.line;
		}
		if (left.logLevel !== right.logLevel) {
			return left.logLevel.localeCompare(right.logLevel);
		}
		if (left.issueCode !== right.issueCode) {
			return left.issueCode.localeCompare(right.issueCode);
		}
		return left.fingerprint.localeCompare(right.fingerprint);
	});
}

/**
 * Produces a summary object from findings.
 */
export function summarizeFindings(findings: AuditFinding[]): AuditSummary {
	const bySeverity: Record<FindingSeverity, number> = {
		info: 0,
		warn: 0,
		error: 0,
	};
	const byIssueCode: Record<IssueCode, number> = {
		NON_KEY_LITERAL: 0,
		MISSING_LOCALE_KEY: 0,
		EMPTY_LOG: 0,
		NOISY_LOG: 0,
		TRACE_WITHOUT_WARN_OR_ERROR: 0,
	};
	for (const finding of findings) {
		bySeverity[finding.severity] += 1;
		byIssueCode[finding.issueCode] += 1;
	}
	return {
		totalFindings: findings.length,
		bySeverity,
		byIssueCode,
	};
}

/**
 * Resolves the default project root path from this module location.
 */
export function defaultProjectRoot(): string {
	return join(dirname(fromFileUrl(import.meta.url)), "..");
}

/**
 * Decides whether the CLI should fail based on findings
 */
export function shouldFail(
	findings: AuditFinding[],
	minimumSeverity: FindingSeverity,
): boolean {
	const minimumRank = severityRank(minimumSeverity);
	return findings.some((finding) =>
		severityRank(finding.severity) >= minimumRank
	);
}

/**
 * Returns an integer rank for severity comparison.
 */
export function severityRank(severity: FindingSeverity): number {
	if (severity === "error") {
		return 3;
	}
	if (severity === "warn") {
		return 2;
	}
	return 1;
}

/**
 * Generates a single finding object from a callsite and issue code.
 */
function createFinding(
	site: LogCallSite,
	issueCode: IssueCode,
	messageValue: string | null,
): AuditFinding {
	const severity = issueSeverity(issueCode);
	const message = issueMessage(issueCode);
	const suggestedFix = issueSuggestedFix(issueCode);
	const fingerprint = [
		site.file,
		String(site.line),
		site.logLevel,
		issueCode,
		messageValue ?? "",
	].join("|");
	return {
		file: site.file,
		line: site.line,
		logLevel: site.logLevel,
		issueCode,
		severity,
		message,
		messageValue,
		suggestedFix,
		fingerprint,
	};
}

/**
 * Maps issue code to severity.
 */
function issueSeverity(issueCode: IssueCode): FindingSeverity {
	switch (issueCode) {
		case "MISSING_LOCALE_KEY":
			return "error";
		case "NON_KEY_LITERAL":
		case "EMPTY_LOG":
		case "TRACE_WITHOUT_WARN_OR_ERROR":
			return "warn";
		case "NOISY_LOG":
			return "info";
	}
}

/**
 * Maps issue code to user-facing message.
 */
function issueMessage(issueCode: IssueCode): string {
	switch (issueCode) {
		case "NON_KEY_LITERAL":
			return "Log uses a non-locale string literal instead of a message key.";
		case "MISSING_LOCALE_KEY":
			return "Log references a key-like string that is not defined in src/_locales/en/messages.json.";
		case "EMPTY_LOG":
			return "Log call has no meaningful message content.";
		case "NOISY_LOG":
			return "Log call contains a noisy low-signal literal.";
		case "TRACE_WITHOUT_WARN_OR_ERROR":
			return "trace log appears in a file without any warn/error logs.";
	}
}

/**
 * Maps issue code to suggested fix guidance.
 */
function issueSuggestedFix(issueCode: IssueCode): string {
	switch (issueCode) {
		case "NON_KEY_LITERAL":
			return "Replace the literal with an existing locale key and pass details as structured args.";
		case "MISSING_LOCALE_KEY":
			return "Use a locale key as the first argument for warn/error logging.";
		case "EMPTY_LOG":
			return "Provide a meaningful locale key and relevant context.";
		case "NOISY_LOG":
			return "Replace low-signal text with an actionable locale key.";
		case "TRACE_WITHOUT_WARN_OR_ERROR":
			return "Add corresponding warn/error logging for error paths or remove unnecessary trace.";
	}
}

/**
 * Compares callsites for deterministic ordering.
 */
function compareCallSites(left: LogCallSite, right: LogCallSite): number {
	if (left.line !== right.line) {
		return left.line - right.line;
	}
	if (left.logLevel !== right.logLevel) {
		return left.logLevel.localeCompare(right.logLevel);
	}
	return left.argsText.localeCompare(right.argsText);
}
