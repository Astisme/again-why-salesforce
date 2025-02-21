import { Tab } from "/tab.js";
import { mockStorage } from "./mocks.ts";

import { assert, assertFalse, assertEquals, assertRejects, assertThrows } from "https://deno.land/std/testing/asserts.ts";
import { TabContainer } from "/tabContainer.js";

// @ts-ignore
function matchStorageToContainer(container){
    assertEquals(mockStorage.tabs.length, container.length);
    for(const i in container){
        // @ts-ignore
        assertEquals(mockStorage.tabs[i].url, container[i].url);
    }
}

await Deno.test("TabContainer - Initialization", async (t) => {
  await t.step("initializes with default tabs when no saved tabs exist", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    
    assertEquals(container.length, 3); // Default tabs count
    assertEquals(container[0].label, "⚡");
    assertEquals(container[1].label, "Flows");
    assertEquals(container[2].label, "Users");

    mockStorage.tabs = [];
      container.length = 0;
    assert(await container._initialize());

    assertEquals(container.length, 3); // Default tabs count
    assertEquals(container[0].label, "⚡");
    assertEquals(container[1].label, "Flows");
    assertEquals(container[2].label, "Users");
  });

  await t.step("initializes with saved tabs from storage", async () => {
      mockStorage.tabs = [
          // @ts-ignore
          { label: "Test", url: "mini-test-url" }
      ];

    const container = await TabContainer.create();
    
    assertEquals(container.length, 1);
    assertEquals(container[0].label, "Test");
    assertEquals(container[0].url, "mini-test-url");

      mockStorage.tabs = [
          // @ts-ignore
          { label: "Test", url: "mini-test-url" }
      ];
      container.length = 0;
      assert(await container._initialize());
    assertEquals(container.length, 1);
    assertEquals(container[0].label, "Test");
    assertEquals(container[0].url, "mini-test-url");
  });

  await t.step("initializes with tabs passed as input", async () => {
      mockStorage.tabs = [];

          // @ts-ignore
      const emptyContainer = await TabContainer.create([]);
      assertEquals(emptyContainer.length, 0);
      // @ts-ignore
    const container = await TabContainer.create([
          { label: "Test", url: "mini-test-url" }
      ]);
    
    assertEquals(container.length, 1);
    assertEquals(container[0].label, "Test");
    assertEquals(container[0].url, "mini-test-url");

      mockStorage.tabs = [];
      container.length = 0;
      // @ts-ignore
      assert(await container._initialize([
          { label: "Test", url: "mini-test-url" }
      ]));
    assertEquals(container.length, 1);
    assertEquals(container[0].label, "Test");
    assertEquals(container[0].url, "mini-test-url");
  });

  await t.step("does not initialize with bad tabs passed as input", async () => {
      mockStorage.tabs = [];

      // this should get ignored
    const container = await TabContainer.create(
          // @ts-ignore
          { label: "Test", url: "mini-test-url" }
      );
    
    assertEquals(container.length, 3); // Default tabs count
    assertEquals(container[0].label, "⚡");
    assertEquals(container[1].label, "Flows");
    assertEquals(container[2].label, "Users");

      mockStorage.tabs = [];
      container.length = 0;
      assert(await container._initialize(
          // @ts-ignore
          false
      ));
    assertEquals(container.length, 3); // Default tabs count
    assertEquals(container[0].label, "⚡");
    assertEquals(container[1].label, "Flows");
    assertEquals(container[2].label, "Users");

      mockStorage.tabs = [];
      container.length = 0;
      assert(await container._initialize(
          // @ts-ignore
          null
      ));
    assertEquals(container.length, 3); // Default tabs count
    assertEquals(container[0].label, "⚡");
    assertEquals(container[1].label, "Flows");
    assertEquals(container[2].label, "Users");
  });
});

