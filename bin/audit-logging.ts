import { join } from "@std/path";
import {
	buildBaseline,
	defaultProjectRoot,
	diffAgainstBaseline,
	loadBaseline,
	runAudit,
	type AuditReport,
	type BaselineDiff,
	shouldFail,
	type FindingSeverity,
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
	baselineFile: string;
	updateBaseline: boolean;
	failSeverity: FindingSeverity;
}

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

	let baselineDiff: BaselineDiff | undefined;
	try {
		const baseline = await loadBaseline(options.baselineFile);
		baselineDiff = diffAgainstBaseline(report.findings, baseline);
		report.baseline = {
			path: relativePath(projectRoot, options.baselineFile),
			totalBaselineFindings: baseline.fingerprints.length,
			newFindings: baselineDiff.newFindings.length,
			resolvedFindings: baselineDiff.resolvedFingerprints.length,
		};
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) {
			throw error;
		}
	}

	if (options.updateBaseline) {
		const nextBaseline = buildBaseline(report.findings);
		await writeJson(options.baselineFile, nextBaseline);
	}

	await writeJson(options.reportFile, report);

	const exitCode = shouldFail(report.findings, options.failSeverity, baselineDiff) ? 1 : 0;
	const summary = buildSummaryLine(report, baselineDiff, exitCode);
	console.log(summary);
	return exitCode;
}

/**
 * Parses CLI args into normalized options.
 */
export function parseArgs(args: string[], projectRoot: string): CliOptions {
	const defaults = {
		srcDir: join(projectRoot, "src"),
		localeFile: join(projectRoot, "src", "_locales", "en", "messages.json"),
		reportFile: join(projectRoot, "logging-audit-report.json"),
		baselineFile: join(projectRoot, "logging-audit-baseline.json"),
		updateBaseline: false,
		failSeverity: "warn" as FindingSeverity,
	};

	const parsed = {
		...defaults,
	};

	for (const arg of args) {
		if (arg === "--update-baseline") {
			parsed.updateBaseline = true;
			continue;
		}
		if (arg.startsWith("--src-dir=")) {
			parsed.srcDir = resolvePath(projectRoot, arg.slice("--src-dir=".length));
			continue;
		}
		if (arg.startsWith("--locale-file=")) {
			parsed.localeFile = resolvePath(projectRoot, arg.slice("--locale-file=".length));
			continue;
		}
		if (arg.startsWith("--report-file=")) {
			parsed.reportFile = resolvePath(projectRoot, arg.slice("--report-file=".length));
			continue;
		}
		if (arg.startsWith("--baseline-file=")) {
			parsed.baselineFile = resolvePath(projectRoot, arg.slice("--baseline-file=".length));
			continue;
		}
		if (arg.startsWith("--fail-severity=")) {
			const severity = arg.slice("--fail-severity=".length);
			if (severity === "info" || severity === "warn" || severity === "error") {
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
 * Converts an absolute path into a project-relative path if possible.
 */
function relativePath(projectRoot: string, targetPath: string): string {
	if (!targetPath.startsWith(projectRoot)) {
		return targetPath;
	}
	const relative = targetPath.slice(projectRoot.length);
	if (!relative) {
		return ".";
	}
	return relative.startsWith("/") ? relative.slice(1) : relative;
}

/**
 * Writes pretty JSON output with a trailing newline.
 */
async function writeJson(path: string, data: unknown): Promise<void> {
	await Deno.writeTextFile(path, `${JSON.stringify(data, null, "\t")}\n`);
}

/**
 * Produces a concise terminal summary.
 */
function buildSummaryLine(report: AuditReport, baselineDiff: BaselineDiff | undefined, exitCode: number): string {
	const base = `logging-audit findings=${report.summary.totalFindings}`;
	if (!baselineDiff) {
		return `${base} fail=${exitCode}`;
	}
	return `${base} new=${baselineDiff.newFindings.length} resolved=${baselineDiff.resolvedFingerprints.length} fail=${exitCode}`;
}

if (import.meta.main) {
	const exitCode = await main(Deno.args);
	Deno.exit(exitCode);
}
