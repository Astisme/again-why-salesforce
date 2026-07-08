"use strict";
import {
	ALL_CMD_KEYS,
	BROWSER,
	CMD_AND_CXM_MAP_TO_WHAT,
	CMD_EXPORT_ALL,
	CMD_OPEN_SETTINGS,
	SETUP_LIGHTNING_PATTERN,
	TOAST_WARNING,
} from "../core/constants.js";
import { openSettingsPage } from "../core/functions.js";
import Tab from "../core/tab.js";
import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkLaunchExport,
} from "./utils.js";

/**
 * Retrieves all or specified command shortcuts available in the browser extension.
 * Filters commands to those that have assigned shortcuts.
 * Supports optional callback or returns a Promise.
 *
 * @param {Object} browserApi - Browser API reference.
 * @param {string|string[]|null} [commands=null] - One or more command names to filter. If null, returns all commands with shortcuts.
 * @param {Function|null} [callback=null] - Optional callback to receive the commands.
 * @return {Promise<Array<Object>>|void} Promise resolving to command objects or void if callback is provided.
 */
export async function bg_getCommandLinks(
	commands = null,
	callback = null,
) {
	const allCommands = await BROWSER.commands.getAll();
	const availableCommands = allCommands.filter((singleCommand) =>
		singleCommand.shortcut !== ""
	);
	if (commands == null) {
		callback?.(availableCommands);
		return availableCommands;
	}
	if (!Array.isArray(commands)) {
		commands = [commands];
	}
	const commandSet = new Set(commands);
	const requestedCommands = availableCommands.filter((ac) =>
		commandSet.has(ac.name)
	);
	callback?.(requestedCommands);
	return requestedCommands;
}

/**
 * Listens for extension command events and executes appropriate actions
 * based on the current Salesforce Setup page context and command received.
 */
export function listenToExtensionCommands() {
	BROWSER.commands.onCommand.addListener(async (command) => {
		// check the current page is Salesforce Setup
		const browserTabUrl = (await bg_getCurrentBrowserTab())?.url;
		if (!browserTabUrl?.match(SETUP_LIGHTNING_PATTERN)) { // we're not in Salesforce Setup
			return;
		}
		const message = {
			what: CMD_AND_CXM_MAP_TO_WHAT[command] ?? command,
			url: Tab.minifyURL(browserTabUrl),
			org: Tab.extractOrgName(browserTabUrl),
		};
		switch (command) {
			case CMD_OPEN_SETTINGS:
				openSettingsPage();
				return;
			case CMD_EXPORT_ALL:
				if (!checkLaunchExport(undefined, true)) {
					return;
				}
				break;
			default:
				if (!ALL_CMD_KEYS.has(command)) {
					message.what = TOAST_WARNING;
					message.message = `Received unknown command: ${command}`;
				}
				break;
		}
		bg_notify(message);
	});
}
