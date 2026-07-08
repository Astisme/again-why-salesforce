"use strict";
import process from "node:process";
import templateManifest from "./template-manifest.json" with { type: "json" };
import { writeFileSync } from "node:fs";
import { runBuildManifest } from "./build-manifest-runtime.mjs";

runBuildManifest({
	argv: process.argv,
	manifest: structuredClone(templateManifest),
	writeFileSyncFn: writeFileSync,
});