await Deno.test("TabContainer - Tab Management", async (t) => {
  await t.step("adds a single tab", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    
    // @ts-ignore
    assert(await container.addTab({ label: "New Tab", url: "new-url" }));
    const lastTab = container[container.length - 1];
    assertEquals(lastTab.label, "New Tab");
    assertEquals(lastTab.url, "mini-new-url");
    
    // @ts-ignore
    assert(await container.addTab({ label: "New Tabb", url: "mini-new-urll" }));
    const newLastTab = container[container.length - 1];
    assertEquals(newLastTab.label, "New Tabb");
    assertEquals(newLastTab.url, "mini-new-urll");
  });

  await t.step("adds multiple tabs", async () => {
    const container = await TabContainer.create();
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Tab1", url: "mini-url1" },
      // @ts-ignore
      { label: "Tab2", url: "mini-url2" },
      // @ts-ignore
      { label: "Tab3", url: "url3" }
    ]));
    assertEquals(container[container.length - 3].label, "Tab1");
    assertEquals(container[container.length - 2].label, "Tab2");
    assertEquals(container[container.length - 1].label, "Tab3");
    assertEquals(container[container.length - 3].url, "mini-url1");
    assertEquals(container[container.length - 2].url, "mini-url2");
    assertEquals(container[container.length - 1].url, "mini-url3");
  });

  await t.step("prevents duplicate tabs", async () => {
    const container = await TabContainer.create();
    
    assert(await container.addTab({ label: "Unique", url: "unique-url" }));
    assert(await container.addTab({ label: "New Tabb", url: "unique-url" }));
    assert(await container.addTab({ label: "New Tab", url: "unique-url2" }));
    await assertRejects(
        async () => container.addTab({ label: "New Tab", url: "unique-url2" }),
        Error,
        `This tab already exists`//: {"label":"New Tab","url":"mini-unique-url2"}`
    );
  });
});

await Deno.test("TabContainer - Organization Filtering", async (t) => {
  await t.step("filters tabs by organization", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org1 Tab", url: "url1", org: "org1" },
      // @ts-ignore
      { label: "Org2 Tab", url: "url2", org: "org2" },
      // @ts-ignore
      { label: "Org2 Tab2", url: "url2", org: "org2" },
      // @ts-ignore
      { label: "No Org Tab", url: "url3" }
    ]));
    
    const org1Tabs = container.getTabsByOrg("org-org1");
    assertEquals(org1Tabs.length, 1);
    assertEquals(org1Tabs[0].label, "Org1 Tab");
    
    const org2Tabs = container.getTabsByOrg("org-org1", false);
    assertEquals(org2Tabs.length, 2);
    assertEquals(org2Tabs[0].label, "Org2 Tab");
    assertEquals(org2Tabs[1].label, "Org2 Tab2");
    
    const noOrgTabs = await container.getTabsWithOrg(false);
    assertEquals(noOrgTabs.length, 4);
    assertEquals(noOrgTabs[noOrgTabs.length - 1].label, "No Org Tab");
    
    const onlyOrgTabs = await container.getTabsWithOrg();
    assertEquals(onlyOrgTabs.length, 3);
    assertEquals(onlyOrgTabs[onlyOrgTabs.length - 1].label, "Org2 Tab2");
  });
});

