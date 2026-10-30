import { expect, mock, test } from "bun:test";

const scenarios = [
	{ name: "stable", status: 0, artifact: true, prerelease: false },
	{ name: "prerelease", status: 0, artifact: true, prerelease: true },
	{ name: "build failure", status: 1, artifact: true, prerelease: false },
	{ name: "missing status", status: null, artifact: true, prerelease: false },
	{ name: "missing artifact", status: 0, artifact: false, prerelease: false },
	{
		name: "spawn failure",
		status: 0,
		artifact: true,
		prerelease: false,
		spawnError: true,
	},
	{
		name: "publication failure",
		status: 0,
		artifact: true,
		prerelease: false,
		publishError: true,
	},
];

test("release orchestration preserves artifacts, flags and failure handling without publishing", async () => {
	const originalExitCode = process.exitCode;
	const environmentKeys = [
		"TRIGGERING_TAG",
		"TAG_VERSION",
		"PRERELEASE",
		"RELEASE_NOTES",
	] as const;
	const originalEnvironment = environmentKeys.map((key) => process.env[key]);
	try {
		for (const [index, scenario] of scenarios.entries()) {
			const builds: { command: string; args: string[] }[] = [];
			const releases: { command: string; args: string[] }[] = [];
			mock.module("node:child_process", () => ({
				/**
				 * Records builds without launching subprocesses.
				 *
				 * @param {string} command Executable requested by release script.
				 * @param {string[]} args Build arguments.
				 * @return {{ status: number | null }} Simulated process result.
				 */
				spawnSync(command: string, args: string[]) {
					builds.push({ command, args });
					if (scenario.spawnError) {
						throw new Error("validation spawn failure");
					}
					return { status: scenario.status };
				},
				/**
				 * Records publication without contacting GitHub.
				 *
				 * @param {string} command Executable requested by release script.
				 * @param {string[]} args Release arguments.
				 * @return {void}
				 */
				execFileSync(command: string, args: string[]) {
					releases.push({ command, args });
					if (scenario.publishError) {
						throw new Error("validation publication failure");
					}
				},
			}));
			mock.module("node:fs", () => ({
				existsSync: () => scenario.artifact,
			}));
			process.env.TRIGGERING_TAG = "v2.2.6.0";
			process.env.TAG_VERSION = "2.2.6.0";
			process.env.PRERELEASE = String(scenario.prerelease);
			if (index === 0) {
				delete process.env.RELEASE_NOTES;
			} else {
				process.env.RELEASE_NOTES = "./validation-notes.txt";
			}
			process.exitCode = 0;
			await import(`../../bin/build-releases.ts?scenario=${index}`);

			expect(builds).toEqual(
				["chrome", "firefox", "safari"].map((browser) => ({
					command: "bun",
					args: ["run", `build-${browser}`],
				})),
			);
			expect(releases).toHaveLength(1);
			expect(releases[0].command).toBe("gh");
			const args = releases[0].args;
			expect(args.slice(0, 5)).toEqual([
				"release",
				"create",
				"v2.2.6.0",
				"--title",
				"v2.2.6.0",
			]);
			expect(args[6]).toBe(
				index === 0 ? "./docs/CHANGELOG.md" : "./validation-notes.txt",
			);
			const draft =
				scenario.status !== 0 ||
				!scenario.artifact ||
				scenario.spawnError === true;
			expect(args.includes("--draft")).toBe(draft);
			expect(args.includes("--prerelease")).toBe(
				!draft && scenario.prerelease,
			);
			expect(args.includes("--latest")).toBe(
				draft || !scenario.prerelease,
			);
			if (draft) {
				expect(args.filter((arg) => arg.startsWith("bin/"))).toEqual(
					[],
				);
			} else {
				expect(args.slice(-3)).toEqual([
					"bin/awsf-chrome-v2.2.6.0.zip",
					"bin/awsf-firefox-v2.2.6.0.zip",
					"bin/awsf-safari-v2.2.6.0.dmg",
				]);
			}
			expect(process.exitCode).toBe(scenario.publishError ? 1 : 0);
		}
	} finally {
		mock.restore();
		for (const [index, key] of environmentKeys.entries()) {
			const value = originalEnvironment[index];
			if (value == null) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
		process.exitCode = originalExitCode ?? 0;
	}
});
