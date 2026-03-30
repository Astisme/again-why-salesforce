"use strict";

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
	browserApi,
	commands = null,
	callback = null,
) {
	const allCommands = await browserApi.commands.getAll();
	const availableCommands = allCommands.filter((singleCommand) =>
		singleCommand.shortcut !== ""
	);
	if (commands == null) {
		if (callback == null) {
			return availableCommands;
		}
		callback(availableCommands);
		return;
	}
	if (!Array.isArray(commands)) {
		commands = [commands];
	}
	const requestedCommands = availableCommands.filter((ac) =>
		commands.includes(ac.name)
	);
	if (callback == null) {
		return requestedCommands;
	}
	callback(requestedCommands);
}