await Deno.test("TabContainer - Tab Replacement", async (t) => {
  // resetTabs = true, removeOrgTabs = true, keepTabsNotThisOrg = something
  await t.step("replaces all tabs with a different org", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Org Tab", url: "org-url2", org: "test-org2" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" }
    ],{
        removeOrgTabs: true,
    }));
    assertEquals(container.length, 3);

    assert(await container.replaceTabs([],{
        removeOrgTabs: true,
        // @ts-ignore
        keepTabsNotThisOrg: "org-test-org"
    }));
    assertEquals(container.length, 1);
    assertEquals(mockStorage.tabs.length, 1);
    assertEquals(container.getTabsWithOrg().length, 1);

    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab2", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-url2", org: "test-org2" },
      // @ts-ignore
      { label: "Normal Tab2", url: "normal-url" },
      // @ts-ignore
      { label: "New Tab", url: "new-url" }
    ],{
        removeOrgTabs: true,
    }));
    assertEquals(container.length, 4);
    assertEquals(mockStorage.tabs.length, 4);
    
    assert(await container.replaceTabs([],{
        removeOrgTabs: true,
        // @ts-ignore
        sync: false,
        // @ts-ignore
        keepTabsNotThisOrg: "org-test-org"
    }));
    assertEquals(container.length, 1);
    assertEquals(mockStorage.tabs.length, 4);
    assertEquals(container[0].label, "Org Tab3");
    assertEquals(mockStorage.tabs[0].label, "Org Tab2");
  });

  // resetTabs = true, removeOrgTabs = true, keepTabsNotThisOrg = nothing
  await t.step("replaces all tabs", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" }
    ],{
        removeOrgTabs: true
    }));
    assertEquals(container.length, 2);
    assertEquals(mockStorage.tabs.length, 2);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab2", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab2", url: "normal-url" },
      // @ts-ignore
      { label: "New Tab", url: "new-url" }
    ],{
        removeOrgTabs: true,
        // @ts-ignore
        sync: false
    }));
    assertEquals(container.length, 3);
    assertEquals(mockStorage.tabs.length, 2);
    assertEquals(container[0].label, "Org Tab2");
    assertEquals(mockStorage.tabs[0].label, "Org Tab");
  });

  // resetTabs = true, removeOrgTabs = false, keepTabsNotThisOrg = something
  await t.step("replaces all tabs without org", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" }
    ],{
        removeOrgTabs: true
    }));
    assertEquals(container.length, 2);
    assertEquals(mockStorage.tabs.length, 2);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab2", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab2", url: "normal-url" },
      // @ts-ignore
      { label: "New Tab", url: "new-url" }
    ],{
        removeOrgTabs: false,
        // @ts-ignore
        sync: false,
        // @ts-ignore
        keepTabsNotThisOrg: "org-test-org",
    }));
    assertEquals(container.length, 4);
    assertEquals(mockStorage.tabs.length, 2);
    assertEquals(container[0].label, "Org Tab");
    assertEquals(container[1].label, "Org Tab2");
    assertEquals(mockStorage.tabs[0].label, "Org Tab");
    assertEquals(mockStorage.tabs[1].label, "Normal Tab");
  });

  // resetTabs = true, removeOrgTabs = false, keepTabsNotThisOrg = nothing
  await t.step("replaces all tabs while preserving org tabs", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" }
    ],{
        removeOrgTabs: true
    }));
    assertEquals(container.length, 2);
    
    assert(await container.replaceTabs(
      // @ts-ignore
      [{ label: "New Tab", url: "new-url" }],
      { resetTabs: true, removeOrgTabs: false }
    ));
    
    assertEquals(container.length, 2);
    assertEquals(mockStorage.tabs.length, 2);
    const orgTabs = container.getTabsByOrg("org-test-org");
    assertEquals(orgTabs.length, 1);
    assertEquals(orgTabs[0].label, "Org Tab");
    assertEquals(container[0].label, "Org Tab");
    assertEquals(container[1].label, "New Tab");

    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab2", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab2", url: "normal-url" },
      // @ts-ignore
      { label: "New Tab", url: "new-url" }
    ],{
        removeOrgTabs: false,
        // @ts-ignore
        sync: false,
    }));
    assertEquals(container.length, 4);
    assertEquals(mockStorage.tabs.length, 2);
    assertEquals(container[0].label, "Org Tab");
    assertEquals(container[1].label, "Org Tab2");
    assertEquals(container[2].label, "Normal Tab2");
    assertEquals(mockStorage.tabs[0].label, "Org Tab");
    assertEquals(mockStorage.tabs[1].label, "New Tab");
  });

  // resetTabs = false, removeOrgTabs = true, keepTabsNotThisOrg = something
  await t.step("remove all org tabs with a specific org", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
    ], {
        removeOrgTabs: true
    }));
    assertEquals(container.length, 4);
    
    assert(await container.replaceTabs(
      [],
      { 
          resetTabs: false,
          removeOrgTabs: true,
          // @ts-ignore
          keepTabsNotThisOrg: "org-test-org",
      }
    ));
    
    assertEquals(container.length, 3);
    assertEquals(mockStorage.tabs.length, 3);
    assertEquals(container.getTabsByOrg("org-test-org").length, 0);
    const org1Tabs = container.getTabsByOrg("org-test-org1");
    assertEquals(org1Tabs.length, 2);
    assertEquals(org1Tabs[0].label, "Org Tab2");
    assertEquals(org1Tabs[1].label, "Org Tab3");

    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab2", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab2", url: "normal-url" },
      // @ts-ignore
      { label: "New Tab", url: "new-url" }
    ],{
        resetTabs: false,
        removeOrgTabs: true,
        // @ts-ignore
        sync: false,
        // @ts-ignore
        keepTabsNotThisOrg: "org-test-org",
    }));
    assertEquals(container.length, 6);
    assertEquals(mockStorage.tabs.length, 3);
    assertEquals(container[0].label, "Normal Tab");
    assertEquals(container[1].label, "Org Tab2");
    assertEquals(container[2].label, "Org Tab3");
    assertEquals(mockStorage.tabs[0].label, "Normal Tab");
    assertEquals(mockStorage.tabs[1].label, "Org Tab2");
  });

  // resetTabs = false, removeOrgTabs = true, keepTabsNotThisOrg = nothing
  await t.step("remove all org tabs while maintaing the rest", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
    ]));
    assertEquals(container.length, 7);
    
    assert(await container.replaceTabs(
      [],
      { 
          resetTabs: false,
          removeOrgTabs: true,
      }
    ));
    
    assertEquals(container.length, 4);
    assertEquals(mockStorage.tabs.length, 4);
    assertEquals(container.getTabsWithOrg().length, 0);
    assertEquals(container.getTabsWithOrg(false).length, 4);

    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab2", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab2", url: "normal-url" },
      // @ts-ignore
      { label: "New Tab", url: "new-url" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-url", org: "test-org1" },
    ],{
        resetTabs: false,
        removeOrgTabs: true,
        // @ts-ignore
        sync: false,
    }));
    assertEquals(container.length, 8);
    assertEquals(mockStorage.tabs.length, 4);
    assertEquals(container[0].label, "⚡");
    assertEquals(container[1].label, "Flows");
    assertEquals(container[2].label, "Users");
    assertEquals(container[3].label, "Normal Tab");
    assertEquals(mockStorage.tabs[0].label, "⚡");
    assertEquals(mockStorage.tabs[1].label, "Flows");
    assertEquals(mockStorage.tabs[2].label, "Users");
    assertEquals(mockStorage.tabs[3].label, "Normal Tab");
  });

  // resetTabs = false, removeOrgTabs = false, keepTabsNotThisOrg = something|nothing
  await t.step("only adds tabs", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Org Tab", url: "org-url2", org: "test-org2" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" }
    ],{
        resetTabs: false,
        removeOrgTabs: false,
    }));
    assertEquals(container.length, 6);
    assertEquals(mockStorage.tabs.length, 6);

    assert(await container.replaceTabs([],{
        resetTabs: false,
        removeOrgTabs: false,
        // @ts-ignore
        keepTabsNotThisOrg: "org-test-org"
    }));
    assertEquals(container.length, 6);

    assert(await container.replaceTabs([
      // @ts-ignore
      { label: "Org Tab2", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-url2", org: "test-org2" },
      // @ts-ignore
      { label: "Normal Tab2", url: "normal-url" },
      // @ts-ignore
      { label: "New Tab", url: "new-url" }
    ],{
        resetTabs: false,
        removeOrgTabs: false,
        // @ts-ignore
        sync: false,
    }));
    assertEquals(container.length, 10);
    assertEquals(mockStorage.tabs.length, 6);
    
    assert(await container.replaceTabs([],{
        resetTabs: false,
        removeOrgTabs: false,
        // @ts-ignore
        sync: false,
        // @ts-ignore
        keepTabsNotThisOrg: "org-test-org"
    }));
    assertEquals(container.length, 10);
    assertEquals(mockStorage.tabs.length, 6);
  });
});

