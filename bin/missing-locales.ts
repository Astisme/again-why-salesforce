// deno-lint-ignore-file no-explicit-any

// Type definitions
interface MessageFile {
	[key: string]: any;
}

interface EnglishMissingKeys {
	[key: string]: {
		message: string;
		description: string;
	};
}

interface LocaleMissingKeys {
	locales: string[];
	missingKeys: string[];
}

interface GroupedMissingKeys {
	[groupId: string]: LocaleMissingKeys | EnglishMissingKeys;
}

/**
 * Find missing keys in a locale file compared to the English reference file
 * and identify removed keys that need to be deleted
 */
function compareLocaleKeys(
	englishFile: MessageFile,
	localeFile: MessageFile,
): { missingKeys: string[]; removedKeys: string[] } {
	const missingKeys: string[] = [];
	const removedKeys: string[] = [];
	// Find keys in English file but not in locale file (missing)
	for (const key in englishFile) {
		if (!Object.hasOwn(localeFile, key)) {
			missingKeys.push(key);
		}
	}
	// Find keys in locale file but not in English file (removed)
	for (const key in localeFile) {
		if (!Object.hasOwn(englishFile, key)) {
			removedKeys.push(key);
		}
	}
	return {
		missingKeys,
		removedKeys,
	};
}

/**
 * Removes keys from a locale file and saves the updated file
 */
async function removeKeysFromLocaleFile(
	filePath: string,
	localeFile: MessageFile,
	keysToRemove: string[],
): Promise<void> {
	if (keysToRemove.length === 0) {
		return;
	}
	// Create a new object without the removed keys
	const updatedLocaleFile: MessageFile = {};
	for (const key in localeFile) {
		if (!keysToRemove.includes(key)) {
			updatedLocaleFile[key] = localeFile[key];
		}
	}
	// Write the updated file
	try {
		await Deno.writeTextFile(
			filePath,
			JSON.stringify(updatedLocaleFile, null, "\t"),
		);
	} catch (error) {
		console.error(`Error writing updated file ${filePath}:`, error);
	}
}

/**
 * Creates a signature for a set of missing keys to use as a grouping identifier
 */
function createKeySignature(keys: string[]): string {
	return keys.toSorted((a, b) => a.localeCompare(b)).join(",");
}

/**
 * Get filtered locale directories (excluding English and Spanish 419)
 */
function getLocaleDirectories(localesDir: string): string[] {
	return Deno.readDirSync(localesDir)
		.filter(
			(entry) => (entry.isDirectory && !entry.name.startsWith("en") &&
				entry.name !== "es_419"),
		)
		.map((entry) => entry.name);
}

/**
 * Process a single locale file and return missing keys or error status
 */
async function processLocaleFile(
	localeFilePath: string,
	englishFile: any,
): Promise<
	{ status: "success" | "missing" | "error"; missingKeys?: string[] }
> {
	try {
		await Deno.stat(localeFilePath);
	} catch {
		return { status: "missing" };
	}
	try {
		const localeContent = await Deno.readTextFile(localeFilePath);
		const localeFile = JSON.parse(localeContent);
		const { missingKeys, removedKeys } = compareLocaleKeys(
			englishFile,
			localeFile,
		);
		if (removedKeys.length > 0) {
			await removeKeysFromLocaleFile(
				localeFilePath,
				localeFile,
				removedKeys,
			);
		}
		return { status: "success", missingKeys };
	} catch (error) {
		console.error(`Error processing file ${localeFilePath}:`, error);
		return { status: "error" };
	}
}

/**
 * Group locales by their missing keys using signatures
 */
function groupLocalesByMissingKeys(
	localeResults: { locale: string; missingKeys: string[] }[],
): { [groupId: string]: LocaleMissingKeys } {
	const groupedResults: { [groupId: string]: LocaleMissingKeys } = {};
	const signatureMap: { [signature: string]: number } = {};
	let groupCounter = 0;
	for (const result of localeResults) {
		const signature = createKeySignature(result.missingKeys);
		if (signatureMap[signature] === undefined) {
			signatureMap[signature] = groupCounter++;
			groupedResults[signatureMap[signature].toString()] = {
				locales: [],
				missingKeys: result.missingKeys,
			};
		}
		const groupId = signatureMap[signature].toString();
		groupedResults[groupId].locales.push(result.locale);
	}
	// Sort locales alphabetically within each group
	for (const group of Object.values(groupedResults)) {
		group.locales.sort();
	}
	return groupedResults;
}

