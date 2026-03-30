import { mockStorage } from "../../mocks.test.ts";
import { assert, assertEquals, assertFalse } from "@std/testing/asserts";
import { waitForCondition } from "../../async.test.ts";

import {
	bg_getCommandLinks,
	bg_getSalesforceLanguage,
	bg_getSettings,
	bg_getStorage,
	bg_setStorage,
} from "/background/background.js";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CXM_MANAGE_TABS,
	GENERIC_TAB_STYLE_KEY,
	LOCALE_KEY,
	NO_RELEASE_NOTES,
	ORG_TAB_STYLE_KEY,
	PERM_CHECK,
	SETTINGS_KEY,
	TAB_ADD_FRONT,
	TOAST_ERROR,
	TOAST_WARNING,
	USER_LANGUAGE,
	WHAT_EXPORT,
	WHAT_EXPORT_CHECK,
	WHAT_GET,
	WHAT_GET_BROWSER_TAB,
	WHAT_GET_COMMANDS,
	WHAT_GET_SETTINGS,
	WHAT_GET_SF_LANG,
	WHAT_GET_STYLE_SETTINGS,
	WHAT_SAVED,
	WHAT_SET,
	WHAT_SHOW_EXPORT_MODAL,
	WHAT_SHOW_IMPORT,
	WHAT_START_TUTORIAL,
	WHAT_THEME,
	WHY_KEY,
} from "/core/constants.js";
import { getStyleSettings } from "/core/functions.js";

type EnabledSetting = {
	id: string;
	enabled: boolean | string;
};

type CommandLink = {
	name: string;
	shortcut: string;
};

/**
 * Narrows a retrieved setting to the shape used by these tests.
 *
 * @param setting Retrieved setting value.
 * @return {asserts setting is EnabledSetting}
 */
