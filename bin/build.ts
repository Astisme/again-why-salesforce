import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: [
		"./src/entrypoints/content.js",
	],
	outfile: "./src/generated/bundledContent.js",
	bundle: true,
	minify: false,
});

await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: [
		"./src/entrypoints/background.js",
	],
	outfile: "./src/generated/bundledBackground.js",
	bundle: true,
	minify: false,
});

esbuild.stop();