await Deno.test("TabContainer - Utility functions", async (t) => {
  await t.step("splice", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container.splice(0, 1).length, 1);
    assertEquals(container.length, 2);
    assertEquals(container.splice(1, 1).length, 1);
    assertEquals(container.length, 1);
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
    ]));
    assertEquals(container.length, 5);
    assertEquals(container.splice(2, container.length).length, 3);
    assertEquals(container.length, 2);
    assertEquals(container.splice(0, container.length).length, 2);
    assertEquals(container.length, 0);
  });

  await t.step("filter", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    // @ts-ignore
    assertEquals(container.filter(tab => tab.label === "Flows").length, 1);
    assertEquals(container.length, 3);
    // @ts-ignore
    assertEquals(container.filter(tab => tab.label !== "Flows").length, 2);
    assertEquals(container.length, 3);
    // @ts-ignore
    assertEquals(container.filter(tab => tab.org == null).length, 3);
    assertEquals(container.length, 3);
  });

  await t.step("getTabsWithOrg", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
    ]));
    assertEquals(container.length, 7);
    assertEquals(container.getTabsWithOrg().length, 3);
    assertEquals(container.length, 7);
    assertEquals(container.getTabsWithOrg(false).length, 4);
    assertEquals(container.length, 7);
  });

  await t.step("getTabsByOrg", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
    ]));
    assertEquals(container.length, 7);
    assertThrows(
        () => container.getTabsByOrg(),
        Error,
        "Cannot get Tabs if Org is not specified."
    );
    assertEquals(container.getTabsByOrg("org-not-present").length, 0);
    assertEquals(container.getTabsByOrg("org-test-org").length, 1);
    assertEquals(container.getTabsByOrg("org-test-org1").length, 2);
    assertEquals(container.getTabsByOrg("org-test-org", false).length, 2);
    assertEquals(container.getTabsByOrg("org-test-org1", false).length, 1);
    assertEquals(container.length, 7);
  });

  await t.step("getTabsByData", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org2" },
    ]));
    assertEquals(container.length, 8);
    // equal to getTabsByOrg
    // @ts-ignore
    assertEquals(container.getTabsByData({org:"org-not-present"}).length, 0);
    // @ts-ignore
    assertEquals(container.getTabsByData({org:"org-test-org"}).length, 1);
    // @ts-ignore
    assertEquals(container.getTabsByData({org:"org-test-org1"}).length, 2);

    // @ts-ignore
    assertEquals(container.getTabsByData({label:"Org Tab"}).length, 1);
    // @ts-ignore
    assertEquals(container.getTabsByData({url:"mini-org-urll"}).length, 3);
    // @ts-ignore
    assertEquals(container.getTabsByData({org:"org-test-org1",url:"mini-org-urll"}).length, 2);
    assertEquals(container.length, 8);
  });

  await t.step("getTabIndex", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org2" },
    ]));
    assertEquals(container.length, 8);
    assertThrows(
        // @ts-ignore
        () => container.getTabIndex(),
        Error,
        "Cannot find index without data."
    );
    assertThrows(
        // @ts-ignore
        () => container.getTabIndex({org:"org-not-present"}),
        Error,
        "Tab was not found."
    );
    // @ts-ignore
    assertEquals(container.getTabIndex({org:"org-test-org"}), 3);
    // @ts-ignore
    assertEquals(container.getTabIndex({org:"org-test-org1"}), 5);

    // @ts-ignore
    assertEquals(container.getTabIndex({label:"Org Tab"}), 3);
    // @ts-ignore
    assertEquals(container.getTabIndex({url:"mini-org-urll"}), 5);
    // @ts-ignore
    assertEquals(container.getTabIndex({org:"org-test-org2",url:"mini-org-urll"}), 7);
    // @ts-ignore
    assertEquals(container.getTabIndex({org:"org-test-org2"}), 7);
    assertEquals(container.length, 8);
  });

  await t.step("exists", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assert(await container.addTabs([
      // @ts-ignore
      { label: "Org Tab", url: "org-url", org: "test-org" },
      // @ts-ignore
      { label: "Normal Tab", url: "normal-url" },
      // @ts-ignore
      { label: "Org Tab2", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org1" },
      // @ts-ignore
      { label: "Org Tab3", url: "org-urll", org: "test-org2" },
    ]));
    assertEquals(container.length, 8);
    // @ts-ignore
    assert(await container.exists({org:"test-org"}));
    // @ts-ignore
    assert(await container.exists({org:"test-org1"}));

    // @ts-ignore
    assert(await container.exists({label:"Org Tab"}));
    // @ts-ignore
    assert(await container.exists({url:"org-urll"}));
    // @ts-ignore
    assert(await container.exists({org:"test-org2",url:"org-urll"}));
    // @ts-ignore
    assert(await container.exists({org:"test-org2"}));
    // @ts-ignore
    assertFalse(await container.exists({org:"org-not-present"}));
    // @ts-ignore
    assertFalse(await container.exists({url:"url-not-present"}));
    assertEquals(container.length, 8);
  });

  await t.step("toJSON", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);

    assertEquals(await container.toJSON(), [
     {
       label: "⚡",
       url: "mini-/lightning",
     },
     {
       label: "Flows",
       url: "mini-/lightning/app/standard__FlowsApp",
     },
     {
       label: "Users",
       url: "mini-ManageUsers/home",
     },
    ]);
    assertEquals(await TabContainer.toJSON(container), [
     {
       label: "⚡",
       url: "mini-/lightning",
     },
     {
       label: "Flows",
       url: "mini-/lightning/app/standard__FlowsApp",
     },
     {
       label: "Users",
       url: "mini-ManageUsers/home",
     },
    ]);
  });

  await t.step("toString", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);

    assertEquals(await container.toString(), `[
{
    "label": "⚡",
    "url": "mini-/lightning"
},
{
    "label": "Flows",
    "url": "mini-/lightning/app/standard__FlowsApp"
},
{
    "label": "Users",
    "url": "mini-ManageUsers/home"
}
]`);
    assertEquals(await TabContainer.toString(container), `[
{
    "label": "⚡",
    "url": "mini-/lightning"
},
{
    "label": "Flows",
    "url": "mini-/lightning/app/standard__FlowsApp"
},
{
    "label": "Users",
    "url": "mini-ManageUsers/home"
}
]`);
  });

  await t.step("isValid", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assert(await TabContainer.isValid(container, false));
    assert(await TabContainer.isValid(container, true));
    const customContainer = await container.toJSON();
    // @ts-ignore
    assert(await TabContainer.isValid(customContainer, false));
    // @ts-ignore
    assert(await TabContainer.isValid(customContainer, true));
    const untabbedContainer = [
        {
            random: "string",
            incredible: 5678,
        },
        {
            superb: true,
            fantastic: {
                ...customContainer
            },
        },
    ];
    // @ts-ignore
    assert(await TabContainer.isValid(untabbedContainer, false));
    // @ts-ignore
    assertFalse(await TabContainer.isValid(untabbedContainer, true));
    const notAnArray = "Goodbye Celsa";
    // @ts-ignore
    assertFalse(await TabContainer.isValid(notAnArray, false));
    // @ts-ignore
    assertFalse(await TabContainer.isValid(notAnArray, true));

    // @ts-ignore
    assertFalse(await TabContainer.isValid(null, false));
    // @ts-ignore
    assertFalse(await TabContainer.isValid(null, true));
  });

  await t.step("map", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    // @ts-ignore
    const newContainer = container.map(_ => "I'm a string!");
    assertEquals(container.length, 3);
    assertEquals(newContainer.length, 3);
    newContainer.forEach(el => 
        assertEquals(el, "I'm a string!")
    );
  });

  await t.step("setDefaultTabs", async () => {
    mockStorage.tabs = [];
    // @ts-ignore
    const container = await TabContainer.create([]);
    assertEquals(container.length, 0);
    assert(await container.setDefaultTabs());
    assertEquals(container.length, 3);
    assertEquals(container[0].label, "⚡");
    assertEquals(container[1].label, "Flows");
    assertEquals(container[2].label, "Users");
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");
  });
});

