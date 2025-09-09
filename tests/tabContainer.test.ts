import { mockStorage } from "./mocks.ts";
import {
	assert,
	assertEquals,
	assertFalse,
	assertRejects,
	assertThrows,
} from "https://deno.land/std/testing/asserts.ts";
import Tab from "/tab.js";
import { ensureAllTabsAvailability, TabContainer } from "/tabContainer.js";

function matchStorageToContainer(container: TabContainer) {
	if (mockStorage.againWhySalesforce.length !== container.length) {
		console.log("match", mockStorage.againWhySalesforce, container);
	}
	assertEquals(
		mockStorage.againWhySalesforce.length,
		container.length,
		"lenghts should be the same",
	);
	for (const i in container) {
		assertEquals(
			mockStorage.againWhySalesforce[i].url,
			container[i].url,
			"each item should be the same",
		);
	}
}

const container = await ensureAllTabsAvailability();

await Deno.test("TabContainer - Initialization", async (t) => {
	await t.step("singleton test", async () => {
		const containerfirst = await ensureAllTabsAvailability();
		const containersecond = await ensureAllTabsAvailability();
		assert(containerfirst === containersecond);
		const containerthird = await TabContainer.create();
		assert(containerfirst === containerthird);
	});

	await t.step(
		"initializes with default tabs when no saved tabs exist",
		async () => {
			mockStorage.againWhySalesforce.length = 0;
			const container = await TabContainer._reset();
			assertEquals(container.length, 3); // Default tabs count
			assertEquals(container[0].label, "⚡");
			assertEquals(container[1].label, "flows");
			assertEquals(container[2].label, "users");
		},
	);

	await t.step("initializes with saved tabs from storage", async () => {
		mockStorage.againWhySalesforce = [
			{ label: "Test", url: "test-url" },
		];
		const container = await TabContainer._reset();
		assertEquals(container.length, 1);
		assertEquals(container[0].label, "Test");
		assertEquals(container[0].url, "test-url");
	});

	await t.step(
		"does not initialize with bad tabs passed as input",
		async () => {
			await container.setDefaultTabs();
			assertEquals(container.length, 3); // Default tabs count
			assertEquals(container[0].label, "⚡");
			assertEquals(container[1].label, "flows");
			assertEquals(container[2].label, "users");
			// reset container
			mockStorage.againWhySalesforce = [false];
			assertRejects(async () => await TabContainer._reset());
			// reset container
			mockStorage.againWhySalesforce = [null];
			assertRejects(async () => await TabContainer._reset());
		},
	);
});

await Deno.test("TabContainer - Tab Management", async (t) => {
	await t.step("adds a single tab", async () => {
		await container.setDefaultTabs();
		assert(await container.addTab({ label: "New Tab", url: "new-url" }));
		const lastTab = container[container.length - 1];
		assertEquals(lastTab.label, "New Tab");
		assertEquals(lastTab.url, "new-url");
		matchStorageToContainer(container);
		assert(await container.addTab({ label: "New Tabb", url: "new-urll" }));
		const newLastTab = container[container.length - 1];
		assertEquals(newLastTab.label, "New Tabb");
		assertEquals(newLastTab.url, "new-urll");
		matchStorageToContainer(container);
	});

	await t.step("adds multiple tabs", async () => {
		await container.setDefaultTabs();
		assert(
			await container.addTabs([
				{ label: "Tab1", url: "url1" },
				{ label: "Tab2", url: "url2" },
				{ label: "Tab3", url: "url3" },
			]),
		);
		assertEquals(container[container.length - 3].label, "Tab1");
		assertEquals(container[container.length - 2].label, "Tab2");
		assertEquals(container[container.length - 1].label, "Tab3");
		assertEquals(container[container.length - 3].url, "url1");
		assertEquals(container[container.length - 2].url, "url2");
		assertEquals(container[container.length - 1].url, "url3");
		matchStorageToContainer(container);
	});

	await t.step("prevents duplicate tabs", async () => {
		await container.setDefaultTabs();
		assert(await container.addTab({ label: "Unique", url: "unique-url" }));
		assert(
			await container.addTab({ label: "New Tabb", url: "unique-url-1" }),
		);
		assert(
			await container.addTab({ label: "New Tab", url: "unique-url2" }),
		);
		await assertRejects(
			async () =>
				await container.addTab({
					label: "New Tab",
					url: "unique-url2",
				}),
			Error,
			"error_duplicate_tab",
		);
	});
});

