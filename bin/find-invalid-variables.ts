const LOCALES_DIR = "src/_locales";

// matches $something where either
// - no space before OR
// - no space after OR
// - no double quotes before OR
// - no double quotes after
const INVALID_VAR_REGEX = /(?<=[^\s$\w])\$\w+|\$\w+(?=[^\s$\w])/g;

/**
 * Gets all locale directories from the locales directory
 * @returns {Promise<string[]>} Array of locale directory names
 */
async function getLocales() {
	const entries = [];
	for await (const entry of Deno.readDir(LOCALES_DIR)) {
		if (entry.isDirectory) {
			entries.push(entry.name);
		}
	}
	return entries.sort();
}

/**
 * Checks if a file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if file exists
 */
async function fileExists(filePath) {
	try {
		await Deno.stat(filePath);
		return true;
	} catch {
		return false;
	}
}

const locales = await getLocales();

const result = {};

for (const locale of locales) {
	const filePath = `${LOCALES_DIR}/${locale}/messages.json`;
	if (!await fileExists(filePath)) continue;
	const matches = [];
	const jsonLocale = JSON.parse(await Deno.readTextFile(filePath));
	for (const [key, value] of Object.entries(jsonLocale)) {
		if (INVALID_VAR_REGEX.test(value.message)) {
			matches.push(key);
		}
		INVALID_VAR_REGEX.lastIndex = 0; // reset regex state
	}
	for (const match of matches) {
		if (result[locale] == null) {
			result[locale] = {};
		}
		result[locale][match] = jsonLocale[match];
	}
}

const keysLen = Object.keys(result).length;
if (keysLen > 0) {
	await Deno.writeTextFile(
		"invalid-variables-report.json",
		JSON.stringify(result, null, 2),
	);
	Deno.exit(1);
}
