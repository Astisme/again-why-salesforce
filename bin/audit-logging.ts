import { join } from "@std/path";
import {
	defaultProjectRoot,
	type FindingSeverity,
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
	if (report.findings.length > 0) {
		await writeJson(options.reportFile, report);
	}
	return shouldFail(report.findings, options.failSeverity) ? 1 : 0;
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

if (import.meta.main) {
	const exitCode = await main(Deno.args);
	Deno.exit(exitCode);
}
