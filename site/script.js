const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
const releaseLabels = document.querySelectorAll(".js-current-release");
const markdownSource = document.querySelector("[data-markdown-source]");
const totalUserLabels = document.querySelectorAll(".js-total-users");
const averageRatingLabels = document.querySelectorAll(".js-average-rating");
const wikiTitleLabel = document.querySelector(".js-wiki-title");
const wikiDescriptionLabel = document.querySelector(".js-wiki-description");
const articleToc = document.querySelector(".js-article-toc");
const wikiSidebar = document.querySelector(".sidebar");

navToggle?.addEventListener("click", () => {
	const isOpen = navToggle.getAttribute("aria-expanded") === "true";
	navToggle.setAttribute("aria-expanded", String(!isOpen));
	siteNav?.setAttribute("data-open", String(!isOpen));
});

siteNav?.addEventListener("click", (event) => {
	if (event.target instanceof HTMLAnchorElement) {
		navToggle?.setAttribute("aria-expanded", "false");
		siteNav.removeAttribute("data-open");
	}
});

const installTargets = {
	chrome: {
		label: "Install for Chrome",
		url: "https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi",
	},
	edge: {
		label: "Install for Edge",
		url: "https://microsoftedge.microsoft.com/addons/detail/dfdjpokbfeaamjcomllncennmfhpldmm",
	},
	firefox: {
		label: "Install for Firefox",
		url: "https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/",
	},
	safari: {
		label: "Install for Safari",
		url: "https://github.com/Astisme/again-why-salesforce/releases/latest",
	},
	unknown: {
		label: "Open latest release",
		url: "https://github.com/Astisme/again-why-salesforce/releases/latest",
	},
};

const wikiDocuments = {
	"Home": "Home.md",
	"Manage-Tabs": "Manage-Tabs/Manage-Tabs.md",
	"Manage-Tabs-modal": "Manage-Tabs/Manage-Tabs-modal.md",
	"Save-a-Tab": "Manage-Tabs/Save-a-Tab.md",
	"Remove-a-Tab": "Manage-Tabs/Remove-a-Tab.md",
	"Remove-Multiple-Tabs": "Manage-Tabs/Remove-Multiple-Tabs.md",
	"Import-Tabs": "Manage-Tabs/Import-Tabs.md",
	"Export-Tabs": "Manage-Tabs/Export-Tabs.md",
	"Sort-Tabs": "Manage-Tabs/Sort-Tabs.md",
	"Context-Menu": "Manage-Tabs/Context-Menu.md",
	"Commands": "Manage-Tabs/Commands.md",
	"Settings": "Settings/Settings.md",
	"Style-your-Tabs": "Settings/Style-your-Tabs.md",
	"Pick-Language": "Settings/Pick-Language.md",
	"Optional-Permissions": "Settings/Optional-Permissions.md",
	"No-Simple-Analytics": "Settings/No-Simple-Analytics.md",
	"Keep-Tabs-Sorted": "Settings/Keep-Tabs-Sorted.md",
	"Open-Other-Org": "Open-Other-Org.md",
	"Tutorial": "Tutorial.md",
	"Safari-Installation": "Safari-Installation.md",
	"What-is-a-Tab": "Tab-Info/What-is-a-Tab.md",
	"Pinned-Tabs": "Tab-Info/Pinned-Tabs.md",
	"Manual-Sort": "Tab-Info/Manual-Sort.md",
};

const wikiTitles = {
	"Home": "Wiki home",
	"Manage-Tabs": "Manage Tabs",
	"Manage-Tabs-modal": "Manage Tabs modal",
	"Save-a-Tab": "Save a Tab",
	"Remove-a-Tab": "Remove a Tab",
	"Remove-Multiple-Tabs": "Remove Multiple Tabs",
	"Import-Tabs": "Import Tabs",
	"Export-Tabs": "Export Tabs",
	"Sort-Tabs": "Sort Tabs",
	"Context-Menu": "Context Menus",
	"Commands": "Commands / Hot Keys",
	"Settings": "Settings",
	"Style-your-Tabs": "Style your Tabs",
	"Pick-Language": "Pick language",
	"Optional-Permissions": "Optional permissions",
	"No-Simple-Analytics": "Disable Simple Analytics",
	"Keep-Tabs-Sorted": "Keep Tabs sorted",
	"Open-Other-Org": "Open Other Org",
	"Tutorial": "Tutorial",
	"Safari-Installation": "Safari Installation",
	"What-is-a-Tab": "What is a Tab?",
	"Pinned-Tabs": "Pinned Tabs",
	"Manual-Sort": "Manual Sort",
};

