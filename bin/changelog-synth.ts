import { dirname, fromFileUrl, join } from "@std/path";
import {
	parseGitLogSubjects,
	prependReleaseBlock,
	renderReleaseBlock,
	synthesizeSections,
} from "./changelog-synth-lib.ts";

interface CliOptions {
	cwd: string;
	from: string | null;
	to: string;
	version: string;
	output: string | null;
	prepend: boolean;
	dryRun: boolean;
}

const DEFAULT_CHANGELOG_RELATIVE_PATH = "docs/CHANGELOG.md";

/**
 * Executes changelog synthesis flow.
 */
export async function main(args: string[]): Promise<number> {
	const projectRoot = defaultProjectRoot();
	const options = parseArgs(args, projectRoot);
	const from = options.from ?? await resolveLatestTag(options.cwd);
	const subjects = await getCommitSubjects(options.cwd, from, options.to);
	const sections = synthesizeSections(subjects);
	const releaseBlock = renderReleaseBlock(options.version, sections);

	if (options.prepend) {
		const changelogPath = options.output ??
			join(options.cwd, DEFAULT_CHANGELOG_RELATIVE_PATH);
		const existingContent = await Deno.readTextFile(changelogPath);
		const updatedContent = prependReleaseBlock(
			existingContent,
			releaseBlock,
		);
		if (options.dryRun) {
			await writeStdout(ensureTrailingNewline(updatedContent));
			return 0;
		}
		await Deno.writeTextFile(
			changelogPath,
			ensureTrailingNewline(updatedContent),
		);
		return 0;
	}

	if (options.output != null && !options.dryRun) {
		await Deno.writeTextFile(options.output, releaseBlock);
		return 0;
	}

	await writeStdout(releaseBlock);
	return 0;
}

/**
 * Parses CLI args into deterministic options.
 */
export function parseArgs(args: string[], projectRoot: string): CliOptions {
	let cwdInput = projectRoot;
	let outputInput: string | null = null;
	let from: string | null = null;
	let to = "HEAD";
	let version = "Next release";
	let prepend = false;
	let dryRun = false;

	for (const arg of args) {
		if (arg === "--") {
			continue;
		}
		if (arg.startsWith("--from=")) {
			from = requireValue(arg, "--from=");
			continue;
		}
		if (arg.startsWith("--to=")) {
			to = requireValue(arg, "--to=");
			continue;
		}
		if (arg.startsWith("--version=")) {
			version = requireValue(arg, "--version=");
			continue;
		}
		if (arg.startsWith("--output=")) {
			outputInput = requireValue(arg, "--output=");
			continue;
		}
		if (arg.startsWith("--cwd=")) {
			const cwdValue = requireValue(arg, "--cwd=");
			cwdInput = resolvePath(projectRoot, cwdValue);
			continue;
		}
		if (arg === "--prepend") {
			prepend = true;
			continue;
		}
		if (arg === "--dry-run") {
			dryRun = true;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return {
		cwd: cwdInput,
		from,
		to,
		version,
		output: outputInput == null ? null : resolvePath(cwdInput, outputInput),
		prepend,
		dryRun,
	};
}

/**
 * Resolves latest tag in the target repo.
 */
export async function resolveLatestTag(cwd: string): Promise<string | null> {
	const command = new Deno.Command("git", {
		args: ["-C", cwd, "describe", "--tags", "--abbrev=0"],
		stdout: "piped",
		stderr: "piped",
	});
	const { code, stdout } = await command.output();
	if (code !== 0) {
		return null;
	}
	const tag = new TextDecoder().decode(stdout).trim();
	return tag.length > 0 ? tag : null;
}

/**
 * Reads commit subjects from git log for the provided range.
 */
export async function getCommitSubjects(
	cwd: string,
	from: string | null,
	to: string,
): Promise<string[]> {
	const range = from == null ? to : `${from}..${to}`;
	const command = new Deno.Command("git", {
		args: ["-C", cwd, "log", "--format=%s", range],
		stdout: "piped",
		stderr: "piped",
	});
	const { code, stdout, stderr } = await command.output();
	if (code !== 0) {
		const message = new TextDecoder().decode(stderr).trim();
		throw new Error(
			`Failed to read git log for range ${range}: ${message}`,
		);
	}
	return parseGitLogSubjects(new TextDecoder().decode(stdout));
}

function requireValue(arg: string, prefix: string): string {
	const value = arg.slice(prefix.length).trim();
	if (value.length === 0) {
		throw new Error(`Argument ${prefix.slice(0, -1)} cannot be empty`);
	}
	return value;
}

function resolvePath(basePath: string, value: string): string {
	if (value.startsWith("/")) {
		return value;
	}
	return join(basePath, value);
}

function defaultProjectRoot(): string {
	return join(dirname(fromFileUrl(import.meta.url)), "..");
}

function ensureTrailingNewline(content: string): string {
	return content.endsWith("\n") ? content : `${content}\n`;
}

async function writeStdout(content: string): Promise<void> {
	await Deno.stdout.write(new TextEncoder().encode(content));
}

if (import.meta.main) {
	const exitCode = await main(Deno.args);
	Deno.exit(exitCode);
}
