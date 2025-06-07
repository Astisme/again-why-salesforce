import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { process } from "node:process";

// Builds browser extensions for all supported browsers and creates a GitHub release
const browsers: string[] = [
	"chrome",
	"firefox",
	"safari",
	//"edge",
];
const artifacts: string[] = [];
const releaseNotes: string = process.env.RELEASE_NOTES ?? "CHANGELOG.md";
const triggeringTag: string = process.env.TRIGGERING_TAG;
const tagVersion: string = process.env.TAG_VERSION;
const prerelease: boolean = process.env.PRERELEASE === "true";

console.log("Building browser extensions...");
let errorHappened: boolean = false;
for (const browser of browsers) {
	console.log(`Building ${browser}...`);
	try {
		await new Deno.Command("deno", {
			args: ["task", `build-${browser}`],
		}).output();
	} catch (error) {
		console.error(`✗ Failed to build ${browser}:`, error);
		errorHappened = true;
		continue;
	}
	const browserVersionName = `awsf-${browser}-v${tagVersion}`;
	const zipPath = `bin/${browserVersionName}.${
		browser !== "safari" ? "zip" : "dmg"
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
const releaseCommand = [
	"gh release create",
	triggeringTag,
	"--title",
	`"${triggeringTag}"`,
	"--notes",
	`"See release notes at ${releaseNotes}"`,
	"--notes-file",
	releaseNotes,
	"--generate-notes",
	"--latest",
	prerelease ? "--prerelease" : "",
	errorHappened ? "--draft" : "",
	artifacts.join(" "),
].filter(Boolean).join(" ");
try {
	execSync(releaseCommand, { stdio: "inherit" });
} catch (error) {
	console.error("✗ Failed to create release:", error);
	process.exit(1);
}
console.log(`✓ Release ${triggeringTag} created successfully`);