globalThis.awsfWikiDocuments = wikiDocuments;

/**
 * Detects current browser family for extension store routing.
 *
 * @param {string} userAgent Browser user agent string.
 * @returns {keyof typeof installTargets} Install target key.
 */
function detectInstallTarget(userAgent) {
	if (userAgent.includes("Edg/")) {
		return "edge";
	}
	if (userAgent.includes("Firefox/")) {
		return "firefox";
	}
	if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && !userAgent.includes("Chromium/")) {
		return "safari";
	}
	if (userAgent.includes("Chrome/") || userAgent.includes("Chromium/")) {
		return "chrome";
	}
	return "unknown";
}

/**
 * Updates install links so Chrome text is not shown to non-Chrome browsers.
 *
 * @returns {void}
 */
function updateInstallLinks() {
	const detectedTarget = detectInstallTarget(navigator.userAgent);
	const target = installTargets[detectedTarget];
	document.querySelectorAll(".js-install-link").forEach((link) => {
		link.textContent = target.label;
		link.setAttribute("href", target.url);
	});
	document.querySelectorAll(".js-safari-guide").forEach((link) => {
		link.toggleAttribute("hidden", detectedTarget !== "safari");
	});
}

/**
 * Fetches latest release name from GitHub.
 *
 * @returns {Promise<string | null>} Latest release label, or null when unavailable.
 */
async function getLatestReleaseLabel() {
	const response = await fetch("https://api.github.com/repos/Astisme/again-why-salesforce/releases/latest");
	if (response.ok) {
		const release = await response.json();
		return release.name || release.tag_name || null;
	}

	const manifestResponse = await fetch("https://raw.githubusercontent.com/Astisme/again-why-salesforce/main/src/manifest/template-manifest.json");
	if (!manifestResponse.ok) {
		return null;
	}
	const manifest = await manifestResponse.json();
	return `v${manifest.version}`;
}

/**
 * Animates numeric text from 0 to target value.
 *
 * @param {Element} label Target label.
 * @param {number} target Numeric target.
 * @param {{ prefix?: string; suffix?: string; decimals?: number; duration?: number; }} [options] Animation options.
 * @returns {void}
 */
function animateNumber(label, target, options = {}) {
	const {
		prefix = "",
		suffix = "",
		decimals = 0,
		duration = 900,
	} = options;
	const formatter = new Intl.NumberFormat("en", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
	if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		label.textContent = `${prefix}${formatter.format(target)}${suffix}`;
		return;
	}
	const startTime = performance.now();

	/**
	 * Renders next animation frame.
	 *
	 * @param {number} frameTime Frame timestamp.
	 * @returns {void}
	 */
	function tick(frameTime) {
		const progress = Math.min((frameTime - startTime) / duration, 1);
		const eased = 1 - ((1 - progress) ** 3);
		const value = target * eased;
		label.textContent = `${prefix}${formatter.format(value)}${suffix}`;
		if (progress < 1) {
			requestAnimationFrame(tick);
		}
	}

	requestAnimationFrame(tick);
}

/**
 * Animates semantic version text from zero segments to target segments.
 *
 * @param {Element} label Target label.
 * @param {string} value Release label.
 * @returns {boolean} True when release was animated.
 */
function animateReleaseLabel(label, value) {
	const match = value.match(/^(v?)(\d+)\.(\d+)\.(\d+)(.*)$/i);
	if (!match) {
		return false;
	}
	const prefix = match[1];
	const major = Number(match[2]);
	const minor = Number(match[3]);
	const patch = Number(match[4]);
	const suffix = match[5];
	const duration = 900;
	if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		label.textContent = value;
		return true;
	}
	const startTime = performance.now();

	/**
	 * Renders next semantic version animation frame.
	 *
	 * @param {number} frameTime Frame timestamp.
	 * @returns {void}
	 */
	function tick(frameTime) {
		const progress = Math.min((frameTime - startTime) / duration, 1);
		const eased = 1 - ((1 - progress) ** 3);
		label.textContent = `${prefix}${Math.floor(major * eased)}.${Math.floor(minor * eased)}.${Math.floor(patch * eased)}${suffix}`;
		if (progress < 1) {
			requestAnimationFrame(tick);
		}
	}
	requestAnimationFrame(tick);
	return true;
}

