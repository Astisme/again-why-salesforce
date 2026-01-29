import { mockStorage } from "../mocks.ts";
import { assert, assertEquals, assertFalse } from "@std/testing/asserts";

import {
	bg_getCommandLinks,
	bg_getSalesforceLanguage,
	bg_getSettings,
	bg_getStorage,
	bg_setStorage,
} from "/background/background.js";
import {
	BROWSER,
	GENERIC_TAB_STYLE_KEY,
	LOCALE_KEY,
	NO_RELEASE_NOTES,
	ORG_TAB_STYLE_KEY,
	SETTINGS_KEY,
	TAB_ADD_FRONT,
	USER_LANGUAGE,
	WHY_KEY,
} from "/constants.js";
import { getStyleSettings } from "/functions.js";

const oldtabs = [
	{ label: "a", url: "m", org: "o" },
	{ label: "e", url: "t" },
	{ label: "n", url: "s", org: "l" },
	{ label: "i", url: "r" },
];
mockStorage[WHY_KEY] = oldtabs;
mockStorage[SETTINGS_KEY] = [
	{ enabled: "es", id: USER_LANGUAGE }, // needed for context menus
	{ enabled: true, id: NO_RELEASE_NOTES },
	{ enabled: false, id: TAB_ADD_FRONT },
];
mockStorage[ORG_TAB_STYLE_KEY] = [{
	id: "italic",
	forActive: true,
	value: "italic",
}]; // the other ones are inserted by background.js

await Deno.test("bg_getStorage behavior", async (t) => {
	await t.step("get default (all Tabs)", async () => {
		const tabs = await bg_getStorage();
		assert(tabs != null);
		assert(Array.isArray(tabs));
		assertEquals(tabs.length, 4);
		assertEquals(tabs[0].label, "a");
		assertEquals(tabs.at(-1).label, "i");
		const newtabs = await bg_getStorage(undefined, WHY_KEY);
		assertEquals(newtabs, tabs);
		bg_getStorage((calledtabs) => {
			assertEquals(calledtabs, tabs);
		}, WHY_KEY);
	});

	await t.step("get all settings", async () => {
		const settings = await bg_getStorage(undefined, SETTINGS_KEY);
		assert(settings != null);
		assert(Array.isArray(settings));
		assertEquals(settings.length, 3);
		assert(settings.find((s) => s.id === NO_RELEASE_NOTES).enabled);
		assertFalse(settings.find((s) => s.id === TAB_ADD_FRONT).enabled);
	});

	await t.step("get locale", async () => {
		const language = await bg_getStorage(undefined, LOCALE_KEY);
		assert(language != null);
		assert(typeof language === "string");
	});

	await t.step("get generic Tab style", async () => {
		const genrictabstyle = await bg_getStorage(
			undefined,
			GENERIC_TAB_STYLE_KEY,
		);
		assert(genrictabstyle == null);
	});

	await t.step("get org Tab style", async () => {
		const orgtabstyle = await bg_getStorage(undefined, ORG_TAB_STYLE_KEY);
		assert(orgtabstyle != null);
		assert(Array.isArray(orgtabstyle));
		assertEquals(orgtabstyle.length, 3);
	});
});

await Deno.test("bg_getSettings behavior", async (t) => {
	await t.step("get all settings", async () => {
		const settings = await bg_getSettings();
		assert(settings != null);
		assert(Array.isArray(settings));
		assertEquals(settings.length, 3);
		assert(settings.find((s) => s.id === NO_RELEASE_NOTES).enabled);
		assertFalse(settings.find((s) => s.id === TAB_ADD_FRONT).enabled);
		const newsettings = await bg_getSettings(undefined, SETTINGS_KEY);
		assertEquals(newsettings, settings);
		bg_getSettings(
			undefined,
			SETTINGS_KEY,
			(calledsettings) => assertEquals(calledsettings, settings),
		);
	});

	await t.step("get one specific setting", async () => {
		const no_release = await bg_getSettings(NO_RELEASE_NOTES);
		assert(no_release != null);
		assertFalse(Array.isArray(no_release));
		assert(no_release.enabled);
	});

	await t.step("get 2 specific settings", async () => {
		const relatedsettings = await bg_getSettings([
			NO_RELEASE_NOTES,
			TAB_ADD_FRONT,
		]);
		assert(relatedsettings != null);
		assert(Array.isArray(relatedsettings));
		assertEquals(relatedsettings.length, 2);
		assert(
			relatedsettings.find((s) => s.id === NO_RELEASE_NOTES).enabled,
		);
		assertFalse(
			relatedsettings.find((s) => s.id === TAB_ADD_FRONT).enabled,
		);
		assertEquals(
			relatedsettings.filter((s) =>
				s.id !== NO_RELEASE_NOTES && s.id !== TAB_ADD_FRONT
			).length,
			0,
		);
	});

	await t.step("get all org tab styles", async () => {
		const orgtabstyle = await bg_getSettings(undefined, ORG_TAB_STYLE_KEY);
		assert(orgtabstyle != null);
		assert(Array.isArray(orgtabstyle));
		assertEquals(orgtabstyle.length, 3);
	});

	await t.step("get specific org tab styles", async () => {
		const boldtabstyle = await bg_getSettings("bold", ORG_TAB_STYLE_KEY);
		assert(boldtabstyle != null);
		assert(Array.isArray(boldtabstyle));
		assertEquals(boldtabstyle.length, 2);
		const italictabstyle = await bg_getSettings(
			"italic",
			ORG_TAB_STYLE_KEY,
		);
		assert(italictabstyle != null);
		assert(Array.isArray(italictabstyle));
		assertEquals(italictabstyle.length, 1);
	});
});

