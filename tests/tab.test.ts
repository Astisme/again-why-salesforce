import { Tab } from "/tab.js";
import "./mocks.ts";

import { assert, assertFalse, assertEquals, assertRejects, assertThrows } from "https://deno.land/std/testing/asserts.ts";

await Deno.test("Tab Creation - Basic Usage", async (t) => {
  await t.step("creates tab with required parameters", async () => {
    const tab = await Tab.create("Home", "https://example.com");
    assertEquals(tab.label, "Home");
    assertEquals(tab.url, "mini-https://example.com");
    assertEquals(tab.org, undefined);
  });

  await t.step("creates tab with optional org parameter", async () => {
    const tab = await Tab.create("Dashboard", "https://example.com", "testOrg");
    assertEquals(tab.label, "Dashboard");
    assertEquals(tab.url, "mini-https://example.com");
    assertEquals(tab.org, "org-testOrg");
  });

  await t.step("tab is valid when object with required parameters", async () => {
    assert(
      await Tab.isValid({
          label: "Home",
          url: "https://example.com"
      })
    );
    assert(
      await Tab.isValid({
          label: "Home",
          url: "https://example.com",
          org: "test-org"
      })
    );
  });
});

await Deno.test("Tab Creation - Object Style", async (t) => {
  await t.step("creates tab from valid object with label", async () => {
    const tab = await Tab.create({
      label: "Settings",
      url: "https://example.com/settings",
      org: "testOrg"
    });
    assertEquals(tab.label, "Settings");
    assertEquals(tab.url, "mini-https://example.com/settings");
    assertEquals(tab.org, "org-testOrg");
  });

  await t.step("creates tab from valid object with tabTitle", async () => {
    const tab = await Tab.create({
      tabTitle: "Profile",
      url: "https://example.com/profile"
    });
    assertEquals(tab.label, "Profile");
    assertEquals(tab.url, "mini-https://example.com/profile");
    assertEquals(tab.org, undefined);
  });

  await t.step("tab is valid from valid object with tabTitle", async () => {
    assert(
      await Tab.isValid({
        tabTitle: "Profile",
        url: "https://example.com/profile"
      })
    );
  });

  await t.step("throws error when object contains unexpected keys", async () => {
    await assertRejects(
      async () => {
        await Tab.create({
          label: "Test",
          url: "https://example.com",
          invalidKey: "value"
        });
      },
      Error,
      "Unexpected keys found: invalidKey"
    );
  });

  await t.step("throws error when passing additional parameters with object", async () => {
    await assertRejects(
      async () => {
        await Tab.create({ label: "Test", url: "https://example.com" }, "extraParam");
      },
      Error,
      "When calling with an object, do not pass anything else."
    );
  });
});

await Deno.test("Tab Creation - Error Cases", async (t) => {
  await t.step("throws error when label is empty", async () => {
    await assertRejects(
      async () => {
        await Tab.create("", "https://example.com");
      },
      Error,
      "Label must be a non-empty string"
    );
  });

  await t.step("tab is not valid when label is empty", async () => {
    assertFalse(
      await Tab.isValid({url: "https://example.com"})
    );
  });

  await t.step("throws error when url is empty", async () => {
    await assertRejects(
      async () => {
        await Tab.create("Test", "");
      },
      Error,
      "URL must be a non-empty string"
    );
  });

  await t.step("tab is not valid when url is empty", async () => {
    assertFalse(
      await Tab.isValid({label: "Test"})
    );
  });

  await t.step("throws error when org is not a string", async () => {
    await assertRejects(
      async () => {
        await Tab.create("Test", "https://example.com", 123 as any);
      },
      Error,
      "Org must be a string or undefined"
    );
  });

  await t.step("tab is not valid when org is not a string", async () => {
    assertFalse(
      await Tab.isValid({
          label: "Test",
          url: "https://example.com",
          org: 123 as any
      })
    );
  });
});

await Deno.test("Tab Creation - Instance Reuse", async (t) => {
  await t.step("returns same instance when passing an existing Tab", async () => {
    const originalTab = await Tab.create("Test", "https://example.com");
    const newTab = await Tab.create(originalTab);
    assertEquals(newTab, originalTab);
  });
});

await Deno.test("Tab Constructor Protection", () => {
  assertThrows(
    () => {
      new Tab("Test", "https://example.com", undefined, Symbol("fake"));
    },
    Error,
    "Use Tab.create() instead of new Tab()"
  );
});