await Deno.test("TabContainer - Organization Filtering", async (t) => {
	await t.step("filters tabs by organization", async () => {
		await container.setDefaultTabs();
		assert(
			await container.addTabs([
				{ label: "Org1 Tab", url: "url1", org: "org1" },
				{ label: "Org2 Tab", url: "url2", org: "org2" },
				{ label: "Org2 Tab2", url: "url22", org: "org2" },
				{ label: "No Org Tab", url: "url3" },
			]),
		);

		const org1Tabs = container.getTabsByOrg("org1");
		assertEquals(org1Tabs.length, 1);
		assertEquals(org1Tabs[0].label, "Org1 Tab");

		const org2Tabs = container.getTabsByOrg("org1", false);
		assertEquals(org2Tabs.length, 2);
		assertEquals(org2Tabs[0].label, "Org2 Tab");
		assertEquals(org2Tabs[1].label, "Org2 Tab2");

		const noOrgTabs = container.getTabsWithOrg(false);
		assertEquals(noOrgTabs.length, 4);
		assertEquals(noOrgTabs[noOrgTabs.length - 1].label, "No Org Tab");

		const onlyOrgTabs = container.getTabsWithOrg();
		assertEquals(onlyOrgTabs.length, 3);
		assertEquals(onlyOrgTabs[onlyOrgTabs.length - 1].label, "Org2 Tab2");
	});
});

await Deno.test("TabContainer - replaceTabs edge cases", async (t) => {
	async function setupContainer() {
		container.length = 0;
		await container.addTabs([
			{ label: "Tab A", url: "url1", org: "test-org" },
			{ label: "Tab B", url: "url2", org: "other-org" },
			{ label: "Tab C", url: "url3", org: "new-org" },
			{ label: "Tab D", url: "url4" },
		]);
		return container;
	}
	// resetTabs = true, removeOrgTabs = true, keepTabsNotThisOrg = 'test-org', removeThisOrgTabs = null
	await t.step(
		"clear all tabs without org and org tabs with org != keepTabsNotThisOrg",
		async () => {
			const container = await setupContainer();

			await container.replaceTabs([], {
				resetTabs: true,
				removeOrgTabs: true,
				keepTabsNotThisOrg: "test-org",
			});

			assertEquals(container.length, 2);
			assertFalse(container.some((t) => t.org === "test-org"));
		},
	);

	// resetTabs = true, removeOrgTabs = true, keepTabsNotThisOrg = null, removeThisOrgTabs = 'other-org'
	await t.step(
		"clears all tabs without org and org tabs with org == removeThisOrgTabs",
		async () => {
			const container = await setupContainer();

			await container.replaceTabs([], {
				resetTabs: true,
				removeOrgTabs: true,
				removeThisOrgTabs: "other-org",
			});

			assertEquals(container.length, 2);
			assertFalse(container.some((t) => t.org === "other-org"));
		},
	);

	// resetTabs = true, removeOrgTabs = true
	await t.step("clears all tabs", async () => {
		const container = await setupContainer();

		await container.replaceTabs([], {
			resetTabs: true,
			removeOrgTabs: true,
		});

		assertEquals(container.length, 0);
	});

	// resetTabs = true, removeOrgTabs = false
	await t.step("removes only non-org (generic) tabs", async () => {
		const container = await setupContainer();

		await container.replaceTabs([], {
			resetTabs: true,
			removeOrgTabs: false,
		});

		assertEquals(container.length, 3);
		assert(container.every((t) => t.org != null));
	});

	// resetTabs = false, removeOrgTabs = true, keepTabsNotThisOrg = 'test-org'
	await t.step(
		"keeps tabs without org and removes org tabs not matching keepTabsNotThisOrg",
		async () => {
			const container = await setupContainer();

			await container.replaceTabs([], {
				resetTabs: false,
				removeOrgTabs: true,
				keepTabsNotThisOrg: "test-org",
			});

			assertEquals(container.length, 2);
			assert(container.every((t) => !t.org || t.org === "test-org"));
		},
	);

	// resetTabs = false, removeOrgTabs = true, keepTabsNotThisOrg = null
	await t.step(
		"keeps tabs without org and removes all org tabs",
		async () => {
			const container = await setupContainer();

			await container.replaceTabs([], {
				resetTabs: false,
				removeOrgTabs: true,
			});

			assertEquals(container.length, 1);
			assert(!container[0].org);
		},
	);

	// resetTabs = false, removeOrgTabs = false, keepTabsNotThisOrg = anything
	await t.step("adds tabs without removing any", async () => {
		const container = await setupContainer();

		await container.replaceTabs([
			{ label: "Tab B", url: "url2", org: "test-org" },
		], {
			resetTabs: false,
			removeOrgTabs: false,
		});

		assertEquals(container.length, 5);
	});
});

