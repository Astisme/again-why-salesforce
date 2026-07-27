#!/usr/bin/env -S deno run --allow-read

const DEFAULT_LOCALES_DIR = "src/_locales";
const PARAMETER_REGEX = /\$([A-Za-z0-9_]+)/g;

interface LocaleMessage {
	message?: string;
	description?: string;
}

interface LocaleFile {
	[key: string]: LocaleMessage;
}

/**
 * Builds the messages file path for a locale.
 * @param {string} language - Locale directory name.
 * @param {string} localesDir - Directory containing locale folders.
 * @return {string} Messages file path.
 */
export function getMessagesFilePath(
	language: string,
	localesDir = DEFAULT_LOCALES_DIR,
): string {
	return `${localesDir}/${language}/messages.json`;
}

/**
 * Reads a locale messages file.
 * @param {string} language - Locale directory name.
 * @param {string} localesDir - Directory containing locale folders.
 * @return {Promise<LocaleFile>} Parsed locale messages.
 */
export async function readLocaleFile(
	language: string,
	localesDir = DEFAULT_LOCALES_DIR,
): Promise<LocaleFile> {
	return JSON.parse(
		await Deno.readTextFile(getMessagesFilePath(language, localesDir)),
	);
}

/**
 * Removes a leading parameter marker from a message key.
 * @param {string} key - Message key or parameter token.
 * @return {string} Key without leading dollar sign.
 */
export function normalizeMessageKey(key: string): string {
	return key.startsWith("$") ? key.slice(1) : key;
}

/**
 * Gets the untranslated message for a key.
 * @param {LocaleFile} localeFile - Parsed locale messages.
 * @param {string} key - Message key.
 * @return {string} Raw message with parameters intact.
 */
export function getOriginalMessage(
	localeFile: LocaleFile,
	key: string,
): string {
	const normalizedKey = normalizeMessageKey(key);
	const message = localeFile[normalizedKey]?.message;
	if (message == null) {
		throw new Error(`Missing message key: ${normalizedKey}`);
	}
	return message;
}

/**
 * Renders a message by recursively replacing $key parameters.
 * @param {LocaleFile} localeFile - Parsed locale messages.
 * @param {string} key - Message key.
 * @param {Set<string>} seenKeys - Keys already visited during this render.
 * @return {string} Rendered message.
 */
export function renderLocaleMessage(
	localeFile: LocaleFile,
	key: string,
	seenKeys = new Set<string>(),
): string {
	const normalizedKey = normalizeMessageKey(key);
	if (seenKeys.has(normalizedKey)) {
		throw new Error(`Circular message reference: ${normalizedKey}`);
	}
	const nextSeenKeys = new Set(seenKeys);
	nextSeenKeys.add(normalizedKey);
	const originalMessage = getOriginalMessage(localeFile, normalizedKey);
	return originalMessage.replaceAll(
		PARAMETER_REGEX,
		(_parameter: string, parameterKey: string) =>
			renderLocaleMessage(localeFile, parameterKey, nextSeenKeys),
	);
}

/**
 * Formats original and rendered messages for command output.
 * @param {LocaleFile} localeFile - Parsed locale messages.
 * @param {string} key - Message key.
 * @return {string} Printable output.
 */
export function formatLocaleMessageResult(
	localeFile: LocaleFile,
	key: string,
): string {
	return [
		`original: ${getOriginalMessage(localeFile, key)}`,
		`result: ${renderLocaleMessage(localeFile, key)}`,
	].join("\n");
}

/**
 * Runs the locale message renderer CLI.
 * @param {string[]} args - Command line arguments.
 * @param {(message: string) => void} log - Standard output writer.
 * @param {(message: string) => void} logError - Standard error writer.
 * @return {Promise<number>} Process exit code.
 */
export async function main(
	args = Deno.args,
	log = console.log,
	logError = console.error,
): Promise<number> {
	const [language, key] = args;
	if (language == null || key == null || args.length !== 2) {
		logError("Usage: deno run --allow-read bin/render-locale-message.ts <language> <key>");
		return 1;
	}
	const localeFile = await readLocaleFile(language);
	log(formatLocaleMessageResult(localeFile, key));
	return 0;
}

// deno-coverage-ignore-start
if (import.meta.main) {
	Deno.exit(await main());
}
// deno-coverage-ignore-stop
