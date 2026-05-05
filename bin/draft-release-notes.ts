import { join } from "@std/path";
import {
	extractLatestNotes,
	extractNotesForTag,
	groupCommitsBySection,
	parseGitLogOutput,
	renderReleaseNotes,
} from "./release-notes-lib.ts";

interface CliOptions {
	fromRef: string | null;
	toRef: string;
	tag: string | null;
	outputPath: string;
	fallbackFilePath: string | null;
}

interface CliDependencies {
	executeGit: (args: string[]) => Promise<string>;
	readTextFile: (path: string) => Promise<string>;
	writeTextFile: (path: string, content: string) => Promise<void>;
	cwd: () => string;
}

const DEFAULT_OUTPUT_PATH = "release-notes.txt";

/**
 * CLI entrypoint.
 */
export async function main(
	args: string[],
	deps: CliDependencies = defaultDependencies(),
): Promise<number> {
	const options = parseArgs(args, deps.cwd());
	const fromRef = options.fromRef ?? await resolveDefaultFromRef(
		options.toRef,
		deps.executeGit,
	);
	const rawLog = await readCommitLog(fromRef, options.toRef, deps.executeGit);
	const commits = parseGitLogOutput(rawLog);
	let notes = "";

	if (commits.length > 0) {
		const groupedNotes = groupCommitsBySection(commits);
		notes = renderReleaseNotes(groupedNotes);
	}

	if (!notes && options.fallbackFilePath != null) {
		const changelog = await deps.readTextFile(options.fallbackFilePath);
		notes = options.tag != null
			? extractNotesForTag(changelog, options.tag)
			: "";
		if (!notes) {
			notes = extractLatestNotes(changelog);
		}
	}

	const normalizedNotes = notes.trim() || "- No notable changes.";
	await deps.writeTextFile(options.outputPath, `${normalizedNotes}\n`);
	return 0;
}

/**
 * Parses command-line options.
 */
export function parseArgs(args: string[], cwd: string): CliOptions {
	const parsed: CliOptions = {
		fromRef: null,
		toRef: "HEAD",
		tag: null,
		outputPath: join(cwd, DEFAULT_OUTPUT_PATH),
		fallbackFilePath: join(cwd, "docs", "CHANGELOG.md"),
	};

	let index = 0;
	while (index < args.length) {
		const arg = args[index];
		if (arg === "--help") {
			throw new Error(helpText());
		}
		if (arg.startsWith("--from=")) {
			parsed.fromRef = arg.slice("--from=".length);
			index += 1;
			continue;
		}
		if (arg === "--from") {
			const value = args[index + 1];
			if (!value) {
				throw new Error("Missing value for --from");
			}
			parsed.fromRef = value;
			index += 2;
			continue;
		}
		if (arg.startsWith("--to=")) {
			parsed.toRef = arg.slice("--to=".length);
			index += 1;
			continue;
		}
		if (arg === "--to") {
			const value = args[index + 1];
			if (!value) {
				throw new Error("Missing value for --to");
			}
			parsed.toRef = value;
			index += 2;
			continue;
		}
		if (arg.startsWith("--tag=")) {
			parsed.tag = arg.slice("--tag=".length);
			index += 1;
			continue;
		}
		if (arg === "--tag") {
			const value = args[index + 1];
			if (!value) {
				throw new Error("Missing value for --tag");
			}
			parsed.tag = value;
			index += 2;
			continue;
		}
		if (arg.startsWith("--output=")) {
			parsed.outputPath = resolvePath(cwd, arg.slice("--output=".length));
			index += 1;
			continue;
		}
		if (arg === "--output") {
			const value = args[index + 1];
			if (!value) {
				throw new Error("Missing value for --output");
			}
			parsed.outputPath = resolvePath(cwd, value);
			index += 2;
			continue;
		}
		if (arg.startsWith("--fallback-file=")) {
			const value = arg.slice("--fallback-file=".length);
			parsed.fallbackFilePath = value ? resolvePath(cwd, value) : null;
			index += 1;
			continue;
		}
		if (arg === "--fallback-file") {
			const value = args[index + 1];
			if (value == null) {
				throw new Error("Missing value for --fallback-file");
			}
			parsed.fallbackFilePath = value ? resolvePath(cwd, value) : null;
			index += 2;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return parsed;
}

/**
 * Resolves the commit reference that precedes `toRef`.
 */
export async function resolveDefaultFromRef(
	toRef: string,
	executeGit: (args: string[]) => Promise<string>,
): Promise<string | null> {
	try {
		const previousTag = await executeGit([
			"describe",
			"--tags",
			"--abbrev=0",
			`${toRef}^`,
		]);
		return previousTag.trim() || null;
	} catch {
		return null;
	}
}

/**
 * Reads commit log entries for the selected range.
 */
export async function readCommitLog(
	fromRef: string | null,
	toRef: string,
	executeGit: (args: string[]) => Promise<string>,
): Promise<string> {
	const range = fromRef != null ? `${fromRef}..${toRef}` : toRef;
	return await executeGit([
		"log",
		"--reverse",
		"--pretty=format:%H%x1f%s%x1f%b%x1e",
		range,
	]);
}

function resolvePath(cwd: string, pathValue: string): string {
	if (pathValue.startsWith("/")) {
		return pathValue;
	}
	return join(cwd, pathValue);
}

function defaultDependencies(): CliDependencies {
	return {
		executeGit: async (args: string[]): Promise<string> => {
			const command = new Deno.Command("git", {
				args,
				stdout: "piped",
				stderr: "piped",
			});
			const { code, stdout, stderr } = await command.output();
			if (code !== 0) {
				throw new Error(new TextDecoder().decode(stderr).trim());
			}
			return new TextDecoder().decode(stdout);
		},
		readTextFile: (path: string): Promise<string> =>
			Deno.readTextFile(path),
		writeTextFile: (path: string, content: string): Promise<void> =>
			Deno.writeTextFile(path, content),
		cwd: () => Deno.cwd(),
	};
}

function helpText(): string {
	return [
		"Draft release notes from git history.",
		"",
		"Flags:",
		"  --from <ref>            Start reference (optional; defaults to previous tag).",
		"  --to <ref>              End reference (default: HEAD).",
		"  --tag <version>         Tag used for changelog fallback extraction.",
		"  --output <file>         Output file path (default: release-notes.txt).",
		"  --fallback-file <file>  Changelog file for fallback extraction (default: docs/CHANGELOG.md).",
	].join("\n");
}

if (import.meta.main) {
	try {
		const exitCode = await main(Deno.args);
		Deno.exit(exitCode);
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		Deno.exit(1);
	}
}
