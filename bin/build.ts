import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: [
		"./src/salesforce/import.js",
	],
	outfile: "./src/salesforce/bundledContent.js",
	bundle: true,
	minify: false,
});

await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: [
		"./src/background/background.js",
	],
	outfile: "./src/background/bundledBackground.js",
	bundle: true,
	minify: false,
});

esbuild.stop();