await Deno.test("TabContainer - Utility functions", async (t) => {
	await t.step("slice", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		{
			const a = container.slice(0, 1);
			assertEquals(a.length, 1);
			assertEquals(a[0].label, "⚡");
			assertEquals(container.length, 3);
		}
		assertEquals(container.slice(1, 1).length, 0);
		assertEquals(container.slice(1, 0).length, 0);
		assertEquals(container.length, 3);
		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
			]),
		);
		assertEquals(container.length, 7);
		{
			const a = container.slice(2, container.length);
			assertEquals(a.length, 5);
			assertEquals(a[0].label, "users");
			assertEquals(a[1].label, "Org Tab");
			assertEquals(a[2].label, "Normal Tab");
			assertEquals(a[3].label, "Org Tab2");
			assertEquals(a[4].label, "Org Tab3");
			assertEquals(container.length, 7);
		}
		assertEquals(container.slice().length, 7);
		assertEquals(container.length, 7);
	});

	await t.step("splice", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container.splice(0, 1).length, 1);
		assertEquals(container.length, 2);
		assertEquals(container.splice(1, 1).length, 1);
		assertEquals(container.length, 1);

		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
			]),
		);
		assertEquals(container.length, 5);
		assertEquals(container.splice(2, container.length).length, 3);
		assertEquals(container.length, 2);
		assertEquals(container.splice(0, container.length).length, 2);
		assertEquals(container.length, 0);
	});

	await t.step("filter", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(
			container.filter((tab) => tab.label === "flows").length,
			1,
		);
		assertEquals(container.length, 3);
		assertEquals(
			container.filter((tab) => tab.label !== "flows").length,
			2,
		);
		assertEquals(container.length, 3);
		assertEquals(container.filter((tab) => tab.org == null).length, 3);
		assertEquals(container.length, 3);
	});

	await t.step("getTabsWithOrg", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
			]),
		);
		assertEquals(container.length, 7);
		assertEquals(container.getTabsWithOrg().length, 3);
		assertEquals(container.length, 7);
		assertEquals(container.getTabsWithOrg(false).length, 4);
		assertEquals(container.length, 7);
	});

	await t.step("getTabsByOrg", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
			]),
		);
		assertEquals(container.length, 7);
		assertThrows(
			() => container.getTabsByOrg(),
			Error,
			"error_get_with_no_org",
		);
		assertEquals(container.getTabsByOrg("not-present").length, 0);
		assertEquals(container.getTabsByOrg("test-org").length, 1);
		assertEquals(container.getTabsByOrg("test-org1").length, 2);
		assertEquals(container.getTabsByOrg("test-org", false).length, 2);
		assertEquals(container.getTabsByOrg("test-org1", false).length, 1);
		assertEquals(container.length, 7);
	});

	await t.step("getTabsByData", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
				{ label: "Org Tab3", url: "urll", org: "test-org2" },
			]),
		);
		assertEquals(container.length, 8);
		// equal to getTabsByOrg
		assertEquals(container.getTabsByData({ org: "not-present" }).length, 0);
		assertEquals(container.getTabsByData({ org: "test-org" }).length, 1);
		assertEquals(container.getTabsByData({ org: "test-org1" }).length, 2);
		assertEquals(
			container.getTabsByData({ org: "not-present" }, false).length,
			4,
		);
		assertEquals(
			container.getTabsByData({ org: "test-org" }, false).length,
			3,
		);
		assertEquals(
			container.getTabsByData({ org: "test-org1" }, false).length,
			2,
		);

		assertEquals(container.getTabsByData({ label: "Org Tab" }).length, 1);
		assertEquals(
			container.getTabsByData({ label: "Org Tab", org: "test-org" })
				.length,
			1,
		);
		assertEquals(container.getTabsByData({ url: "urll" }).length, 2);
		assertEquals(
			container.getTabsByData({ url: "urll", org: "test-org1" }).length,
			1,
		);
		assertEquals(
			container.getTabsByData({ org: "test-org1", url: "urll" }).length,
			1,
		);
		assertEquals(
			container.getTabsByData({ label: "Org Tab" }, false).length,
			7,
		);
		assertEquals(
			container.getTabsByData(
				{ label: "Org Tab", org: "test-org" },
				false,
			).length,
			7,
		);
		assertEquals(container.getTabsByData({ url: "urll" }, false).length, 6);
		assertEquals(
			container.getTabsByData({ url: "urll", org: "test-org1" }, false)
				.length,
			7,
		);
		assertEquals(
			container.getTabsByData({ org: "test-org1", url: "urll" }, false)
				.length,
			7,
		);
		assertEquals(container.length, 8);
	});

	await t.step("getSingleTabByData", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
				{ label: "Org Tab3", url: "urll", org: "test-org2" },
			]),
		);
		assertEquals(container.length, 8);
		// equal to getTabsByOrg
		assertThrows(
			() => container.getSingleTabByData({ org: "not-present" }),
			Error,
			"error_tab_not_found",
		);
		assertEquals(
			container.getSingleTabByData({ org: "test-org" }).org,
			"test-org",
		);
		assertThrows(
			() => container.getSingleTabByData({ org: "test-org1" }),
			Error,
			"error_many_tabs_found",
		);
		assertThrows(
			() => container.getSingleTabByData({ org: "not-present" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertThrows(
			() => container.getSingleTabByData({ org: "test-org" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertThrows(
			() => container.getSingleTabByData({ org: "test-org1" }, false),
			Error,
			"error_many_tabs_found",
		);
		// equal to getTabsByData
		assertEquals(
			container.getSingleTabByData({ label: "Org Tab" }).url,
			"url",
		);
		assertEquals(
			container.getSingleTabByData({ label: "Org Tab", org: "test-org" })
				.label,
			"Org Tab",
		);
		assertThrows(
			() => container.getSingleTabByData({ url: "urll" }),
			Error,
			"error_many_tabs_found",
		);
		assertThrows(
			() => container.getSingleTabByData({ label: "Org Tab" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertThrows(
			() => container.getSingleTabByData({ url: "urll" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertThrows(
			() =>
				container.getSingleTabByData(
					{ org: "test-org1", url: "urll" },
					false,
				),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(
			container.getSingleTabByData({ url: "normal-url" }).label,
			"Normal Tab",
			"return generic Tab when multiple matches and org is null",
		);
		assertEquals(
			container.getSingleTabByData({
				url: "normal-url",
				org: "test-org1",
			}).label,
			"Org Tab3",
			"return org-specific Tab when multiple matches and org is not null",
		);
		assertThrows(
			() =>
				container.getSingleTabByData(
					{ label: "Org Tab3" },
				),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container.length, 8);
	});

	await t.step("getTabIndex", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
				{ label: "Org Tab3", url: "urll", org: "test-org2" },
			]),
		);
		assertEquals(container.length, 8);
		assertThrows(
			() => container.getTabIndex(),
			Error,
			"error_no_data",
		);
		assertThrows(
			() => container.getTabIndex({ org: "not-present" }),
			Error,
			"error_tab_not_found",
		);
		assertEquals(container.getTabIndex({ org: "test-org" }), 3);
		assertEquals(container.getTabIndex({ org: "test-org1" }), 5);

		assertEquals(
			container.getTabIndex({ label: "Org Tab", org: "test-org" }),
			3,
		);
		assertEquals(
			container.getTabIndex({ url: "urll", org: "test-org1" }),
			5,
		);
		assertEquals(
			container.getTabIndex({ org: "test-org2", url: "urll" }),
			7,
		);
		assertEquals(container.getTabIndex({ org: "test-org2" }), 7);
		assertEquals(container.length, 8);
	});

	await t.step("exists", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "url3", org: "test-org1" },
				{ label: "Org Tab3", url: "url3", org: "test-org2" },
			]),
		);
		assertEquals(container.length, 8);
		assertFalse(
			container.exists({ org: "test-org" }, true),
			"does not exist with org only",
		);
		assert(container.exists({ url: "url", org: "test-org" }, true));
		assert(container.exists({ url: "url3", org: "test-org1" }, true));

		assertFalse(container.exists({ label: "Org Tab" }, true));
		assertFalse(
			container.exists({ url: "urll" }, true),
			"does not exist with url only",
		);
		assert(container.exists({ url: "urll", org: "test-org1" }, true));
		assert(container.exists({ org: "test-org2", url: "url3" }, true));
		assertFalse(container.exists({ org: "test-org2" }, true));
		assertFalse(container.exists({ org: "not-present" }, true));
		assertFalse(
			container.exists({ url: "urll", org: "not-present" }, true),
		);
		assertFalse(container.exists({ url: "url-not-present" }, true));
		assertFalse(
			container.exists({ url: "url-not-present", org: "test-org" }, true),
		);
		assertEquals(container.length, 8);

		assert(
			container.exists({ org: "test-org" }, false),
		);
		assert(container.exists({ url: "url", org: "test-org" }, false));
		assert(container.exists({ url: "url3", org: "test-org1" }, false));

		assertFalse(container.exists({ label: "Org Tab" }, false));
		assertFalse(
			container.exists({ url: "urll" }, false),
		);
		assert(
			container.exists({ url: "urll", org: "test-org1" }, false),
		);
		assert(container.exists({ url: "urll", org: "test-org1" }, false));
		assert(container.exists({ org: "test-org2", url: "url3" }, false));
		assert(container.exists({ org: "test-org2" }, false));
		assertFalse(container.exists({ org: "not-present" }, false));
		assertFalse(
			container.exists({ url: "urll", org: "not-present" }, false),
		);
		assertFalse(container.exists({ url: "url-not-present" }, false));
		assertFalse(
			container.exists(
				{ url: "url-not-present", org: "test-org" },
				false,
			),
		);
	});

	await t.step("toJSON", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assertEquals(container.toJSON(), [
			{
				label: "⚡",
				url: "/lightning",
			},
			{
				label: "flows",
				url: "/lightning/app/standard__FlowsApp",
			},
			{
				label: "users",
				url: "ManageUsers/home",
			},
		]);
		assertEquals(TabContainer.toJSON(container), [
			{
				label: "⚡",
				url: "/lightning",
			},
			{
				label: "flows",
				url: "/lightning/app/standard__FlowsApp",
			},
			{
				label: "users",
				url: "ManageUsers/home",
			},
		]);
	});

	await t.step("toString", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assertEquals(
			container.toString(),
			`[
{
    "label": "⚡",
    "url": "/lightning"
},
{
    "label": "flows",
    "url": "/lightning/app/standard__FlowsApp"
},
{
    "label": "users",
    "url": "ManageUsers/home"
}
]`,
		);
		assertEquals(
			TabContainer.toString(container),
			`[
{
    "label": "⚡",
    "url": "/lightning"
},
{
    "label": "flows",
    "url": "/lightning/app/standard__FlowsApp"
},
{
    "label": "users",
    "url": "ManageUsers/home"
}
]`,
		);
	});

	await t.step("isValid", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assert(TabContainer.isValid(container, false));
		assert(TabContainer.isValid(container, true));
		const customContainer = container.toJSON();
		assert(TabContainer.isValid(customContainer, false));
		assert(TabContainer.isValid(customContainer, true));
		const untabbedContainer = [
			{
				random: "string",
				incredible: 5678,
			},
			{
				superb: true,
				fantastic: {
					...customContainer,
				},
			},
		];
		assert(TabContainer.isValid(untabbedContainer, false));
		assertFalse(TabContainer.isValid(untabbedContainer, true));
		const notAnArray = "Goodbye Celsa";
		assertFalse(TabContainer.isValid(notAnArray, false));
		assertFalse(TabContainer.isValid(notAnArray, true));

		assertFalse(TabContainer.isValid(null, false));
		assertFalse(TabContainer.isValid(null, true));
	});

	await t.step("map", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		const newContainer = container.map((_) => "I'm a string!");
		assertEquals(container.length, 3);
		assertEquals(newContainer.length, 3);
		newContainer.forEach((el) => assertEquals(el, "I'm a string!"));
	});

	await t.step("setDefaultTabs", async () => {
		container.length = 0;
		assertEquals(container.length, 0);
		assert(await container.setDefaultTabs());
		assertEquals(container.length, 3);
		assertEquals(container[0].label, "⚡");
		assertEquals(container[1].label, "flows");
		assertEquals(container[2].label, "users");
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
	});
});

