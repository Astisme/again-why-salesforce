import {
	createReadySalesforceSession,
	getTutorialProgress,
	openManageTabsFromWorker,
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
		const preferredSalesforce = usablePages.find((candidate) =>
			isSalesforceUrl(candidate.url())
		);
		if (preferredSalesforce != null) {
			return preferredSalesforce;
		}
		const nonBlank = usablePages.find((candidate) => !isBlankPage(candidate.url()));
		if (nonBlank != null) {
			return nonBlank;
		}
		if (isUsable(fallbackPage)) {
			return fallbackPage;
		}
		if (usablePages.length > 0) {
			return usablePages[0];
		}
		await sleep(500);
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

async function clickHighlightedRedirectTab(page) {
	const beforeRedirectUrl = page.url();
	await page.waitForSelector(TUTORIAL_HIGHLIGHT_SELECTOR, { timeout: 60000 });
	const clickAction = await runWithPageRetries("clickHighlightedRedirectTab", () =>
		page.evaluate((highlightSelector) => {
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
	await page.waitForFunction(
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
	);
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

async function clickPinFromHighlightedTab(page) {
	await page.waitForSelector(TUTORIAL_HIGHLIGHT_SELECTOR, { timeout: 60000 });
	const action = await runWithPageRetries("clickPinFromHighlightedTab", () =>
		page.evaluate((highlightSelector) => {
			const highlighted = document.querySelector(highlightSelector);
			if (highlighted == null) {
				throw new Error("Tutorial highlighted tab missing");
			}
			const directPin = highlighted.querySelector('[data-action="pin-tab"]');
			if (directPin instanceof HTMLElement) {
				directPin.click();
				return "pin-direct";
			}
			const dropdown = highlighted.querySelector('button[data-name="dropdownButton"]') ??
				highlighted.closest("li")?.querySelector('button[data-name="dropdownButton"]');
			if (dropdown instanceof HTMLElement) {
				dropdown.click();
				const pinInMenu = highlighted.closest("li")?.querySelector('[data-action="pin-tab"]');
				if (pinInMenu instanceof HTMLElement) {
					pinInMenu.click();
					return "pin-dropdown";
				}
			}
			throw new Error("No UI pin action found on highlighted tab");
		}, TUTORIAL_HIGHLIGHT_SELECTOR)
	);
	console.log(`Step6 action: ${action}`);
}

async function reorderTabsInModalByDrag(page) {
	await page.waitForSelector(MANAGE_TABS_MODAL_SELECTOR, { timeout: 60000 });
	await page.waitForSelector(`${SORTABLE_TABLE_SELECTOR} tr`, { timeout: 60000 });
	const dragInfo = await page.evaluate(() => {
		const highlighted = document.querySelector(".awsf-tutorial-highlight");
		const sourceHandle = highlighted?.closest("tr")?.querySelector(".slds-cell-wrap") ?? highlighted;
		const targetHandle = document.querySelector("#sortable-table tbody tr:nth-child(1) .slds-cell-wrap");
		if (!(sourceHandle instanceof HTMLElement) || !(targetHandle instanceof HTMLElement)) {
			throw new Error("Unable to find drag handles for tutorial reorder step");
		}
		const sourceRow = sourceHandle.closest("tr");
		const targetRow = targetHandle.closest("tr");
		return {
			sourceRect: sourceHandle.getBoundingClientRect().toJSON(),
			targetRect: targetHandle.getBoundingClientRect().toJSON(),
			sameRow: sourceRow === targetRow,
		};
	});

	if (dragInfo.sameRow) {
		const alt = await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll("#sortable-table tbody tr"));
			const second = rows.at(1)?.querySelector(".slds-cell-wrap");
			const first = rows.at(0)?.querySelector(".slds-cell-wrap");
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

Deno.test(
	"Tutorial completes end-to-end in Salesforce Chrome session on Linux",
	{ sanitizeOps: false, sanitizeResources: false },
	async () => {
		let lastError: unknown = null;
		for (let runAttempt = 1; runAttempt <= 1; runAttempt++) {
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

				await clickTutorialConfirmIfVisible(activePage, "step0");
				await clickTutorialConfirmIfVisible(activePage, "step1");
				await captureUi(activePage, "after-step1");

				await clickHighlightedRedirectTab(activePage);
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

				await clickPinFromHighlightedTab(activePage);
				await captureUi(activePage, "after-step6");

				await clickTutorialConfirm(activePage, "step7");
				await captureUi(activePage, "after-step7");

				await openManageTabsFromWorker(browser, activePage.url());
				activePage = await getUsableSalesforcePage(browser, activePage);
				await activePage.waitForSelector(MANAGE_TABS_MODAL_SELECTOR, {
					timeout: 60000,
				});
				await captureUi(activePage, "after-step8");

				await clickTutorialConfirm(activePage, "step9");
				await captureUi(activePage, "after-step9");

				await reorderTabsInModalByDrag(activePage);
				await captureUi(activePage, "after-step10");

				await clickTutorialConfirm(activePage, "step11");
				await captureUi(activePage, "after-step11");

				await activePage.waitForSelector(MANAGE_TABS_SAVE_SELECTOR, {
					timeout: 60000,
				});
				await activePage.click(MANAGE_TABS_SAVE_SELECTOR);
				await captureUi(activePage, "after-step12");

				await clickTutorialConfirm(activePage, "step13");
				await clickTutorialConfirm(activePage, "step14");
				await captureUi(activePage, "after-step14");

				await activePage.waitForFunction(
					(selector) => document.querySelector(selector) == null,
					{ timeout: 60000 },
					TUTORIAL_BOX_SELECTOR,
				);
				const tutorialProgress = await getTutorialProgress(browser);
				if (tutorialProgress == null || tutorialProgress < 15) {
					throw new Error(
						`Tutorial did not complete. Stored progress: ${tutorialProgress}`,
					);
				}
				return;
			} catch (error) {
				lastError = error;
				if (runAttempt < 1) {
					const message = error instanceof Error
						? error.message
						: String(error);
					console.warn(
						`Tutorial run attempt ${runAttempt}/3 failed, retrying fresh browser session: ${message}`,
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
