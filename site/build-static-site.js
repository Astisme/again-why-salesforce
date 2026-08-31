import { wikiDocuments, wikiTitles } from "./wiki-data.js";

const siteDir = new URL("./", import.meta.url);
const repoDir = new URL("../", siteDir);
const outputDir = new URL("../site-dist/", siteDir);
const wikiDir = new URL(
	`${Deno.env.get("AWSF_WIKI_DIR") || "../wiki.again-why-salesforce"}/`,
	repoDir,
);
const releaseApiUrl =
	"https://api.github.com/repos/Astisme/again-why-salesforce/releases/latest";

globalThis.awsfWikiDocuments = wikiDocuments;
await import("./markdown.js");

/**
 * Empties a generated directory with short retry for local Windows file locks.
 *
 * @param {URL} url Directory URL.
 * @returns {Promise<void>} Promise resolved after removal.
 */
async function emptyGeneratedDirectory(url) {
	await Deno.mkdir(url, { recursive: true });
	for await (const entry of Deno.readDir(url)) {
		const entryUrl = new URL(entry.name, url);
		for (let attempt = 0; attempt < 5; attempt += 1) {
			try {
				await Deno.remove(entryUrl, { recursive: true });
				break;
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					break;
				}
				if (attempt === 4) {
					throw error;
				}
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
		}
	}
}

/**
 * Copies source site to output directory.
 *
 * @returns {Promise<void>} Promise resolved after copy.
 */
async function copySite() {
	await emptyGeneratedDirectory(outputDir);
	for await (const entry of Deno.readDir(siteDir)) {
		if (
			entry.name === "build-static-site.js" ||
			entry.name === "markdown.js"
		) {
			continue;
		}
		await Deno.copyFile(
			new URL(entry.name, siteDir),
			new URL(entry.name, outputDir),
		);
	}
}

/**
 * Reads text from local file.
 *
 * @param {URL} url File URL.
 * @returns {Promise<string>} File content.
 */
function readText(url) {
	return Deno.readTextFile(url);
}

/**
 * Writes text to local file.
 *
 * @param {URL} url File URL.
 * @param {string} content File content.
 * @returns {Promise<void>} Promise resolved after write.
 */
function writeText(url, content) {
	return Deno.writeTextFile(url, content);
}

/**
 * Removes runtime Markdown parser script from generated static HTML.
 *
 * @param {string} html HTML content.
 * @returns {string} HTML without Markdown parser script.
 */
function removeMarkdownScript(html) {
	return html.replaceAll(
		/\n?\s*<script src="(?:\.\.\/){0,2}markdown\.js" defer><\/script>/g,
		"",
	);
}

/**
 * Gets latest release label.
 *
 * @returns {Promise<string | null>} Latest release label.
 */
async function getLatestReleaseLabel() {
	const response = await fetch(releaseApiUrl);
	if (response.ok) {
		const release = await response.json();
		return release.name || release.tag_name || null;
	}
	const manifest = JSON.parse(
		await readText(
			new URL("src/manifest/template-manifest.json", repoDir),
		),
	);
	return `v${manifest.version}`;
}

/**
 * Converts wiki doc id to generated page href.
 *
 * @param {string} doc Wiki document id.
 * @param {"root" | "wiki" | "wiki-home"} context Link context.
 * @returns {string} Static page URL.
 */
function getWikiPageName(doc, context = "root") {
	if (context === "wiki-home") {
		return doc === "Home" ? "./" : `./${doc}/`;
	}
	if (context === "wiki") {
		return doc === "Home" ? "../" : `../${doc}/`;
	}
	return doc === "Home" ? "wiki/" : `wiki/${doc}/`;
}

/**
 * Gets wiki home href for current link context.
 *
 * @param {"root" | "wiki" | "wiki-home"} context Link context.
 * @returns {string} Wiki home href.
 */
function getWikiHomeHref(context) {
	if (context === "wiki-home") {
		return "./";
	}
	return context === "wiki" ? "../" : "wiki/";
}

/**
 * Converts wiki doc id to generated output file URL.
 *
 * @param {string} doc Wiki document id.
 * @returns {URL} Static page output file URL.
 */
function getWikiOutputUrl(doc) {
	return doc === "Home"
		? new URL("wiki/index.html", outputDir)
		: new URL(`wiki/${doc}/index.html`, outputDir);
}

