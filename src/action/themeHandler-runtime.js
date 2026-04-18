let htmlRuntime = null;
let localStorageRuntime;
let matchMediaRuntime;
let sendExtensionMessageRuntime;
let whatThemeRuntime;
let systemColorListener = null;

/**
 * Updates DOM/storage state and emits the theme message.
 *
 * @param {string} theme Theme value.
 * @param {boolean} [updateUserTheme=false] Whether to persist explicit user theme.
 * @return {Promise<unknown> | unknown} Message dispatch result.
 */
function messageAndUpdateTheme(theme, updateUserTheme = false) {
	if (htmlRuntime == null) {
		return;
	}
	htmlRuntime.dataset.theme = theme;
	localStorageRuntime.setItem("usingTheme", theme);
	if (updateUserTheme) {
		htmlRuntime.dataset.usertheme = theme;
		localStorageRuntime.setItem("userTheme", theme);
	}
	return sendExtensionMessageRuntime({ what: whatThemeRuntime, theme });
}

/**
 * Handles system color-scheme updates.
 *
 * @param {{ matches: boolean }} event Change event.
 * @return {Promise<unknown> | unknown | void} Theme update result when a change is required.
 */
function handleSystemColorSchemeChange(event) {
	if (htmlRuntime == null) {
		return;
	}
	const systemThemeValue = event.matches ? "dark" : "light";
	const htmlThemeValue = htmlRuntime.dataset.theme;
	if (systemThemeValue !== htmlThemeValue) {
		return messageAndUpdateTheme(systemThemeValue);
	}
}

/**
 * Enables or disables the system color listener.
 *
 * @param {boolean | null} [enable=true] Enable flag.
 * @return {Promise<void> | void} Listener update result.
 */
function systemColorSchemeListener(enable = true) {
	if (
		htmlRuntime == null ||
		matchMediaRuntime == null ||
		(enable && systemColorListener != null) ||
		(!enable && systemColorListener == null)
	) {
		return;
	}
	localStorageRuntime.setItem("userTheme", "system");
	if (enable) {
		systemColorListener = matchMediaRuntime("(prefers-color-scheme: dark)");
		systemColorListener.addEventListener(
			"change",
			handleSystemColorSchemeChange,
		);
		return handleSystemColorSchemeChange(systemColorListener);
	}
	systemColorListener.removeEventListener(
		"change",
		handleSystemColorSchemeChange,
	);
	systemColorListener = null;
}

/**
 * Toggles between light and dark user themes.
 *
 * @return {Promise<unknown> | unknown} Theme update result.
 */
function handleSwitchColorTheme() {
	if (htmlRuntime == null) {
		return;
	}
	const newTheme = htmlRuntime.dataset.theme === "light" ? "dark" : "light";
	return messageAndUpdateTheme(newTheme, true);
}

/**
 * Initializes theme state from storage and system preferences.
 *
 * @return {Promise<void> | void} Initialization result.
 */
function initTheme() {
	if (htmlRuntime == null) {
		return;
	}
	htmlRuntime.dataset.usertheme = localStorageRuntime.getItem("userTheme") ??
		"system";
	htmlRuntime.dataset.theme = htmlRuntime.dataset.usertheme === "system"
		? null
		: htmlRuntime.dataset.usertheme;
	return systemColorSchemeListener(
		htmlRuntime.dataset.usertheme === "system",
	);
}

/**
 * Creates a theme-handler runtime with explicit dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ documentElement: { dataset: Record<string, string | null> } }} options.documentRef Document-like host.
 * @param {{ getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; }} options.localStorageRef Storage implementation.
 * @param {((query: string) => { matches: boolean; addEventListener: (type: "change", listener: (event: { matches: boolean }) => void | Promise<void>) => void; removeEventListener: (type: "change", listener: (event: { matches: boolean }) => void | Promise<void>) => void; }) | undefined} options.matchMediaFn Match-media factory.
 * @param {(message: { what: string; theme: string }) => Promise<unknown> | unknown} options.sendExtensionMessageFn Runtime message sender.
 * @param {string} options.whatTheme Message type used for theme updates.
 * @return {{ handleSwitchColorTheme: () => Promise<unknown> | unknown; initTheme: () => Promise<void> | void; systemColorSchemeListener: (enable?: boolean | null) => Promise<void> | void; }} Theme runtime API.
 */
export function createThemeHandlerRuntime({
	documentRef,
	localStorageRef,
	matchMediaFn,
	sendExtensionMessageFn,
	whatTheme,
}) {
	htmlRuntime = documentRef?.documentElement ?? null;
	localStorageRuntime = localStorageRef;
	matchMediaRuntime = matchMediaFn;
	sendExtensionMessageRuntime = sendExtensionMessageFn;
	whatThemeRuntime = whatTheme;
	systemColorListener = null;
	return {
		handleSwitchColorTheme,
		initTheme,
		systemColorSchemeListener,
	};
}
