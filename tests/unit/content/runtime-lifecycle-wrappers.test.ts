/// <reference lib="dom" />
import "../../mocks.test.ts";
import { assertEquals, assertStrictEquals } from "@std/testing/asserts";
import * as generatorRuntime from "../../../src/salesforce/runtime/generator-runtime.js";
import * as generator from "../../../src/salesforce/generator.js";
import * as dragHandler from "../../../src/salesforce/dragHandler.js";
import * as exportRuntime from "../../../src/salesforce/export.js";
import * as modalLayout from "../../../src/salesforce/modal-layout.js";
import * as reviewSponsor from "../../../src/components/review-sponsor/review-sponsor.js";

/**
 * Creates typed generator module fake that records delegated calls.
 *
 * @return {{ calls: string[]; module: Record<string, (...args: unknown[]) => string> }} Generator fake.
 */
function createGeneratorFake() {
	const calls: string[] = [];

	/**
	 * Creates one recorded generator API function.
	 *
	 * @param {string} name API function name.
	 * @return {(...args: unknown[]) => string} Recorded API function.
	 */
	function record(name: string) {
		return (...args: unknown[]) => {
			calls.push(`${name}:${JSON.stringify(args)}`);
			return name;
		};
	}

	return {
		calls,
		module: {
			createManageTabRow: record("createManageTabRow"),
			generateCheckboxWithLabel: record("generateCheckboxWithLabel"),
			generateHelpWith_i_popup: record("generateHelpWith_i_popup"),
			generateManageTabsModal: record("generateManageTabsModal"),
			generateOpenOtherOrgModal: record("generateOpenOtherOrgModal"),
			generateRadioButtons: record("generateRadioButtons"),
			generateReviewSponsorSvgs: record("generateReviewSponsorSvgs"),
			generateRowTemplate: record("generateRowTemplate"),
			generateSection: record("generateSection"),
			generateSldsFileInput: record("generateSldsFileInput"),
			generateSldsModal: record("generateSldsModal"),
			generateSldsModalWithTabList: record("generateSldsModalWithTabList"),
			generateSldsToastMessage: record("generateSldsToastMessage"),
			generateStyleFromSettings: record("generateStyleFromSettings"),
			generateTutorialElements: record("generateTutorialElements"),
			generateUpdateTabModal: record("generateUpdateTabModal"),
			handleLightningLinkClick: record("handleLightningLinkClick"),
			sldsConfirm: record("sldsConfirm"),
		},
	};
}

Deno.test("generator runtime lifecycle is lazy and generator entrypoint preserves defaults", async () => {
	const fake = createGeneratorFake();
	generatorRuntime.__testHooks.resetModule();
	generatorRuntime.__testHooks.setModule(fake.module);

	try {
		assertStrictEquals(generatorRuntime.getModule(), fake.module);
		assertEquals(String(await generator.handleLightningLinkClick(new Event("click"))), "handleLightningLinkClick");
		assertEquals(String(await generator.generateStyleFromSettings()), "generateStyleFromSettings");
		assertEquals(String(generator.generateRowTemplate("row", "config")), "generateRowTemplate");
		assertEquals(String(await generator.generateSldsToastMessage("toast")), "generateSldsToastMessage");
		assertEquals(String(await generator.generateSection()), "generateSection");
		assertEquals(String(await generator.generateSldsModal()), "generateSldsModal");
		assertEquals(String(generator.generateRadioButtons("group")), "generateRadioButtons");
		assertEquals(String(await generator.generateOpenOtherOrgModal()), "generateOpenOtherOrgModal");
		assertEquals(String(await generator.generateSldsFileInput("wrapper", "input", "type")), "generateSldsFileInput");
		assertEquals(String(await generator.generateCheckboxWithLabel("id", "label")), "generateCheckboxWithLabel");
		assertEquals(String(await generator.generateUpdateTabModal("label", "url", "org")), "generateUpdateTabModal");
		assertEquals(String(generator.generateHelpWith_i_popup()), "generateHelpWith_i_popup");
		assertEquals(String(await generator.generateSldsModalWithTabList()), "generateSldsModalWithTabList");
		assertEquals(String(await generator.createManageTabRow()), "createManageTabRow");
		assertEquals(String(await generator.generateManageTabsModal()), "generateManageTabsModal");
		assertEquals(String(generator.generateReviewSponsorSvgs()), "generateReviewSponsorSvgs");
		assertEquals(String(await generator.generateTutorialElements()), "generateTutorialElements");
		assertEquals(String(await generator.sldsConfirm()), "sldsConfirm");
		assertEquals(fake.calls.length, 18);
	} finally {
		generatorRuntime.__testHooks.resetModule();
	}
});

Deno.test("lazy entrypoint wrappers delegate through replaceable module singletons", async () => {
	const calls: string[] = [];
	const callback = () => calls.push("callback");
	const dragModule = {
		setupDragForTable: (value: () => void) => {
			value();
			calls.push("table");
		},
		setupDragForUl: (value: () => void) => {
			value();
			calls.push("ul");
		},
	};
	const exportModule = {
		createExportModal: () => {
			calls.push("export");
			return Promise.resolve();
		},
	};
	const modalModule = {
		updateModalBodyOverflow: (article: HTMLElement | null = null) => {
			calls.push(article == null ? "modal:null" : "modal:article");
		},
	};
	const reviewModule = {
		showReviewOrSponsor: () => calls.push("review"),
	};

	dragHandler.__testHooks.setModule(dragModule);
	exportRuntime.__testHooks.setModule(exportModule);
	modalLayout.__testHooks.setModule(modalModule);
	reviewSponsor.__testHooks.setModule(reviewModule);
	try {
		assertStrictEquals(dragHandler.getModule(), dragModule);
		assertStrictEquals(exportRuntime.getModule(), exportModule);
		assertStrictEquals(modalLayout.getModule(), modalModule);
		assertStrictEquals(reviewSponsor.getModule(), reviewModule);
		dragHandler.setupDragForTable(callback);
		dragHandler.setupDragForUl(callback);
		await exportRuntime.createExportModal();
		modalLayout.updateModalBodyOverflow();
		reviewSponsor.showReviewOrSponsor();
		assertEquals(calls, [
			"callback",
			"table",
			"callback",
			"ul",
			"export",
			"modal:null",
			"review",
		]);
	} finally {
		dragHandler.__testHooks.resetModule();
		exportRuntime.__testHooks.resetModule();
		modalLayout.__testHooks.resetModule();
		reviewSponsor.__testHooks.resetModule();
	}
});
