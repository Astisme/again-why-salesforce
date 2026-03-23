const DEFAULT_SRC_DIR = "src";
const DEFAULT_LOCALE_FILE = "src/_locales/en/messages.json";
const DEFAULT_REPORT_FILE = "logging-audit-report.json";
const DEFAULT_BASELINE_FILE = "logging-audit-baseline.json";

const LOG_LEVELS = ["log", "info", "warn", "error", "trace"] as const;
const SEVERITIES = ["none", "info", "warning", "error"] as const;

type LogLevel = (typeof LOG_LEVELS)[number];
type Severity = Exclude<(typeof SEVERITIES)[number], "none">;
type SeverityGate = (typeof SEVERITIES)[number];

interface LocaleMessage {
	message?: string;
}

interface LocaleFile {
	[key: string]: LocaleMessage;
}

interface ParsedCall {
	level: LogLevel;
	line: number;
	args: string[];
}

interface Finding {
	file: string;
	line: number;
	level: LogLevel;
	severity: Severity;
	code: string;
	message: string;
	messageRef: string | null;
	suggestedFix: string;
}

interface AuditSummary {
	filesScanned: number;
	callsitesScanned: number;
	findingsBySeverity: Record<Severity, number>;
	findingsByCode: Record<string, number>;
	totalFindings: number;
	newFindings: number;
}

interface AuditReport {
	version: 1;
	generatedAt: string;
	findings: Finding[];
	summary: AuditSummary;
}

interface BaselineFile {
	version: 1;
	fingerprints: string[];
}

interface AuditOptions {
	srcDir: string;
	localeFile: string;
	reportFile: string;
	baselineFile: string;
	failOnSeverity: SeverityGate;
	failOnNewSeverity: SeverityGate;
	updateBaseline: boolean;
}

interface CliResult {
	report: AuditReport;
	exitCode: number;
	newFindings: Finding[];
}

/**
 * Checks whether a path points to a JavaScript source file.
 *
 * @param {string} path File system path.
 * @returns {boolean} `true` when path ends with `.js`.
 */
function isJavaScriptPath(path: string): boolean {
	return path.endsWith(".js");
}

/**
 * Converts a severity gate string into its rank.
 *
 * @param {SeverityGate} severity Severity threshold.
 * @returns {number} Comparable severity rank.
 */
function getSeverityRank(severity: SeverityGate): number {
	const map: Record<SeverityGate, number> = {
		none: -1,
		info: 0,
		warning: 1,
		error: 2,
	};
	return map[severity];
}

/**
 * Computes whether a finding severity is blocked by a threshold.
 *
 * @param {Severity} findingSeverity Finding severity.
 * @param {SeverityGate} gate Configured gate.
 * @returns {boolean} `true` when finding crosses the gate.
 */
function crossesGate(findingSeverity: Severity, gate: SeverityGate): boolean {
	if (gate === "none") {
		return false;
	}
	return getSeverityRank(findingSeverity) >= getSeverityRank(gate);
}

/**
 * Parses CLI flags into auditor options.
 *
 * @param {string[]} args CLI args from `Deno.args`.
 * @returns {AuditOptions} Parsed options.
 */