function assertIsEnabledSetting(
	setting: unknown,
): asserts setting is EnabledSetting {
	assert(setting != null);
	assert(!Array.isArray(setting));
	assert(typeof setting === "object");
	assert("enabled" in setting);
}

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
		bg_getStorage((calledtabs: unknown) => {
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
			(calledsettings: unknown) => assertEquals(calledsettings, settings),
		);
	});

	await t.step("get one specific setting", async () => {
		const no_release = await bg_getSettings(NO_RELEASE_NOTES);
		assertIsEnabledSetting(no_release);
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
		bg_setStorage(oldtabs, (calledtabs: unknown) => {
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
		assertIsEnabledSetting(newset);
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

await Deno.test("bg_getSalesforceLanguage ignores lookalike non-Salesforce hosts", async () => {
	mockStorage[LOCALE_KEY] = "fallback-locale";
	BROWSER.tabs.setMockBrowserTabs([{
		id: 0,
		url: "https://mycustomorg.lightning.force.com.attacker.test",
		active: true,
		currentWindow: true,
	}]);
	BROWSER.cookies.setMockCookies([{
		domain: "mycustomorg.my.salesforce.com.attacker.test",
		name: "sid",
		value: "bearer value",
	}]);
	const sflang = await bg_getSalesforceLanguage();
	assertEquals(sflang, "fallback-locale");
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
		bg_getCommandLinks(undefined, (calledcommands: unknown) => {
			assertEquals(calledcommands, allcommands);
		});
	});

	await t.step("get one command", async () => {
		const fcommands = await bg_getCommandLinks("f");
		assert(fcommands != null);
		assert(Array.isArray(fcommands));
		assertEquals(fcommands.length, 1);
		bg_getCommandLinks("f", (calledcommands: unknown) => {
			assertEquals(calledcommands, fcommands);
		});
	});

	await t.step("get 3 commands", async () => {
		const commandstoget = ["f", "l", "t"];
		const threecommands = await bg_getCommandLinks(commandstoget);
		assert(threecommands != null);
		assert(Array.isArray(threecommands));
		assertEquals(threecommands.length, 2); // should remove the one with no shortuct
		bg_getCommandLinks(commandstoget, (calledcommands: unknown) => {
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
		bg_getCommandLinks(commandstoget, (calledcommands: unknown) => {
			assertEquals(calledcommands, threecommands);
		});
	});
});

await Deno.test("background listeners handle runtime, command, and browser events", async () => {
	const originalSetTimeout = globalThis.setTimeout;
	const originalSendMessage = BROWSER.tabs.sendMessage;
	const originalContains = BROWSER.permissions.contains;
	const sentMessages: unknown[] = [];

	globalThis.setTimeout = ((handler: TimerHandler) => {
		if (typeof handler === "function") {
			handler();
		}
		return 1;
	}) as typeof setTimeout;
	BROWSER.tabs.sendMessage = (_tabId: number, message: unknown) => {
		sentMessages.push(message);
		return Promise.resolve(true);
	};
	BROWSER.permissions.contains = () => Promise.resolve(true);
	BROWSER.tabs.setMockBrowserTabs([{
		id: 1,
		url: "https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
		active: true,
		currentWindow: true,
	}]);
	mockStorage[NO_RELEASE_NOTES] = undefined;
	mockStorage[SETTINGS_KEY] = [
		{ enabled: "fr", id: USER_LANGUAGE },
		{ enabled: false, id: NO_RELEASE_NOTES },
		{ enabled: false, id: TAB_ADD_FRONT },
	];

	try {
		let savedResponse: unknown;
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_SAVED, echo: "saved" },
			"",
			(response) => {
				savedResponse = response;
			},
		);
		assertEquals(savedResponse, null);

		let permissionResponse: unknown;
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: PERM_CHECK, contains: { permissions: ["tabs"] } },
			"",
			(response) => {
				permissionResponse = response;
			},
		);
		await waitForCondition(() => permissionResponse != null);
		assertEquals(permissionResponse, true);

		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_GET, key: WHY_KEY },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_SET, key: WHY_KEY, set: [{ label: "A", url: "B" }] },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_GET_SETTINGS, keys: USER_LANGUAGE },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_GET_STYLE_SETTINGS, key: ORG_TAB_STYLE_KEY },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_GET_COMMANDS, commands: [] },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_GET_BROWSER_TAB },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_GET_SF_LANG },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_EXPORT_CHECK },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: WHAT_EXPORT, tabs: [{ label: "x", url: "y" }] },
			"",
			() => {},
		);
		for (
			const what of [
				WHAT_SHOW_IMPORT,
				WHAT_THEME,
				TOAST_ERROR,
				TOAST_WARNING,
				WHAT_SHOW_EXPORT_MODAL,
				CXM_MANAGE_TABS,
				WHAT_START_TUTORIAL,
			]
		) {
			BROWSER.runtime.onMessage.triggerMessage({ what }, "", () => {});
		}
		BROWSER.runtime.onMessage.triggerMessage(
			{ what: "unknown" },
			"",
			() => {},
		);
		BROWSER.runtime.onMessage.triggerMessage({}, "", () => {});

		BROWSER.commands.onCommand.triggerCommand(CMD_EXPORT_ALL);
		BROWSER.commands.onCommand.triggerCommand("unknown-command");
		await waitForCondition(() => sentMessages.length > 0);
		assert(sentMessages.length > 0);

		BROWSER.runtime.onStartup.triggerStartup();
		const sentMessagesBeforeActivation = sentMessages.length;
		BROWSER.tabs.onActivated.triggerActivated({ tabId: 1, windowId: 1 });
		await waitForCondition(
			() => sentMessages.length > sentMessagesBeforeActivation,
		);
		BROWSER.tabs.onUpdated.triggerUpdated(
			1,
			{ status: "complete" },
			{
				id: 1,
				url: "https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
				active: true,
				currentWindow: true,
			},
		);
		BROWSER.windows.onFocusChanged.triggerFocusChanged(1);
		BROWSER.commands.onChanged.triggerChanged();
		assert(sentMessages.length > 0);
	} finally {
		globalThis.setTimeout = originalSetTimeout;
		BROWSER.tabs.sendMessage = originalSendMessage;
		BROWSER.permissions.contains = originalContains;
	}
});

await Deno.test("background skips update checks on tab activation for development installs", async () => {
	const originalSetTimeout = globalThis.setTimeout;
	const originalFetch = globalThis.fetch;
	const originalSendMessage = BROWSER.tabs.sendMessage;
	const browserWithManagement = BROWSER as typeof BROWSER & {
		management?: {
			getSelf: () => Promise<{ installType: string }>;
		};
	};
	const originalManagement = browserWithManagement.management;
	let fetchCalls = 0;
	const sentMessages: unknown[] = [];

	globalThis.setTimeout = ((handler: TimerHandler) => {
		if (typeof handler === "function") {
			handler();
		}
		return 1;
	}) as typeof setTimeout;
	globalThis.fetch = (() => {
		fetchCalls++;
		return Promise.reject(new Error("fetch should not be called"));
	}) as typeof fetch;
	BROWSER.tabs.sendMessage = (_tabId: number, message: unknown) => {
		sentMessages.push(message);
		return Promise.resolve(true);
	};
	browserWithManagement.management = {
		getSelf: () => Promise.resolve({ installType: "development" }),
	};
	BROWSER.tabs.setMockBrowserTabs([{
		id: 1,
		url: "https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
		active: true,
		currentWindow: true,
	}]);

	try {
		BROWSER.tabs.onActivated.triggerActivated({ tabId: 1, windowId: 1 });
		await waitForCondition(() => sentMessages.length > 0);
		assertEquals(fetchCalls, 0);
	} finally {
		globalThis.setTimeout = originalSetTimeout;
		globalThis.fetch = originalFetch;
		BROWSER.tabs.sendMessage = originalSendMessage;
		browserWithManagement.management = originalManagement;
	}
});
