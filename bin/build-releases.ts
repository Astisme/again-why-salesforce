import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { env, exit } from "node:process";

// Builds browser extensions for all supported browsers and creates a GitHub release
const browsers: string[] = [
	"chrome",
	"firefox",
	"safari",
	//"edge",
];
const artifacts: string[] = [];
const releaseNotes: string = env.RELEASE_NOTES ??
	"./docs/CHANGELOG.md";
const triggeringTag: string = env.TRIGGERING_TAG;
const tagVersion: string = env.TAG_VERSION;
const prerelease: boolean = env.PRERELEASE === "true";

console.log("Building browser extensions...");
let errorHappened: boolean = false;
for (const browser of browsers) {
	console.log(`Building ${browser}...`);
	try {
		const cmd = new Deno.Command("deno", {
			args: ["task", `build-${browser}`],
			stdout: "piped",
			stderr: "piped",
		});
		const child = cmd.spawn();
		// Stream stdout
		(async () => {
			const reader = child.stdout
				.pipeThrough(new TextDecoderStream())
				[Symbol.asyncIterator]();

			for await (const chunk of reader) {
				Deno.stdout.write(new TextEncoder().encode(chunk));
			}
		})();
		// Stream stderr
		(async () => {
			const reader = child.stderr
				.pipeThrough(new TextDecoderStream())
				[Symbol.asyncIterator]();

			for await (const chunk of reader) {
				Deno.stderr.write(new TextEncoder().encode(chunk));
			}
		})();
		const { code } = await child.status;
		console.log(`Process exited with code ${code}`);
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
	"--notes-file",
	`"${releaseNotes}"`,
	errorHappened ? "--draft" : "",
    !errorHappened && prerelease ? "--prerelease" : "--latest",
	artifacts.join(" "),
].filter(Boolean).join(" ");
try {
	execSync(releaseCommand, { stdio: "inherit" });
} catch (error) {
	console.error("✗ Failed to create release:", error);
	exit(1);
}
console.log(`✓ Release ${triggeringTag} created successfully`);