// TODO
await Deno.test("TabContainer - Synchronization", async (t) => {
  await t.step("syncs tabs with storage", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    
    assertEquals(container.length, 3);
    assertEquals(mockStorage.tabs.length, 3);
    // @ts-ignore
    assert(await container.addTab({ label: "Sync Test", url: "sync-url"}, false ));
    assertEquals(container.length, 4);
    assertEquals(mockStorage.tabs.length, 3);

    await container.syncTabs();
    assertEquals(container.length, 4);
    assertEquals(mockStorage.tabs.length, 4);

    // @ts-ignore
    await container.syncTabs([{ label: "Sync Test", url: "sync-url2" }]);
    assertEquals(container.length, 1);
    assertEquals(mockStorage.tabs.length, 1);
    assertRejects(
        // @ts-ignore
        async () => await container.syncTabs({ label: "Sync Test", url: "sync-url2" }),
        Error,
        "Invalid array or no array was passed"
    );
    assertEquals(container.length, 0);
    assertEquals(mockStorage.tabs.length, 1);

    // @ts-ignore
    await TabContainer._syncTabs([{ label: "Sync Test", url: "sync-url3" }]);
    assertEquals(container.length, 0);
    assertEquals(mockStorage.tabs.length, 0);
    assertRejects(
        // @ts-ignore
        async () => await TabContainer._syncTabs({ label: "Sync Test", url: "sync-url2" }),
        Error,
        "Invalid array or no array was passed"
    );

    // @ts-ignore
    const arr = [];
    arr.push(await Tab.create("Sync Test", "sync-url3"));
    // @ts-ignore
    await TabContainer._syncTabs(arr);
    assertEquals(container.length, 0);
    assertEquals(mockStorage.tabs.length, 1);
  });
});

