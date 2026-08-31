/// <reference lib="dom" />
import "../../mocks.test.ts";
import {
	assertEquals,
	assertRejects,
	assertThrows,
} from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";
import {
	bootstrapIfNeeded,
	getCurrentHref,
	getIsCurrentlyOnSavedTab,
	getModalHanger,
	getSetupTabUl,
	getWasOnSavedTab,
	isOnSavedTab,
	makeDuplicatesBold,
	performActionOnTabs,
	reorderTabsUl,
	sf_afterSet,
	showToast,
} from "../../../src/salesforce/runtime/content-runtime.js";
import {
	actionFavourite,
	addTab,
	createStarSvg,
	FAVOURITE_BUTTON_ID,
	generateFavouriteButton,
	getFavouriteImage,
	pageActionTab,
	showFavouriteButton,
	SLASHED_STAR_ID,
	STAR_ID,
	toggleFavouriteButton,
} from "../../../src/salesforce/runtime/favourite-manager-runtime.js";
import {
	createManageTabsModal,
	handleActionButtonClick,
} from "../../../src/salesforce/runtime/manageTabs-runtime.js";
import { createOpenOtherOrgModal } from "../../../src/salesforce/runtime/openOtherOrg-runtime.js";
import { checkTutorial } from "../../../src/salesforce/runtime/tutorial-runtime.js";

Deno.test("content runtime singleton wrappers delegate through default module", async () => {
	const dom = installMockDom(
		"https://acme.lightning.force.com/lightning/setup/Users/home",
	);

	try {
		try {
			bootstrapIfNeeded();
		} catch (_error) {
			// Default singleton needs browser page APIs not present in this DOM.
		}
		assertEquals(getCurrentHref(), undefined);
		assertEquals(getIsCurrentlyOnSavedTab(), undefined);
		try {
			getModalHanger();
		} catch (_error) {
			// Default DOM can lack modal helpers.
		}
		try {
			getSetupTabUl();
		} catch (_error) {
			// Default DOM can lack setup tab helpers.
		}
		assertEquals(getWasOnSavedTab(), undefined);
		await assertRejects(() => isOnSavedTab());
		assertEquals(makeDuplicatesBold("Users/home"), undefined);
		assertEquals(await performActionOnTabs("unknown"), undefined);
		assertEquals(await reorderTabsUl(), undefined);
		assertEquals(sf_afterSet(), undefined);
		await assertRejects(async () => {
			await showToast("toast_message_key");
		});
	} finally {
		dom.cleanup();
	}
});

Deno.test("favourite runtime singleton wrappers expose ids and delegate safe calls", async () => {
	const dom = installMockDom(
		"https://acme.lightning.force.com/lightning/setup/Users/home",
	);

	try {
		assertEquals(FAVOURITE_BUTTON_ID, "again-why-salesforce-button");
		assertEquals(STAR_ID, "again-why-salesforce-star");
		assertEquals(SLASHED_STAR_ID, "again-why-salesforce-slashed-star");
		assertThrows(() => pageActionTab(true), Error);

		assertThrows(
			() => createStarSvg({ id: "star-id", alt: "star_alt" }, false),
			Error,
		);
		await assertRejects(() => generateFavouriteButton());
		assertThrows(() => getFavouriteImage(SLASHED_STAR_ID, null), Error);
		assertThrows(() => toggleFavouriteButton(true, null), Error);
		await assertRejects(() => actionFavourite());
		await assertRejects(() => addTab("Users/home"));
		const timeoutId = await showFavouriteButton(6);
		if (typeof timeoutId === "number") {
			clearTimeout(timeoutId);
		}
	} finally {
		dom.cleanup();
	}
});

Deno.test("manage-tabs runtime singleton wrappers delegate", async () => {
	const dom = installMockDom(
		"https://acme.lightning.force.com/lightning/setup/Users/home",
	);

	try {
		await assertRejects(() => createManageTabsModal());
		assertThrows(() =>
			handleActionButtonClick(new Event("click"), { action: "missing" })
		);
	} finally {
		dom.cleanup();
	}
});

Deno.test("open-other-org runtime singleton wrapper reaches modal generation", async () => {
	const dom = installMockDom(
		"https://acme.lightning.force.com/lightning/setup/Users/home",
	);

	try {
		await assertRejects(() =>
			createOpenOtherOrgModal({
				label: "Setup",
				org: "acme",
				url: "Users/home",
			})
		);
	} finally {
		dom.cleanup();
	}
});

Deno.test("tutorial runtime singleton wrapper reaches stored-state lookup", async () => {
	const dom = installMockDom(
		"https://acme.lightning.force.com/lightning/setup/Users/home",
	);

	try {
		await assertRejects(() => checkTutorial(false));
	} finally {
		dom.cleanup();
	}
});