export function parseArgs(args: string[]): AuditOptions {
	const options: AuditOptions = {
		srcDir: DEFAULT_SRC_DIR,
		localeFile: DEFAULT_LOCALE_FILE,
		reportFile: DEFAULT_REPORT_FILE,
		baselineFile: DEFAULT_BASELINE_FILE,
		failOnSeverity: "none",
		failOnNewSeverity: "error",
		updateBaseline: false,
	};

	for (const arg of args) {
		if (arg.startsWith("--src-dir=")) {
			options.srcDir = arg.slice("--src-dir=".length);
			continue;
		}
		if (arg.startsWith("--locale-file=")) {
			options.localeFile = arg.slice("--locale-file=".length);
			continue;
		}
		if (arg.startsWith("--report-file=")) {
			options.reportFile = arg.slice("--report-file=".length);
			continue;
		}
		if (arg.startsWith("--baseline-file=")) {
			options.baselineFile = arg.slice("--baseline-file=".length);
			continue;
		}
		if (arg.startsWith("--fail-on-severity=")) {
			const value = arg.slice("--fail-on-severity=".length);
			assertSeverityGate(value, "fail-on-severity");
			options.failOnSeverity = value;
			continue;
		}
		if (arg.startsWith("--fail-on-new-severity=")) {
			const value = arg.slice("--fail-on-new-severity=".length);
			assertSeverityGate(value, "fail-on-new-severity");
			options.failOnNewSeverity = value;
			continue;
		}
		if (arg === "--update-baseline") {
			options.updateBaseline = true;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return options;
}

/**
 * Throws when a string is not a valid severity gate value.
 *
 * @param {string} value User-provided value.
 * @param {string} flag Flag name for error reporting.
 * @returns {void}
 */
function assertSeverityGate(value: string, flag: string): asserts value is SeverityGate {
	if (!SEVERITIES.includes(value as SeverityGate)) {
		throw new Error(
			`Invalid value for --${flag}: ${value}. Allowed values: ${SEVERITIES.join(", ")}`,
		);
	}
}

/**
 * Reads locale keys from the english locale file.
 *
 * @param {string} localeFile Locale JSON path.
 * @returns {Promise<Set<string>>} Locale key set.
 */
export async function readLocaleKeys(localeFile: string): Promise<Set<string>> {
	const raw = await Deno.readTextFile(localeFile);
	const parsed = JSON.parse(raw) as LocaleFile;
	const keys = Object.keys(parsed);
	keys.sort();
	return new Set(keys);
}

/**
 * Recursively lists JavaScript files from a source directory.
 *
 * @param {string} srcDir Source directory root.
 * @returns {Promise<string[]>} Sorted JavaScript file paths.
 */
export async function listJavaScriptFiles(srcDir: string): Promise<string[]> {
	const files: string[] = [];
	await walkDirectory(srcDir, files);
	files.sort();
	return files;
}

/**
 * Walks a directory recursively and appends JavaScript files to the collector.
 *
 * @param {string} dir Directory path.
 * @param {string[]} collector Mutable file collector.
 * @returns {Promise<void>}
 */
async function walkDirectory(dir: string, collector: string[]): Promise<void> {
	for await (const entry of Deno.readDir(dir)) {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory) {
			await walkDirectory(path, collector);
			continue;
		}
		if (entry.isFile && isJavaScriptPath(path)) {
			collector.push(path);
		}
	}
}

/**
 * Produces log call findings for a single JavaScript file.
 *
 * @param {string} filePath File path being audited.
 * @param {string} source File source contents.
 * @param {Set<string>} localeKeys Allowed locale key set.
 * @returns {{ callsites: number; findings: Finding[] }} Per-file audit output.
 */
export function auditFile(
	filePath: string,
	source: string,
	localeKeys: Set<string>,
): { callsites: number; findings: Finding[] } {
	const calls = parseConsoleCalls(source);
	const findings: Finding[] = [];
	const hasWarnOrError = calls.some((call) =>
		call.level === "warn" || call.level === "error"
	);

	for (const call of calls) {
		const messageRef = extractMessageRef(call.args[0]);
		const contextArgs = call.args.slice(1);

		if (call.args.length === 0) {
			findings.push(createFinding(filePath, call, {
				code: "EMPTY_LOG",
				severity: call.level === "warn" || call.level === "error"
					? "warning"
					: "info",
				message: "Log call has no arguments.",
				messageRef: null,
				suggestedFix:
					"Provide a locale message key as first argument and include useful context payload.",
			}));
			continue;
		}

		if (messageRef === null) {
			findings.push(createFinding(filePath, call, {
				code: "MISSING_MESSAGE_KEY",
				severity: call.level === "warn" || call.level === "error"
					? "error"
					: "warning",
				message:
					"First argument is not a string literal locale key, message key cannot be validated.",
				messageRef: null,
				suggestedFix:
					"Use a literal locale key string from src/_locales/en/messages.json as first argument.",
			}));
		} else {
			if (messageRef.length === 0) {
				findings.push(createFinding(filePath, call, {
					code: "EMPTY_MESSAGE_KEY",
					severity: "warning",
					message: "Log message key is an empty string.",
					messageRef,
					suggestedFix:
						"Use a non-empty locale key string from src/_locales/en/messages.json.",
				}));
			}
			if (messageRef.length > 0 && !localeKeys.has(messageRef)) {
				findings.push(createFinding(filePath, call, {
					code: "UNKNOWN_LOCALE_KEY",
					severity: "error",
					message:
						"Log message literal does not match any key in src/_locales/en/messages.json.",
					messageRef,
					suggestedFix:
						"Add the key to english locale messages or replace it with an existing key.",
				}));
			}
		}

		if ((call.level === "warn" || call.level === "error") &&
			!hasContextPayload(contextArgs)) {
			findings.push(createFinding(filePath, call, {
				code: "MISSING_CONTEXT_PAYLOAD",
				severity: "error",
				message:
					"warn/error logs must include context payload (object literal or error/context argument).",
				messageRef,
				suggestedFix:
					"Pass an object or error as an additional argument with actionable context.",
			}));
		}

		if (
			(call.level === "log" || call.level === "info") &&
			messageRef !== null &&
			isNoisyMessageRef(messageRef) &&
			!hasContextPayload(contextArgs)
		) {
			findings.push(createFinding(filePath, call, {
				code: "NOISY_LOG",
				severity: "info",
				message:
					"Potentially noisy log without context; consider reducing noise or adding context.",
				messageRef,
				suggestedFix:
					"Use a specific locale key and attach payload to justify this log in production.",
			}));
		}

		if (call.level === "trace" && !hasWarnOrError) {
			findings.push(createFinding(filePath, call, {
				code: "TRACE_WITHOUT_WARN_OR_ERROR",
				severity: "warning",
				message:
					"Trace log appears without any warn/error log in the same file.",
				messageRef,
				suggestedFix:
					"Pair trace usage with warn/error logs or remove trace-only instrumentation.",
			}));
		}
	}

	return { callsites: calls.length, findings };
}

/**
 * Creates a normalized finding object.
 *
 * @param {string} filePath Finding source file.
 * @param {ParsedCall} call Parsed call metadata.
 * @param {{
 *   code: string;
 *   severity: Severity;
 *   message: string;
 *   messageRef: string | null;
 *   suggestedFix: string;
 * }} details Additional finding details.
 * @returns {Finding} Finding payload.
 */
function createFinding(
	filePath: string,
	call: ParsedCall,
	details: {
		code: string;
		severity: Severity;
		message: string;
		messageRef: string | null;
		suggestedFix: string;
	},
): Finding {
	return {
		file: filePath,
		line: call.line,
		level: call.level,
		severity: details.severity,
		code: details.code,
		message: details.message,
		messageRef: details.messageRef,
		suggestedFix: details.suggestedFix,
	};
}

/**
 * Extracts a string-literal message key from a call argument.
 *
 * @param {string | undefined} arg First call argument.
 * @returns {string | null} Message key when argument is a string literal.
 */
function extractMessageRef(arg: string | undefined): string | null {
	if (typeof arg !== "string") {
		return null;
	}
	const trimmed = arg.trim();
	if (trimmed.length < 2) {
		return null;
	}
	const isSingleQuoted = trimmed.startsWith("'") && trimmed.endsWith("'");
	const isDoubleQuoted = trimmed.startsWith('"') && trimmed.endsWith('"');
	if (!isSingleQuoted && !isDoubleQuoted) {
		return null;
	}
	return trimmed.slice(1, -1);
}

/**
 * Checks whether context arguments provide actionable payload.
 *
 * @param {string[]} args Arguments after the message key.
 * @returns {boolean} `true` when payload appears to include object/error/context information.
 */
function hasContextPayload(args: string[]): boolean {
	for (const arg of args) {
		const trimmed = arg.trim();
		if (trimmed.length === 0) {
			continue;
		}
		if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
			return true;
		}
		if (/[A-Z][A-Za-z0-9_]*Error\b/.test(trimmed)) {
			return true;
		}
		if (/\b(err|error|exception|context|payload|details|meta|data)\b/i.test(trimmed)) {
			return true;
		}
	}
	return false;
}