await Deno.test("TabContainer - Import", async (t) => {
  await t.step("import tabs from JSON string", async () => {
      mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    
    assertEquals(await container.importTabs(`[{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}]`), 2);
    assertEquals(container.length, 5);
    
    assertEquals(await container.importTabs(`[{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}]`, true, false), 2);
    assertEquals(container.length, 2);
    
    assertEquals(await container.importTabs(`[{"label":"hello","url":"nice-url2"},{"label":"orglabel","url":"orgurl2","org":"orgorg"}]`, true), 2);
    assertEquals(container.length, 3);
    
    assertEquals(await container.importTabs(`[{"label":"hello","url":"nice-url3"},{"label":"orglabel","url":"orgurl3","org":"orgorg"}]`, false, false), 2);
    assertEquals(container.length, 3);
  });

  await t.step("does not import tabs from wrong JSON string", async () => {
      mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertRejects(
        async () => await container.importTabs(`{"label":"hello","url":"nice-url"},{"label":"orglabel","url":"orgurl","org":"orgorg"}`),
        Error,
    );
    assertEquals(container.length, 3);
    
    assertRejects(
        async () => await container.importTabs(`[{"label":"hello","url":"nice-url"},{"unexpected":"orglabel","url":"orgurl","org":"orgorg"}]`, true, false),
        Error,
    );
    assertEquals(container.length, 3);
    
    assertRejects(
        async () => await container.importTabs(`a simple string`, true),
        Error,
    );
    assertEquals(container.length, 3);
    
    assertRejects(
        async () => await container.importTabs(`[{"label":"hello","url":"nice-url","whoopsie":{"label":"hello","url":"nice-url"}}`, true),
        Error,
    );
    assertEquals(container.length, 3);
  });
});

