import { mockStorage } from "./mocks.ts";
import {
	assert,
	assertEquals,
	assertFalse,
	assertRejects,
	assertThrows,
} from "@std/testing/asserts";
import Tab from "/tab.js";
import { ensureAllTabsAvailability, TabContainer } from "/tabContainer.js";
const currentDate = Date.now();

function matchStorageToContainer(container: TabContainer) {
	if (
		mockStorage.againWhySalesforce[TabContainer.keyTabs].length !==
			container.length
	) {
		console.log(
			"match",
			mockStorage.againWhySalesforce[TabContainer.keyTabs],
			container,
		);
	}
	assertEquals(
		mockStorage.againWhySalesforce[TabContainer.keyTabs].length,
		container.length,
		"lenghts should be the same",
	);
	for (const i in container) {
		assertEquals(
			mockStorage.againWhySalesforce[TabContainer.keyTabs][i].url,
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
		assertEquals(containerfirst[TabContainer.keyPinnedTabsNo], 0);
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
			assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		},
	);

	await t.step("initializes with saved tabs from storage", async () => {
		mockStorage.againWhySalesforce = [
			{ label: "Test", url: "test-url" },
			{
				label: "Test2",
				url: "test-url2",
				[Tab.keyClickCount]: 3,
				[Tab.keyClickDate]: currentDate,
			},
		];
		const container = await TabContainer._reset();
		assertEquals(container.length, 2);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].label, "Test");
		assertEquals(container[0].url, "test-url");
		assertEquals(container[1].label, "Test2");
		assertEquals(container[1].url, "test-url2");
		assertEquals(container[1][Tab.keyClickCount], 3);
		assertEquals(container[1][Tab.keyClickDate], currentDate);
	});

	await t.step(
		"initializes with saved tabs from storage and pinned tabs from storage",
		async () => {
			mockStorage.againWhySalesforce = {
				[TabContainer.keyTabs]: [
					{ label: "Test", url: "test-url" },
					{
						label: "Test2",
						url: "test-url2",
						[Tab.keyClickCount]: 3,
						[Tab.keyClickDate]: currentDate,
					},
				],
				[TabContainer.keyPinnedTabsNo]: 1,
			};
			const container = await TabContainer._reset();
			assertEquals(container.length, 2);
			assertEquals(container[TabContainer.keyPinnedTabsNo], 1);
			assertEquals(container[0].label, "Test");
			assertEquals(container[0].url, "test-url");
			assertEquals(container[1].label, "Test2");
			assertEquals(container[1].url, "test-url2");
			assertEquals(container[1][Tab.keyClickCount], 3);
			assertEquals(container[1][Tab.keyClickDate], currentDate);
		},
	);

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
	await t.step("addTab", async () => {
		await container.setDefaultTabs();
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(await container.addTab({ label: "New Tab", url: "new-url" }));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		const lastTab = container.at(-1);
		assertEquals(lastTab.label, "New Tab");
		assertEquals(lastTab.url, "new-url");
		matchStorageToContainer(container);
		assert(
			await container.addTab({
				label: "New Tabb",
				url: "new-urll",
				[Tab.keyClickCount]: 9,
			}),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		const newLastTab = container.at(-1);
		assertEquals(newLastTab.label, "New Tabb");
		assertEquals(newLastTab.url, "new-urll");
		assertEquals(newLastTab[Tab.keyClickCount], 9);
		matchStorageToContainer(container);
	});

	await t.step("addTabs", async () => {
		await container.setDefaultTabs();
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(
			await container.addTabs([
				{ label: "Tab1", url: "url1" },
				{ label: "Tab2", url: "url2", org: "test2" },
				{ label: "Tab3", url: "url3", [Tab.keyClickCount]: 2 },
				{ label: "Tab4", url: "url4", [Tab.keyClickDate]: currentDate },
			]),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.at(-4).label, "Tab1");
		assertEquals(container.at(-3).label, "Tab2");
		assertEquals(container.at(-2).label, "Tab3");
		assertEquals(container.at(-1).label, "Tab4");
		assertEquals(container.at(-4).url, "url1");
		assertEquals(container.at(-3).url, "url2");
		assertEquals(container.at(-2).url, "url3");
		assertEquals(container.at(-1).url, "url4");
		assertEquals(container.at(-3).org, "test2");
		assertEquals(container.at(-2)[Tab.keyClickCount], 2);
		assertEquals(container.at(-1)[Tab.keyClickDate], currentDate);
		matchStorageToContainer(container);
	});

	await t.step("addTab prevents duplicate tabs", async () => {
		await container.setDefaultTabs();
		assert(await container.addTab({ label: "Unique", url: "unique-url" }));
		assert(
			await container.addTab({ label: "New Tabb", url: "unique-url-1" }),
		);
		assert(
			await container.addTab({ label: "New Tab", url: "unique-url2" }),
		);
		assert(
			await container.addTab({
				label: "New Tab",
				url: "unique-url2",
				org: "test-org2",
			}),
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		const org1Tabs = container.getTabsByOrg("org1");
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(org1Tabs.length, 1);
		assertEquals(org1Tabs[0].label, "Org1 Tab");
		const org2Tabs = container.getTabsByOrg("org1", false);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(org2Tabs.length, 2);
		assertEquals(org2Tabs[0].label, "Org2 Tab");
		assertEquals(org2Tabs[1].label, "Org2 Tab2");
		const noOrgTabs = container.getTabsWithOrg(false);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(noOrgTabs.length, 4);
		assertEquals(noOrgTabs.at(-1).label, "No Org Tab");
		const onlyOrgTabs = container.getTabsWithOrg();
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(onlyOrgTabs.length, 3);
		assertEquals(onlyOrgTabs.at(-1).label, "Org2 Tab2");
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
			assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
			assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 0);
	});

	// resetTabs = true, removeOrgTabs = false
	await t.step("removes only non-org (generic) tabs", async () => {
		const container = await setupContainer();
		await container.replaceTabs([], {
			resetTabs: true,
			removeOrgTabs: false,
		});
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
			assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
			assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 5);
	});
});