/**
 * Flags low-value key names that often indicate debug noise.
 *
 * @param {string} messageRef Message key.
 * @returns {boolean} `true` when key looks noisy.
 */
function isNoisyMessageRef(messageRef: string): boolean {
	return /(debug|tmp|temp|todo|test|trace)/i.test(messageRef);
}

/**
 * Parses all console logging calls from source text.
 *
 * @param {string} source JavaScript source code.
 * @returns {ParsedCall[]} Parsed callsites.
 */
export function parseConsoleCalls(source: string): ParsedCall[] {
	const calls: ParsedCall[] = [];
	const regex = /console\.(log|info|warn|error|trace)\s*\(/g;

	for (const match of source.matchAll(regex)) {
		const level = match[1] as LogLevel;
		const matchIndex = match.index as number;
		const openParenIndex = matchIndex + match[0].length - 1;
		const closeParenIndex = findMatchingParen(source, openParenIndex);
		if (closeParenIndex === -1) {
			continue;
		}
		const argsText = source.slice(openParenIndex + 1, closeParenIndex);
		const line = getLineNumber(source, matchIndex);
		calls.push({
			level,
			line,
			args: splitArguments(argsText),
		});
	}

	return calls;
}

/**
 * Finds the matching closing parenthesis index for an opening parenthesis.
 *
 * @param {string} source Source text.
 * @param {number} openParenIndex Index of opening parenthesis.
 * @returns {number} Matching closing parenthesis index, or `-1`.
 */
function findMatchingParen(source: string, openParenIndex: number): number {
	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	let inTemplate = false;
	let inLineComment = false;
	let inBlockComment = false;

	for (let i = openParenIndex; i < source.length; i += 1) {
		const char = source[i];
		const next = source[i + 1];
		const previous = source[i - 1];

		if (inLineComment) {
			if (char === "\n") {
				inLineComment = false;
			}
			continue;
		}
		if (inBlockComment) {
			if (char === "*" && next === "/") {
				inBlockComment = false;
				i += 1;
			}
			continue;
		}
		if (!inSingle && !inDouble && !inTemplate) {
			if (char === "/" && next === "/") {
				inLineComment = true;
				i += 1;
				continue;
			}
			if (char === "/" && next === "*") {
				inBlockComment = true;
				i += 1;
				continue;
			}
		}
		if (!inDouble && !inTemplate && char === "'" && previous !== "\\") {
			inSingle = !inSingle;
			continue;
		}
		if (!inSingle && !inTemplate && char === '"' && previous !== "\\") {
			inDouble = !inDouble;
			continue;
		}
		if (!inSingle && !inDouble && char === "`" && previous !== "\\") {
			inTemplate = !inTemplate;
			continue;
		}
		if (inSingle || inDouble || inTemplate) {
			continue;
		}
		if (char === "(") {
			depth += 1;
			continue;
		}
		if (char === ")") {
			depth -= 1;
			if (depth === 0) {
				return i;
			}
		}
	}

	return -1;
}

/**
 * Splits a call argument list while preserving nested expression boundaries.
 *
 * @param {string} argsText Raw argument text between parentheses.
 * @returns {string[]} Trimmed argument strings.
 */
export function splitArguments(argsText: string): string[] {
	const args: string[] = [];
	if (argsText.trim().length === 0) {
		return args;
	}

	let current = "";
	let parenDepth = 0;
	let braceDepth = 0;
	let bracketDepth = 0;
	let inSingle = false;
	let inDouble = false;
	let inTemplate = false;

	for (let i = 0; i < argsText.length; i += 1) {
		const char = argsText[i];
		const previous = argsText[i - 1];

		if (!inDouble && !inTemplate && char === "'" && previous !== "\\") {
			inSingle = !inSingle;
			current += char;
			continue;
		}
		if (!inSingle && !inTemplate && char === '"' && previous !== "\\") {
			inDouble = !inDouble;
			current += char;
			continue;
		}
		if (!inSingle && !inDouble && char === "`" && previous !== "\\") {
			inTemplate = !inTemplate;
			current += char;
			continue;
		}
		if (inSingle || inDouble || inTemplate) {
			current += char;
			continue;
		}

		if (char === "(") {
			parenDepth += 1;
			current += char;
			continue;
		}
		if (char === ")") {
			parenDepth -= 1;
			current += char;
			continue;
		}
		if (char === "{") {
			braceDepth += 1;
			current += char;
			continue;
		}
		if (char === "}") {
			braceDepth -= 1;
			current += char;
			continue;
		}
		if (char === "[") {
			bracketDepth += 1;
			current += char;
			continue;
		}
		if (char === "]") {
			bracketDepth -= 1;
			current += char;
			continue;
		}

		if (
			char === "," &&
			parenDepth === 0 &&
			braceDepth === 0 &&
			bracketDepth === 0
		) {
			args.push(current.trim());
			current = "";
			continue;
		}

		current += char;
	}

	if (current.trim().length > 0) {
		args.push(current.trim());
	}

	return args;
}

/**
 * Computes 1-based line number for a character index.
 *
 * @param {string} source File source text.
 * @param {number} index Character index.
 * @returns {number} 1-based line number.
 */
function getLineNumber(source: string, index: number): number {
	let line = 1;
	for (let i = 0; i < index; i += 1) {
		if (source[i] === "\n") {
			line += 1;
		}
	}
	return line;
}

/**
 * Creates a deterministic fingerprint for baseline comparison.
 *
 * @param {Finding} finding Finding to fingerprint.
 * @returns {string} Stable fingerprint string.
 */
export function getFindingFingerprint(finding: Finding): string {
	return [
		finding.file,
		String(finding.line),
		finding.level,
		finding.severity,
		finding.code,
		finding.messageRef ?? "",
	].join("|");
}

/**
 * Sorts findings deterministically by path, line, level, code and message reference.
 *
 * @param {Finding[]} findings Findings to sort.
 * @returns {Finding[]} New sorted findings array.
 */
export function sortFindings(findings: Finding[]): Finding[] {
	return [...findings].sort((left, right) => {
		const leftKey = [
			left.file,
			String(left.line).padStart(8, "0"),
			left.level,
			left.code,
			left.messageRef,
		].join("|");
		const rightKey = [
			right.file,
			String(right.line).padStart(8, "0"),
			right.level,
			right.code,
			right.messageRef,
		].join("|");
		return leftKey.localeCompare(rightKey);
	});
}

/**
 * Computes baseline diff by fingerprint.
 *
 * @param {Finding[]} findings Current findings.
 * @param {BaselineFile} baseline Baseline file content.
 * @returns {Finding[]} New findings not present in baseline.
 */
export function getNewFindings(findings: Finding[], baseline: BaselineFile): Finding[] {
	const baselineSet = new Set(baseline.fingerprints);
	return findings.filter((finding) => !baselineSet.has(getFindingFingerprint(finding)));
}

/**
 * Loads a baseline file or returns an empty baseline when it does not exist.
 *
 * @param {string} baselineFile Baseline file path.
 * @returns {Promise<BaselineFile>} Baseline payload.
 */
export async function loadBaseline(baselineFile: string): Promise<BaselineFile> {
	try {
		const raw = await Deno.readTextFile(baselineFile);
		const parsed = JSON.parse(raw) as BaselineFile;
		const unique = [...new Set(parsed.fingerprints)].sort();
		return {
			version: 1,
			fingerprints: unique,
		};
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			return {
				version: 1,
				fingerprints: [],
			};
		}
		throw error;
	}
}

