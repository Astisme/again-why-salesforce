import { expect, test } from "bun:test";
import { createSfElementsModule } from "../../../src/salesforce/module/sf-elements-module.js";

function createSetupTabFixture() {
	const classTokens = [];
	const appended = [];
	const parent = {
		appendChild: (element) => appended.push(element),
		querySelector: () => null,
	};
	const nativePinnedTabs = { parentElement: parent };
	const extensionTabs = {
		addEventListener: () => {},
		classList: {
			add: (...tokens) => classTokens.push(...tokens),
		},
		dataset: {},
		getAttribute: () => null,
		id: "",
		scrollLeft: 0,
		setAttribute: () => {},
		style: { overflowX: "" },
	};
	const documentRef = {
		createElement: (tag) => {
			expect(tag).toBe("ul");
			return extensionTabs;
		},
		getElementsByClassName: () => [],
		querySelector: (selector) => {
			expect(selector).toBe("ul.pinnedItems.slds-grid");
			return nativePinnedTabs;
		},
	};

	return { appended, classTokens, documentRef, extensionTabs };
}

test("keeps the extension Setup tab list out of Salesforce's native tabBarItems class", () => {
	const { appended, classTokens, documentRef, extensionTabs } =
		createSetupTabFixture();
	const module = createSfElementsModule({ documentRef });

	expect(module.findSetupTabUlInSalesforcePage()).toBe(true);
	expect(classTokens).toEqual(["slds-grid"]);
	expect(extensionTabs.id).toBe("again-why-salesforce");
	expect(appended).toEqual([extensionTabs]);
	expect(module.getSetupTabUl()).toBe(extensionTabs);
});
