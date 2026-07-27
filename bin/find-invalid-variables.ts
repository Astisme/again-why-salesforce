#!/usr/bin/env -S deno run --allow-read --allow-write

const LOCALES_DIR = "src/_locales";
const ENGLISH_LOCALE = "en";
const OUTPUT_FILE = "invalid-variables-report.json";
const VARIABLE_REGEX = /\$[a-zA-Z0-9_]+/g;

interface LocaleMessage {
	message?: string;
	description?: string;
}

interface LocaleFile {
	[key: string]: LocaleMessage;
}

interface InvalidVariableEntry {
	message: string;
	unknownVariables: string[];
}

interface InvalidLocaleReport {
	[locale: string]: Record<string, InvalidVariableEntry>;
}

/**
 * Gets all locale directories from the locales directory.
 *
 * @param {string} localesDir Locales root directory.
 * @return {Promise<string[]>} Locale directory names.
 */
export async function getLocales(
	localesDir = LOCALES_DIR,
): Promise<string[]> {
	const entries: string[] = [];
	for await (const entry of Deno.readDir(localesDir)) {
		if (entry.isDirectory) {
			entries.push(entry.name);
		}
	}
	return entries.sort();
}

/**
 * Checks if a file exists.
 *
 * @param {string} filePath Path to check.
 * @return {Promise<boolean>} True if file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await Deno.stat(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Reads and parses a locale file.
 *
 * @param {string} filePath Locale file path.
 * @return {Promise<LocaleFile>} Parsed locale file.
 */
export async function readLocaleFile(filePath: string): Promise<LocaleFile> {
	return JSON.parse(await Deno.readTextFile(filePath));
}

/**
 * Extracts placeholder variable names from a localized message.
 *
 * @param {string} message Message text.
 * @return {string[]} Unique variable keys without `$` prefix.
 */
export function getMessageVariables(message: string): string[] {
	return [
		...new Set(
			message.match(VARIABLE_REGEX)?.map((variable) =>
				variable.slice(1)
			) ??
				[],
		),
	].sort();
}

/**
 * Finds message variables that do not reference an English locale key.
 *
 * @param {LocaleFile} localeFile Locale file to inspect.
 * @param {ReadonlySet<string>} allowedVariables English locale keys.
 * @return {Record<string, InvalidVariableEntry>} Invalid variable report for one locale.
 */
export function getInvalidVariableEntries(
	localeFile: LocaleFile,
	allowedVariables: ReadonlySet<string>,
): Record<string, InvalidVariableEntry> {
	const invalidEntries: Record<string, InvalidVariableEntry> = {};
	for (const [key, value] of Object.entries(localeFile)) {
		if (typeof value?.message !== "string") {
			continue;
		}
		const unknownVariables = getMessageVariables(value.message).filter(
			(variable) => !allowedVariables.has(variable),
		);
		if (unknownVariables.length > 0) {
			invalidEntries[key] = {
				message: value.message,
				unknownVariables,
			};
		}
	}
	return invalidEntries;
}

/**
 * Builds the invalid variable report for all locales.
 *
 * @param {string} [localesDir=LOCALES_DIR] Locales root directory.
 * @return {Promise<InvalidLocaleReport>} Invalid variable report.
 */
export async function buildInvalidVariablesReport(
	localesDir = LOCALES_DIR,
): Promise<InvalidLocaleReport> {
	const englishFile = await readLocaleFile(
		`${localesDir}/${ENGLISH_LOCALE}/messages.json`,
	);
	const allowedVariables = new Set(Object.keys(englishFile));
	const locales = await getLocales(localesDir);
	const report: InvalidLocaleReport = {};
	for (const locale of locales) {
		const filePath = `${localesDir}/${locale}/messages.json`;
		if (!await fileExists(filePath)) {
			continue;
		}
		const localeFile = await readLocaleFile(filePath);
		const invalidEntries = getInvalidVariableEntries(
			localeFile,
			allowedVariables,
		);
		if (Object.keys(invalidEntries).length > 0) {
			report[locale] = invalidEntries;
		}
	}
	return report;
}

/**
 * Main execution.
 *
 * @return {Promise<void>}
 */
export async function main(): Promise<void> {
	const result = await buildInvalidVariablesReport();
	if (Object.keys(result).length === 0) {
		return;
	}
	await Deno.writeTextFile(
		OUTPUT_FILE,
		`${JSON.stringify(result, null, 2)}\n`,
	);
	Deno.exit(1);
}

/**
 * Removes stale report then runs validation.
 *
 * @return {Promise<void>}
 */
export async function removeThenMain(): Promise<void> {
	try {
		await Deno.remove(OUTPUT_FILE);
	} catch (_e) {
		// no stale report
	} finally {
		await main();
	}
}

if (import.meta.main) {
	await removeThenMain();
}