await Deno.test("TabContainer - Synchronization", async (t) => {
	await t.step("syncs tabs with storage", async () => {
		await container.setDefaultTabs();

		assertEquals(container.length, 3);
		assertEquals(mockStorage.againWhySalesforce.length, 3);
		assert(
			await container.addTab(
				{ label: "Sync Test", url: "sync-url" },
				false,
			),
		);
		assertEquals(container.length, 4);
		assertEquals(mockStorage.againWhySalesforce.length, 3);

		assert(await container.syncTabs());
		assertEquals(container.length, 4);
		assertEquals(mockStorage.againWhySalesforce.length, 4);

		assert(
			await container.syncTabs([{
				label: "Sync Test",
				url: "sync-url2",
			}]),
		);
		assertEquals(container.length, 1);
		assertEquals(mockStorage.againWhySalesforce.length, 1);
		assertRejects(
			async () =>
				await container.syncTabs({
					label: "Sync Test",
					url: "sync-url2",
				}),
			Error,
			"error_no_array",
		);
		assertEquals(container.length, 0);
		assertEquals(mockStorage.againWhySalesforce.length, 1);

		assert(
			await TabContainer._syncTabs([{
				label: "Sync Test",
				url: "sync-url3",
			}]),
		);
		assertEquals(container.length, 0);
		assertEquals(mockStorage.againWhySalesforce.length, 1);
		assertRejects(
			async () =>
				await TabContainer._syncTabs({
					label: "Sync Test",
					url: "sync-url2",
				}),
			Error,
			"error_no_array",
		);

		const arr = [];
		arr.push(await Tab.create("Sync Test", "sync-url3"));
		assert(await TabContainer._syncTabs(arr));
		assertEquals(container.length, 0);
		assertEquals(mockStorage.againWhySalesforce.length, 1);
	});
});

