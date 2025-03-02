import "./mocks.ts";
import {
	assert,
	assertEquals,
	assertFalse,
	assertThrows,
} from "https://deno.land/std/testing/asserts.ts";
import { Tab } from "/tab.js";

await Deno.test("Tab Creation - Basic Usage", async (t) => {
	await t.step("creates tab with required parameters", () => {
		const tab = Tab.create("Home", "https://example.com");
		assertEquals(tab.label, "Home");
		assertEquals(tab.url, "https://example.com");
		assertEquals(tab.org, undefined);
	});

	await t.step("creates tab with optional org parameter", () => {
		const tab = Tab.create(
			"Dashboard",
			"https://example.com",
			"testorg",
		);
		assertEquals(tab.label, "Dashboard");
		assertEquals(tab.url, "https://example.com");
		assertEquals(tab.org, "testorg");
	});

	await t.step(
		"tab is valid when object with required parameters",
		() => {
			assert(
				Tab.isValid({
					label: "Home",
					url: "https://example.com",
				}),
			);
			assert(
				Tab.isValid({
					label: "Home",
					url: "https://example.com",
					org: "test-org",
				}),
			);
		},
	);
});

await Deno.test("Tab Creation - Object Style", async (t) => {
	await t.step("creates tab from valid object with label", () => {
		const tab = Tab.create({
			label: "Settings",
			url: "https://example.com/settings",
			org: "testorg",
		});
		assertEquals(tab.label, "Settings");
		assertEquals(tab.url, "https://example.com/settings");
		assertEquals(tab.org, "testorg");
	});

	await t.step("creates tab from valid object with tabTitle", () => {
		const tab = Tab.create({
			tabTitle: "Profile",
			url: "https://example.com/profile",
		});
		assertEquals(tab.label, "Profile");
		assertEquals(tab.url, "https://example.com/profile");
		assertEquals(tab.org, undefined);
	});

	await t.step("tab is valid from valid object with tabTitle", () => {
		assert(
			Tab.isValid({
				tabTitle: "Profile",
				url: "https://example.com/profile",
			}),
		);
	});

	await t.step(
		"throws error when object contains unexpected keys",
		() => {
			assertThrows(
				() => {
					Tab.create({
						label: "Test",
						url: "https://example.com",
						invalidKey: "value",
					});
				},
				Error,
				"Unexpected keys found: invalidKey",
			);
		},
	);

	await t.step(
		"throws error when passing additional parameters with object",
		() => {
			assertThrows(
				() => {
					Tab.create({
						label: "Test",
						url: "https://example.com",
					}, "extraParam");
				},
				Error,
				"When calling with an object, do not pass anything else.",
			);
		},
	);
});

await Deno.test("Tab Creation - Error Cases", async (t) => {
	await t.step("throws error when label is empty", () => {
		assertThrows(
			() => {
				Tab.create("", "https://example.com");
			},
			Error,
			"Label must be a non-empty string",
		);
	});

	await t.step("tab is not valid when label is empty", () => {
		assertFalse(
			Tab.isValid({ url: "https://example.com" }),
		);
	});

	await t.step("throws error when url is empty", () => {
		assertThrows(
			() => {
				Tab.create("Test", "");
			},
			Error,
			"URL must be a non-empty string",
		);
	});

	await t.step("tab is not valid when url is empty", () => {
		assertFalse(
			Tab.isValid({ label: "Test" }),
		);
	});

	await t.step("throws error when org is not a string", () => {
		assertThrows(
			() => {
				Tab.create("Test", "https://example.com", 123);
			},
			Error,
			"Org must be a string or undefined",
		);
	});

	await t.step("tab is not valid when org is not a string", () => {
		assertFalse(
			Tab.isValid({
				label: "Test",
				url: "https://example.com",
				org: 123,
			}),
		);
	});
});

