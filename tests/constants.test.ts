import {
	assert,
	assertEquals,
	assertFalse,
	assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
	GENERIC_TAB_STYLE_KEY,
	getAllStyleSettings,
	getCssRule,
	getCssSelector,
	getSettings,
	getStyleSettings,
	LINK_NEW_BROWSER,
	ORG_TAB_STYLE_KEY,
	sendExtensionMessage,
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
		const result = await getAllStyleSettings();
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
		const result = await getAllStyleSettings();
		assertEquals(result, {
			"settings-tab_generic_style": [
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
			"settings-tab_org_style": undefined,
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
		const result = await getAllStyleSettings();
		assertEquals(result, {
			"settings-tab_generic_style": [
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
			"settings-tab_org_style": [
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
		});
	});
});

Deno.test("getCssSelector builds correct selector", () => {
	const extensionNameClass = ".again-why-salesforce";
	const sldsActiveClass = ".slds-is-active";
	const hasOrgTab = ":has(.is-org-tab)";
	assertEquals(
		getCssSelector(),
		`${extensionNameClass}:not(${sldsActiveClass}):not(${hasOrgTab})`,
	);
	assertEquals(
		getCssSelector(true),
		`${extensionNameClass}:not(${sldsActiveClass}):not(${hasOrgTab})`,
	);
	assertEquals(
		getCssSelector(true, true),
		`${extensionNameClass}:not(${sldsActiveClass}):not(${hasOrgTab})`,
	);
	assertEquals(
		getCssSelector(true, true, ""),
		`${extensionNameClass}:not(${sldsActiveClass}):not(${hasOrgTab})`,
	);
	assertEquals(
		getCssSelector(true, true, "::after"),
		`${extensionNameClass}:not(${sldsActiveClass}):not(${hasOrgTab})::after`,
	);
	assertEquals(
		getCssSelector(true, false, ""),
		`${extensionNameClass}:not(${sldsActiveClass})${hasOrgTab}`,
	);
	assertEquals(
		getCssSelector(true, false, "::before"),
		`${extensionNameClass}:not(${sldsActiveClass})${hasOrgTab}::before`,
	);
	assertEquals(
		getCssSelector(false, true, ""),
		`${extensionNameClass}${sldsActiveClass}:not(${hasOrgTab})`,
	);
	assertEquals(
		getCssSelector(false, true, "::after"),
		`${extensionNameClass}${sldsActiveClass}:not(${hasOrgTab})::after`,
	);
	assertEquals(
		getCssSelector(false, false, ""),
		`${extensionNameClass}${sldsActiveClass}${hasOrgTab}`,
	);
	assertEquals(
		getCssSelector(false, false, "::before"),
		`${extensionNameClass}${sldsActiveClass}${hasOrgTab}::before`,
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
