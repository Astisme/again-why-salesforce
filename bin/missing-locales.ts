// deno-lint-ignore-file no-explicit-any
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

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
		if (!Object.prototype.hasOwnProperty.call(localeFile, key)) {
			missingKeys.push(key);
		}
	}
	// Find keys in locale file but not in English file (removed)
	for (const key in localeFile) {
		if (!Object.prototype.hasOwnProperty.call(englishFile, key)) {
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
function removeKeysFromLocaleFile(
	filePath: string,
	localeFile: MessageFile,
	keysToRemove: string[],
): void {
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
		fs.writeFileSync(
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
	return keys.sort().join(",");
}

/**
 * Main function to check all locale files against the English reference
 */
function checkLocaleFiles(localesDir: string): GroupedMissingKeys {
	const groupedReport: GroupedMissingKeys = {};
	// Read the English reference file
	const englishFilePath = path.join(localesDir, "en", "messages.json");
	if (!fs.existsSync(englishFilePath)) {
		throw new Error(
			"English reference file not found at: " + englishFilePath,
		);
	}
	const englishContent = fs.readFileSync(englishFilePath, "utf8");
	const englishFile = JSON.parse(englishContent);
	// Get all locale directories
	const localeDirs = fs.readdirSync(localesDir)
		.filter((file) => {
			const dirPath = path.join(localesDir, file);
			return fs.statSync(dirPath).isDirectory() &&
				!file.startsWith("en") && file !== "es_419"; // Skip English directories and Spanish 419
		});
	// To collect all missing keys for the English report
	const allMissingKeys = new Set<string>();
	const localeResults: { locale: string; missingKeys: string[] }[] = [];
	// Check each locale file
	for (const localeDir of localeDirs) {
		const localeFilePath = path.join(
			localesDir,
			localeDir,
			"messages.json",
		);
		if (!fs.existsSync(localeFilePath)) {
			// Add this to a special group for missing files
			const groupId = "missing_files";
			if (!groupedReport[groupId]) {
				groupedReport[groupId] = {
					locales: [],
					missingKeys: ["FILE_NOT_FOUND"],
				} as LocaleMissingKeys;
			}
			(groupedReport[groupId] as LocaleMissingKeys).locales.push(
				localeDir,
			);
			continue;
		}
		try {
			const localeContent = fs.readFileSync(localeFilePath, "utf8");
			const localeFile = JSON.parse(localeContent);
			const { missingKeys, removedKeys } = compareLocaleKeys(
				englishFile,
				localeFile,
			);
			// Remove obsolete keys from the locale file without reporting
			if (removedKeys.length > 0) {
				removeKeysFromLocaleFile(
					localeFilePath,
					localeFile,
					removedKeys,
				);
			}
			// Store the results for grouping
			if (missingKeys.length > 0) {
				localeResults.push({
					locale: localeDir,
					missingKeys,
				});

				// Add to the set of all missing keys
				missingKeys.forEach((key) => allMissingKeys.add(key));
			}
		} catch (error) {
			console.error(
				`Error processing file ${localeFilePath}:`,
				error,
			);
			// Add this to a special group for error files
			const groupId = "error_files";
			if (!groupedReport[groupId]) {
				groupedReport[groupId] = {
					locales: [],
					missingKeys: ["FILE_ERROR"],
				} as LocaleMissingKeys;
			}
			(groupedReport[groupId] as LocaleMissingKeys).locales.push(
				localeDir,
			);
		}
	}
	// Group locales by their missing keys using signatures
	const signatureMap: { [signature: string]: number } = {};
	let groupCounter = 0;
	for (const result of localeResults) {
		const signature = createKeySignature(result.missingKeys);
		// If this signature doesn't have a group number yet, assign one
		if (signatureMap[signature] === undefined) {
			signatureMap[signature] = groupCounter++;
			// Create a new group with this number
			groupedReport[signatureMap[signature].toString()] = {
				locales: [],
				missingKeys: result.missingKeys,
			} as LocaleMissingKeys;
		}
		// Add the locale to its group
		const groupId = signatureMap[signature].toString();
		const group = groupedReport[groupId] as LocaleMissingKeys;
		group.locales.push(result.locale);
	}
	// Create the English missing keys report
	const englishMissingKeys: EnglishMissingKeys = {};
	allMissingKeys.forEach((key) => {
		if (englishFile[key]) {
			englishMissingKeys[key] = {
				message: englishFile[key].message || "",
				description: englishFile[key].description || "",
			};
		}
	});
	// Add English missing keys to the grouped report
	Object.assign(groupedReport, englishMissingKeys);
	return groupedReport;
}

/**
 * Main execution
 */
function main() {
	const localesDir = path.resolve("_locales");
	if (!fs.existsSync(localesDir)) {
		console.error("_locales directory not found!");
		process.exit(1);
	}
	try {
		const groupedReport = checkLocaleFiles(localesDir);
		// Calculate total missing keys and locales with missing translations
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
			process.exit(0);
		}
		// Write the grouped report to a JSON file
		const outputPath = path.resolve("missing-keys-report.json");
		fs.writeFileSync(outputPath, JSON.stringify(groupedReport, null, "\t"));
	} catch (error) {
		console.error("Error generating report:", error);
	}
	process.exit(1);
}

main();