await Deno.test("Tab Creation - Instance Reuse", async (t) => {
	await t.step(
		"returns same instance when passing an existing Tab",
		() => {
			const originalTab = Tab.create("Test", "https://example.com");
			const newTab = Tab.create(originalTab);
			assertEquals(newTab, originalTab);
		},
	);
});

await Deno.test("Tab Constructor Protection", () => {
	assertThrows(
		() => {
			new Tab("Test", "https://example.com", undefined, Symbol("fake"));
		},
		Error,
		"Use Tab.create() instead of new Tab()",
	);
});

await Deno.test("Utility methods", async (t) => {
	const tab_no_org = Tab.create("Test", "https://example.com");
	const tab_with_org = Tab.create(
		"Test",
		"https://example.com",
		"testorg",
	);
	const object_no_org = {
		label: "Test",
		url: "https://example.com",
	};
	const object_with_org = {
		label: "Test",
		url: "https://example.com",
		org: "testorg",
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
			"string",
		);
		assertEquals(
			typeof tab_string_with_org,
			"string",
		);
		assertEquals(
			tab_string_no_org,
			`{
    "label": "Test",
    "url": "https://example.com"
}`,
		);
		assertEquals(
			tab_string_with_org,
			`{
    "label": "Test",
    "url": "https://example.com",
    "org": "testorg"
}`,
		);
	});

	await t.step("equals", () => {
		assertFalse(tab_with_org.equals());
		assertFalse(tab_with_org.equals({ label: "Text" }));
		assert(tab_with_org.equals({ label: "Test" }));
		assertFalse(tab_with_org.equals({ org: "testOrg" }));
		assert(tab_with_org.equals({ org: "testorg" }));
		// label
		assertFalse(tab_with_org.equals({
			label: "Text",
		}));
		assertFalse(tab_with_org.equals({
			label: "Text",
			url: "https://example.com",
		}));
		assertFalse(tab_with_org.equals({
			label: "Text",
			org: "testorg",
		}));
		assertFalse(tab_with_org.equals({
			label: "Text",
			url: "https://example.com",
			org: "testorg",
		}));
		assert(tab_with_org.equals({
			label: "Test",
		}));
		assert(tab_with_org.equals({
			label: "Test",
			url: "https://example.com",
		}));
		assert(tab_with_org.equals({
			label: "Test",
			org: "testorg",
		}));
		assert(tab_with_org.equals({
			label: "Test",
			url: "https://example.com",
			org: "testorg",
		}));
		// url
		assertFalse(tab_with_org.equals({
			url: "https://www.example.com",
		}));
		assertFalse(tab_with_org.equals({
			url: "https://www.example.com",
			label: "Test",
		}));
		assertFalse(tab_with_org.equals({
			url: "https://www.example.com",
			org: "testorg",
		}));
		assertFalse(tab_with_org.equals({
			url: "https://www.example.com",
			label: "Test",
			org: "testorg",
		}));
		assert(tab_with_org.equals({
			url: "https://example.com",
		}));
		assert(tab_with_org.equals({
			url: "https://example.com",
			label: "Test",
		}));
		assert(tab_with_org.equals({
			url: "https://example.com",
			org: "testorg",
		}));
		assert(tab_with_org.equals({
			url: "https://example.com",
			label: "Test",
			org: "testorg",
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
			url: "https://example.com",
		}));
		assertFalse(tab_with_org.equals({
			org: "testOrg",
			label: "Test",
			url: "https://example.com",
		}));
		assert(tab_with_org.equals({
			org: "testorg",
		}));
		assert(tab_with_org.equals({
			org: "testorg",
			label: "Test",
		}));
		assert(tab_with_org.equals({
			org: "testorg",
			url: "https://example.com",
		}));
		assert(tab_with_org.equals({
			org: "testorg",
			label: "Test",
			url: "https://example.com",
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

await Deno.test("URL manipulation", async (t) => {
	await t.step("minifyURL", () => {
		assertThrows(
			() => Tab.minifyURL(),
		);
		assertEquals(
			Tab.minifyURL(
				"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/",
			),
			"SetupOneHome/home",
		);
		assertEquals(
			Tab.minifyURL(
				"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
			),
			"SetupOneHome/home",
		);
		assertEquals(
			Tab.minifyURL(
				"https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/",
			),
			"SetupOneHome/home",
		);
		assertEquals(
			Tab.minifyURL(
				"https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
			),
			"SetupOneHome/home",
		);
		assertEquals(
			Tab.minifyURL("/lightning/setup/SetupOneHome/home/"),
			"SetupOneHome/home",
		);
		assertEquals(
			Tab.minifyURL("/lightning/setup/SetupOneHome/home"),
			"SetupOneHome/home",
		);
		assertEquals(
			Tab.minifyURL("lightning/setup/SetupOneHome/home/"),
			"SetupOneHome/home",
		);
		assertEquals(
			Tab.minifyURL("lightning/setup/SetupOneHome/home"),
			"SetupOneHome/home",
		);
		assertEquals(Tab.minifyURL("SetupOneHome/home/"), "SetupOneHome/home");
		assertEquals(Tab.minifyURL("SetupOneHome/home"), "SetupOneHome/home");

		assertEquals(
			Tab.minifyURL("/SetupOneHome/home/"),
			"/SetupOneHome/home",
		);
		assertEquals(Tab.minifyURL("/SetupOneHome/home"), "/SetupOneHome/home");
	});

	await t.step("expandURL", () => {
		assertThrows(
			() => Tab.expandURL(),
		);
		assertThrows(
			() => Tab.expandURL("url"),
		);
		assertEquals(
			Tab.expandURL(
				"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(
			Tab.expandURL(
				"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(
			Tab.expandURL(
				"https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(
			Tab.expandURL(
				"https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(
			Tab.expandURL(
				"lightning/setup/SetupOneHome/home/",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(
			Tab.expandURL(
				"lightning/setup/SetupOneHome/home",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(
			Tab.expandURL(
				"SetupOneHome/home/",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(
			Tab.expandURL(
				"SetupOneHome/home",
				"https://myorgdomain.sandbox.my.salesforce-setup.com/",
			),
			"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home",
		);
	});

	await t.step("containsSalesforceId", () => {
		assertThrows(
			() => Tab.containsSalesforceId(),
		);
		assert(
			Tab.containsSalesforceId(
				"https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/ObjectManager/Account/FieldsAndRelationships/00N4W00000S0vI0/view",
			),
		);
		assert(
			Tab.containsSalesforceId(
				"/lightning/setup/ObjectManager/Account/FieldsAndRelationships/00N4W00000S0vI0/view",
			),
		);
		assert(
			Tab.containsSalesforceId(
				"https://myorgdomain.my.salesforce-setup.com/lightning/setup/EmbeddedServiceDeployments/04IEm000000J2VxMAK/view",
			),
		);
		assert(Tab.containsSalesforceId("00N4W00000S0vI0"));
		assert(Tab.containsSalesforceId("/00N4W00000S0vI0/"));
		assert(Tab.containsSalesforceId("=00N4W00000S0vI0/"));
		assert(Tab.containsSalesforceId("/00N4W00000S0vI0?"));
		assert(Tab.containsSalesforceId("=00N4W00000S0vI0?"));
		assert(Tab.containsSalesforceId("/00N4W00000S0vI0&"));
		assert(Tab.containsSalesforceId("=00N4W00000S0vI0&"));
		assertFalse(Tab.containsSalesforceId("IamCountedAsSFi"));
		assertFalse(Tab.containsSalesforceId("FieldsAndRelationships"));
		assertFalse(Tab.containsSalesforceId("ObjectManagerNew"));
		assertFalse(Tab.containsSalesforceId("/IamCountedAsSFi/"));
		assertFalse(Tab.containsSalesforceId("/FieldsAndRelationships/"));
		assertFalse(Tab.containsSalesforceId("/ObjectManagerNe/"));
	});

	await t.step("extractOrgName", () => {
		assert(true);
	});
});