/**
 * Writes findings baseline fingerprints to disk.
 *
 * @param {string} baselineFile Baseline file path.
 * @param {Finding[]} findings Findings used to populate baseline.
 * @returns {Promise<void>}
 */
export async function writeBaseline(
	baselineFile: string,
	findings: Finding[],
): Promise<void> {
	const fingerprints = findings.map(getFindingFingerprint);
	const payload: BaselineFile = {
		version: 1,
		fingerprints: [...new Set(fingerprints)].sort(),
	};
	await Deno.writeTextFile(baselineFile, `${JSON.stringify(payload, null, 2)}\n`);
}

/**
 * Builds an audit summary from findings and scan counters.
 *
 * @param {Finding[]} findings Current findings.
 * @param {number} filesScanned Number of scanned files.
 * @param {number} callsitesScanned Number of scanned callsites.
 * @param {number} newFindings Number of new findings compared to baseline.
 * @returns {AuditSummary} Summary object.
 */
function buildSummary(
	findings: Finding[],
	filesScanned: number,
	callsitesScanned: number,
	newFindings: number,
): AuditSummary {
	const findingsBySeverity: Record<Severity, number> = {
		info: 0,
		warning: 0,
		error: 0,
	};
	const findingsByCode: Record<string, number> = {};

	for (const finding of findings) {
		findingsBySeverity[finding.severity] += 1;
		findingsByCode[finding.code] = (findingsByCode[finding.code] ?? 0) + 1;
	}

	const sortedCodes = Object.keys(findingsByCode).sort();
	const normalizedByCode: Record<string, number> = {};
	for (const code of sortedCodes) {
		normalizedByCode[code] = findingsByCode[code];
	}

	return {
		filesScanned,
		callsitesScanned,
		findingsBySeverity,
		findingsByCode: normalizedByCode,
		totalFindings: findings.length,
		newFindings,
	};
}

