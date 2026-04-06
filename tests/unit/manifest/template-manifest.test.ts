import { assertEquals } from "@std/testing/asserts";
import manifestJson from "../../../src/manifest/template-manifest.json" with {
	type: "json",
};

type TemplateManifest = {
	background: {
		scripts?: string[];
		service_worker: string;
	};
	content_scripts: Array<{
		js: string[];
	}>;
};

Deno.test("template-manifest points content and background bundles to generated", () => {
	const manifest = manifestJson as TemplateManifest;
	assertEquals(
		manifest.content_scripts[0].js[0],
		"generated/bundledContent.js",
	);
	assertEquals(
		manifest.background.service_worker,
		"generated/bundledBackground.js",
	);
	assertEquals(
		manifest.background.scripts?.[0],
		"generated/bundledBackground.js",
	);
});
