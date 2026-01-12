import {
	assert,
	assertEquals,
	assertFalse,
	assertRejects,
} from "@std/testing/asserts";

import {
	BROWSER,
	DO_NOT_REQUEST_FRAME_PERMISSION,
	EXTENSION_OPTIONAL_HOST_PERM,
	FRAME_PATTERNS,
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	LINK_NEW_BROWSER,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	SETTINGS_KEY,
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_BOLD,
	TAB_STYLE_BORDER,
	TAB_STYLE_COLOR,
	TAB_STYLE_HOVER,
	TAB_STYLE_ITALIC,
	TAB_STYLE_SHADOW,
	TAB_STYLE_TOP,
	TAB_STYLE_UNDERLINE,
	USE_LIGHTNING_NAVIGATION,
} from "/constants.js";
import {
	areFramePatternsAllowed,
	getCssRule,
	getCssSelector,
	getSettings,
	getStyleSettings,
	isExportAllowed,
	isOnSalesforceSetup,
	requestCookiesPermission,
	requestExportPermission,
	requestFramePatternsPermission,
	sendExtensionMessage,
} from "/functions.js";

Deno.test("sendExtensionMessage returns promise if no callback", async () => {
	const result = await sendExtensionMessage({ what: "echo", echo: "bar" });
	assertEquals(result, "bar");
});

Deno.test("sendExtensionMessage supports callback usage", () => {
	sendExtensionMessage({ what: "echo", echo: "bar" }, (response) => {
		assertEquals(response, "bar");
	});
});

Deno.test("sendExtensionMessage rejects on runtime error", async () => {
	const originalError = BROWSER.runtime.lastError;
	BROWSER.runtime.lastError = new Error("fail");
	await assertRejects(() =>
		sendExtensionMessage({ what: "eco", echo: "bar" })
	);
	BROWSER.runtime.lastError = originalError;
});

Deno.test("getSettings", async (t) => {
	await t.step(
		"getSettings equals sendExtensionMessage in specific case",
		async () => {
			const resultWithGetSettings = await getSettings();
			const resultWithSendExtensionMessage = await sendExtensionMessage({
				what: "get-settings",
			});
			assertEquals(resultWithGetSettings, resultWithSendExtensionMessage);
		},
	);

	// add some mock settings
	assert(
		await sendExtensionMessage({
			what: "set",
			key: SETTINGS_KEY,
			set: [
				{
					id: LINK_NEW_BROWSER,
					enabled: false,
				},
				{
					id: USE_LIGHTNING_NAVIGATION,
					enabled: true,
				},
			],
		}),
	);

	await t.step(
		"getSettings calls sendExtensionMessage with single keys",
		async () => {
			let result = await getSettings(LINK_NEW_BROWSER);
			assertFalse(result.enabled);
			result = await getSettings(USE_LIGHTNING_NAVIGATION);
			assert(result.enabled);
		},
	);

	await t.step(
		"getSettings calls sendExtensionMessage with multiple keys",
		async () => {
			const result = await getSettings([
				LINK_NEW_BROWSER,
				USE_LIGHTNING_NAVIGATION,
			]);
			assertEquals(2, result.length);
			assertFalse(result[0].enabled);
			assert(result[1].enabled);
		},
	);

	await t.step(
		"getSettings calls sendExtensionMessage with random keys",
		async () => {
			const result = await getSettings("random_key");
			assertEquals(undefined, result);
		},
	);
});

Deno.test("getSettings equals sendExtensionMessage in specific case", async () => {
	const resultWithGetSettings = await getSettings();
	const resultWithSendExtensionMessage = await sendExtensionMessage({
		what: "get-settings",
	});
	assertEquals(resultWithGetSettings, resultWithSendExtensionMessage);
});

