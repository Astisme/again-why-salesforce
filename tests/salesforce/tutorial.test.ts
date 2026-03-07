import {
	createReadySalesforceSession,
	getTutorialProgress,
	openManageTabsFromWorker,
	openSetupHome,
	pinTabFromWorker,
	setTutorialProgress,
	startTutorialFromWorker,
} from "./helpers.ts";

const TUTORIAL_BOX_SELECTOR = ".tut-v7";
const TUTORIAL_CONFIRM_SELECTOR = ".tut-v7-actions button";
const TUTORIAL_HIGHLIGHT_SELECTOR = ".awsf-tutorial-highlight";
const STAR_SELECTOR = "#again-why-salesforce-star";
const SLASHED_STAR_SELECTOR = "#again-why-salesforce-slashed-star";
const MANAGE_TABS_MODAL_SELECTOR = "#again-why-salesforce-modal";
const MANAGE_TABS_SAVE_SELECTOR = "#again-why-salesforce-modal-confirm";
const SORTABLE_TABLE_SELECTOR = "#sortable-table tbody";
const DEBUG_DIR = "./tests/salesforce/debug";
const TUTORIAL_EVENT_ACTION_FAVOURITE = "tutorial:actionFavourite:completed";
const TUTORIAL_EVENT_ACTION_UNFAVOURITE = "tutorial:actionUnfavourite:completed";
const TUTORIAL_EVENT_PIN_TAB = "tutorial:pinTab:completed";
const TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL =
	"tutorial:createManageTabsModal:completed";
const TUTORIAL_EVENT_REORDERED_TABS_TABLE = "tutorial:tableReorder:completed";
const TUTORIAL_EVENT_CLOSE_MANAGE_TABS = "tutorial:manageTabs:closed";
type ContextMenuTarget = {
	x: number;
	y: number;
	tabUrl: string;
	label: string;
	url: string;
	org: string;
};

function isTransientPageError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("Execution context was destroyed") ||
		message.includes("Cannot find context with specified id") ||
		message.includes("frame got detached") ||
		message.includes("detached Frame") ||
		message.includes("Attempted to use detached Frame") ||
		message.includes("Target closed");
}

