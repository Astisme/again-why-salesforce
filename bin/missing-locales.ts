// deno-lint-ignore-file no-explicit-any
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

// Type definitions
interface MessageFile {
	[key: string]: any;
}

interface MissingKeysReport {
	[filename: string]: string[] | EnglishMissingKeys;
}

interface EnglishMissingKeys {
	[key: string]: {
		message: string;
		description: string;
	};
}

/**
 * Find missing keys in a locale file compared to the English reference file
 */
function findMissingKeys(
	englishFile: MessageFile,
	localeFile: MessageFile,
): string[] {
	const missingKeys: string[] = [];
	for (const key in englishFile) {
		if (!Object.prototype.hasOwnProperty.call(localeFile, key)) {
			missingKeys.push(key);
		}
	}
	return missingKeys;
}

/**
 * Main function to check all locale files against the English reference
 */
function checkLocaleFiles(localesDir: string): MissingKeysReport {
	const report: MissingKeysReport = {};
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
	// Check each locale file
	for (const localeDir of localeDirs) {
		const localeFilePath = path.join(
			localesDir,
			localeDir,
			"messages.json",
		);
		if (fs.existsSync(localeFilePath)) {
			try {
				const localeContent = fs.readFileSync(localeFilePath, "utf8");
				const localeFile = JSON.parse(localeContent);
				const missingKeys = findMissingKeys(englishFile, localeFile);
				if (missingKeys.length > 0) {
					report[`${localeDir}/messages.json`] = missingKeys;
					// Add to the set of all missing keys
					missingKeys.forEach((key) => allMissingKeys.add(key));
				}
			} catch (error) {
				console.error(
					`Error processing file ${localeFilePath}:`,
					error,
				);
				report[`${localeDir}/messages.json`] = [
					"ERROR_PROCESSING_FILE",
				];
			}
		} else {
			report[`${localeDir}/messages.json`] = ["FILE_NOT_FOUND"];
		}
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
	// Add to the report
	report["en/messages.json"] = englishMissingKeys;
	return report;
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
		const report = checkLocaleFiles(localesDir);
		const totalMissingKeys = Object.entries(report).reduce(
			(total, [file, missingKeys]) => {
				if (file === "en/messages.json") return total;
				return total + (missingKeys as string[]).length;
			},
			0,
		);
		// if all keys where found, close the process
		if (totalMissingKeys === 0) {
			process.exit(0);
		}
		// Write the report to a JSON file
		const outputPath = path.resolve("missing-keys-report.json");
		fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
	} catch (error) {
		console.error("Error generating report:", error);
	}
	process.exit(1);
}

main();