Deno.test("getStyleSettings sends correct message", async (t) => {
	await t.step("getAllStyleSettings returns null if no styles", async () => {
		const result = await getStyleSettings();
		assertEquals(result, null);
	});

	await t.step(
		"getStyleSettings is the same as sendExtensionMessage for GENERIC_TAB_STYLE_KEY",
		async () => {
			let resultWithGetStyleSettings = await getStyleSettings(
				GENERIC_TAB_STYLE_KEY,
			);
			let resultWithSendExtensionMessage = await sendExtensionMessage({
				what: "get-style-settings",
				key: GENERIC_TAB_STYLE_KEY,
			});
			assertEquals(
				resultWithGetStyleSettings,
				resultWithSendExtensionMessage,
			);
			resultWithGetStyleSettings = await getStyleSettings(
				ORG_TAB_STYLE_KEY,
			);
			resultWithSendExtensionMessage = await sendExtensionMessage({
				what: "get-style-settings",
				key: ORG_TAB_STYLE_KEY,
			});
			assertEquals(
				resultWithGetStyleSettings,
				resultWithSendExtensionMessage,
			);
		},
	);

	// add some mock generic style settings
	assert(
		await sendExtensionMessage({
			what: "set",
			key: GENERIC_TAB_STYLE_KEY,
			set: [
				{
					id: TAB_STYLE_BORDER,
					forActive: false,
					value: "red",
				},
				{
					id: TAB_STYLE_ITALIC,
					forActive: true,
					value: "random",
				},
				{
					id: TAB_STYLE_BORDER,
					forActive: true,
					value: "#fff",
				},
			],
		}),
	);

	await t.step("getStyleSettings finds generic tabs", async () => {
		let result = await getStyleSettings(GENERIC_TAB_STYLE_KEY);
		assertEquals(3, result.length);
		assertEquals(result[0].value, "red");
		assertEquals(result[1].value, "random");
		assertEquals(result[2].value, "#fff");
		result = await getStyleSettings(ORG_TAB_STYLE_KEY);
		assertEquals(undefined, result);
	});

	await t.step("getAllStyleSettings returns generic styles", async () => {
		const result = await getStyleSettings();
		assertEquals(result, {
			[GENERIC_TAB_STYLE_KEY]: [
				{
					id: TAB_STYLE_BORDER,
					forActive: false,
					value: "red",
				},
				{
					id: TAB_STYLE_ITALIC,
					forActive: true,
					value: "random",
				},
				{
					id: TAB_STYLE_BORDER,
					forActive: true,
					value: "#fff",
				},
			],
			[GENERIC_PINNED_TAB_STYLE_KEY]: undefined,
			[ORG_TAB_STYLE_KEY]: undefined,
			[ORG_PINNED_TAB_STYLE_KEY]: undefined,
		});
	});

	// add some mock org style settings
	assert(
		await sendExtensionMessage({
			what: "set",
			key: ORG_TAB_STYLE_KEY,
			set: [
				{
					id: TAB_STYLE_BORDER,
					forActive: false,
					value: "red",
				},
				{
					id: TAB_STYLE_ITALIC,
					forActive: true,
					value: "random",
				},
				{
					id: TAB_STYLE_BORDER,
					forActive: true,
					value: "#fff",
				},
			],
		}),
	);

	await t.step("getSettings finds org tabs", async () => {
		const result = await getStyleSettings(ORG_TAB_STYLE_KEY);
		assertEquals(3, result.length);
		assertEquals(result[0].value, "red");
		assertEquals(result[1].value, "random");
		assertEquals(result[2].value, "#fff");
	});

	await t.step("getAllStyleSettings returns all styles", async () => {
		const result = await getStyleSettings();
		assertEquals(result, {
			[GENERIC_TAB_STYLE_KEY]: [
				{
					id: TAB_STYLE_BORDER,
					forActive: false,
					value: "red",
				},
				{
					id: TAB_STYLE_ITALIC,
					forActive: true,
					value: "random",
				},
				{
					id: TAB_STYLE_BORDER,
					forActive: true,
					value: "#fff",
				},
			],
			[GENERIC_PINNED_TAB_STYLE_KEY]: undefined,
			[ORG_TAB_STYLE_KEY]: [
				{
					id: TAB_STYLE_BORDER,
					forActive: false,
					value: "red",
				},
				{
					id: TAB_STYLE_ITALIC,
					forActive: true,
					value: "random",
				},
				{
					id: TAB_STYLE_BORDER,
					forActive: true,
					value: "#fff",
				},
			],
			[ORG_PINNED_TAB_STYLE_KEY]: undefined,
		});
	});
});