/**
 * Rewrites runtime wiki query links to static generated links.
 *
 * @param {string} html HTML content.
 * @param {"root" | "wiki" | "wiki-home"} context Link context.
 * @returns {string} HTML content with static wiki links.
 */
function rewriteWikiLinks(html, context = "root") {
	return html
		.replaceAll(
			/href="(\.?\/?)wiki\.html\?doc=([^"#]+)(#[^"]*)?"/g,
			(_match, prefix, encodedDoc, hash = "") => {
				const doc = decodeURIComponent(encodedDoc);
				return wikiDocuments[doc]
					? `href="${prefix}${getWikiPageName(doc, context)}${hash}"`
					: `href="${prefix}${getWikiHomeHref(context)}"`;
			},
		)
		.replaceAll(
			/href="(\.?\/?)wiki\.html"/g,
			(_match, prefix) => `href="${prefix}${getWikiHomeHref(context)}"`,
		);
}

/**
 * Rewrites wiki shell relative paths for nested generated pages.
 *
 * @param {string} html HTML content.
 * @param {string} prefix Relative prefix back to site root.
 * @returns {string} HTML content with nested-safe paths.
 */
function rewriteWikiShellPaths(html, prefix) {
	return html
		.replaceAll(
			/href="(index|features|installation|changelog|articles|privacy)\.html"/g,
			`href="${prefix}$1.html"`,
		)
		.replaceAll('href="wiki.css"', `href="${prefix}wiki.css"`)
		.replaceAll('src="markdown.js"', `src="${prefix}markdown.js"`)
		.replaceAll('src="script.js"', `src="${prefix}script.js"`);
}

/**
 * Replaces release labels with static build value.
 *
 * @param {string} html HTML content.
 * @param {string | null} latestRelease Latest release label.
 * @returns {string} HTML content with static release labels.
 */
function replaceReleaseLabels(html, latestRelease) {
	if (!latestRelease) {
		return html;
	}
	return html.replaceAll(
		/(<(?:span|strong)\s+class="js-current-release")>0(<\/(?:span|strong)>)/g,
		`$1 data-static-release="true">${latestRelease}$2`,
	);
}

/**
 * Creates a stable slug from heading text.
 *
 * @param {string} value Heading text.
 * @param {Set<string>} usedSlugs Used slugs.
 * @returns {string} Unique slug.
 */
function createSlug(value, usedSlugs) {
	const baseSlug = value
		.toLowerCase()
		.replaceAll(/[^a-z0-9\s-]/g, "")
		.trim()
		.replaceAll(/\s+/g, "-") || "section";
	let slug = baseSlug;
	let index = 2;
	while (usedSlugs.has(slug)) {
		slug = `${baseSlug}-${index}`;
		index += 1;
	}
	usedSlugs.add(slug);
	return slug;
}

/**
 * Escapes text for safe HTML interpolation.
 *
 * @param {string} value Raw text.
 * @returns {string} Escaped text.
 */
function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/**
 * Adds heading ids and returns rendered table of contents.
 *
 * @param {string} html Rendered article HTML.
 * @returns {{ html: string; toc: string }} Article HTML and table of contents.
 */
function addHeadingIds(html) {
	const usedSlugs = new Set();
	const links = [];
	const rendered = html.replaceAll(
		/<(h[1-4])>([\s\S]*?)<\/\1>/g,
		(_match, tag, text) => {
			const slug = createSlug(text, usedSlugs);
			const label = escapeHtml(text);
			links.push(
				`<a href="#${slug}" class="toc-${tag}">${label}</a>`,
			);
			return `<${tag} id="${slug}">${text}</${tag}>`;
		},
	);
	return {
		html: rendered,
		toc: links.join("\n") || `<a href="#content">Overview</a>`,
	};
}

/**
 * Replaces article content in page shell.
 *
 * @param {string} html Page HTML.
 * @param {string} articleHtml Rendered article HTML.
 * @returns {string} Page HTML.
 */
function replaceMarkdownArticle(html, articleHtml) {
	return html.replace(
		/<article([^>]*?)class="markdown-body"([^>]*?)data-markdown-source="[^"]+"([^>]*?)>[\s\S]*?<\/article>/,
		`<article$1class="markdown-body"$2$3>${articleHtml}</article>`,
	);
}

/**
 * Builds static changelog and privacy pages.
 *
 * @param {string | null} latestRelease Latest release label.
 * @returns {Promise<void>} Promise resolved after pages are written.
 */
