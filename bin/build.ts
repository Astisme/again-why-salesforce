import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";

await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: [
        "./salesforce/import.js",
	],
	outfile: "./salesforce/bundledContent.js",
	bundle: true,
	minify: false,
});

await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: [
		"./background/background.js",
	],
	outfile: "./background/bundledBackground.js",
	bundle: true,
	minify: false,
});

esbuild.stop();