/**
 * Replaces static release placeholders with live GitHub release value.
 *
 * @returns {Promise<void>} Promise resolved after release labels update or fallback.
 */
async function hydrateReleaseLabels() {
	const latestRelease = await getLatestReleaseLabel();
	if (!latestRelease) {
		releaseLabels.forEach((label) => {
			label.textContent = "0";
		});
		return;
	}
	releaseLabels.forEach((label) => {
		if (!animateReleaseLabel(label, latestRelease)) {
			label.textContent = latestRelease;
		}
	});
}

/**
 * Creates a stable slug from heading text.
 *
 * @param {string} value Heading text.
 * @param {Set<string>} usedSlugs Slugs already assigned.
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
 * Builds right-side table of contents from rendered article headings.
 *
 * @returns {void}
 */
function hydrateArticleToc() {
	if (!articleToc || !markdownSource) {
		return;
	}
	const headings = [...markdownSource.querySelectorAll("h1, h2, h3, h4")];
	const usedSlugs = new Set();
	articleToc.replaceChildren();
	if (headings.length === 0) {
		const link = document.createElement("a");
		link.href = "#content";
		link.textContent = "Overview";
		articleToc.append(link);
		return;
	}
	for (const heading of headings) {
		if (!heading.id) {
			heading.id = createSlug(heading.textContent || "section", usedSlugs);
		}
		const link = document.createElement("a");
		link.href = `#${heading.id}`;
		link.textContent = heading.textContent || "Section";
		link.className = `toc-${heading.tagName.toLowerCase()}`;
		articleToc.append(link);
	}
}

/**
 * Highlights current wiki page in left navigation.
 *
 * @returns {void}
 */
function hydrateWikiSidebar() {
	if (!wikiSidebar) {
		return;
	}
	const doc = new URLSearchParams(location.search).get("doc") || "Home";
	const currentHref = `wiki.html?doc=${encodeURIComponent(doc)}`;
	for (const link of wikiSidebar.querySelectorAll("a")) {
		if (!(link instanceof HTMLAnchorElement)) {
			continue;
		}
		const isCurrent = link.getAttribute("href") === currentHref;
		if (isCurrent) {
			link.setAttribute("aria-current", "page");
		} else {
			link.removeAttribute("aria-current");
		}
	}
}

/**
 * Builds raw GitHub URL for selected local content wrapper.
 *
 * @param {Element} target Markdown target element.
 * @returns {string | null} Raw content URL.
 */
function getMarkdownUrl(target) {
	if (target.getAttribute("data-markdown-source") === "changelog") {
		return "https://raw.githubusercontent.com/Astisme/again-why-salesforce/main/docs/CHANGELOG.md";
	}
	if (target.getAttribute("data-markdown-source") === "privacy") {
		return "https://raw.githubusercontent.com/Astisme/again-why-salesforce/main/docs/PRIVACY_POLICY.md";
	}

	const doc = new URLSearchParams(location.search).get("doc") || "Home";
	const path = wikiDocuments[doc] || wikiDocuments.Home;
	return `https://raw.githubusercontent.com/wiki/Astisme/again-why-salesforce/${path}`;
}

/**
 * Fetches public store and analytics metrics.
 *
 * @returns {Promise<{ users: number; rating: number | null; }>} Combined public metrics.
 */