async function buildMarkdownPages(latestRelease) {
	const changelogTemplate = await readText(
		new URL("changelog.html", outputDir),
	);
	const changelogMarkdown = await readText(
		new URL("docs/CHANGELOG.md", repoDir),
	);
	const changelogHtml = globalThis.awsfMarkdown.renderChangelog(
		changelogMarkdown,
		latestRelease,
	);
	await writeText(
		new URL("changelog.html", outputDir),
		removeMarkdownScript(
			rewriteWikiLinks(
				replaceReleaseLabels(
					replaceMarkdownArticle(changelogTemplate, changelogHtml),
					latestRelease,
				),
			),
		),
	);

	const privacyTemplate = await readText(new URL("privacy.html", outputDir));
	const privacyMarkdown = await readText(
		new URL("docs/PRIVACY_POLICY.md", repoDir),
	);
	await writeText(
		new URL("privacy.html", outputDir),
		removeMarkdownScript(
			rewriteWikiLinks(
				replaceMarkdownArticle(
					privacyTemplate,
					globalThis.awsfMarkdown.renderMarkdown(privacyMarkdown),
				),
			),
		),
	);
}

/**
 * Builds one static wiki page.
 *
 * @param {string} template Wiki shell template.
 * @param {string} doc Wiki document id.
 * @param {string} markdown Wiki Markdown.
 * @returns {string} Static page HTML.
 */
function buildWikiPage(template, doc, markdown) {
	const rendered = addHeadingIds(
		globalThis.awsfMarkdown.renderMarkdown(markdown),
	);
	const prefix = doc === "Home" ? "../" : "../../";
	const linkContext = doc === "Home" ? "wiki-home" : "wiki";
	let html = template
		.replace(
			/<h1 class="js-wiki-title">[\s\S]*?<\/h1>/,
			`<h1 class="js-wiki-title">${wikiTitles[doc] || doc}</h1>`,
		)
		.replace(
			/<p\s+class="js-wiki-description">[\s\S]*?<\/p>/,
			`<p class="js-wiki-description">Article from ${
				wikiDocuments[doc]
			}</p>`,
		)
		.replace(
			/<article class="markdown-body" data-markdown-source="wiki">[\s\S]*?<\/article>/,
			`<article class="markdown-body">${rendered.html}</article>`,
		)
		.replace(
			/<nav class="js-article-toc">[\s\S]*?<\/nav>/,
			`<nav class="js-article-toc">${rendered.toc}</nav>`,
		);
	html = removeMarkdownScript(
		rewriteWikiLinks(rewriteWikiShellPaths(html, prefix), linkContext),
	);
	if (doc !== "Home") {
		html = html.replaceAll(
			new RegExp(`href="${getWikiPageName(doc, linkContext)}"`, "g"),
			`aria-current="page" href="${getWikiPageName(doc, linkContext)}"`,
		);
	}
	return html;
}

/**
 * Builds static wiki pages from raw GitHub wiki content.
 *
 * @returns {Promise<void>} Promise resolved after pages are written.
 */
async function buildWikiPages() {
	const template = await readText(new URL("wiki.html", siteDir));
	for (const [doc, path] of Object.entries(wikiDocuments)) {
		const markdown = await readText(new URL(path, wikiDir));
		const outputUrl = getWikiOutputUrl(doc);
		await Deno.mkdir(new URL("./", outputUrl), { recursive: true });
		await writeText(outputUrl, buildWikiPage(template, doc, markdown));
	}
	await Deno.remove(new URL("wiki.html", outputDir));
}

/**
 * Rewrites normal pages with generated links and static release labels.
 *
 * @param {string | null} latestRelease Latest release label.
 * @returns {Promise<void>} Promise resolved after page writes.
 */
async function rewriteCopiedPages(latestRelease) {
	for await (const entry of Deno.readDir(outputDir)) {
		if (!entry.isFile || !entry.name.endsWith(".html")) {
			continue;
		}
		const url = new URL(entry.name, outputDir);
		const html = await readText(url);
		await writeText(
			url,
			removeMarkdownScript(
				replaceReleaseLabels(rewriteWikiLinks(html), latestRelease),
			),
		);
	}
}

const latestRelease = await getLatestReleaseLabel();
await copySite();
await rewriteCopiedPages(latestRelease);
await buildMarkdownPages(latestRelease);
await buildWikiPages();