await Deno.test("TabContainer - Utility functions", async (t) => {
	await t.step("slice", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		{
			const a = container.slice(0, 1);
			assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
			assertEquals(a.length, 1);
			assertEquals(a[0].label, "⚡");
			assertEquals(container.length, 3);
		}
		assertEquals(container.slice(1, 1).length, 0);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.slice(1, 0).length, 0);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
			assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
			assertEquals(a.length, 5);
			assertEquals(a[0].label, "users");
			assertEquals(a[1].label, "Org Tab");
			assertEquals(a[2].label, "Normal Tab");
			assertEquals(a[3].label, "Org Tab2");
			assertEquals(a[4].label, "Org Tab3");
			assertEquals(container.length, 7);
		}
		assertEquals(container.slice().length, 7);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 7);
	});

	await t.step("push", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container.push({ label: "Org Tab", url: "url" }), 4);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 4);
		assertEquals(container.at(-1).url, "url");
		assertEquals(
			container.push([
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
			]),
			7,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.at(-3).url, "normal-url");
		assertEquals(container.at(-2).url, "urll");
		assertEquals(container.at(-1).url, "normal-url");
		assertEquals(container.at(-1).org, "test-org1");
		assertEquals(
			container.push(...[
				{ label: "Normal Tab", url: "normal-url4" },
				{ label: "Org Tab2", url: "urll4", org: "test-org1" },
				{ label: "Org Tab3", url: "normal4-url", org: "test-org1" },
			]),
			10,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.at(-3).url, "normal-url4");
		assertEquals(container.at(-2).url, "urll4");
		assertEquals(container.at(-1).url, "normal4-url");
		assertEquals(
			container.push(
				{ label: "Normal Tab", url: "normal-url5" },
				{ label: "Org Tab3", url: "normal5-url", org: "test-org1" },
			),
			12,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.at(-2).url, "normal-url5");
		assertEquals(container.at(-1).url, "normal5-url");
		// check also the ones before
		assertEquals(container.at(-9).url, "url");
		assertEquals(container.at(-8).url, "normal-url");
		assertEquals(container.at(-7).url, "urll");
		assertEquals(container.at(-6).url, "normal-url");
		assertEquals(container.at(-6).org, "test-org1");
		assertEquals(container.at(-5).url, "normal-url4");
		assertEquals(container.at(-4).url, "urll4");
		assertEquals(container.at(-3).url, "normal4-url");
		// does not throw on errored tabs
		assertEquals(
			container.push({ label: "notab", what: "idk" }),
			12,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		// does not throw on duplicated tabs
		assertEquals(
			container.push({ label: "Org Tab", url: "url" }),
			12,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	});

	await t.step("unshift", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.unshift({ label: "Org Tab", url: "url" }), 4);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 4);
		assertEquals(container.at(0).url, "url");
		assertEquals(
			container.unshift([
				{ label: "Normal Tab", url: "normal-url" },
				{ label: "Org Tab2", url: "urll", org: "test-org1" },
				{ label: "Org Tab3", url: "normal-url", org: "test-org1" },
			]),
			7,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.at(0).url, "normal-url");
		assertEquals(container.at(1).url, "urll");
		assertEquals(container.at(2).url, "normal-url");
		assertEquals(container.at(2).org, "test-org1");
		assertEquals(
			container.unshift(...[
				{ label: "Normal Tab", url: "normal-url4" },
				{ label: "Org Tab2", url: "urll4", org: "test-org1" },
				{ label: "Org Tab3", url: "normal4-url", org: "test-org1" },
			]),
			10,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.at(0).url, "normal-url4");
		assertEquals(container.at(1).url, "urll4");
		assertEquals(container.at(2).url, "normal4-url");
		assertEquals(
			container.unshift(
				{ label: "Normal Tab", url: "normal-url5" },
				{ label: "Org Tab3", url: "normal5-url", org: "test-org1" },
			),
			12,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.at(0).url, "normal-url5");
		assertEquals(container.at(1).url, "normal5-url");
		// check also the ones before
		assertEquals(container.at(8).url, "url");
		assertEquals(container.at(7).url, "normal-url");
		assertEquals(container.at(6).url, "urll");
		assertEquals(container.at(5).url, "normal-url");
		assertEquals(container.at(4).url, "normal4-url");
		assertEquals(container.at(4).org, "test-org1");
		assertEquals(container.at(3).url, "urll4");
		assertEquals(container.at(2).url, "normal-url4");
		// does not throw on errored tabs
		assertEquals(
			container.unshift({ label: "notab", what: "idk" }),
			12,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		// does not throw on duplicated tabs
		assertEquals(
			container.unshift({ label: "Org Tab", url: "url" }),
			12,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	});

	await t.step("splice", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.splice(0, 1).length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 2);
		assertEquals(container.splice(1, 1).length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 2);
		assertEquals(container.splice(0, container.length).length, 2);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 0);
	});

	await t.step("filter", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.filter((tab) => tab.label === "flows").length,
			1,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
		assertEquals(
			container.filter((tab) => tab.label !== "flows").length,
			2,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
		assertEquals(container.filter((tab) => tab.org == null).length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
	});

	await t.step("getTabsWithOrg", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 7);
		assertEquals(container.getTabsWithOrg(false).length, 4);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 7);
	});

	await t.step("getTabsByOrg", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByOrg("not-present").length, 0);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByOrg("test-org").length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByOrg("test-org1").length, 2);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByOrg("test-org", false).length, 2);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByOrg("test-org1", false).length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 7);
	});

	await t.step("getTabsByData", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByData({ org: "test-org" }).length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByData({ org: "test-org1" }).length, 2);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ org: "not-present" }, false).length,
			4,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ org: "test-org" }, false).length,
			3,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ org: "test-org1" }, false).length,
			2,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByData({ label: "Org Tab" }).length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ label: "Org Tab", org: "test-org" })
				.length,
			1,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByData({ url: "urll" }).length, 2);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ url: "urll", org: "test-org1" }).length,
			1,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ org: "test-org1", url: "urll" }).length,
			1,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ label: "Org Tab" }, false).length,
			7,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData(
				{ label: "Org Tab", org: "test-org" },
				false,
			).length,
			7,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabsByData({ url: "urll" }, false).length, 6);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ url: "urll", org: "test-org1" }, false)
				.length,
			7,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabsByData({ org: "test-org1", url: "urll" }, false)
				.length,
			7,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 8);
	});

	await t.step("getSingleTabByData", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getSingleTabByData({ org: "test-org" }).org,
			"test-org",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getSingleTabByData({ org: "test-org1" }),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getSingleTabByData({ org: "not-present" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getSingleTabByData({ org: "test-org" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getSingleTabByData({ org: "test-org1" }, false),
			Error,
			"error_many_tabs_found",
		);
		// equal to getTabsByData
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getSingleTabByData({ label: "Org Tab" }).url,
			"url",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getSingleTabByData({ label: "Org Tab", org: "test-org" })
				.label,
			"Org Tab",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getSingleTabByData({ url: "urll" }),
			Error,
			"error_tab_not_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getSingleTabByData({ label: "Org Tab" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getSingleTabByData({ url: "urll" }, false),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() =>
				container.getSingleTabByData(
					{ org: "test-org1", url: "urll" },
					false,
				),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getSingleTabByData({ url: "normal-url" }).label,
			"Normal Tab",
			"return generic Tab when multiple matches and org is null",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getSingleTabByData({
				url: "normal-url",
				org: "test-org1",
			}).label,
			"Org Tab3",
			"return org-specific Tab when multiple matches and org is not null",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() =>
				container.getSingleTabByData(
					{ label: "Org Tab3" },
				),
			Error,
			"error_many_tabs_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 8);
	});

	await t.step("getTabIndex", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertThrows(
			() => container.getTabIndex({ org: "not-present" }),
			Error,
			"error_tab_not_found",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabIndex({ org: "test-org" }), 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabIndex({ org: "test-org1" }), 5);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabIndex({ label: "Org Tab", org: "test-org" }),
			3,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabIndex({ url: "urll", org: "test-org1" }),
			5,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			container.getTabIndex({ org: "test-org2", url: "urll" }),
			7,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.getTabIndex({ org: "test-org2" }), 7);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 8);
	});

	await t.step("exists", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ url: "url", org: "test-org" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ url: "url3", org: "test-org1" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(container.exists({ label: "Org Tab" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(
			container.exists({ url: "urll" }, true),
			"does not exist with url only",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ url: "urll", org: "test-org1" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ org: "test-org2", url: "url3" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(container.exists({ org: "test-org2" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(container.exists({ org: "not-present" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(
			container.exists({ url: "urll", org: "not-present" }, true),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(container.exists({ url: "url-not-present" }, true));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(
			container.exists({ url: "url-not-present", org: "test-org" }, true),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 8);
		assert(
			container.exists({ org: "test-org" }, false),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ url: "url", org: "test-org" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ url: "url3", org: "test-org1" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(container.exists({ label: "Org Tab" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(
			container.exists({ url: "urll" }, false),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(
			container.exists({ url: "urll", org: "test-org1" }, false),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ url: "urll", org: "test-org1" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ org: "test-org2", url: "url3" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(container.exists({ org: "test-org2" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(container.exists({ org: "not-present" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(
			container.exists({ url: "urll", org: "not-present" }, false),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(container.exists({ url: "url-not-present" }, false));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertFalse(
			container.exists(
				{ url: "url-not-present", org: "test-org" },
				false,
			),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	});

	await t.step("toJSON", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.toJSON(), {
			pinned: 0,
			tabs: [
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
			],
		});
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	});

	await t.step("toString", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	});

	await t.step("map", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		const newContainer = container.map((_) => "I'm a string!");
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
		assertEquals(newContainer.length, 3);
		for (const el of newContainer) {
			assertEquals(el, "I'm a string!");
		}
	});

	await t.step("setDefaultTabs", async () => {
		container.length = 0;
		assertEquals(container.length, 0);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assert(await container.setDefaultTabs());
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			mockStorage.againWhySalesforce[TabContainer.keyTabs].length,
			3,
		);
		assert(
			await container.addTab(
				{ label: "Sync Test", url: "sync-url" },
				false,
			),
		);
		assertEquals(container.length, 4);
		assertEquals(
			mockStorage.againWhySalesforce[TabContainer.keyTabs].length,
			3,
		);
		assert(await container.syncTabs());
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 4);
		assertEquals(
			mockStorage.againWhySalesforce[TabContainer.keyTabs].length,
			4,
		);
	});
});

await Deno.test("TabContainer - Import", async (t) => {
	await t.step("import tabs from JSON string", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}]`,
			),
			2,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 5);
		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}]`,
				{
					resetTabs: true,
					preserveOtherOrg: false,
				},
			),
			2,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 2);
		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url2"},{"label":"orglabel","url":"orgurl2","org":"orgorg"}]`,
				{
					resetTabs: true,
				},
			),
			2,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url3"},{"label":"orglabel","url":"orgurl3","org":"orgorg"}]`,
				{
					resetTabs: false,
					preserveOtherOrg: false,
				},
			),
			2,
			"e",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url4","${Tab.keyClickCount}":4},{"label":"orglabel","url":"orgurl4","org":"orgorg","${Tab.keyClickDate}":${currentDate}}]`,
				{
					importMetadata: true,
				},
			),
			2,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 5);
		assertEquals(container.at(-2)[Tab.keyClickCount], 4);
		assertEquals(container.at(-2)[Tab.keyClickDate], undefined);
		assertEquals(container.at(-1)[Tab.keyClickCount], undefined);
		assertEquals(container.at(-1)[Tab.keyClickDate], currentDate);
		assertEquals(
			await container.importTabs(
				`[{"label":"hello","url":"nice-url5","${Tab.keyClickCount}":4,"${Tab.keyClickDate}":${currentDate},"org":"test-org5"}]`,
				{
					importMetadata: false,
				},
			),
			1,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 6);
		assertEquals(container.at(-1).label, "hello");
		assertEquals(container.at(-1).url, "nice-url5");
		assertEquals(container.at(-1).org, "test-org5");
		assertEquals(container.at(-1)[Tab.keyClickCount], undefined);
		assertEquals(container.at(-1)[Tab.keyClickDate], undefined);
	});

	await t.step("import tabs with pinned tabs", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url6","${Tab.keyClickCount}":6},{"label":"orglabel","url":"orgurl6","org":"orgorg","${Tab.keyClickDate}":${currentDate}}]}`,
				{
					importMetadata: true,
				},
			),
			2,
			"two new pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
		assertEquals(container.length, 5);
		assertEquals(container[0].url, "nice-url6");
		assertEquals(container[1].url, "orgurl6");
		assertEquals(container[2].url, "/lightning");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url6","${Tab.keyClickCount}":6},{"label":"orglabel","url":"orgurl7","org":"orgorg","${Tab.keyClickDate}":${currentDate}}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"one old pinned Tab + one new pinned Tab",
		);
		assertEquals(
			container[TabContainer.keyPinnedTabsNo],
			3,
			"should merge the pinned Tabs",
		);
		assertEquals(container.length, 6);
		assertEquals(container[0].url, "nice-url6");
		assertEquals(container[1].url, "orgurl6");
		assertEquals(container[2].url, "orgurl7");
		assertEquals(container[3].url, "/lightning");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url7"}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"out of bounds pinned number",
		);
		assertEquals(
			container[TabContainer.keyPinnedTabsNo],
			4,
			"even if pinned tabs was 2 in the JSON, only 1 Tab was available",
		);
		assertEquals(container.length, 7);
		assertEquals(container[0].url, "nice-url6");
		assertEquals(container[1].url, "orgurl6");
		assertEquals(container[2].url, "orgurl7");
		assertEquals(container[3].url, "nice-url7");
		assertEquals(container[4].url, "/lightning");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":-3,"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url8"}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"negative pinned number",
		);
		assertEquals(
			container[TabContainer.keyPinnedTabsNo],
			4,
			"a negative pinned number means nothing should be added to pins",
		);
		assertEquals(container.length, 8);
		assertEquals(container[0].url, "nice-url6");
		assertEquals(container[1].url, "orgurl6");
		assertEquals(container[2].url, "orgurl7");
		assertEquals(container[3].url, "nice-url7");
		assertEquals(container[4].url, "/lightning");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url9"}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"undefined pinned number",
		);
		assertEquals(
			container[TabContainer.keyPinnedTabsNo],
			4,
			"an undefined pinned number means nothing should be added to pins",
		);
		assertEquals(container.length, 9);
		assertEquals(container[0].url, "nice-url6");
		assertEquals(container[1].url, "orgurl6");
		assertEquals(container[2].url, "orgurl7");
		assertEquals(container[3].url, "nice-url7");
		assertEquals(container[4].url, "/lightning");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":1,"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url84"}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"new pinned Tab",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 5);
		assertEquals(container.length, 10);
		assertEquals(container[0].url, "nice-url6");
		assertEquals(container[1].url, "orgurl6");
		assertEquals(container[2].url, "orgurl7");
		assertEquals(container[3].url, "nice-url7");
		assertEquals(container[4].url, "nice-url84");
		assertEquals(container[5].url, "/lightning");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url62","${Tab.keyClickCount}":6},{"label":"orglabel","url":"orgurl62","org":"orgorg","${Tab.keyClickDate}":${currentDate}},{"label":"testlabel","url":"testurl"}]}`,
				{
					importMetadata: true,
					resetTabs: true,
				},
			),
			3,
			"import metadata and reset Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "nice-url62");
		assertEquals(container[1].url, "orgurl62");
		assertEquals(container[2].url, "testurl");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":1,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"nice-url62"}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"1 new pinned Tab + 1 already present Tab (ignored)",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 3);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "nice-url62");
		assertEquals(container[1].url, "orgurl62");
		assertEquals(container[2].url, "pin-url");
		assertEquals(container[3].url, "testurl");
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
			"Unexpected non-whitespace character after JSON",
		);
		assertEquals(container.length, 3);
		await assertRejects(
			async () =>
				await container.importTabs(
					`[{"label":"hello","url":"nice-url"},{"unexpected":"orglabel","url":"orgurl","org":"orgorg"},{"label":"hi","url":"hy"},{"what":"idk"}]`,
					{
						resetTabs: true,
						preserveOtherOrg: false,
					},
				),
			Error,
			"error_invalid_tab",
			//"error_tabcont_invalid_tabs"
		);
		assertEquals(container.length, 3);
		assertRejects(
			async () =>
				await container.importTabs(`a simple string`, {
					resetTabs: true,
				}),
			Error,
			"is not valid JSON",
		);
		assertEquals(container.length, 3);
		assertRejects(
			async () =>
				await container.importTabs(
					`[{"label":"hello","url":"nice-url","whoopsie":{"label":"hello","url":"nice-url"}}`,
					{
						resetTabs: true,
					},
				),
			Error,
			"Expected ',' or ']' after array element in JSON",
		);
		assertEquals(container.length, 3);
	});
});