await Deno.test("TabContainer - Import", async (t) => {
	await t.step("import tabs from JSON string", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);

		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}]`,
			),
			2,
		);
		assertEquals(container.length, 5);

		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}]`,
				true,
				false,
			),
			2,
		);
		assertEquals(container.length, 2);

		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url2"},{"label":"orglabel","url":"orgurl2","org":"orgorg"}]`,
				true,
			),
			2,
		);
		assertEquals(container.length, 3);

		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url3"},{"label":"orglabel","url":"orgurl3","org":"orgorg"}]`,
				false,
				false,
			),
			2,
		);
		assertEquals(container.length, 3);
	});

	await t.step("does not import tabs from wrong JSON string", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertRejects(
			async () =>
				await container.importTabs(
					`{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}`,
				),
			Error,
		);
		assertEquals(container.length, 3);

		assertRejects(
			async () =>
				await container.importTabs(
					`[{"label":"hello","url":"nice-url"},{"unexpected":"orglabel","url":"orgurl","org":"orgorg"}]`,
					true,
					false,
				),
			Error,
		);
		assertEquals(container.length, 3);

		assertRejects(
			async () => await container.importTabs(`a simple string`, true),
			Error,
		);
		assertEquals(container.length, 3);

		assertRejects(
			async () =>
				await container.importTabs(
					`[{"label":"hello","url":"nice-url","whoopsie":{"label":"hello","url":"nice-url"}}`,
					true,
				),
			Error,
		);
		assertEquals(container.length, 3);
	});
});

