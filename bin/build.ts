import * as esbuild from "esbuild";

const bundleConfigs = [
	{
		entryPoint: "./src/entrypoints/content.js",
		outfile: "./src/generated/bundledContent.js",
	},
	{
		entryPoint: "./src/entrypoints/background.js",
		outfile: "./src/generated/bundledBackground.js",
	},
	{
		entryPoint: "./src/entrypoints/popup.js",
		outfile: "./src/generated/bundledPopup.js",
		format: "esm",
	},
	{
		entryPoint: "./src/entrypoints/options.js",
		outfile: "./src/generated/bundledOptions.js",
		format: "esm",
	},
	{
		entryPoint: "./src/entrypoints/lightning-navigation.js",
		outfile: "./src/generated/bundledLightningNavigation.js",
		format: "esm",
	},
];

/**
 * Builds one entrypoint file into the corresponding generated bundle.
 *
 * @param {string} entryPoint - Source entrypoint path.
 * @param {string} outfile - Generated output path.
 * @param {esbuild.Format} [format] - Optional explicit output format.
 * @return {Promise<void>} Promise resolved when the bundle build completes.
 */
async function buildBundle(
	entryPoint: string,
	outfile: string,
	format?: esbuild.Format,
) {
	await esbuild.build({
		entryPoints: [entryPoint],
		outfile,
		format,
		bundle: true,
		minify: false,
	});
}

for (const config of bundleConfigs) {
	await buildBundle(config.entryPoint, config.outfile, config.format);
}

esbuild.stop();