await Deno.test("TabContainer - Move Tab", async (t) => {
	await t.step("make a tab be the first of the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertRejects(
			async () =>
				await container.moveTab({ url: "ManageUsers/home" }, {
					fullMovement: true,
				}),
			Error,
			"error_cannot_move_dir",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertRejects(
			async () =>
				await container.moveTab(
					{ url: "normal-url", org: "test-org" },
					{
						moveBefore: true,
						fullMovement: false,
					},
				),
			Error,
			"error_cannot_move_dir",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "normal-url");
		assertEquals(container[1].url, "url");
		assertEquals(container[2].url, "urll");
		assertEquals(container[3].url, "url3");
	});

	await t.step("make a tab be the last of the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertRejects(
			async () =>
				await container.moveTab({ url: "/lightning" }, {
					moveBefore: false,
					fullMovement: true,
				}),
			Error,
			"error_cannot_move_dir",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[1].url, "ManageUsers/home");
		assertEquals(container[2].url, "/lightning");
		matchStorageToContainer(container);
	});

	await t.step("move a tab left/up one spot in the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		matchStorageToContainer(container);
		assertEquals(await container.moveTab({ url: "ManageUsers/home" }), 1);
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "ManageUsers/home");
		assertEquals(container[2].url, "/lightning/app/standard__FlowsApp");
		matchStorageToContainer(container);
	});

	await t.step("move a tab right/down one spot in the array", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "ManageUsers/home");
		assertEquals(container[2].url, "/lightning/app/standard__FlowsApp");
		matchStorageToContainer(container);
	});

	await t.step("move a tab right/down other org Tabs", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
			6,
			"performs full movement and is set as last Tab",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertRejects(
			async () =>
				await container.moveTab({ url: "url", org: "test-org" }, {
					moveBefore: false,
				}),
			Error,
			"error_cannot_move_dir",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(await container.remove({ url: "ManageUsers/home" }));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 2);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		matchStorageToContainer(container);
		assertRejects(
			async () => await container.remove(),
			Error,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertRejects(
			async () => await container.remove({ org: "test-org" }),
			Error,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":1,"${TabContainer.keyTabs}":[{"label":"hello","url":"nice-url6","${Tab.keyClickCount}":6},{"label":"orglabel","url":"orgurl6","org":"orgorg","${Tab.keyClickDate}":${currentDate}}]}`,
				{
					importMetadata: true,
					resetTabs: true,
				},
			),
			2,
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 1);
		assertEquals(container.length, 2);
		assert(await container.remove({ url: "orgurl6" }));
		assertEquals(
			container[TabContainer.keyPinnedTabsNo],
			1,
			"removed non-pinned Tab",
		);
		assertEquals(container.length, 1);
		assertEquals(container[0].url, "nice-url6");
		assert(await container.remove({ url: "nice-url6" }));
		assertEquals(
			container[TabContainer.keyPinnedTabsNo],
			0,
			"removed pinned Tab",
		);
		assertEquals(container.length, 0);
	});

	await t.step("remove all other tabs", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(await container.removeOtherTabs({ url: "ManageUsers/home" }));
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 1);
		assertEquals(container[0].url, "ManageUsers/home");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":1,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"nice-url4"}]}`,
				{
					importMetadata: true,
				},
			),
			2,
			"new pinned Tab + new unpinned Tab",
		);
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 1, "a");
		assert(await container.removeOtherTabs({ url: "nice-url4" }));
		assertEquals(container.length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":1,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"nice-url3"}]}`,
				{
					importMetadata: true,
				},
			),
			2,
			"new pinned Tab + new unpinned Tab",
		);
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 1);
		assert(await container.removeOtherTabs({ url: "pin-url" }));
		assertEquals(container.length, 1);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 1);
	});

	await t.step("remove tabs before/on the left", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(
			await container.removeOtherTabs({
				url: "/lightning/app/standard__FlowsApp",
			}, { removeBefore: true }),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "url");
		assertEquals(container[1].url, "urll");
		assertEquals(container[2].url, "normal-url");
		assertEquals(container[3].url, "url3");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"nice-url3"}]}`,
				{
					importMetadata: true,
				},
			),
			2,
			"2 new pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
		assertEquals(container.length, 6);
		assert(
			await container.removeOtherTabs({
				url: "nice-url3",
			}, { removeBefore: true }),
			"removes from within pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 1);
		assertEquals(container.length, 5);
		assertEquals(container[0].url, "nice-url3");
		assertEquals(container[1].url, "url");
		assertEquals(container[2].url, "urll");
		assertEquals(container[3].url, "normal-url");
		assertEquals(container[4].url, "url3");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":1,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"nice-url3"}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"1 new pinned Tab + 1 old Tab",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
		assertEquals(container.length, 6);
		assert(
			await container.removeOtherTabs({
				url: "urll",
			}, { removeBefore: true }),
			"removes from after pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "url");
		assertEquals(container[1].url, "urll");
		assertEquals(container[2].url, "normal-url");
		assertEquals(container[3].url, "url3");
	});

	await t.step("remove tabs after", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(
			await container.removeOtherTabs({
				url: "/lightning/app/standard__FlowsApp",
			}, { removeBefore: false }),
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "url3");
		assertEquals(container[1].url, "url");
		assertEquals(container[2].url, "urll");
		assertEquals(container[3].url, "url3");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":1,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"url","org":"test-org1"}]}`,
				{
					importMetadata: true,
				},
			),
			1,
			"1 new pinned Tab + 1 old Tab",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 1);
		assertEquals(container.length, 5);
		assert(
			await container.removeOtherTabs({
				url: "urll",
				org: "test-org",
			}, { removeBefore: false }),
			"removes after pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 1);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "pin-url");
		assertEquals(container[1].url, "url3");
		assertEquals(container[2].url, "url");
		assertEquals(container[3].url, "urll");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url2"},{"label":"hello","url":"url2"}]}`,
				{
					importMetadata: true,
				},
			),
			2,
			"2 new pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 3);
		assertEquals(container.length, 6);
		assert(
			await container.removeOtherTabs({
				url: "pin-url2",
			}, { removeBefore: false }),
			"remove before end of pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
		assertEquals(container.length, 4);
		assertEquals(container[0].url, "pin-url");
		assertEquals(container[1].url, "pin-url2");
	});
});

