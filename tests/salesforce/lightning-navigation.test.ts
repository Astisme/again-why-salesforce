import {
	assertEquals,
	assertExists,
	assertStrictEquals,
} from "@std/testing/asserts";
import { loadIsolatedModule } from "../load-isolated-module.ts";

type LightningNavigationDependencies = {
	$A: {
		get: (name: string) => {
			fire: () => void;
			setParams: (params: Record<string, string>) => void;
		};
	};
	addEventListener: (
		type: string,
		listener: (event: {
			data: Record<string, string>;
			source: object;
		}) => void,
	) => void;
	console: {
		error: (message: string) => void;
	};
	open: (url: string, target: string) => void;
};

type LightningNavigationListener = (event: {
	data: Record<string, string>;
	source: object;
}) => void;

/**
 * Loads the Salesforce lightning navigation script and captures its message listener.
 *
 * @return {Promise<{ cleanup: () => void; errors: string[]; listener: ((event: { data: Record<string, string>; source: object; }) => void) | null; opens: { target: string; url: string; }[]; records: { eventName: string; params: Record<string, string>[]; }[]; }>} Captured listener state.
 */
async function loadLightningNavigation() {
	const errors: string[] = [];
	const opens: { target: string; url: string }[] = [];
	const records: { eventName: string; params: Record<string, string>[] }[] =
		[];
	let listener:
		| ((event: {
			data: Record<string, string>;
			source: object;
		}) => void)
		| null = null;

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		LightningNavigationDependencies
	>({
		modulePath: new URL(
			"../../src/salesforce/lightning-navigation.js",
			import.meta.url,
		),
		dependencies: {
			$A: {
				get: (eventName) => {
					const record = {
						eventName,
						params: [] as Record<string, string>[],
					};
					records.push(record);
					return {
						fire: () => {},
						setParams: (params) => {
							record.params.push(params);
						},
					};
				},
			},
			addEventListener: (_type, registeredListener) => {
				listener = registeredListener;
			},
			console: {
				error: (message) => {
					errors.push(message);
				},
			},
			open: (url, target) => {
				opens.push({ target, url });
			},
		},
	});

	return { cleanup, errors, listener, opens, records };
}

Deno.test("lightning-navigation handles record and URL navigation messages", async () => {
	const { cleanup, listener, records } = await loadLightningNavigation();
	const registeredListener = listener as LightningNavigationListener | null;

	try {
		assertStrictEquals(typeof registeredListener, "function");
		assertExists(registeredListener);
		registeredListener({
			data: {
				navigationType: "recordId",
				recordId: "001ABC",
				what: "lightningNavigation",
			},
			source: globalThis,
		});
		registeredListener({
			data: {
				navigationType: "url",
				url: "/lightning/setup/ObjectManager/home",
				what: "lightningNavigation",
			},
			source: globalThis,
		});

		assertEquals(records, [
			{
				eventName: "e.force:navigateToSObject",
				params: [{ recordId: "001ABC" }],
			},
			{
				eventName: "e.force:navigateToURL",
				params: [{ url: "/lightning/setup/ObjectManager/home" }],
			},
		]);
	} finally {
		cleanup();
	}
});

Deno.test("lightning-navigation ignores foreign sources and reports invalid types", async () => {
	const { cleanup, errors, listener, records } =
		await loadLightningNavigation();
	const registeredListener = listener as LightningNavigationListener | null;

	try {
		assertExists(registeredListener);
		registeredListener({
			data: {
				navigationType: "recordId",
				recordId: "001ABC",
				what: "not-lightningNavigation",
			},
			source: globalThis,
		});
		registeredListener({
			data: {
				navigationType: "recordId",
				recordId: "001ABC",
				what: "lightningNavigation",
			},
			source: {},
		});
		registeredListener({
			data: {
				navigationType: "invalid",
				what: "lightningNavigation",
			},
			source: globalThis,
		});

		assertEquals(records, []);
		assertEquals(errors, ["Invalid navigation type"]);
	} finally {
		cleanup();
	}
});

Deno.test("lightning-navigation falls back to open when the Salesforce event API throws", async () => {
	const errors: string[] = [];
	const opens: { target: string; url: string }[] = [];
	let listener: LightningNavigationListener | null = null;

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		LightningNavigationDependencies
	>({
		modulePath: new URL(
			"../../src/salesforce/lightning-navigation.js",
			import.meta.url,
		),
		dependencies: {
			$A: {
				get: () => {
					throw new Error("boom");
				},
			},
			addEventListener: (_type, registeredListener) => {
				listener = registeredListener;
			},
			console: {
				error: (message) => {
					errors.push(message);
				},
			},
			open: (url, target) => {
				opens.push({ target, url });
			},
		},
	});

	try {
		const registeredListener = listener as
			| LightningNavigationListener
			| null;
		assertExists(registeredListener);
		registeredListener({
			data: {
				fallbackURL: "https://example.com/fallback",
				navigationType: "url",
				url: "/broken",
				what: "lightningNavigation",
			},
			source: globalThis,
		});

		assertEquals(opens, [{
			target: "_top",
			url: "https://example.com/fallback",
		}]);
		assertEquals(errors, ["Navigation failed: boom"]);
	} finally {
		cleanup();
	}
});
