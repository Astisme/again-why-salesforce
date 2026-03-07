const deno = Deno.execPath();
const salesforceTests = [
	"./tests/salesforce/tutorial.test.ts",
	"./tests/salesforce/favourite-manager.test.ts",
];

async function runCommand(args: string[], options: Deno.CommandOptions = {}) {
	const child = new Deno.Command(deno, {
		args,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
		...options,
	}).spawn();
	const status = await child.status;
	if (!status.success) {
		throw new Error(`deno ${args.join(" ")} failed with ${status.code}`);
	}
}

await runCommand(["task", "dev-chrome"], { cwd: Deno.cwd() });

for (const testPath of salesforceTests) {
	await runCommand([
		"test",
		"--no-check",
		"--import=tests/mocks.ts",
		"-A",
		testPath,
	], { cwd: Deno.cwd() });
}