await Deno.test("TabContainer - Update Tab", async () => {
	await container.setDefaultTabs();
	assertEquals(container.length, 3);
	assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	assertEquals(container[0].url, "/lightning");
	assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
	assertEquals(container[2].url, "ManageUsers/home");
	assert(
		await container.updateTab({ url: "/lightning" }, {
			url: "/lightning/test",
		}),
	);
	assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	assertEquals(container[0].url, "/lightning/test");
	assertEquals(container[0].label, "⚡");
	assertEquals(container[0].org, undefined);
	assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
	assertEquals(container[2].url, "ManageUsers/home");
	matchStorageToContainer(container);
	assert(
		await container.updateTab({ url: "ManageUsers/home" }, { org: "a" }),
	);
	assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	assertEquals(container[0].org, undefined);
	assertEquals(container[1].org, undefined);
	assertEquals(container[2].org, "a");
	assertEquals(container[2].label, "users");
	assertEquals(container[2].url, "ManageUsers/home");
	matchStorageToContainer(container);
	assert(
		await container.updateTab({ url: "ManageUsers/home" }, {
			[Tab.keyClickCount]: 1,
			[Tab.keyClickDate]: currentDate,
		}),
	);
	assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	assertEquals(container[2][Tab.keyClickCount], 1);
	assertEquals(container[2][Tab.keyClickDate], currentDate);
	assert(
		await container.updateTab({ url: "ManageUsers/home" }, {
			org: "",
			url: "",
			label: "",
		}),
	);
	assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
	assertEquals(container[0].org, undefined);
	assertEquals(container[1].org, undefined);
	assertEquals(container[2].org, undefined);
	assertEquals(container[2].label, "users");
	assertEquals(container[2].url, "ManageUsers/home");
	matchStorageToContainer(container);
	assertEquals(
		await container.importTabs(
			`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"nice-url3"}]}`,
			{
				importMetadata: true,
			},
		),
		2,
		"2 new pinned Tabs",
	);
	assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
	assertEquals(container.length, 5);
	assertEquals(container[0].url, "pin-url");
	assert(
		await container.updateTab({ url: "pin-url" }, {
			org: "",
			url: "noo",
			label: "bye",
		}),
	);
	assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
	assertEquals(container.length, 5);
	assertEquals(container[0].url, "noo");
});