await Deno.test("Utility methods", async (t) => {
    const tab_no_org = await Tab.create("Test", "https://example.com");
    const tab_with_org = await Tab.create("Test", "https://example.com", "testOrg");
    const object_no_org = {
        label: "Test",
        url: "mini-https://example.com"
    };
    const object_with_org = {
        label: "Test",
        url: "mini-https://example.com",
        org: "org-testOrg"
    };

    await t.step("isTab", () => {
        assert(Tab.isTab(tab_no_org));
        assert(Tab.isTab(tab_with_org));
        assertFalse(Tab.isTab(object_no_org));
        assertFalse(Tab.isTab(object_with_org));
    });

    await t.step("toJSON", () => {
        const tabjson_no_org = tab_no_org.toJSON();
        const tabjson_with_org = tab_with_org.toJSON();
        assertFalse(Tab.isTab(tabjson_no_org));
        assertFalse(Tab.isTab(tabjson_with_org));
        assert(tabjson_no_org instanceof Object);
        assert(tabjson_with_org instanceof Object);
        assertEquals(
            tabjson_no_org,
            object_no_org,
        );
        assertEquals(
            tabjson_with_org,
            object_with_org,
        );
    });

    await t.step("toString", () => {
        const tab_string_no_org = tab_no_org.toString();
        const tab_string_with_org = tab_with_org.toString();
        assertEquals(
            typeof tab_string_no_org,
            "string"  
        );
        assertEquals(
            typeof tab_string_with_org,
            "string"  
        );
        assertEquals(
            tab_string_no_org,
            `{
    "label": "Test",
    "url": "mini-https://example.com"
}`,
        );
        assertEquals(
            tab_string_with_org,
            `{
    "label": "Test",
    "url": "mini-https://example.com",
    "org": "org-testOrg"
}`,
        );
    });

    await t.step("equals", () => {
        assertFalse(tab_with_org.equals());
        assertFalse(tab_with_org.equals({label: "Text"}));
        assert(tab_with_org.equals({label: "Test"}));
        assertFalse(tab_with_org.equals({url: "https://example.com"}));
        assert(tab_with_org.equals({url: "mini-https://example.com"}));
        assertFalse(tab_with_org.equals({org: "testOrg"}));
        assert(tab_with_org.equals({org: "org-testOrg"}));
        // label
        assertFalse(tab_with_org.equals({
            label: "Text",
        }));
        assertFalse(tab_with_org.equals({
            label: "Text",
            url: "mini-https://example.com"
        }));
        assertFalse(tab_with_org.equals({
            label: "Text",
            org: "org-testOrg"
        }));
        assertFalse(tab_with_org.equals({
            label: "Text",
            url: "mini-https://example.com",
            org: "org-testOrg"
        }));
        assert(tab_with_org.equals({
            label: "Test",
        }));
        assert(tab_with_org.equals({
            label: "Test",
            url: "mini-https://example.com"
        }));
        assert(tab_with_org.equals({
            label: "Test",
            org: "org-testOrg"
        }));
        assert(tab_with_org.equals({
            label: "Test",
            url: "mini-https://example.com",
            org: "org-testOrg"
        }));
        // url
        assertFalse(tab_with_org.equals({
            url: "https://example.com",
        }));
        assertFalse(tab_with_org.equals({
            url: "https://example.com",
            label: "Test",
        }));
        assertFalse(tab_with_org.equals({
            url: "https://example.com",
            org: "org-testOrg"
        }));
        assertFalse(tab_with_org.equals({
            url: "https://example.com",
            label: "Test",
            org: "org-testOrg"
        }));
        assert(tab_with_org.equals({
            url: "mini-https://example.com",
        }));
        assert(tab_with_org.equals({
            url: "mini-https://example.com",
            label: "Test",
        }));
        assert(tab_with_org.equals({
            url: "mini-https://example.com",
            org: "org-testOrg"
        }));
        assert(tab_with_org.equals({
            url: "mini-https://example.com",
            label: "Test",
            org: "org-testOrg"
        }));
        // org
        assertFalse(tab_with_org.equals({
            org: "testOrg",
        }));
        assertFalse(tab_with_org.equals({
            org: "testOrg",
            label: "Test",
        }));
        assertFalse(tab_with_org.equals({
            org: "testOrg",
            url: "mini-https://example.com",
        }));
        assertFalse(tab_with_org.equals({
            org: "testOrg",
            label: "Test",
            url: "mini-https://example.com",
        }));
        assert(tab_with_org.equals({
            org: "org-testOrg",
        }));
        assert(tab_with_org.equals({
            org: "org-testOrg",
            label: "Test",
        }));
        assert(tab_with_org.equals({
            org: "org-testOrg",
            url: "mini-https://example.com",
        }));
        assert(tab_with_org.equals({
            org: "org-testOrg",
            label: "Test",
            url: "mini-https://example.com",
        }));
        // objects
        assertFalse(tab_no_org.equals(tab_with_org));
        assertFalse(tab_no_org.equals(object_with_org));
        assert(tab_no_org.equals(object_no_org));
        assert(tab_no_org.equals(tab_no_org));
        assert(tab_with_org.equals(object_with_org));
        assert(tab_with_org.equals(object_no_org));
        assert(tab_with_org.equals(tab_with_org));
    });
});

await Deno.test("minify and extranct", async (t) => {
    await t.step("minifyURL", async () => {
        assertEquals(await Tab.minifyURL("url"), "mini-url");
        assertEquals(await Tab.minifyURL("mini-url"), "mini-url");
    });

    await t.step("extractOrgName", async () => {
        assertEquals(await Tab.extractOrgName("testorg"), "org-testorg");
        assertEquals(await Tab.extractOrgName("org-testorg"), "org-testorg");
    });
});
