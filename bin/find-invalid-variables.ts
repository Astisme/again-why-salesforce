import * as fs from "node:fs";
import * as path from "node:path";

const LOCALES_DIR = "src/_locales";

// matches $something where either
// - no space before OR
// - no space after OR
// - no double quotes before OR
// - no double quotes after
const INVALID_VAR_REGEX = /(?<=[^\s$\w])\$\w+|\$\w+(?=[^\s$\w])/g;

const result = {};

const locales = fs.readdirSync(LOCALES_DIR, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name)
	.sort();

for (const locale of locales) {
	const filePath = path.join(LOCALES_DIR, locale, "messages.json");
	if (!fs.existsSync(filePath)) continue;
	const matches = [];
	const jsonLocale = JSON.parse(fs.readFileSync(filePath, "utf8"));
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

if (Object.keys(result).length > 0) {
	fs.writeFileSync(
		"invalid-variables-report.json",
		JSON.stringify(result, null, 2),
		"utf8",
	);
}
