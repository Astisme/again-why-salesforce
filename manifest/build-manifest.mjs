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
	case "edge":
		delete manifest.background.scripts;
		delete manifest.browser_specific_settings;
		break;

	case "safari":
		delete manifest.minimum_chrome_version;
		delete manifest.browser_specific_settings.gecko;
		break;

	default:
		console.error(
			`Usage: ${process.argv[0]} ${
				process.argv[1]
			} (firefox || chrome || safari)`,
		);
		throw new Error(`Unknown browser: ${browser}`);
}

writeFileSync("manifest.json", JSON.stringify(manifest, null, 4));