await Deno.test("TabContainer - Move Tab", async (t) => {
  await t.step("make a tab be the first of the array", async () => {
      mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");
    matchStorageToContainer(container);
    
    // @ts-ignore
    assertEquals(await container.moveTab({url:"mini-ManageUsers/home"}, {fullMovement: true}), 0);
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-ManageUsers/home");
    assertEquals(container[1].url, "mini-/lightning");
    assertEquals(container[2].url, "mini-/lightning/app/standard__FlowsApp");
    matchStorageToContainer(container);
  });
    
  await t.step("make a tab be the last of the array", async () => {
      mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");
    matchStorageToContainer(container);
    
    // @ts-ignore
    assertEquals(await container.moveTab({url:"mini-/lightning"}, {moveBefore: false, fullMovement: true}), 2);
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[1].url, "mini-ManageUsers/home");
    assertEquals(container[2].url, "mini-/lightning");
    matchStorageToContainer(container);
  });
    
  await t.step("move a tab left/up one spot in the array", async () => {
      mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");
    matchStorageToContainer(container);
    
    // @ts-ignore
    assertEquals(await container.moveTab({url:"mini-ManageUsers/home"}), 1);
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-ManageUsers/home");
    assertEquals(container[2].url, "mini-/lightning/app/standard__FlowsApp");
    matchStorageToContainer(container);
  });
    
  await t.step("move a tab right/down one spot in the array", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");
    matchStorageToContainer(container);
    
    // @ts-ignore
    assertEquals(await container.moveTab({url:"mini-/lightning/app/standard__FlowsApp"}, {moveBefore: false}), 2);
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-ManageUsers/home");
    assertEquals(container[2].url, "mini-/lightning/app/standard__FlowsApp");
    matchStorageToContainer(container);
  });
});

