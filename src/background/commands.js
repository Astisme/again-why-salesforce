"use strict";
import { BROWSER } from "../core/constants.js";

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