await Deno.test("TabContainer - Move Tab", async (t) => {
	await t.step("make a tab be the first of the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		matchStorageToContainer(container);
		assert(
			await container.addTabs([
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "url3", org: "test-org1" },
			]),
		);
		assertEquals(container.length, 7);
		assertEquals(
			await container.moveTab({ url: "ManageUsers/home" }, {
				fullMovement: true,
			}),
			0,
		);
		assertEquals(container.length, 7);
		assertEquals(container[0].url, "ManageUsers/home");
		assertEquals(container[1].url, "/lightning");
		assertEquals(container[2].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[3].url, "url");
		assertEquals(container[4].url, "normal-url");
		assertEquals(container[5].url, "urll");
		assertEquals(container[6].url, "url3");
		matchStorageToContainer(container);
		await container.replaceTabs([
			{ label: "Org Tab", url: "url", org: "test-org1" },
			{ label: "Org Tab2", url: "urll", org: "test-org1" },
			{ label: "Org Tab3", url: "url3", org: "test-org1" },
			{ label: "Normal Tab", url: "normal-url" },
		], {
			resetTabs: true,
			removeOrgTabs: true,
		});
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "url");
		assertEquals(container[1].url, "urll");
		assertEquals(container[2].url, "url3");
		assertEquals(container[3].url, "normal-url");
		assertEquals(
			await container.moveTab({ url: "normal-url", org: "test-org" }, {
				moveBefore: true,
				fullMovement: false,
			}),
			0,
			"performs full movement and is set as first Tab",
		);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "normal-url");
		assertEquals(container[1].url, "url");
		assertEquals(container[2].url, "urll");
		assertEquals(container[3].url, "url3");
	});

	await t.step("make a tab be the last of the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		matchStorageToContainer(container);
		assertEquals(
			await container.moveTab({ url: "/lightning" }, {
				moveBefore: false,
				fullMovement: true,
			}),
			2,
		);
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[1].url, "ManageUsers/home");
		assertEquals(container[2].url, "/lightning");
		matchStorageToContainer(container);
	});

	await t.step("move a tab left/up one spot in the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		matchStorageToContainer(container);

		assertEquals(await container.moveTab({ url: "ManageUsers/home" }), 1);
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "ManageUsers/home");
		assertEquals(container[2].url, "/lightning/app/standard__FlowsApp");
		matchStorageToContainer(container);
	});

	await t.step("move a tab right/down one spot in the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		matchStorageToContainer(container);

		assertEquals(
			await container.moveTab({
				url: "/lightning/app/standard__FlowsApp",
			}, { moveBefore: false }),
			2,
		);
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "ManageUsers/home");
		assertEquals(container[2].url, "/lightning/app/standard__FlowsApp");
		matchStorageToContainer(container);
	});

	await t.step("move a tab right/down other org Tabs", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		matchStorageToContainer(container);
		assert(
			await container.addTabs([
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "url3", org: "test-org1" },
			]),
		);
		assertEquals(container.length, 7);
		assertEquals(
			await container.moveTab({ url: "url", org: "test-org" }, {
				moveBefore: false,
			}),
			7,
			"performs full movement and is set as last Tab",
		);
		assertEquals(container.length, 7);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assertEquals(container[3].url, "normal-url");
		assertEquals(container[4].url, "urll");
		assertEquals(container[5].url, "url3");
		assertEquals(container[6].url, "url");
		assertEquals(
			await container.moveTab({
				url: "ManageUsers/home",
				org: "test-org",
			}, {
				moveBefore: false,
			}),
			3,
			"is moved after undefined org Tabs",
		);
		assertEquals(container.length, 7);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "normal-url");
		assertEquals(container[3].url, "ManageUsers/home");
		assertEquals(container[4].url, "urll");
		assertEquals(container[5].url, "url3");
		assertEquals(container[6].url, "url");
		assertEquals(
			await container.moveTab({
				url: "ManageUsers/home",
				org: "test-org",
			}, {
				moveBefore: false,
			}),
			6,
			"is moved after other org Tabs + 1 same org Tab",
		);
		assertEquals(container.length, 7);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "normal-url");
		assertEquals(container[3].url, "urll");
		assertEquals(container[4].url, "url3");
		assertEquals(container[5].url, "url");
		assertEquals(container[6].url, "ManageUsers/home");
	});

	await t.step("move a Tab left/up other org Tabs", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		matchStorageToContainer(container);
		assert(
			await container.addTabs([
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab", url: "url", org: "test-org" },
				{ label: "Org Tab3", url: "url3", org: "test-org1" },
			]),
		);
		assertEquals(container.length, 7);
		assertEquals(container[3].url, "normal-url");
		assertEquals(container[4].url, "urll");
		assertEquals(container[5].url, "url");
		assertEquals(container[6].url, "url3");
		assertEquals(
			await container.moveTab({ url: "urll", org: "test-org1" }, {
				moveBefore: true,
			}),
			3,
			"is moved before undefined org Tabs",
		);
		assertEquals(container.length, 7);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assertEquals(container[3].url, "urll");
		assertEquals(container[4].url, "normal-url");
		assertEquals(container[5].url, "url");
		assertEquals(container[6].url, "url3");
		assertEquals(
			await container.moveTab({ url: "normal-url", org: "test-org" }, {
				moveBefore: true,
			}),
			2,
			"is moved before other org Tabs + 1 same org Tab",
		);
		assertEquals(container.length, 7);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "normal-url");
		assertEquals(container[3].url, "ManageUsers/home");
		assertEquals(container[4].url, "urll");
		assertEquals(container[5].url, "url");
		assertEquals(container[6].url, "url3");
	});
});