async function getPublicStoreMetrics() {
	const [chromeResult, edgeResult, firefoxResult, safariResult] = await Promise.allSettled([
		fetch("https://img.shields.io/chrome-web-store/users/bceeoimjhgjbihanbiifgpndmkklajbi.json?label=Chrome%20Users&color=blue").then((response) => response.json()),
		fetch("https://img.shields.io/badge/dynamic/json.json?label=Edge%20Users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fdfdjpokbfeaamjcomllncennmfhpldmm").then((response) => response.json()),
		fetch("https://addons.mozilla.org/api/v5/addons/addon/again@why.salesforce/").then((response) => response.json()),
		fetch("https://simpleanalytics.com/extension.again.whysalesforce.json?version=5&fields=visitors&start=today-7d&info=false&browser_name=Safari").then((response) => response.json()),
	]);
	const chrome = chromeResult.status === "fulfilled" ? chromeResult.value : {};
	const edge = edgeResult.status === "fulfilled" ? edgeResult.value : {};
	const firefox = firefoxResult.status === "fulfilled" ? firefoxResult.value : {};
	const safari = safariResult.status === "fulfilled" ? safariResult.value : {};
	const users = parseCompactNumber(chrome.value || chrome.message || 0) +
		parseCompactNumber(edge.value || edge.message || 0) +
		Number(firefox.average_daily_users || 0) +
		Number(safari.visitors || 0);
	const firefoxRatingCount = Number(firefox.ratings?.count || 0);
	const ratingCount = firefoxRatingCount;
	const rating = ratingCount > 0
		? Number(firefox.ratings?.average || 0)
		: null;

	return { users, rating };
}

/**
 * Parses badge counts such as "221", "1.2k", or "2M".
 *
 * @param {string | number} value Badge count.
 * @returns {number} Parsed count.
 */
function parseCompactNumber(value) {
	if (typeof value === "number") {
		return value;
	}
	const normalized = value.trim().toLowerCase().replaceAll(",", "");
	const multiplier = normalized.endsWith("k")
		? 1_000
		: normalized.endsWith("m")
			? 1_000_000
			: 1;
	return Number.parseFloat(normalized.replace(/[km]$/, "")) * multiplier || 0;
}

/**
 * Updates public usage and rating metrics.
 *
 * @returns {Promise<void>} Promise resolved after metrics update.
 */
async function hydratePublicStoreMetrics() {
	const metrics = await getPublicStoreMetrics();
	totalUserLabels.forEach((label) => {
		if (metrics.users <= 0) {
			label.textContent = "0";
			return;
		}
		animateNumber(label, metrics.users);
	});
	averageRatingLabels.forEach((label) => {
		if (metrics.rating === null) {
			label.textContent = "0";
			return;
		}
		animateNumber(label, metrics.rating, { decimals: 1, suffix: " / 5" });
	});
}

/**
 * Loads raw GitHub Markdown into local wrapper page.
 *
 * @returns {Promise<void>} Promise resolved after Markdown render or fallback.
 */
async function hydrateMarkdown() {
	if (!markdownSource) {
		return;
	}
	if (!globalThis.awsfMarkdown) {
		markdownSource.innerHTML = "<p>Could not load Markdown renderer.</p>";
		return;
	}
	const url = getMarkdownUrl(markdownSource);
	if (!url) {
		return;
	}
	const response = await fetch(url);
	if (!response.ok) {
		markdownSource.innerHTML = "<p>Could not load GitHub raw Markdown.</p>";
		return;
	}
	const markdown = await response.text();
	if (markdownSource.getAttribute("data-markdown-source") === "wiki") {
		const doc = new URLSearchParams(location.search).get("doc") || "Home";
		if (wikiTitleLabel) {
			wikiTitleLabel.textContent = wikiTitles[doc] || doc.replaceAll("-", " ");
		}
		if (wikiDescriptionLabel) {
			wikiDescriptionLabel.textContent = `Article from ${wikiDocuments[doc] || wikiDocuments.Home}`;
		}
	}
	markdownSource.innerHTML = markdownSource.getAttribute("data-markdown-source") === "changelog"
		? globalThis.awsfMarkdown.renderChangelog(markdown)
		: globalThis.awsfMarkdown.renderMarkdown(markdown);
	hydrateArticleToc();
}

updateInstallLinks();
hydrateWikiSidebar();
hydrateReleaseLabels().catch(() => {});
hydratePublicStoreMetrics().catch(() => {
	totalUserLabels.forEach((label) => {
		label.textContent = "0";
	});
	averageRatingLabels.forEach((label) => {
		label.textContent = "0";
	});
});
hydrateMarkdown().catch(() => {
	if (markdownSource) {
		markdownSource.innerHTML = "<p>Could not load GitHub raw Markdown.</p>";
	}
});
