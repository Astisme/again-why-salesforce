/**
 * Escapes text before writing generated HTML.
 *
 * @param {string} value Raw text.
 * @returns {string} Escaped text.
 */
function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/**
 * Converts Markdown inline links and code to safe HTML.
 *
 * @param {string} value Markdown text.
 * @returns {string} HTML text.
 */
function renderInlineMarkdown(value) {
	return escapeHtml(value)
		.replaceAll(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, href) => {
			const url = normalizeImageUrl(String(href));
			return `<img src="${escapeHtml(url)}" alt="${escapeHtml(String(alt))}" loading="lazy">`;
		})
		.replaceAll(/`([^`]+)`/g, "<code>$1</code>")
		.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replaceAll(/__([^_]+)__/g, "<strong>$1</strong>")
		.replaceAll("&lt;u&gt;", "<u>")
		.replaceAll("&lt;/u&gt;", "</u>")
		.replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
			const url = String(href);
			if (url.startsWith("http") || url.startsWith("mailto:") || url.startsWith("#")) {
				return `<a href="${escapeHtml(url)}">${label}</a>`;
			}
			const localDoc = url
				.replaceAll("../", "")
				.replaceAll("./", "")
				.replaceAll(".md", "")
				.split("/")
				.pop() || "Home";
			const wikiDocuments = globalThis.awsfWikiDocuments || {};
			const target = wikiDocuments[localDoc] ? `wiki.html?doc=${encodeURIComponent(localDoc)}` : "wiki.html";
			return `<a href="${escapeHtml(target)}">${label}</a>`;
		})
		.replaceAll(/\*([^*]+)\*/g, "<em>$1</em>")
		.replaceAll(/(^|[\s(])_([^_\n]+)_([\s).,!?]|$)/g, "$1<em>$2</em>$3");
}

/**
 * Decodes selected Markdown-safe HTML entities before block parsing.
 *
 * @param {string} value Markdown text.
 * @returns {string} Normalized Markdown text.
 */
function decodeMarkdownEntities(value) {
	return value
		.replaceAll("&#45;", "-")
		.replaceAll("&#x2D;", "-")
		.replaceAll("&nbsp;", " ");
}

/**
 * Converts GitHub blob image URLs to raw image URLs.
 *
 * @param {string} url Markdown image URL.
 * @returns {string} Browser-renderable image URL.
 */
function normalizeImageUrl(url) {
	return url
		.replace("https://github.com/Astisme/again-why-salesforce/blob/main/", "https://raw.githubusercontent.com/Astisme/again-why-salesforce/main/")
		.replace("https://github.com/Astisme/again-why-salesforce/raw/main/", "https://raw.githubusercontent.com/Astisme/again-why-salesforce/main/");
}

/**
 * Converts small Markdown subset used by project docs into HTML.
 *
 * @param {string} markdown Raw Markdown.
 * @returns {string} Rendered HTML.
 */
function renderMarkdown(markdown) {
	const visibleMarkdown = markdown.replaceAll(/<!--[\s\S]*?-->/g, "");
	const blocks = [];
	let listItems = [];
	let tableRows = [];
	let quoteLines = [];
	let codeLines = null;

	/**
	 * Flushes pending list items into block list.
	 *
	 * @returns {void}
	 */
	function flushList() {
		if (listItems.length === 0) {
			return;
		}
		const items = listItems
			.map((item) => `<li class="list-level-${Math.min(item.level, 3)}">${item.content}</li>`)
			.join("");
		blocks.push(`<ul>${items}</ul>`);
		listItems = [];
	}

	/**
	 * Flushes pending table rows into block list.
	 *
	 * @returns {void}
	 */
	function flushTable() {
		if (tableRows.length === 0) {
			return;
		}
		const [headerRow, separatorRow, ...bodyRows] = tableRows;
		const hasSeparator = separatorRow?.every((cell) => /^:?-+:?$/.test(cell.trim()));
		if (!hasSeparator) {
			blocks.push(...tableRows.map((row) => `<p>${row.map(renderInlineMarkdown).join(" ")}</p>`));
			tableRows = [];
			return;
		}
		const head = headerRow.map((cell) => `<th>${renderInlineMarkdown(cell.trim())}</th>`).join("");
		const body = bodyRows
			.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell.trim())}</td>`).join("")}</tr>`)
			.join("");
		blocks.push(`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
		tableRows = [];
	}

	/**
	 * Flushes pending blockquote lines into a callout or quote.
	 *
	 * @returns {void}
	 */
	function flushQuote() {
		if (quoteLines.length === 0) {
			return;
		}
		const text = quoteLines.join("\n").trim();
		const lowerText = text.toLowerCase();
		const type = lowerText.includes("warning")
			? "warning"
			: lowerText.includes("info")
				? "info"
				: "note";
		const rendered = text
			.split(/\n+/)
			.filter((line) => !/^!\[(info|warning)\]/i.test(line.trim()))
			.map(renderInlineMarkdown)
			.join("");
		const quoteListLines = text
			.split(/\n+/)
			.map((line) => line.trim())
			.filter(Boolean);
		if (type === "note" && quoteListLines.length > 0 && quoteListLines.every((line) => line.startsWith("- "))) {
			const items = quoteListLines
				.map((line) => `<li>${renderInlineMarkdown(line.slice(2))}</li>`)
				.join("");
			blocks.push(`<ul class="nested-list">${items}</ul>`);
			quoteLines = [];
			return;
		}
		blocks.push(`<blockquote class="callout ${type}">${rendered}</blockquote>`);
		quoteLines = [];
	}

	/**
	 * Parses one Markdown table row.
	 *
	 * @param {string} line Markdown table row.
	 * @returns {string[]} Table cells.
	 */
	function parseTableRow(line) {
		return line.replace(/^\|/, "").replace(/\|$/, "").split("|");
	}

	for (const rawLine of visibleMarkdown.split(/\r?\n/)) {
		const decodedLine = decodeMarkdownEntities(rawLine);
		const line = decodedLine.trim();
		if (codeLines) {
			if (line.startsWith("```")) {
				blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
				codeLines = null;
				continue;
			}
			codeLines.push(decodedLine);
			continue;
		}
		const decodedTrimmedLine = decodedLine.trim();
		const treeListMatch = decodedLine.match(/^(\s*)\|\s*-\s+(.+)$/);
		if (line.startsWith("```")) {
			flushQuote();
			flushTable();
			flushList();
			codeLines = [];
			continue;
		}
		if (!line || line === "---") {
			flushQuote();
			flushTable();
			flushList();
			continue;
		}
		if (treeListMatch) {
			flushQuote();
			flushTable();
			const level = treeListMatch[1].length + 1;
			listItems.push({ content: renderInlineMarkdown(treeListMatch[2]), level });
			continue;
		}
		if (line.includes("|") && !line.startsWith("> ")) {
			flushQuote();
			flushList();
			tableRows.push(parseTableRow(line));
			continue;
		}
		if (line === ">") {
			flushList();
			flushTable();
			quoteLines.push("");
			continue;
		}
		if (line.startsWith("<!--")) {
			flushQuote();
			flushTable();
			flushList();
			continue;
		}
		if (line.startsWith("# ")) {
			flushQuote();
			flushTable();
			flushList();
			blocks.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
			continue;
		}
		if (line.startsWith("## ")) {
			flushQuote();
			flushTable();
			flushList();
			blocks.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
			continue;
		}
		if (line.startsWith("### ")) {
			flushQuote();
			flushTable();
			flushList();
			blocks.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
			continue;
		}
		if (line.startsWith("#### ")) {
			flushQuote();
			flushTable();
			flushList();
			blocks.push(`<h4>${renderInlineMarkdown(line.slice(5))}</h4>`);
			continue;
		}
		if (line.startsWith("> ")) {
			flushList();
			flushTable();
			quoteLines.push(line.slice(2));
			continue;
		}
		if (decodedTrimmedLine.startsWith("- ") || decodedTrimmedLine.startsWith("* ") || /^\d+\.\s/.test(decodedTrimmedLine)) {
			flushQuote();
			flushTable();
			listItems.push({
				content: renderInlineMarkdown(decodedTrimmedLine.replace(/^(-|\*|\d+\.)\s/, "")),
				level: 0,
			});
			continue;
		}
		flushQuote();
		flushTable();
		flushList();
		blocks.push(`<p>${renderInlineMarkdown(decodedTrimmedLine.replaceAll("\\", ""))}</p>`);
	}
	if (codeLines) {
		blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
	}
	flushQuote();
	flushTable();
	flushList();
	return blocks.join("");
}

/**
 * Converts changelog Markdown releases into collapsed detail panels.
 *
 * @param {string} markdown Raw changelog Markdown.
 * @returns {string} Rendered changelog HTML.
 */
function renderChangelog(markdown) {
	const visibleMarkdown = markdown.replaceAll(/<!--[\s\S]*?-->/g, "");
	const releaseParts = visibleMarkdown.split(/\n# (?=v\d+\.\d+\.\d+)/);
	const intro = renderMarkdown(releaseParts.shift() || "");
	const releases = releaseParts
		.filter((part) => part.trim())
		.map((part, index) => {
			const releaseMarkdown = `# ${part.trim()}`;
			const title = releaseMarkdown.match(/^#\s+(.+)$/m)?.[1] || "Release";
			return `<details class="release-panel" ${index === 0 ? "open" : ""}><summary>${escapeHtml(title)}</summary>${renderMarkdown(releaseMarkdown.replace(/^#\s+.+\n?/, ""))}</details>`;
		})
		.join("");
	return `${intro}${releases}`;
}

globalThis.awsfMarkdown = {
	renderChangelog,
	renderMarkdown,
};