await Deno.test("TabContainer - Remove Tab(s)", async (t) => {
	await t.step("remove this tab", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");

		assert(await container.remove({ url: "ManageUsers/home" }));
		assertEquals(container.length, 2);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		matchStorageToContainer(container);

		assertRejects(
			async () => await container.remove(),
			Error,
		);
		assertRejects(
			async () => await container.remove({ org: "test-org" }),
			Error,
		);
	});

	await t.step("remove all other tabs", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");

		assert(await container.removeOtherTabs({ url: "ManageUsers/home" }));
		assertEquals(container.length, 1);
		assertEquals(container[0].url, "ManageUsers/home");
	});

	await t.step("remove tabs before/on the left", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(
			await container.removeOtherTabs({
				url: "/lightning/app/standard__FlowsApp",
			}, { removeBefore: true }),
		);
		assertEquals(container.length, 2);
		assertEquals(container[0].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[1].url, "ManageUsers/home");
		await container.replaceTabs([
			{ label: "Org Tab2", url: "url3" },
			{ label: "Org Tab", url: "url", org: "test-org1" },
			{ label: "Org Tab2", url: "urll", org: "test-org" },
			{ label: "Org Tab3", url: "urll", org: "test-org1" },
			{ label: "Normal Tab", url: "normal-url" },
			{ label: "Org Tab2", url: "url3", org: "test-org" },
		], {
			resetTabs: true,
			removeOrgTabs: true,
		});
		assertEquals(container.length, 6);
		assertEquals(container[0].url, "url3");
		assertEquals(container[1].url, "url");
		assertEquals(container[2].url, "urll");
		assertEquals(container[3].url, "urll");
		assertEquals(container[4].url, "normal-url");
		assertEquals(container[5].url, "url3");
		assert(
			await container.removeOtherTabs({
				url: "normal-url",
				org: "test-org",
			}, { removeBefore: true }),
			"removes all other Tabs with the same/undefined Org which are before the selected Tab",
		);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "url");
		assertEquals(container[1].url, "urll");
		assertEquals(container[2].url, "normal-url");
		assertEquals(container[3].url, "url3");
	});

	await t.step("remove tabs after", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(
			await container.removeOtherTabs({
				url: "/lightning/app/standard__FlowsApp",
			}, { removeBefore: false }),
		);
		assertEquals(container.length, 2);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		await container.replaceTabs([
			{ label: "Org Tab2", url: "url3" },
			{ label: "Org Tab", url: "url", org: "test-org1" },
			{ label: "Org Tab2", url: "urll", org: "test-org" },
			{ label: "Org Tab3", url: "urll", org: "test-org1" },
			{ label: "Normal Tab", url: "normal-url" },
			{ label: "Org Tab2", url: "url3", org: "test-org" },
		], {
			resetTabs: true,
			removeOrgTabs: true,
		});
		assertEquals(container.length, 6);
		assertEquals(container[0].url, "url3");
		assertEquals(container[1].url, "url");
		assertEquals(container[2].url, "urll");
		assertEquals(container[3].url, "urll");
		assertEquals(container[4].url, "normal-url");
		assertEquals(container[5].url, "url3");
		assert(
			await container.removeOtherTabs({
				url: "url",
				org: "test-org1",
			}, { removeBefore: false }),
			"removes all other Tabs with the same/undefined Org which are after the selected Tab",
		);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "url3");
		assertEquals(container[1].url, "url");
		assertEquals(container[2].url, "urll");
		assertEquals(container[3].url, "url3");
	});
});

await Deno.test("TabContainer - Error on Invalid Tabs", async (t) => {
	await t.step("errorOnInvalidTabs", () => {
		assertThrows(
			() => TabContainer.errorOnInvalidTabs(),
			Error,
		);
		assertThrows(
			() => TabContainer.errorOnInvalidTabs("reject"),
			Error,
		);
		assertThrows(
			() => TabContainer.errorOnInvalidTabs([{ unexpected: true }]),
			Error,
		);
		assertThrows(
			() =>
				TabContainer.errorOnInvalidTabs([{
					label: "hi",
					url: "mum",
					orgs: ["alpha", "beta"],
				}]),
			Error,
		);
	});
});

await Deno.test("TabContainer - Update Tab", async () => {
	await container.setDefaultTabs();
	assertEquals(container.length, 3);
	assertEquals(container[0].url, "/lightning");
	assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
	assertEquals(container[2].url, "ManageUsers/home");
	assert(
		await container.updateTab({ url: "/lightning" }, {
			url: "/lightning/test",
		}),
	);
	assertEquals(container[0].url, "/lightning/test");
	assertEquals(container[0].label, "⚡");
	assertEquals(container[0].org, undefined);
	assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
	assertEquals(container[2].url, "ManageUsers/home");
	matchStorageToContainer(container);
	assert(
		await container.updateTab({ url: "ManageUsers/home" }, { org: "a" }),
	);
	assertEquals(container[0].org, undefined);
	assertEquals(container[1].org, undefined);
	assertEquals(container[2].org, "a");
	assertEquals(container[2].label, "users");
	assertEquals(container[2].url, "ManageUsers/home");
	matchStorageToContainer(container);
	assert(
		await container.updateTab({ url: "ManageUsers/home" }, {
			org: "",
			url: "",
			label: "",
		}),
	);
	assertEquals(container[0].org, undefined);
	assertEquals(container[1].org, undefined);
	assertEquals(container[2].org, undefined);
	assertEquals(container[2].label, "users");
	assertEquals(container[2].url, "ManageUsers/home");
	matchStorageToContainer(container);
});

