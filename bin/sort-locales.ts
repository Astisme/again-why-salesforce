#!/usr/bin/env -S deno run --allow-read --allow-write
// deno-lint-ignore-file no-explicit-any

/**
 * Recursively sorts an object’s keys alphabetically.
 * Arrays and primitive values are left intact.
 */
function sortObjectKeys<T>(obj: T): T {
	if (Array.isArray(obj)) {
		return obj.map((item) =>
			item !== null && typeof item === "object"
				? sortObjectKeys(item)
				: item
		) as unknown as T;
	} else if (obj !== null && typeof obj === "object") {
		const entries = Object.keys(obj)
			.sort((a, b) => a.localeCompare(b))
			.map((key) => {
				const val = (obj as any)[key];
				return [
					key,
					val,
				] as [string, any];
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
	for await (const dirEntry of Deno.readDir(basePath)) {
		const entryPath = `${basePath}/${dirEntry.name}`;
		if (dirEntry.isDirectory) {
			yield* findLocaleMessageFiles(entryPath);
		} else if (dirEntry.isFile && dirEntry.name === "messages.json") {
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
 * @returns {Promise<void>}
 */
async function main() {
	const baseDir = "_locales";
	try {
		let failedOnce = false;
		for await (const filePath of findLocaleMessageFiles(baseDir)) {
			try {
				const raw = await Deno.readTextFile(filePath);
				const data = JSON.parse(raw);
				const sorted = sortObjectKeys(data);
				await Deno.writeTextFile(
					filePath,
					`${JSON.stringify(sorted, null, "\t")}\n`,
				);
				console.log(`✔  Sorted ${filePath}`);
			} catch (err) {
				console.error(`✖  Failed ${filePath}: ${err.message}`);
				failedOnce = true;
			}
		}
		if (failedOnce) {
			Deno.exit(1);
		}
	} catch (err) {
		console.error(`Error traversing ${baseDir}: ${err.message}`);
		Deno.exit(1);
	}
}

main().catch((err) => {
	console.error(`Unexpected error: ${err}`);
	Deno.exit(1);
});
