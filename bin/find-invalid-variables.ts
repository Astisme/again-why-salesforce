#!/usr/bin/env -S deno run --allow-read --allow-write

const LOCALES_DIR = "src/_locales";

// matches $something where either
// - no space before OR
// - no space after OR
// - no double quotes before OR
// - no double quotes after
const INVALID_VAR_REGEX = /(?<=[^\s$\w])\$\w+|\$\w+(?=[^\s$\w])/g;

interface LocaleMessage {
	message?: string;
	description?: string;
}

interface LocaleFile {
	[key: string]: LocaleMessage;
}

interface InvalidLocalesReport {
	[locale: string]: LocaleFile;
}

/**
 * Gets all locale directories from the locales directory.
 * @return {Promise<string[]>} Array of locale directory names.
 */
async function getLocales(): Promise<string[]> {
	const entries: string[] = [];
	for await (const entry of Deno.readDir(LOCALES_DIR)) {
		if (entry.isDirectory) {
			entries.push(entry.name);
		}
	}
	return entries.sort();
}

/**
 * Checks if a file exists.
 * @param {string} filePath - Path to check.
 * @return {Promise<boolean>} True if file exists.
 */
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await Deno.stat(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Reads and parses a locale file.
 * @param {string} filePath - Locale file path.
 * @return {Promise<LocaleFile>} Parsed locale file.
 */
async function readLocaleFile(filePath: string): Promise<LocaleFile> {
	return JSON.parse(await Deno.readTextFile(filePath));
}

/**
 * Gets the locale keys whose messages contain invalid variables.
 * @param {LocaleFile} localeFile - Locale file to inspect.
 * @return {string[]} Invalid locale keys.
 */
function getInvalidLocaleKeys(localeFile: LocaleFile): string[] {
	const invalidKeys: string[] = [];
	for (const [key, value] of Object.entries(localeFile)) {
		if (
			typeof value?.message === "string" &&
			INVALID_VAR_REGEX.test(value.message)
		) {
			invalidKeys.push(key);
		}
		INVALID_VAR_REGEX.lastIndex = 0;
	}
	return invalidKeys;
}

/**
 * Builds the report payload for invalid locale keys.
 * @param {LocaleFile} localeFile - Locale file containing invalid keys.
 * @param {string[]} invalidKeys - Keys to include in the report.
 * @return {LocaleFile} Report entry for the locale.
 */
function buildLocaleReportEntry(
	localeFile: LocaleFile,
	invalidKeys: string[],
): LocaleFile {
	const reportEntry: LocaleFile = {};
	for (const key of invalidKeys) {
		reportEntry[key] = localeFile[key];
	}
	return reportEntry;
}

/**
 * Removes keys from a locale file.
 * @param {LocaleFile} localeFile - Locale file to update.
 * @param {string[]} keysToRemove - Keys to remove.
 * @return {LocaleFile} Locale file without the removed keys.
 */
function removeLocaleKeys(
	localeFile: LocaleFile,
	keysToRemove: string[],
): LocaleFile {
	const removedKeys = new Set(keysToRemove);
	const updatedLocaleFile: LocaleFile = {};
	for (const [key, value] of Object.entries(localeFile)) {
		if (!removedKeys.has(key)) {
			updatedLocaleFile[key] = value;
		}
	}
	return updatedLocaleFile;
}

/**
 * Writes a locale file back to disk.
 * @param {string} filePath - Locale file path.
 * @param {LocaleFile} localeFile - Locale file contents.
 * @return {Promise<void>}
 */
async function writeLocaleFile(
	filePath: string,
	localeFile: LocaleFile,
): Promise<void> {
	await Deno.writeTextFile(
		filePath,
		`${JSON.stringify(localeFile, null, "\t")}\n`,
	);
}

/**
 * Processes all locale files, removes invalid locale keys, and builds a report.
 * @return {Promise<InvalidLocalesReport>} Invalid locale report.
 */
async function removeInvalidLocales(): Promise<InvalidLocalesReport> {
	const locales = await getLocales();
	const report: InvalidLocalesReport = {};
	for (const locale of locales) {
		const filePath = `${LOCALES_DIR}/${locale}/messages.json`;
		if (!await fileExists(filePath)) {
			continue;
		}
		const localeFile = await readLocaleFile(filePath);
		const invalidKeys = getInvalidLocaleKeys(localeFile);
		if (invalidKeys.length === 0) {
			continue;
		}
		report[locale] = buildLocaleReportEntry(localeFile, invalidKeys);
		const updatedLocaleFile = removeLocaleKeys(localeFile, invalidKeys);
		await writeLocaleFile(filePath, updatedLocaleFile);
	}
	return report;
}

/**
 * Main execution.
 * @return {Promise<void>}
 */
async function main(): Promise<void> {
	const result = await removeInvalidLocales();
	if (Object.keys(result).length === 0) {
		return;
	}
	await Deno.writeTextFile(
		"invalid-variables-report.json",
		`${JSON.stringify(result, null, 2)}\n`,
	);
	Deno.exit(1);
}

await main();
