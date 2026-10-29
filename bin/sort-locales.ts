#!/usr/bin/env -S bun run

import fs from "node:fs/promises";

/**
 * Recursively sorts an object’s keys alphabetically.
 * Arrays and primitive values are left intact.
 */
function sortObjectKeys<T>(obj: T): T {
	if (Array.isArray(obj)) {
		return obj.map((item) =>
			item !== null && typeof item === "object"
				? sortObjectKeys(item)
				: item,
		) as unknown as T;
	} else if (obj !== null && typeof obj === "object") {
		const entries = Object.keys(obj)
			.sort((a, b) => a.localeCompare(b))
			.map((key) => {
				const val = (obj as any)[key];
				return [key, val] as [string, any];
			});
		return Object.fromEntries(entries) as T;
	}
	return obj;
}

/**
 * Recursively traverse directories starting at basePath to find all 'messages.json' files
 */
async function* findLocaleMessageFiles(
	basePath: string,
): AsyncGenerator<string> {
	for (const dirEntry of await fs.readdir(basePath, {
		withFileTypes: true,
	})) {
		const entryPath = `${basePath}/${dirEntry.name}`;
		if (dirEntry.isDirectory()) {
			yield* findLocaleMessageFiles(entryPath);
		} else if (dirEntry.isFile() && dirEntry.name === "messages.json") {
			yield entryPath;
		}
	}
}

/**
 * Main function that traverses locale message files in the _locales directory,
 * reads and parses each JSON file, sorts its keys, and writes the sorted content back.
 * Logs success or failure for each file and exits with code 1 if any file fails to process.
 *
 * @async
 * @return {Promise<void>}
 */
async function main() {
	const baseDir = "src/_locales";
	try {
		let failedOnce = false;
		for await (const filePath of findLocaleMessageFiles(baseDir)) {
			try {
				const raw = await fs.readFile(filePath, "utf8");
				const data = JSON.parse(raw);
				const sorted = sortObjectKeys(data);
				await fs.writeFile(
					filePath,
					`${JSON.stringify(sorted, null, "\t")}\n`,
				);
			} catch (err) {
				console.error(`✖  Failed ${filePath}: ${err.message}`);
				failedOnce = true;
			}
		}
		if (failedOnce) {
			process.exitCode = 1;
		}
	} catch (err) {
		console.error(`Error traversing ${baseDir}: ${err.message}`);
		process.exitCode = 1;
	}
}

if (import.meta.main) {
	await main();
}
