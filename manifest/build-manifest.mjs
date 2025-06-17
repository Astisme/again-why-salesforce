"use strict";
import process from "node:process";
import manifest from "./template-manifest.json" with { type: "json" };
import { writeFileSync } from "node:fs";

const browser = process.argv[2];
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
		const commandsToKeep = [
			"cmd-save-as-tab",
			"cmd-remove-tab",
			"cmd-update-tab",
			"cmd-open-other-org",
		];
		Object.keys(manifest.commands).forEach((com) => {
			if (!commandsToKeep.includes(com)) {
				delete manifest.commands[com]["suggested_key"];
			}
		});
		break;
	}

	case "safari": {
		delete manifest.minimum_chrome_version;
		delete manifest.browser_specific_settings.gecko;
		delete manifest.background.type;
		delete manifest.background.scripts;
		delete manifest.incognito;
		const notAllowedPermissions = [
			"downloads",
		];
		manifest.permissions = manifest.permissions.filter((perm) =>
			!notAllowedPermissions.includes(perm)
		);
		manifest.optional_permissions = manifest.optional_permissions.filter((
			optional_perm,
		) => !notAllowedPermissions.includes(optional_perm));
		break;
	}
	default:
		console.error(
			`Usage: ${process.argv[0]} ${
				process.argv[1]
			} (firefox || chrome || safari)`,
		);
		throw new Error(`Unknown browser: ${browser}`);
}

writeFileSync("manifest.json", JSON.stringify(manifest, null, 4));