/**
 * Create English missing keys report from all missing keys
 */
function createEnglishMissingKeysReport(
	allMissingKeys: Set<string>,
	englishFile: any,
): EnglishMissingKeys {
	const englishMissingKeys: EnglishMissingKeys = {};
	for (const key of allMissingKeys) {
		if (englishFile[key]) {
			englishMissingKeys[key] = {
				message: englishFile[key].message ?? "",
				description: englishFile[key].description ?? "",
			};
		}
	}
	return englishMissingKeys;
}

/**
 * Helper function to add locales to special groups (missing_files, error_files)
 */
function addToSpecialGroup(
	groupedReport: GroupedMissingKeys,
	groupId: string,
	locale: string,
	keys: string[],
): void {
	if (!groupedReport[groupId]) {
		groupedReport[groupId] = {
			locales: [],
			missingKeys: keys,
		} as LocaleMissingKeys;
	}
	(groupedReport[groupId] as LocaleMissingKeys).locales.push(locale);
}

/**
 * Main function to check all locale files against the English reference
 */
async function checkLocaleFiles(
	localesDir: string,
): Promise<GroupedMissingKeys> {
	const groupedReport: GroupedMissingKeys = {};
	// Read the English reference file
	const englishFilePath = `${localesDir}/en/messages.json`;
	try {
		await Deno.stat(englishFilePath);
	} catch {
		throw new Error(
			"English reference file not found at: " + englishFilePath,
		);
	}
	const englishContent = await Deno.readTextFile(englishFilePath);
	const englishFile = JSON.parse(englishContent);
	// Get filtered locale directories
	const localeDirs = getLocaleDirectories(localesDir);
	// Process each locale file
	const allMissingKeys = new Set<string>();
	const localeResults: { locale: string; missingKeys: string[] }[] = [];
	for (const localeDir of localeDirs) {
		const localeFilePath = `${localesDir}/${localeDir}/messages.json`;
		const result = await processLocaleFile(localeFilePath, englishFile);
		if (result.status === "missing") {
			addToSpecialGroup(groupedReport, "missing_files", localeDir, [
				"FILE_NOT_FOUND",
			]);
		} else if (result.status === "error") {
			addToSpecialGroup(groupedReport, "error_files", localeDir, [
				"FILE_ERROR",
			]);
		} else if (result.missingKeys && result.missingKeys.length > 0) {
			localeResults.push({
				locale: localeDir,
				missingKeys: result.missingKeys,
			});
			for (const key of result.missingKeys) {
				allMissingKeys.add(key);
			}
		}
	}
	// Group locales by missing keys and add to report
	const groupedLocales = groupLocalesByMissingKeys(localeResults);
	Object.assign(groupedReport, groupedLocales);
	// Add English missing keys report
	const englishReport = createEnglishMissingKeysReport(
		allMissingKeys,
		englishFile,
	);
	Object.assign(groupedReport, englishReport);
	return groupedReport;
}

/**
 * Main execution
 */
async function main() {
	const localesDir = new URL("/src/_locales", import.meta.url).pathname;
	try {
		await Deno.stat(localesDir);
	} catch {
		console.error(`${localesDir} directory not found!`);
		Deno.exit(1);
	}
	try {
		const groupedReport = await checkLocaleFiles(localesDir); // Calculate total missing keys and locales with missing translations
		let someMissingKeys = false;
		for (const [key, group] of Object.entries(groupedReport)) {
			if (!Number.isInteger(Number(key))) continue;
			const localeGroup = group as LocaleMissingKeys;
			if (localeGroup.locales.length > 0) {
				someMissingKeys = true;
				break;
			}
		}
		// If no missing keys were found, close with success
		if (!someMissingKeys) {
			Deno.exit(0);
		}
		// Write the grouped report to a JSON file
		const outputPath =
			new URL("/missing-keys-report.json", import.meta.url).pathname;
		await Deno.writeTextFile(
			outputPath,
			JSON.stringify(groupedReport, null, "\t"),
		);
	} catch (error) {
		console.error("Error generating report:", error);
	}
	Deno.exit(1);
}

main();