await Deno.test("bg_setStorage behavior", async (t) => {
	await t.step("set with WHY_KEY", async () => {
		await bg_setStorage([{ label: "t", url: "n" }]);
		const tabs = await bg_getStorage();
		assert(tabs != null);
		assert(Array.isArray(tabs));
		assertEquals(tabs.length, 1);
		await bg_setStorage([oldtabs[0]], undefined, WHY_KEY);
		const newtabs = await bg_getStorage();
		assertEquals(newtabs, [oldtabs[0]]);
		bg_setStorage(oldtabs, (calledtabs) => {
			assertEquals(calledtabs, oldtabs);
		}, WHY_KEY);
	});

	await t.step("set with SETTINGS_KEY", async () => {
		await bg_setStorage(
			{ id: "new_setting", enabled: true },
			undefined,
			SETTINGS_KEY,
		);
		const newset = await bg_getSettings("new_setting");
		assert(newset != null);
		assertFalse(Array.isArray(newset));
		assert(newset.enabled);
	});

	await t.step("set with GENERIC_TAB_STYLE_KEY", async () => {
		const oldgenstyle = await getStyleSettings(GENERIC_TAB_STYLE_KEY);
		assert(oldgenstyle == null);
		await bg_setStorage(
			{ id: "underline", forActive: false, value: "underline" },
			undefined,
			GENERIC_TAB_STYLE_KEY,
		);
		const genstyle = await getStyleSettings(GENERIC_TAB_STYLE_KEY);
		assert(genstyle != null);
		assert(Array.isArray(genstyle));
		assertEquals(genstyle.length, 1);
		await bg_setStorage(
			[
				{ id: "underline", forActive: true, value: "underline" },
				{ id: "underline", forActive: false, value: "" }, // disables this object
			],
			undefined,
			GENERIC_TAB_STYLE_KEY,
		);
		const newgenstyle = await getStyleSettings(GENERIC_TAB_STYLE_KEY);
		assert(newgenstyle != null);
		assert(Array.isArray(newgenstyle));
		assertEquals(newgenstyle.length, 1);
		await bg_setStorage(
			{ id: "underline", forActive: false, value: "underline" },
			undefined,
			GENERIC_TAB_STYLE_KEY,
		); // reenable for non-active Tab
		const bothgenstyle = await getStyleSettings(GENERIC_TAB_STYLE_KEY);
		assert(bothgenstyle != null);
		assert(Array.isArray(bothgenstyle));
		assertEquals(bothgenstyle.length, 2);
	});

	await t.step("set with LOCALE_KEY", async () => {
		await bg_setStorage("en", undefined, LOCALE_KEY);
		const newlocale = await bg_getSettings(undefined, LOCALE_KEY);
		assert(newlocale != null);
		assert(typeof newlocale === "string");
		assertEquals(newlocale, "en");
	});
});

await Deno.test("bg_getSalesforceLanguage behavior", async () => {
	BROWSER.tabs.setMockBrowserTabs([{
		id: 0,
		url: "https://mycustomorg--sandbox.lightning.force.com",
		active: true,
		currentWindow: true,
	}]);
	BROWSER.cookies.setMockCookies([{
		domain: "mycustomorg--sandbox.my.salesforce.com",
		name: "sid",
		value: "bearer value", // only for tests
	}]);
	const sflang = await bg_getSalesforceLanguage();
	assert(sflang != null);
	assert(typeof sflang === "string");
	assertEquals(sflang, "sf-lang-en"); // only for tests, from Salesforce, we'll get the correct language
});

await Deno.test("bg_getCommandLinks behavior", async (t) => {
	BROWSER.commands.setMockCommands([
		{ shortcut: "a", name: "l" },
		{ shortcut: ".", name: "m" },
		{ shortcut: "z", name: "f" },
		{ shortcut: "i", name: "v" },
		{ shortcut: "", name: "t" },
	]);

	await t.step("get all commands", async () => {
		const allcommands = await bg_getCommandLinks();
		assert(allcommands != null);
		assert(Array.isArray(allcommands));
		assertEquals(allcommands.length, 4); // should remove the one with no shortuct
		bg_getCommandLinks(undefined, (calledcommands) => {
			assertEquals(calledcommands, allcommands);
		});
	});

	await t.step("get one command", async () => {
		const fcommands = await bg_getCommandLinks("f");
		assert(fcommands != null);
		assert(Array.isArray(fcommands));
		assertEquals(fcommands.length, 1);
		bg_getCommandLinks("f", (calledcommands) => {
			assertEquals(calledcommands, fcommands);
		});
	});

	await t.step("get 3 commands", async () => {
		const commandstoget = ["f", "l", "t"];
		const threecommands = await bg_getCommandLinks(commandstoget);
		assert(threecommands != null);
		assert(Array.isArray(threecommands));
		assertEquals(threecommands.length, 2); // should remove the one with no shortuct
		bg_getCommandLinks(commandstoget, (calledcommands) => {
			assertEquals(calledcommands, threecommands);
		});
	});

	await t.step("get no commands", async () => {
		BROWSER.commands.setMockCommands([]);
		const commandstoget = ["f", "l", "t"];
		const threecommands = await bg_getCommandLinks(commandstoget);
		assert(threecommands != null);
		assert(Array.isArray(threecommands));
		assertEquals(threecommands.length, 0); // there are no available commands
		bg_getCommandLinks(commandstoget, (calledcommands) => {
			assertEquals(calledcommands, threecommands);
		});
	});
});