Deno.test("getCssSelector builds correct selector", () => {
	const extensionNameClass = ".again-why-salesforce";
	const isActive = ".slds-is-active";
	const hasOrgTab = ":has(.is-org-tab)";
	const isPinTab = ":has(.is-pin-tab)";
	const notActive = `:not(${isActive})`;
	const notOrg = `:not(${hasOrgTab})`;
	const notPin = `:not(${isPinTab})`;
	// test defaults
	assertEquals(
		getCssSelector(),
		`${extensionNameClass}${notActive}${notOrg}${notPin}`,
	);
	// test all unpinned
	assertEquals(
		getCssSelector({
			isInactive: true,
			isGeneric: true,
			pseudoElement: "::after",
			isPinned: false,
		}),
		`${extensionNameClass}${notActive}${notOrg}${notPin}::after`,
	);
	assertEquals(
		getCssSelector({
			isInactive: true,
			isGeneric: false,
			pseudoElement: "",
			isPinned: false,
		}),
		`${extensionNameClass}${notActive}${hasOrgTab}${notPin}`,
	);
	assertEquals(
		getCssSelector({
			isInactive: true,
			isGeneric: false,
			pseudoElement: "::before",
			isPinned: false,
		}),
		`${extensionNameClass}${notActive}${hasOrgTab}${notPin}::before`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: true,
			pseudoElement: "",
			isPinned: false,
		}),
		`${extensionNameClass}${isActive}${notOrg}${notPin}`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: true,
			pseudoElement: "::after",
			isPinned: false,
		}),
		`${extensionNameClass}${isActive}${notOrg}${notPin}::after`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: false,
			pseudoElement: "",
			isPinned: false,
		}),
		`${extensionNameClass}${isActive}${hasOrgTab}${notPin}`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: false,
			pseudoElement: "::before",
			isPinned: false,
		}),
		`${extensionNameClass}${isActive}${hasOrgTab}${notPin}::before`,
	);
	// test all pinned
	assertEquals(
		getCssSelector({
			isInactive: true,
			isGeneric: true,
			pseudoElement: "::after",
			isPinned: true,
		}),
		`${extensionNameClass}${notActive}${notOrg}${isPinTab}::after`,
	);
	assertEquals(
		getCssSelector({
			isInactive: true,
			isGeneric: false,
			pseudoElement: "",
			isPinned: true,
		}),
		`${extensionNameClass}${notActive}${hasOrgTab}${isPinTab}`,
	);
	assertEquals(
		getCssSelector({
			isInactive: true,
			isGeneric: false,
			pseudoElement: "::before",
			isPinned: true,
		}),
		`${extensionNameClass}${notActive}${hasOrgTab}${isPinTab}::before`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: true,
			pseudoElement: "",
			isPinned: true,
		}),
		`${extensionNameClass}${isActive}${notOrg}${isPinTab}`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: true,
			pseudoElement: "::after",
			isPinned: true,
		}),
		`${extensionNameClass}${isActive}${notOrg}${isPinTab}::after`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: false,
			pseudoElement: "",
			isPinned: true,
		}),
		`${extensionNameClass}${isActive}${hasOrgTab}${isPinTab}`,
	);
	assertEquals(
		getCssSelector({
			isInactive: false,
			isGeneric: false,
			pseudoElement: "::before",
			isPinned: true,
		}),
		`${extensionNameClass}${isActive}${hasOrgTab}${isPinTab}::before`,
	);
});

Deno.test("getCssRule generates correct CSS rules", async (t) => {
	await t.step("test happy path when inputs are correct", () => {
		assertEquals(
			getCssRule(TAB_STYLE_BACKGROUND, "#fff"),
			"background-color: #fff !important;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_HOVER, "#aff"),
			"background-color: #aff !important;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_TOP, "#faf"),
			"background-color: #faf !important;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_COLOR, "#000"),
			"color: #000;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_BORDER, "red"),
			"border: 2px solid red;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_SHADOW, "#f1f1f1"),
			"text-shadow: 0px 0px 3px #f1f1f1;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_BOLD),
			"font-weight: bold;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_ITALIC),
			"font-style: italic;",
		);
		assertEquals(
			getCssRule(TAB_STYLE_UNDERLINE),
			"text-decoration: underline;",
		);
		assertEquals(
			getCssRule("user-set"),
			"",
		);
		assertEquals(
			getCssRule(),
			"",
		);
	});
});

Deno.test("requestPermissions", async (t) => {
	await t.step("request export permissions", async () => {
		const exportPermObj = {
			permissions: ["downloads"],
		};
		assertFalse(await BROWSER.permissions.contains(exportPermObj));
		assertFalse(isExportAllowed());
		assert(await requestExportPermission());
		assert(await BROWSER.permissions.contains(exportPermObj));
		assert(isExportAllowed());
	});
	await t.step("request frame patterns permissions", async () => {
		const framePatternsPermObj = {
			origins: FRAME_PATTERNS,
		};
		assertFalse(await BROWSER.permissions.contains(framePatternsPermObj));
		globalThis.location = {
			href: "http://localhost",
		};
		assertFalse(await areFramePatternsAllowed());
		localStorage.setItem(DO_NOT_REQUEST_FRAME_PERMISSION, "true");
		assert(await areFramePatternsAllowed());
		localStorage.setItem(DO_NOT_REQUEST_FRAME_PERMISSION, "false");
		assertFalse(await areFramePatternsAllowed());
		assert(await requestFramePatternsPermission());
		assert(await BROWSER.permissions.contains(framePatternsPermObj));
		assert(await areFramePatternsAllowed());
	});
	await t.step("request cookies permissions", async () => {
		const cookiesPermObj = {
			permissions: ["cookies"],
			origins: EXTENSION_OPTIONAL_HOST_PERM,
		};
		assertFalse(await BROWSER.permissions.contains(cookiesPermObj));
		assert(await requestCookiesPermission());
		assert(await BROWSER.permissions.contains(cookiesPermObj));
	});
});

Deno.test("checks for extensionsion functionality", async (t) => {
	await t.step("is on salesforce setup", async () => {
		const isonSFsetup = await isOnSalesforceSetup();
		assert(isonSFsetup.ison);
		assert(isonSFsetup.url != null);
	});
});
