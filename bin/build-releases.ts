import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { env } from "node:process";
import { assertBuildSucceeded } from "./build-releases-runtime.ts";

// Builds browser extensions for all supported browsers and creates a GitHub release
const browsers: string[] = [
	"chrome",
	"firefox",
	"safari",
	//"edge",
];
const artifacts: string[] = [];
const releaseNotes: string = env.RELEASE_NOTES ?? "./docs/CHANGELOG.md";
const triggeringTag: string = env.TRIGGERING_TAG;
const tagVersion: string = env.TAG_VERSION;
const prerelease: boolean = env.PRERELEASE === "true";

console.log("Building browser extensions...");
let errorHappened: boolean = false;
for (const browser of browsers) {
	console.log(`Building ${browser}...`);
	try {
		const { status } = spawnSync("bun", ["run", `build-${browser}`], {
			stdio: "inherit",
		});
		console.log(`Process exited with code ${status}`);
		assertBuildSucceeded({ browser, code: status ?? 1 });
	} catch (error) {
		console.error(`✗ Failed to build ${browser}:`, error);
		errorHappened = true;
		continue;
	}
	const browserVersionName = `awsf-${browser}-v${tagVersion}`;
	const zipPath = `bin/${browserVersionName}.${
		browser === "safari" ? "dmg" : "zip"
	}`;
	if (existsSync(zipPath)) {
		artifacts.push(zipPath);
		console.log(`✓ ${browser} build completed`);
	} else {
		console.warn(`⚠ ${browser} artifact not found at ${zipPath}`);
		errorHappened = true;
	}
}

console.log("Creating GitHub release...");
try {
	execFileSync(
		"gh",
		[
			"release",
			"create",
			triggeringTag,
			"--title",
			triggeringTag,
			"--notes-file",
			releaseNotes,
			...(errorHappened ? ["--draft"] : []),
			!errorHappened && prerelease ? "--prerelease" : "--latest",
			...artifacts,
		],
		{ stdio: "inherit" },
	);
	console.log(`✓ Release ${triggeringTag} created successfully`);
} catch (error) {
	console.error("✗ Failed to create release:", error);
	process.exitCode = 1;
}
