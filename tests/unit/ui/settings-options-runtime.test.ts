import { assertEquals, assertStrictEquals } from "@std/testing/asserts";

/**
 * Installs minimal browser globals required by modules that import constants.
 *
 * @return {() => void} Restores previous global descriptors.
 */
function installBrowserGlobals() {
	const keys = ["browser", "chrome", "document", "localStorage"] as const;
	const previousDescriptors = new Map<
		string,
		PropertyDescriptor | undefined
	>();
	for (const key of keys) {
		previousDescriptors.set(
			key,
			Object.getOwnPropertyDescriptor(globalThis, key),
		);
	}
	const browserMock = {
		i18n: {
			getMessage: (key: string) => key,
		},
		runtime: {
			getManifest: () => ({
				homepage_url: "https://github.com/againwhy/awsf",
				optional_host_permissions: [],
				version: "0.0.0-test",
			}),
		},
	};
	const createElementMock = (id = "") => ({
		id,
		addEventListener: () => {},
		append: () => {},
		appendChild: () => null,
		children: [],
		checked: false,
		classList: {
			add: () => {},
			contains: () => false,
			remove: () => {},
			toggle: () => false,
		},
		click: () => {},
		closest: () => null,
		dataset: {} as Record<string, string>,
		dispatchEvent: () => true,
		getAttribute: () => null,
		innerText: "",
		parentNode: null,
		querySelector: () => null,
		querySelectorAll: () => [],
		remove: () => {},
		setAttribute: () => {},
		style: {} as Record<string, string>,
		textContent: "",
		value: "",
	});
	const documentMock = {
		documentElement: createElementMock("html"),
		getElementById: (id: string) => createElementMock(id),
		querySelector: (_selector: string) => createElementMock("query"),
		querySelectorAll: (_selector: string) => [],
	};
	const localStorageMock = {
		getItem: (_key: string) => null,
		setItem: (_key: string, _value: string) => {},
	};
	for (const key of keys) {
		Object.defineProperty(globalThis, key, {
			value: key === "document"
				? documentMock
				: key === "localStorage"
				? localStorageMock
				: browserMock,
			configurable: true,
			writable: true,
		});
	}
	return () => {
		for (const [key, descriptor] of previousDescriptors.entries()) {
			if (descriptor == null) {
				delete (globalThis as Record<string, unknown>)[key];
				continue;
			}
			Object.defineProperty(globalThis, key, descriptor);
		}
	};
}

/**
 * Imports the options-runtime module.
 *
 * @return {Promise<typeof import("../../../src/settings/options-runtime.js")>} Runtime module.
 */
async function importOptionsRuntimeModule() {
	return await import("../../../src/settings/options-runtime.js");
}

/**
 * Imports the options entrypoint module.
 *
 * @return {Promise<typeof import("../../../src/settings/options.js")>} Entrypoint module.
 */
async function importOptionsEntrypointModule() {
	return await import("../../../src/settings/options.js");
}

Deno.test("options-runtime forwards runtime options to injected factories", async () => {
	const restoreBrowserGlobals = installBrowserGlobals();
	try {
		const { createOptionsRuntime, runOptionsRuntime } =
			await importOptionsRuntimeModule();
		const calls: Array<{
			overrides: Record<string, unknown>;
			runRestoreOnLoad: boolean;
		}> = [];
		const sentinel = { ok: true };

		const runtime = createOptionsRuntime({
			createOptionsModuleFn: (
				overrides?: Record<string, unknown>,
				options?: { runRestoreOnLoad?: boolean },
			) => {
				calls.push({
					overrides: overrides ?? {},
					runRestoreOnLoad: options?.runRestoreOnLoad === true,
				});
				return sentinel;
			},
		});

		assertStrictEquals(
			runtime.runOptionsRuntime({
				overrides: { key: "value" },
				runRestoreOnLoad: true,
			}),
			sentinel,
		);
		assertStrictEquals(
			runOptionsRuntime({
				createOptionsModuleFn: (
					overrides?: Record<string, unknown>,
					options?: { runRestoreOnLoad?: boolean },
				) => {
					calls.push({
						overrides: overrides ?? {},
						runRestoreOnLoad: options?.runRestoreOnLoad === true,
					});
					return sentinel;
				},
				overrides: { another: "value" },
				runRestoreOnLoad: false,
			}),
			sentinel,
		);
		assertEquals(calls, [{
			overrides: { key: "value" },
			runRestoreOnLoad: true,
		}, {
			overrides: { another: "value" },
			runRestoreOnLoad: false,
		}]);
	} finally {
		restoreBrowserGlobals();
	}
});

Deno.test("options-runtime can be created without an override factory", async () => {
	const restoreBrowserGlobals = installBrowserGlobals();
	try {
		const { createOptionsRuntime } = await importOptionsRuntimeModule();
		const runtime = createOptionsRuntime();
		assertEquals(typeof runtime.runOptionsRuntime, "function");
	} finally {
		restoreBrowserGlobals();
	}
});

Deno.test("options entrypoint bootstraps only when enabled", async () => {
	const restoreBrowserGlobals = installBrowserGlobals();
	const skipDescriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		"__AWSF_SKIP_OPTIONS_AUTO_BOOTSTRAP__",
	);
	Object.defineProperty(globalThis, "__AWSF_SKIP_OPTIONS_AUTO_BOOTSTRAP__", {
		value: true,
		configurable: true,
		writable: true,
	});
	try {
		const { bootstrapOptions } = await importOptionsEntrypointModule();
		let runs = 0;
		const skipResult = bootstrapOptions({
			skipAutoBootstrap: true,
			runOptionsRuntimeFn: () => {
				runs++;
				return { started: true };
			},
		});
		assertStrictEquals(skipResult, null);
		assertEquals(runs, 0);

		const runResult = bootstrapOptions({
			skipAutoBootstrap: false,
			runOptionsRuntimeFn: () => {
				runs++;
				return { started: true };
			},
		});
		assertEquals(runResult, { started: true });
		assertEquals(runs, 1);
	} finally {
		if (skipDescriptor == null) {
			delete (globalThis as Record<string, unknown>)
				.__AWSF_SKIP_OPTIONS_AUTO_BOOTSTRAP__;
		} else {
			Object.defineProperty(
				globalThis,
				"__AWSF_SKIP_OPTIONS_AUTO_BOOTSTRAP__",
				skipDescriptor,
			);
		}
		restoreBrowserGlobals();
	}
});
