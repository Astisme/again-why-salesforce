#!/usr/bin/env -S deno run --allow-read --allow-write

import { parseArgs, runAuditCli } from "./audit-logging-lib.ts";

/**
 * CLI entrypoint for logging quality auditing.
 *
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
	const options = parseArgs(Deno.args);
	const result = await runAuditCli(options);
	if (result.exitCode !== 0) {
		Deno.exit(result.exitCode);
	}
}

if (import.meta.main) {
	await main();
}