await Deno.test("TabContainer - Remove Tab(s)", async (t) => {
  await t.step("remove this tab", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");

    // @ts-ignore
    assert(await container.remove({url:"mini-ManageUsers/home"}))
    assertEquals(container.length, 2);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    matchStorageToContainer(container);

    assertRejects(
        async () => await container.remove(),
        Error,
    );
    assertRejects(
        // @ts-ignore
        async () => await container.remove({org:"test-org"}),
        Error,
    );
  });

  await t.step("remove all other tabs", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");

    // @ts-ignore
    assert(await container.removeOtherTabs({url:"mini-ManageUsers/home"}))
    assertEquals(container.length, 1);
    assertEquals(container[0].url, "mini-ManageUsers/home");
  });

  await t.step("remove tabs before/on the left", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");

    // @ts-ignore
    assert(await container.removeOtherTabs({url:"mini-/lightning/app/standard__FlowsApp"},{removeBefore: true}))
    assertEquals(container.length, 2);
    assertEquals(container[0].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[1].url, "mini-ManageUsers/home");
  });

  await t.step("remove tabs after", async () => {
    mockStorage.tabs = [];
    const container = await TabContainer.create();
    assertEquals(container.length, 3);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
    assertEquals(container[2].url, "mini-ManageUsers/home");

    // @ts-ignore
    assert(await container.removeOtherTabs({url:"mini-/lightning/app/standard__FlowsApp"},{removeBefore: false}))
    assertEquals(container.length, 2);
    assertEquals(container[0].url, "mini-/lightning");
    assertEquals(container[1].url, "mini-/lightning/app/standard__FlowsApp");
  });
});

await Deno.test("TabContainer - Error on Invalid Tabs", async (t) => {
  await t.step("errorOnInvalidTabs", async () => {
    assertRejects(
        async () => await TabContainer.errorOnInvalidTabs(),
        Error,
    );
    assertRejects(
        // @ts-ignore
        async () => await TabContainer.errorOnInvalidTabs("reject"),
        Error,
    );
    assertRejects(
        // @ts-ignore
        async () => await TabContainer.errorOnInvalidTabs([{unexpected:true}]),
        Error,
    );
    assertRejects(
        // @ts-ignore
        async () => await TabContainer.errorOnInvalidTabs([{label:"hi",url:"mum",orgs:["alpha","beta"]}]),
        Error,
    );
  });
});
