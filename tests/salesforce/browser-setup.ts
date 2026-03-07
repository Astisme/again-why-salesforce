import {
	createReadySalesforceSession,
	dumpState,
	getExtensionPath,
	getUserDataDir,
	sleep,
} from "./helpers.ts";

const profileDir = await getUserDataDir();
const extensionPath = getExtensionPath();
const { browser, page } = await createReadySalesforceSession();

console.log(`Using Chrome profile: ${profileDir}`);
console.log(`Using unpacked extension from: ${extensionPath}`);
await dumpState(page, "ready");
console.log(
	"Salesforce profile is ready and the extension content script is loaded on Setup Home. Press Ctrl+C to close this browser.",
);

let shouldExit = false;
Deno.addSignalListener(
	Deno.build.os === "windows" ? "SIGINT" : "SIGTERM",
	() => {
		shouldExit = true;
	},
);

try {
	while (!shouldExit) {
		await sleep(1000);
	}
} finally {
	await browser.close();
}
