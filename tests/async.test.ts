type WaitForOptions = {
	intervalMs?: number;
	timeoutMs?: number;
};

/**
 * Pauses execution for the requested number of milliseconds.
 *
 * @param {number} delayMs Time to wait before resolving.
 * @return {Promise<void>} Promise resolved after the timer fires.
 */
function sleep(delayMs: number) {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, delayMs);
	});
}

/**
 * Waits until the next task so pending microtasks can complete first.
 *
 * @return {Promise<void>} Promise resolved on the next timer tick.
 */
export function waitForNextTask() {
	return sleep(0);
}

/**
 * Polls until the predicate returns `true` or the timeout is reached.
 *
 * @param {() => boolean} predicate Function checked until it succeeds.
 * @param {WaitForOptions} [options={}] Polling configuration.
 * @return {Promise<void>} Promise resolved when the predicate succeeds.
 * @throws {Error} Throws when the timeout is reached first.
 */
export async function waitForCondition(
	predicate: () => boolean,
	{ intervalMs = 10, timeoutMs = 1000 }: WaitForOptions = {},
) {
	const startedAt = Date.now();
	while (!predicate()) {
		if (Date.now() - startedAt >= timeoutMs) {
			throw new Error("error_wait_timeout");
		}
		await sleep(intervalMs);
	}
}
