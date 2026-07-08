/**
 * Throws when a browser build exits unsuccessfully.
 *
 * @param options Build result values.
 * @param options.browser Browser name.
 * @param options.code Process exit code.
 * @return void
 */
export function assertBuildSucceeded(
	{ browser, code }: { browser: string; code: number },
): void {
	if (code !== 0) {
		throw new Error(`${browser} build failed with exit code ${code}`);
	}
}
