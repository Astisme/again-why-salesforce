"use strict";

/**
 * Applies browser-specific manifest mutations.
 *
 * @param {Object} options Runtime values.
 * @param {string | undefined} options.browser Target browser.
 * @param {Record<string, unknown>} options.manifest Manifest object to mutate.
 * @param {{ argv?: string[]; error: (message: string) => void }} [options.logger=console] Logger used for usage output.
 * @param {string[]} [options.argv=[]] Process arguments used in usage output.
 * @return {Record<string, unknown>} The mutated manifest object.
 */
export function buildManifestForBrowser({
	browser,
	manifest,
	logger = console,
	argv = [],
} = {}) {
	switch (browser) {
		case "firefox":
			delete manifest.minimum_chrome_version;
			delete manifest.background.service_worker;
			delete manifest.browser_specific_settings.safari;
			break;

		case "chrome":
		case "edge": {
			delete manifest.background.scripts;
			delete manifest.browser_specific_settings;
			const commandsToKeep = new Set([
				"cmd-save-as-tab",
				"cmd-remove-tab",
				"cmd-update-tab",
				"cmd-open-other-org",
			]);
			for (const command of Object.keys(manifest.commands)) {
				if (!commandsToKeep.has(command)) {
					delete manifest.commands[command]["suggested_key"];
				}
			}
			break;
		}

		case "safari": {
			delete manifest.minimum_chrome_version;
			delete manifest.browser_specific_settings.gecko;
			delete manifest.background.type;
			delete manifest.background.scripts;
			delete manifest.incognito;
			const notAllowedPermissions = new Set([
				"downloads",
			]);
			manifest.permissions = manifest.permissions.filter((perm) =>
				!notAllowedPermissions.has(perm)
			);
			manifest.optional_permissions = manifest.optional_permissions
				.filter((
					optionalPermission,
				) => !notAllowedPermissions.has(optionalPermission));
			break;
		}
		default:
			logger.error(
				`Usage: ${argv[0] ?? ""} ${
					argv[1] ?? ""
				} (firefox || chrome || safari)`,
			);
			throw new Error(`Unknown browser: ${browser}`);
	}
	return manifest;
}

/**
 * Runs the manifest build pipeline and writes the resulting file.
 *
 * @param {Object} options Runtime dependencies.
 * @param {string[]} options.argv Process arguments where index 2 is browser.
 * @param {Record<string, unknown>} options.manifest Manifest object to mutate.
 * @param {(path: string, contents: string) => void} options.writeFileSyncFn File writer.
 * @param {{ error: (message: string) => void }} [options.logger=console] Logger used for usage output.
 * @param {string} [options.outputPath="./src/manifest.json"] Output file path.
 * @return {Record<string, unknown>} Written manifest object.
 */
export function runBuildManifest({
	argv,
	manifest,
	writeFileSyncFn,
	logger = console,
	outputPath = "./src/manifest.json",
} = {}) {
	const builtManifest = buildManifestForBrowser({
		argv,
		browser: argv[2],
		logger,
		manifest,
	});
	writeFileSyncFn(outputPath, JSON.stringify(builtManifest, null, 4));
	return builtManifest;
}