await Deno.test("TabContainer - Sort Tabs", async (t) => {
	await t.step("By label ascending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		assert(await container.sort());
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "label");
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].label, "⚡");
		assertEquals(container[1].label, "flows");
		assertEquals(container[2].label, "users");
		// update tabs to add org (so they all are scrambled)
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: 0,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: 2,
			}),
		);
		assert(
			await container.updateTab(container[2], {
				org: "b",
				[Tab.keyClickCount]: 1,
				[Tab.keyClickDate]: 1,
			}),
		);
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
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "label");
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].label, "⚡");
		assertEquals(container[1].label, "flows");
		assertEquals(container[2].label, "users");
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url"},{"label":"hello","url":"nice-url3"}]}`,
				{
					importMetadata: true,
				},
			),
			2,
			"2 new pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
		assertEquals(container.length, 5);
		assert(
			container.isSorted,
			"pinned Tabs are not counted by sorting function",
		);
		assertEquals(container.isSortedBy, "label");
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
	});

	await t.step("By label descending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 0);
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
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: 0,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: 2,
			}),
		);
		assert(
			await container.updateTab(container[2], {
				org: "b",
				[Tab.keyClickCount]: 1,
				[Tab.keyClickDate]: 1,
			}),
		);
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url","${Tab.keyClickCount}":5,"${Tab.keyClickDate}":5,"org":"t"},{"label":"hxello","url":"nice-url3","${Tab.keyClickCount}":3,"${Tab.keyClickDate}":3,"org":"m"}]}`,
				{
					importMetadata: true,
				},
			),
			2,
			"2 new pinned Tabs",
		);
		assertEquals(container[TabContainer.keyPinnedTabsNo], 2);
		matchStorageToContainer(container);
		assertFalse(
			container.isSorted,
			"After adding this Tab, they should not be sorted",
		);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0].label, "hello");
		assertEquals(container[1].label, "hxello");
		assertEquals(container[2].label, "⚡");
		assertEquals(container[3].label, "flows");
		assertEquals(container[4].label, "users");
		assertEquals(container[5].label, "mylabel");
		// sort array
		assert(await container.sort({ sortBy: "label", sortAsc: false }));
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, "label");
		assertFalse(container.isSortedAsc);
		assert(container.isSortedDesc);
		assertEquals(container[0].label, "hello");
		assertEquals(container[1].label, "hxello");
		assertEquals(container[2].label, "users");
		assertEquals(container[3].label, "mylabel");
		assertEquals(container[4].label, "flows");
		assertEquals(container[5].label, "⚡");
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
				{
					label: "flows",
					url: "flows",
					org: "e",
					[Tab.keyClickCount]: 0,
					[Tab.keyClickDate]: 0,
				},
				{
					label: "assignment",
					url: "assignment",
					org: "a",
					[Tab.keyClickCount]: 2,
					[Tab.keyClickDate]: 2,
				},
				{
					label: "field",
					url: "field",
					[Tab.keyClickCount]: 1,
					[Tab.keyClickDate]: 1,
				},
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
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: 0,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: 2,
			}),
		);
		assert(
			await container.updateTab(container[2], {
				org: "b",
				[Tab.keyClickCount]: 1,
				[Tab.keyClickDate]: 1,
			}),
		);
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
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: 0,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: 2,
			}),
		);
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
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: 0,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: 2,
			}),
		);
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

	await t.step("By click-count ascending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// move around because they were already sorted
		container.moveTab({ label: "flows" }, { moveBefore: true });
		// add orgs
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: 0,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: 2,
			}),
		);
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by org ascending
		assert(
			await container.sort({ sortBy: Tab.keyClickCount, sortAsc: true }),
		);
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, Tab.keyClickCount);
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0][Tab.keyClickCount], undefined);
		assertEquals(container[1][Tab.keyClickCount], 0);
		assertEquals(container[2][Tab.keyClickCount], 2);
	});

	await t.step("By click-count descending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// move around because they were already sorted
		container.moveTab({ label: "flows" }, { moveBefore: true });
		// add orgs
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: 0,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: 2,
			}),
		);
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by org descending
		assert(
			await container.sort({ sortBy: Tab.keyClickCount, sortAsc: false }),
		);
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, Tab.keyClickCount);
		assertFalse(container.isSortedAsc);
		assert(container.isSortedDesc);
		assertEquals(container[0][Tab.keyClickCount], 2);
		assertEquals(container[1][Tab.keyClickCount], 0);
		assertEquals(container[2][Tab.keyClickCount], undefined);
	});

	const stepCurrentDate = Date.now() + 1000;
	await t.step("By click-date ascending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// move around because they were already sorted
		container.moveTab({ label: "flows" }, { moveBefore: true });
		// add orgs
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: currentDate,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: stepCurrentDate,
			}),
		);
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by org ascending
		assert(
			await container.sort({ sortBy: Tab.keyClickDate, sortAsc: true }),
		);
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, Tab.keyClickDate);
		assert(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		assertEquals(container[0][Tab.keyClickDate], undefined);
		assertEquals(container[1][Tab.keyClickDate], currentDate);
		assertEquals(container[2][Tab.keyClickDate], stepCurrentDate);
	});

	await t.step("By click-date descending", async () => {
		await container.setDefaultTabs();
		assertEquals(container.length, 3);
		assertEquals(container[0].url, "/lightning");
		assertEquals(container[1].url, "/lightning/app/standard__FlowsApp");
		assertEquals(container[2].url, "ManageUsers/home");
		// move around because they were already sorted
		container.moveTab({ label: "flows" }, { moveBefore: true });
		// add orgs
		assert(
			await container.updateTab(container[0], {
				org: "a",
				[Tab.keyClickCount]: 0,
				[Tab.keyClickDate]: currentDate,
			}),
		);
		assert(
			await container.updateTab(container[1], {
				org: "c",
				[Tab.keyClickCount]: 2,
				[Tab.keyClickDate]: stepCurrentDate,
			}),
		);
		// now should all be random
		matchStorageToContainer(container);
		assertFalse(container.isSorted);
		assertEquals(container.isSortedBy, null);
		assertFalse(container.isSortedAsc);
		assertFalse(container.isSortedDesc);
		// sort by org descending
		assert(
			await container.sort({ sortBy: Tab.keyClickDate, sortAsc: false }),
		);
		matchStorageToContainer(container);
		assert(container.isSorted);
		assertEquals(container.isSortedBy, Tab.keyClickDate);
		assertFalse(container.isSortedAsc);
		assert(container.isSortedDesc);
		assertEquals(container[0][Tab.keyClickDate], stepCurrentDate);
		assertEquals(container[1][Tab.keyClickDate], currentDate);
		assertEquals(container[2][Tab.keyClickDate], undefined);
	});

	await t.step("Pinned Tabs", async () => {
		assertEquals(
			await container.importTabs(
				`{"${TabContainer.keyPinnedTabsNo}":2,"${TabContainer.keyTabs}":[{"label":"hello","url":"pin-url","org":"b","${Tab.keyClickCount}":2,"${Tab.keyClickDate}":2},{"label":"hello","url":"nice-url3","org":"c","${Tab.keyClickCount}":3,"${Tab.keyClickDate}":3},{"label":"hello","url":"aurl","org":"a","${Tab.keyClickCount}":1,"${Tab.keyClickDate}":1}]}`,
				{
					importMetadata: true,
					resetTabs: true,
				},
			),
			3,
			"3 pinned Tabs",
		);
	});
	matchStorageToContainer(container);
	// without non-pinned Tabs, the TabContainer is sorted (because the pinned Tabs do not count)
	assert(container.isSorted);
	assertEquals(container.isSortedBy, "label");
	assertFalse(container.isSortedAsc);
	assert(container.isSortedDesc);
	assertEquals(container[0].url, "pin-url");
	assertEquals(container[1].url, "nice-url3");
	assertEquals(container[2].url, "aurl");
});