/**
 * Writes an audit report JSON payload to disk.
 *
 * @param {string} reportFile Output report path.
 * @param {AuditReport} report Report payload.
 * @returns {Promise<void>}
 */
export async function writeReport(reportFile: string, report: AuditReport): Promise<void> {
	await Deno.writeTextFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
}

/**
 * Runs the full logging audit workflow for CLI usage.
 *
 * @param {AuditOptions} options Parsed CLI options.
 * @returns {Promise<CliResult>} Report, new findings and exit code.
 */
export async function runAuditCli(options: AuditOptions): Promise<CliResult> {
	const localeKeys = await readLocaleKeys(options.localeFile);
	const files = await listJavaScriptFiles(options.srcDir);

	let callsitesScanned = 0;
	let findings: Finding[] = [];

	for (const filePath of files) {
		const source = await Deno.readTextFile(filePath);
		const result = auditFile(filePath, source, localeKeys);
		callsitesScanned += result.callsites;
		findings = findings.concat(result.findings);
	}

	findings = sortFindings(findings);
	if (options.updateBaseline) {
		await writeBaseline(options.baselineFile, findings);
	}
	const baseline = await loadBaseline(options.baselineFile);
	const newFindings = sortFindings(getNewFindings(findings, baseline));

	const report: AuditReport = {
		version: 1,
		generatedAt: new Date().toISOString(),
		findings,
		summary: buildSummary(findings, files.length, callsitesScanned, newFindings.length),
	};

	await writeReport(options.reportFile, report);

	const hasBlockedFindings = findings.some((finding) =>
		crossesGate(finding.severity, options.failOnSeverity)
	);
	const hasBlockedNewFindings = newFindings.some((finding) =>
		crossesGate(finding.severity, options.failOnNewSeverity)
	);

	return {
		report,
		newFindings,
		exitCode: hasBlockedFindings || hasBlockedNewFindings ? 1 : 0,
	};
}