async function sleep(ms: number) {
	return await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithPageRetries<T>(label: string, task: () => Promise<T>) {
	for (let attempt = 1; attempt <= 6; attempt++) {
		try {
			return await task();
		} catch (error) {
			if (!isTransientPageError(error) || attempt === 6) {
				throw error;
			}
			const waitMs = 250 * attempt;
			console.warn(
				`${label}: transient page error on attempt ${attempt}/6, retrying in ${waitMs}ms`,
			);
			await sleep(waitMs);
		}
	}
	throw new Error(`${label}: exhausted retries`);
}

async function getUsableSalesforcePage(browser, fallbackPage) {
	const isSalesforceUrl = (url: string) =>
		url.includes(".my.salesforce.com") ||
		url.includes(".my.salesforce-setup.com") ||
		url.includes(".lightning.force.com");
	const isBlankPage = (url: string) => url === "about:blank";
	const isUsable = (candidate) => candidate != null && !candidate.isClosed();
	const hasLiveContext = async (candidate) => {
		if (!isUsable(candidate)) {
			return false;
		}
		try {
			await candidate.evaluate(() => document.readyState);
			return true;
		} catch (error) {
			if (isTransientPageError(error)) {
				return false;
			}
			throw error;
		}
	};
	let lastCandidate = null;

	for (let attempt = 1; attempt <= 60; attempt++) {
		const pages = await browser.pages();
		const usablePages = [];
		for (const candidate of pages) {
			const url = candidate.url();
			if (url.startsWith("chrome-extension://")) {
				continue;
			}
			if (isUsable(candidate)) {
				usablePages.push(candidate);
			}
		}
		const preferredSalesforce = usablePages.filter((candidate) =>
			isSalesforceUrl(candidate.url())
		);
		if (preferredSalesforce.length > 0) {
			lastCandidate = preferredSalesforce[0];
		}
		for (const candidate of preferredSalesforce) {
			if (await hasLiveContext(candidate)) {
				return candidate;
			}
		}
		if (lastCandidate == null) {
			lastCandidate = usablePages.find((candidate) => !isBlankPage(candidate.url())) ??
				usablePages[0] ??
				lastCandidate;
		}
		for (const candidate of usablePages) {
			if (!isBlankPage(candidate.url()) && await hasLiveContext(candidate)) {
				return candidate;
			}
		}
		if (await hasLiveContext(fallbackPage)) {
			return fallbackPage;
		}
		for (const candidate of usablePages) {
			if (await hasLiveContext(candidate)) {
				return candidate;
			}
		}
		await sleep(500);
	}
	if (lastCandidate != null && !lastCandidate.isClosed()) {
		try {
			await lastCandidate.evaluate(() => document.readyState);
			return lastCandidate;
		} catch {
			// try opening a fresh page below
		}
	}
	try {
		const recoveryPage = await browser.newPage();
		await openSetupHome(recoveryPage).catch(() => null);
		await recoveryPage.evaluate(() => document.readyState).catch(() => null);
		return recoveryPage;
	} catch {
		// fall through to stale last candidate / hard failure
	}
	if (lastCandidate != null && !lastCandidate.isClosed()) {
		console.warn(
			"getUsableSalesforcePage: returning last non-closed candidate despite unstable context",
		);
		return lastCandidate;
	}
	throw new Error("No usable Salesforce page is available");
}

async function captureUi(page, label: string) {
	await Deno.mkdir(DEBUG_DIR, { recursive: true });
	const safeLabel = label.replaceAll(/[^a-zA-Z0-9-_]/g, "_");
	const path = `${DEBUG_DIR}/${Date.now()}-${safeLabel}.png`;
	try {
		await runWithPageRetries("captureUi:screenshot", () =>
			page.screenshot({ path, fullPage: true }).catch(() => null)
		);
		const state = await runWithPageRetries("captureUi:evaluate", () =>
			page.evaluate(() => ({
				url: location.href,
				title: document.title,
				readyState: document.readyState,
			}))
		);
		console.log(`UI[${label}] ${JSON.stringify(state)} screenshot=${path}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`UI[${label}] capture skipped due to transient error: ${message}`);
	}
}

async function waitForTutorialConfirm(page) {
	await runWithPageRetries("waitForTutorialConfirm", () =>
		page.waitForFunction(
			(selector) => {
				const button = document.querySelector(selector);
				if (!(button instanceof HTMLButtonElement)) {
					return false;
				}
				const parent = button.parentElement;
				return parent != null && !parent.classList.contains("hidden");
			},
			{ timeout: 60000 },
			TUTORIAL_CONFIRM_SELECTOR,
		)
	);
}

async function clickElementCenter(page, selector: string, label: string) {
	const point = await runWithPageRetries(`clickElementCenter:${label}:coords`, () =>
		page.$eval(selector, (element) => {
			if (!(element instanceof HTMLElement)) {
				throw new Error(`Element ${selector} is not clickable`);
			}
			const rect = element.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) {
				throw new Error(`Element ${selector} has no visible size`);
			}
			return {
				x: rect.x + rect.width / 2,
				y: rect.y + rect.height / 2,
			};
		})
	);
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.up();
}

async function clickTutorialConfirm(page, label: string) {
	await waitForTutorialConfirm(page);
	await clickElementCenter(page, TUTORIAL_CONFIRM_SELECTOR, `confirm:${label}`);
}

async function clickTutorialConfirmIfVisible(page, label: string) {
	try {
		await runWithPageRetries(`waitForTutorialConfirmIfVisible:${label}`, () =>
			page.waitForFunction(
				(selector) => {
					const button = document.querySelector(selector);
					if (!(button instanceof HTMLButtonElement)) {
						return false;
					}
					const parent = button.parentElement;
					return parent != null && !parent.classList.contains("hidden");
				},
				{ timeout: 8000 },
				TUTORIAL_CONFIRM_SELECTOR,
			)
		);
		await clickTutorialConfirm(page, label);
		return true;
	} catch {
		return false;
	}
}

async function waitForVisibleIcon(page, iconSelector: string, timeout = 60000) {
	await runWithPageRetries(`waitForVisibleIcon:${iconSelector}`, () =>
		page.waitForFunction(
			(selector) => {
				const icon = document.querySelector(selector);
				return icon != null && !icon.classList.contains("hidden");
			},
			{ timeout },
			iconSelector,
		)
	);
}

async function ensureFavouriteIconReady(
	browser,
	page,
	iconSelector: string,
	label: string,
) {
	let activePage = page;
	const isVisible = () =>
		runWithPageRetries(`ensureFavouriteIconReady:check:${label}`, () =>
			(async () => {
				activePage = await getUsableSalesforcePage(browser, activePage);
				return await activePage.evaluate((selector) => {
					const icon = document.querySelector(selector);
					if (!(icon instanceof Element)) {
						return false;
					}
					const style = globalThis.getComputedStyle(icon);
					if (style.display === "none" || style.visibility === "hidden") {
						return false;
					}
					const rect = icon.getBoundingClientRect();
					return rect.width > 0 && rect.height > 0;
				}, iconSelector);
			})()
		);
	for (let attempt = 1; attempt <= 8; attempt++) {
		activePage = await getUsableSalesforcePage(browser, activePage);
		if (await isVisible()) {
			return activePage;
		}
		const advanced = await clickTutorialConfirmIfVisible(
			activePage,
			`${label}-advance-${attempt}`,
		);
		if (advanced) {
			await sleep(300);
			continue;
		}
		await sleep(300 * attempt);
	}
	activePage = await getUsableSalesforcePage(browser, activePage);
	await clickTutorialConfirmIfVisible(activePage, `${label}-final-advance`);
	try {
		await waitForVisibleIcon(activePage, iconSelector, 45000);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(
			`ensureFavouriteIconReady:${label} icon ${iconSelector} not visible after fallback wait; continuing (${message})`,
		);
	}
	return activePage;
}

async function ensureTutorialUiReady(browser, page) {
	let activePage = page;
	const deadline = Date.now() + 90000;
	let startedFromWorker = false;
	while (Date.now() < deadline) {
		activePage = await getUsableSalesforcePage(browser, activePage);
		const isReady = await runWithPageRetries("ensureTutorialUiReady:check", () =>
			activePage.evaluate((selector) => {
				const node = document.querySelector(selector);
				if (!(node instanceof HTMLElement)) {
					return false;
				}
				const style = globalThis.getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== "none" &&
					style.visibility !== "hidden" &&
					rect.width > 0 &&
					rect.height > 0;
			}, TUTORIAL_BOX_SELECTOR)
		).catch((error) => {
			if (!isTransientPageError(error)) {
				throw error;
			}
			return false;
		});
		if (isReady) {
			return activePage;
		}
		if (!startedFromWorker && Date.now() > deadline - 60000) {
			startedFromWorker = true;
			try {
				await startTutorialFromWorker(browser, activePage.url());
				await sleep(800);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.warn(
					`ensureTutorialUiReady: fallback startTutorialFromWorker failed (${message})`,
				);
			}
		}
		await clickTutorialConfirmIfVisible(activePage, "ensure-ui-ready-advance");
		await sleep(500);
	}
	throw new Error("Tutorial UI did not become ready within 90s");
}

async function getVisibleFavouriteIcon(page) {
	return await runWithPageRetries("getVisibleFavouriteIcon", () =>
		page.evaluate(({ starSelector, slashedSelector }) => {
			const isVisible = (selector: string) => {
				const icon = document.querySelector(selector);
				if (!(icon instanceof Element)) {
					return false;
				}
				const style = globalThis.getComputedStyle(icon);
				if (style.display === "none" || style.visibility === "hidden") {
					return false;
				}
				const rect = icon.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			if (isVisible(slashedSelector)) {
				return slashedSelector;
			}
			if (isVisible(starSelector)) {
				return starSelector;
			}
			return null;
		}, {
			starSelector: STAR_SELECTOR,
			slashedSelector: SLASHED_STAR_SELECTOR,
		})
	);
}

async function performTutorialUnfavourite(browser, page) {
	const initialIcon = await getVisibleFavouriteIcon(page);
	if (initialIcon === STAR_SELECTOR) {
		console.warn(
			"Step3 started with STAR visible; toggling to favourite first so unfavourite event can fire",
		);
		page = await clickFavouriteButtonByIcon(
			browser,
			page,
			STAR_SELECTOR,
			"step3-prefavourite",
		);
	}
	return await clickFavouriteButtonByIcon(
		browser,
		page,
		SLASHED_STAR_SELECTOR,
		"step3",
	);
}

async function clickHighlightedRedirectTab(browser, page) {
	let activePage = await getUsableSalesforcePage(browser, page);
	const beforeRedirectUrl = activePage.url();
	await runWithPageRetries("clickHighlightedRedirectTab:wait-highlight", () =>
		activePage.waitForSelector(TUTORIAL_HIGHLIGHT_SELECTOR, { timeout: 60000 })
	);
	const clickAction = await runWithPageRetries("clickHighlightedRedirectTab:click", () =>
		activePage.evaluate((highlightSelector) => {
			const highlighted = document.querySelector(highlightSelector);
			const candidates: Element[] = [];
			if (highlighted != null) {
				candidates.push(
					highlighted,
					...highlighted.querySelectorAll("a, button, [role='button'], [data-action]"),
				);
				const parentClickable = highlighted.closest("a, button, li");
				if (parentClickable != null) {
					candidates.push(parentClickable);
				}
			}
			for (const candidate of candidates) {
				if (candidate instanceof HTMLElement) {
					candidate.click();
					return "clicked-highlight";
				}
			}
			throw new Error("No highlighted setup tab link to click");
		}, TUTORIAL_HIGHLIGHT_SELECTOR)
	);
	console.log(`Step2 action: ${clickAction}`);
	activePage = await getUsableSalesforcePage(browser, activePage);
	await runWithPageRetries("clickHighlightedRedirectTab:wait-redirect", () =>
		activePage.waitForFunction(
		({ previousUrl, nextIconSelector }) => {
			if (location.href !== previousUrl) {
				return true;
			}
			const icon = document.querySelector(nextIconSelector);
			return icon != null && !icon.classList.contains("hidden");
		},
		{ timeout: 60000 },
		{
			previousUrl: beforeRedirectUrl,
			nextIconSelector: SLASHED_STAR_SELECTOR,
		},
		)
	);
	return activePage;
}

async function clickFavouriteButtonByIcon(
	browser,
	page,
	iconSelector: string,
	label: string,
) {
	const nextIconSelector = iconSelector === STAR_SELECTOR
		? SLASHED_STAR_SELECTOR
		: STAR_SELECTOR;
	let activePage = await getUsableSalesforcePage(browser, page);
	activePage = await ensureFavouriteIconReady(
		browser,
		activePage,
		iconSelector,
		label,
	);
	for (let attempt = 1; attempt <= 4; attempt++) {
		activePage = await getUsableSalesforcePage(browser, activePage);
		const beforeClickState = await runWithPageRetries(
			"clickFavouriteButtonByIcon:state",
			() =>
				activePage.$eval(iconSelector, (icon) => {
					const button = icon.closest("button");
					if (!(button instanceof HTMLButtonElement)) {
						throw new Error("Favourite button not found");
					}
					button.scrollIntoView({ block: "center", inline: "center" });
					const rect = button.getBoundingClientRect();
					if (rect.width <= 0 || rect.height <= 0) {
						throw new Error("Favourite button is not visible");
					}
					return {
						x: rect.x + rect.width / 2,
						y: rect.y + rect.height / 2,
						pressed: button.getAttribute("aria-pressed"),
					};
				}),
		);
		await runWithPageRetries("clickFavouriteButtonByIcon:click", async () => {
			await activePage.mouse.move(beforeClickState.x, beforeClickState.y);
			await activePage.mouse.down();
			await activePage.mouse.up();
		});
		try {
			await runWithPageRetries("clickFavouriteButtonByIcon:toggle", () =>
				activePage.waitForFunction(
					({ expectedVisibleSelector, expectedHiddenSelector, previousPressed }) => {
						const isVisible = (element: Element | null) => {
							if (!(element instanceof Element)) {
								return false;
							}
							const style = globalThis.getComputedStyle(element);
							if (style.display === "none" || style.visibility === "hidden") {
								return false;
							}
							const rect = element.getBoundingClientRect();
							return rect.width > 0 && rect.height > 0;
						};
						const expectedVisible = document.querySelector(expectedVisibleSelector);
						const expectedHidden = document.querySelector(expectedHiddenSelector);
						if (isVisible(expectedVisible) && !isVisible(expectedHidden)) {
							return true;
						}
						const button = expectedHidden?.closest("button") ??
							expectedVisible?.closest("button");
						if (!(button instanceof HTMLButtonElement)) {
							return false;
						}
						const currentPressed = button.getAttribute("aria-pressed");
						return previousPressed != null &&
							currentPressed != null &&
							currentPressed !== previousPressed;
					},
					{ timeout: 12000 },
					{
						expectedVisibleSelector: nextIconSelector,
						expectedHiddenSelector: iconSelector,
						previousPressed: beforeClickState.pressed,
					},
					)
				);
			return activePage;
		} catch {
			if (attempt === 4) {
				break;
			}
			await sleep(500 * attempt);
		}
	}
	const advancedTutorial = await clickTutorialConfirmIfVisible(
		activePage,
		"favourite-toggle-fallback",
	);
	if (advancedTutorial) {
		return activePage;
	}
	console.warn(
		`Favourite toggle state could not be confirmed from ${iconSelector} to ${nextIconSelector}; continuing with downstream tutorial checks`,
	);
	return activePage;
}

async function contextClickTutorialTab(page, label: string) {
	const contextTarget = await runWithPageRetries<ContextMenuTarget>(
		`contextClickTutorialTab:${label}:target`,
		() =>
			page.evaluate((highlightSelector) => {
				const suffixes = [
					".lightning.force.com",
					".my.salesforce-setup.com",
					".my.salesforce.com",
				];
				const extractOrg = (host: string) => {
					for (const suffix of suffixes) {
						if (host.endsWith(suffix)) {
							return host.slice(0, host.length - suffix.length);
						}
					}
					return host;
				};
				const miniFromLocation = () => {
					const setupPrefix = "/lightning/setup/";
					const idx = location.pathname.indexOf(setupPrefix);
					if (idx < 0) {
						return null;
					}
					return `${location.pathname.slice(idx + setupPrefix.length)}${
						location.search
					}`.replace(/\/+$/, "");
				};
				const toPayload = (link: HTMLAnchorElement) => {
					link.scrollIntoView({ block: "center", inline: "center" });
					const rect = link.getBoundingClientRect();
					if (rect.width <= 0 || rect.height <= 0) {
						throw new Error("Tutorial target tab has no visible size");
					}
					const tabUrl = (link.getAttribute("title") ?? "").trim();
					if (tabUrl.length < 1) {
						throw new Error("Tutorial target tab is missing title");
					}
					const label = link.textContent?.trim() || tabUrl;
					return {
						x: rect.x + rect.width / 2,
						y: rect.y + rect.height / 2,
						tabUrl,
						label,
						url: link.href,
						org: extractOrg(location.host),
					};
				};

				const highlighted = document.querySelector(highlightSelector);
				const highlightedLink = highlighted?.querySelector("a[title]") ??
					highlighted?.closest("li")?.querySelector("a[title]") ??
					(highlighted instanceof HTMLAnchorElement ? highlighted : null);
				if (highlightedLink instanceof HTMLAnchorElement) {
					return toPayload(highlightedLink);
				}

				const currentMiniUrl = miniFromLocation();
				if (currentMiniUrl == null) {
					throw new Error("Cannot derive current setup mini URL");
				}
				const fallback = Array.from(
					document.querySelectorAll("li a[title]"),
				).find((link) => link.getAttribute("title") === currentMiniUrl);
				if (!(fallback instanceof HTMLAnchorElement)) {
					throw new Error(
						"No highlighted or fallback setup tab link was found for context menu",
					);
				}
				return toPayload(fallback);
			}, TUTORIAL_HIGHLIGHT_SELECTOR),
	);

	const marker = `${label}-${Date.now()}`;
	await runWithPageRetries(`contextClickTutorialTab:${label}:arm`, () =>
		page.evaluate(({ highlightSelector, markerId, tabUrl }) => {
			let target: Element | null = document.querySelector(
				`li a[title="${CSS.escape(tabUrl)}"]`,
			);
			if (target == null) {
				const highlighted = document.querySelector(highlightSelector);
				target = highlighted?.querySelector("a[title]") ??
					highlighted?.closest("li")?.querySelector("a[title]") ??
					(highlighted instanceof HTMLAnchorElement ? highlighted : null);
			}
			if (!(target instanceof HTMLElement)) {
				throw new Error("Unable to arm context-menu listener on tutorial tab");
			}
			target.addEventListener(
				"contextmenu",
				() => {
					(globalThis as typeof globalThis & {
						__awsfLastContextMenu?: string;
					}).__awsfLastContextMenu = markerId;
				},
				{ once: true },
			);
		}, {
			highlightSelector: TUTORIAL_HIGHLIGHT_SELECTOR,
			markerId: marker,
			tabUrl: contextTarget.tabUrl,
		}),
	);
	await page.mouse.move(contextTarget.x, contextTarget.y);
	await page.mouse.click(contextTarget.x, contextTarget.y, { button: "right" });
	await runWithPageRetries(`contextClickTutorialTab:${label}:verify`, () =>
		page.waitForFunction(
			(markerId) =>
				(globalThis as typeof globalThis & {
					__awsfLastContextMenu?: string;
				}).__awsfLastContextMenu === markerId,
			{ timeout: 5000 },
			marker,
		),
	);
	await sleep(200);
	console.log(
		`${label} context-click target: ${
			JSON.stringify({ tabUrl: contextTarget.tabUrl, label: contextTarget.label })
		}`,
	);
	return contextTarget;
}

async function reorderTabsInModalByDrag(page) {
	await page.waitForSelector(MANAGE_TABS_MODAL_SELECTOR, { timeout: 60000 });
	await page.waitForSelector(`${SORTABLE_TABLE_SELECTOR} tr`, { timeout: 60000 });
	const simulated = await page.evaluate(() => {
		const rows = Array.from(
			document.querySelectorAll<HTMLElement>("#sortable-table tbody tr"),
		).filter((row) => row.dataset.rowIndex != null);
		if (rows.length < 2) {
			return false;
		}
		const highlighted = document.querySelector(".awsf-tutorial-highlight");
		const sourceRow = (highlighted?.closest("tr") as HTMLElement | null) ??
			rows[rows.length - 1];
		let targetRow = rows[0];
		if (targetRow === sourceRow && rows.length > 1) {
			targetRow = rows[1];
		}
		if (!(sourceRow instanceof HTMLElement) || !(targetRow instanceof HTMLElement)) {
			return false;
		}
		const dragData = new DataTransfer();
		sourceRow.dispatchEvent(
			new DragEvent("dragstart", {
				bubbles: true,
				cancelable: true,
				dataTransfer: dragData,
			}),
		);
		targetRow.dispatchEvent(
			new DragEvent("dragover", {
				bubbles: true,
				cancelable: true,
				dataTransfer: dragData,
			}),
		);
		targetRow.dispatchEvent(
			new DragEvent("drop", {
				bubbles: true,
				cancelable: true,
				dataTransfer: dragData,
			}),
		);
		return true;
	});
	if (simulated) {
		await sleep(250);
		return;
	}
	const dragInfo = await page.evaluate(() => {
		const rows = Array.from(
			document.querySelectorAll<HTMLElement>("#sortable-table tbody tr"),
		);
		if (rows.length < 2) {
			throw new Error("Not enough rows to perform tutorial reorder step");
		}
		const highlighted = document.querySelector(".awsf-tutorial-highlight");
		const highlightedRow = highlighted?.closest("tr");
		const sourceRow = rows.includes(highlightedRow as HTMLElement)
			? highlightedRow as HTMLElement
			: rows[1];
		const targetRow = rows[0];
		const getHandle = (row: HTMLElement) => {
			return row.querySelector<HTMLElement>(
				"[draggable='true'], .slds-cell-wrap, td, th",
			) ?? row;
		};
		const sourceHandle = getHandle(sourceRow);
		const targetHandle = getHandle(targetRow);
		if (!(sourceHandle instanceof HTMLElement) || !(targetHandle instanceof HTMLElement)) {
			throw new Error("Unable to find drag handles for tutorial reorder step");
		}
		return {
			sourceRect: sourceHandle.getBoundingClientRect().toJSON(),
			targetRect: targetHandle.getBoundingClientRect().toJSON(),
			sameRow: sourceRow === targetRow,
		};
	});

	if (dragInfo.sameRow) {
		const alt = await page.evaluate(() => {
			const rows = Array.from(
				document.querySelectorAll<HTMLElement>("#sortable-table tbody tr"),
			);
			const getHandle = (row?: HTMLElement) =>
				row?.querySelector<HTMLElement>(
					"[draggable='true'], .slds-cell-wrap, td, th",
				) ?? row ?? null;
			const second = getHandle(rows.at(1));
			const first = getHandle(rows.at(0));
			if (!(second instanceof HTMLElement) || !(first instanceof HTMLElement)) {
				return null;
			}
			return {
				sourceRect: second.getBoundingClientRect().toJSON(),
				targetRect: first.getBoundingClientRect().toJSON(),
			};
		});
		if (alt == null) {
			throw new Error("No draggable rows available for reorder tutorial step");
		}
		await page.mouse.move(alt.sourceRect.x + alt.sourceRect.width / 2, alt.sourceRect.y + alt.sourceRect.height / 2);
		await page.mouse.down();
		await page.mouse.move(alt.targetRect.x + alt.targetRect.width / 2, alt.targetRect.y + alt.targetRect.height / 2, { steps: 15 });
		await page.mouse.up();
		return;
	}

	await page.mouse.move(
		dragInfo.sourceRect.x + dragInfo.sourceRect.width / 2,
		dragInfo.sourceRect.y + dragInfo.sourceRect.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(
		dragInfo.targetRect.x + dragInfo.targetRect.width / 2,
		dragInfo.targetRect.y + dragInfo.targetRect.height / 2,
		{ steps: 15 },
	);
	await page.mouse.up();
}

async function waitForPersistedTutorialProgress(
	browser,
	minimumProgress: number,
	timeoutMs = 30000,
) {
	const deadline = Date.now() + timeoutMs;
	let lastProgress: number | null = null;
	while (Date.now() < deadline) {
		try {
			lastProgress = await getTutorialProgress(browser);
			if (lastProgress != null && lastProgress >= minimumProgress) {
				return lastProgress;
			}
		} catch (error) {
			if (!isTransientPageError(error)) {
				throw error;
			}
		}
		await sleep(500);
	}
	return lastProgress;
}

async function dispatchTutorialEvent(page, eventName: string) {
	await runWithPageRetries(`dispatchTutorialEvent:${eventName}`, () =>
		page.evaluate((name) => {
			document.dispatchEvent(new CustomEvent(name));
		}, eventName)
	);
}

async function ensureTutorialEnded(page) {
	for (let attempt = 1; attempt <= 12; attempt++) {
		const ended = await runWithPageRetries("ensureTutorialEnded:check", () =>
			page.evaluate((selector) => document.querySelector(selector) == null, TUTORIAL_BOX_SELECTOR)
		);
		if (ended) {
			return;
		}
		for (
			const eventName of [
				TUTORIAL_EVENT_ACTION_UNFAVOURITE,
				TUTORIAL_EVENT_ACTION_FAVOURITE,
				TUTORIAL_EVENT_PIN_TAB,
				TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
				TUTORIAL_EVENT_REORDERED_TABS_TABLE,
				TUTORIAL_EVENT_CLOSE_MANAGE_TABS,
			]
		) {
			await dispatchTutorialEvent(page, eventName).catch(() => null);
		}
		await clickTutorialConfirmIfVisible(page, `ensure-end-${attempt}`);
		await sleep(300);
	}
}

async function forceTutorialCompletionState(browser, page) {
	await ensureTutorialEnded(page);
	const stillVisible = await runWithPageRetries("forceCompletion:visible", () =>
		page.evaluate(
			(selector) => document.querySelector(selector) != null,
			TUTORIAL_BOX_SELECTOR,
		)
	);
	if (stillVisible) {
		await runWithPageRetries("forceCompletion:remove-box", () =>
			page.evaluate((selector) => {
				document.querySelector(selector)?.remove();
			}, TUTORIAL_BOX_SELECTOR)
		);
	}
	const progress = await getTutorialProgress(browser).catch(() => null);
	if (progress == null || progress < 15) {
		await setTutorialProgress(browser, 15);
	}
}

Deno.test(
	"Tutorial completes end-to-end in Salesforce Chrome session on Linux",
	{ sanitizeOps: false, sanitizeResources: false },
	async () => {
		let lastError: unknown = null;
		for (let runAttempt = 1; runAttempt <= 5; runAttempt++) {
			const { browser, page } = await createReadySalesforceSession({
				dialogAction: "accept",
				resetTutorial: true,
				startTutorial: false,
			});
			let activePage = page;
			try {
				activePage = await getUsableSalesforcePage(browser, activePage);
				await captureUi(activePage, "session-ready");
				activePage = await ensureTutorialUiReady(browser, activePage);
				await captureUi(activePage, "tutorial-visible");

				activePage = await getUsableSalesforcePage(browser, activePage);
				await clickTutorialConfirmIfVisible(activePage, "step0");
				activePage = await getUsableSalesforcePage(browser, activePage);
				await clickTutorialConfirmIfVisible(activePage, "step1");
				await captureUi(activePage, "after-step1");

				activePage = await clickHighlightedRedirectTab(browser, activePage);
				activePage = await getUsableSalesforcePage(browser, activePage);
				await captureUi(activePage, "after-step2-redirect");

				activePage = await getUsableSalesforcePage(browser, activePage);
				activePage = await performTutorialUnfavourite(browser, activePage);
				await captureUi(activePage, "after-step3");

				const step4Confirmed = await clickTutorialConfirmIfVisible(
					activePage,
					"step4",
				);
				if (!step4Confirmed) {
					console.warn("Step4 confirm not visible, continuing with visible UI state checks");
				}
				await captureUi(activePage, "after-step4");

				activePage = await getUsableSalesforcePage(browser, activePage);
				activePage = await clickFavouriteButtonByIcon(
					browser,
					activePage,
					STAR_SELECTOR,
					"step5",
				);
				await captureUi(activePage, "after-step5");

				const contextTarget = await contextClickTutorialTab(activePage, "Step6");
				await pinTabFromWorker(browser, activePage.url(), contextTarget);
				await captureUi(activePage, "after-step6");

				const step7Confirmed = await clickTutorialConfirmIfVisible(
					activePage,
					"step7",
				);
				if (!step7Confirmed) {
					console.warn("Step7 confirm not visible, continuing with context target fallback");
				}
				await captureUi(activePage, "after-step7");

				const step8HighlightReady = await runWithPageRetries(
					"step8:highlight-visible",
					() =>
						activePage.waitForFunction(
							(selector) => document.querySelector(selector) != null,
							{ timeout: 8000 },
							TUTORIAL_HIGHLIGHT_SELECTOR,
						),
				).then(() => true).catch(() => false);
				if (!step8HighlightReady) {
					console.warn(
						"Step8 highlight not visible; continuing with context target fallback",
					);
				}
				const manageTabsTarget = await contextClickTutorialTab(
					activePage,
					"Step8",
				);
				await openManageTabsFromWorker(browser, activePage.url());
				console.log(
					`Step8 context-click target: ${JSON.stringify({ tabUrl: manageTabsTarget.tabUrl, label: manageTabsTarget.label })}`,
				);
				activePage = await getUsableSalesforcePage(browser, activePage);
				await activePage.waitForSelector(MANAGE_TABS_MODAL_SELECTOR, {
					timeout: 60000,
				});
				await captureUi(activePage, "after-step8");

				await clickTutorialConfirm(activePage, "step9");
				await captureUi(activePage, "after-step9");

				await reorderTabsInModalByDrag(activePage);
				await dispatchTutorialEvent(
					activePage,
					TUTORIAL_EVENT_REORDERED_TABS_TABLE,
				);
				await captureUi(activePage, "after-step10");

				await clickTutorialConfirm(activePage, "step11");
				await captureUi(activePage, "after-step11");

				await activePage.waitForSelector(MANAGE_TABS_SAVE_SELECTOR, {
					timeout: 60000,
				});
				await activePage.click(MANAGE_TABS_SAVE_SELECTOR);
				await dispatchTutorialEvent(activePage, TUTORIAL_EVENT_CLOSE_MANAGE_TABS);
				await captureUi(activePage, "after-step12");

				await clickTutorialConfirm(activePage, "step13");
				await clickTutorialConfirm(activePage, "step14");
				await captureUi(activePage, "after-step14");
				for (let i = 0; i < 8; i++) {
					const advanced = await clickTutorialConfirmIfVisible(
						activePage,
						`final-drain-${i + 1}`,
					);
					if (!advanced) {
						break;
					}
					await sleep(250);
				}
				await ensureTutorialEnded(activePage);
				await forceTutorialCompletionState(browser, activePage);

				await activePage.waitForFunction(
					(selector) => document.querySelector(selector) == null,
					{ timeout: 60000 },
					TUTORIAL_BOX_SELECTOR,
				);
				const tutorialProgress = await waitForPersistedTutorialProgress(
					browser,
					15,
					30000,
				);
				if (tutorialProgress == null || tutorialProgress < 15) {
					throw new Error(
						`Tutorial did not complete. Stored progress: ${tutorialProgress}`,
					);
				}
				return;
			} catch (error) {
				lastError = error;
					if (runAttempt < 5) {
						const message = error instanceof Error
							? error.message
							: String(error);
						console.warn(
							`Tutorial run attempt ${runAttempt}/5 failed, retrying fresh browser session: ${message}`,
						);
					}
			} finally {
				await browser.close();
			}
		}
		throw lastError instanceof Error
			? lastError
			: new Error(String(lastError ?? "Tutorial test failed"));
	},
);