await Deno.test("TabContainer - Sort Tabs", async (t) => {
	await t.step("By label ascending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(await container.sort());
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "label");
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].label, "⚡");
		assertEquals(container[1].label, "flows");
		assertEquals(container[2].label, "users");
		// update tabs to add org (so they all are scrambled)
		assert(await container.updateTab(container[0], { org: "a" }));
		assert(await container.updateTab(container[1], { org: "c" }));
		assert(await container.updateTab(container[2], { org: "b" }));
		// move around because they were already sorted
		await container.moveTab({ label: "flows" }, { moveBefore: true });
		assertFalse(
			container.isSorted,
			"After moving a Tab, they should not be sorted",
		);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].label, "flows");
		assertEquals(container[1].label, "⚡");
		assertEquals(container[2].label, "users");
		// sort again
		assert(await container.sort({ sortBy: "label", sortAsc: true }));
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "label");
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].label, "⚡");
		assertEquals(container[1].label, "flows");
		assertEquals(container[2].label, "users");
	});

	await t.step("By label descending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].label, "⚡");
		assertEquals(container[1].label, "flows");
		assertEquals(container[2].label, "users");
		assert(container.isSorted, "should detect is alredy sorted");
		assert(
			container.isSortedBy === "label" || container.isSortedBy === "url",
			"for this particular case, the array is already sorted both by label and url",
		);
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// add new Tab because they were already sorted
		assert(await container.addTab({ label: "mylabel", url: "/myurl" }));
		// update tabs to add org (so they all are scrambled)
		assert(await container.updateTab(container[0], { org: "a" }));
		assert(await container.updateTab(container[1], { org: "c" }));
		assert(await container.updateTab(container[2], { org: "b" }));
		matchStorageToContainer(container);
		assertFalse(
			container.isSorted,
			"After adding this Tab, they should not be sorted",
		);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].label, "⚡");
		assertEquals(container[1].label, "flows");
		assertEquals(container[2].label, "users");
		assertEquals(container[3].label, "mylabel");
		// sort array
		assert(await container.sort({ sortBy: "label", sortAsc: false }));
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "label");
		assertFalse(container.isSortedAsc);
		assert(container.isSortedDesc);
		assertEquals(container[0].label, "users");
		assertEquals(container[1].label, "mylabel");
		assertEquals(container[2].label, "flows");
		assertEquals(container[3].label, "⚡");
	});

	await t.step("By URL ascending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// add new Tabs to scramble
		assert(
			await container.addTabs([
				{ label: "flows", url: "flows", org: "e" },
				{ label: "assignment", url: "assignment", org: "a" },
				{ label: "field", url: "field" },
			]),
		);
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by URL ascending
		assert(await container.sort({ sortBy: "url", sortAsc: true }));
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "url");
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "assignment");
		assertEquals(container[3].url, "field");
		assertEquals(container[4].url, "flows");
		assertEquals(container[5].url, "ManageUsers/home");
	});

	await t.step("By URL descending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// move around because they were already sorted
		container.moveTab({ label: "flows" }, { moveBefore: true });
		// add orgs
		assert(await container.updateTab(container[0], { org: "a" }));
		assert(await container.updateTab(container[1], { org: "c" }));
		assert(await container.updateTab(container[2], { org: "b" }));
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by URL descending
		assert(await container.sort({ sortBy: "url", sortAsc: false }));
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "url");
		assertFalse(container.isSortedAsc);
		assert(container.isSortedDesc);
		assertEquals(container[0].url, "ManageUsers/home");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "/lightning");
	});

	await t.step("By org ascending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// move around because they were already sorted
		container.moveTab({ label: "flows" }, { moveBefore: true });
		// add orgs
		assert(await container.updateTab(container[0], { org: "a" }));
		assert(await container.updateTab(container[1], { org: "c" }));
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by org ascending
		assert(await container.sort({ sortBy: "org", sortAsc: true }));
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "org");
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].org, undefined);
		assertEquals(container[1].org, "a");
		assertEquals(container[2].org, "c");
	});

	await t.step("By org descending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// move around because they were already sorted
		container.moveTab({ label: "flows" }, { moveBefore: true });
		// add orgs
		assert(await container.updateTab(container[0], { org: "a" }));
		assert(await container.updateTab(container[1], { org: "c" }));
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by org descending
		assert(await container.sort({ sortBy: "org", sortAsc: false }));
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "org");
		assertFalse(container.isSortedAsc);
		assert(container.isSortedDesc);
		assertEquals(container[0].org, "c");
		assertEquals(container[1].org, "a");
		assertEquals(container[2].org, undefined);
	});
});
