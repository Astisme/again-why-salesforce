import {
	assertEquals,
	assertExists,
	assertStrictEquals,
} from "@std/testing/asserts";
import { createLightningNavigationModule } from "../../../src/salesforce/lightning-navigation-runtime.js";

type LightningNavigationListener = (event: {
	data: Record<string, string>;
	source: object;
}) => void;

/**
 * Creates a runtime fixture and captures the registered message listener.
 *
 * @param {Object} [options={}] Fixture options.
 * @param {boolean} [options.throwOnGet=false] Whether Aura API `get` should throw.
 * @param {unknown} [options.throwValue] Value thrown by Aura API `get`.
 * @return {{
 *   errors: string[];
 *   listener: LightningNavigationListener | null;
 *   opens: { target: string; url: string }[];
 *   records: { eventName: string; params: Record<string, string>[] }[];
 * }}
 */
function loadLightningNavigation({
	throwOnGet = false,
	throwValue = new Error("boom"),
}: {
	throwOnGet?: boolean;
	throwValue?: unknown;
} = {}) {
	const errors: string[] = [];
	const opens: { target: string; url: string }[] = [];
	const records: { eventName: string; params: Record<string, string>[] }[] = [];
	let listener: LightningNavigationListener | null = null;

	createLightningNavigationModule({
		auraApi: {
			get: (eventName: string) => {
				if (throwOnGet) {
					throw throwValue;
				}
				const record = {
					eventName,
					params: [] as Record<string, string>[],
				};
				records.push(record);
				return {
					fire: () => {},
					setParams: (params: Record<string, string>) => {
						record.params.push(params);
					},
				};
			},
		},
		addEventListenerFn: (_type, registeredListener) => {
			listener = registeredListener as LightningNavigationListener;
		},
		consoleRef: {
			error: (message: string) => {
				errors.push(message);
			},
		},
		openFn: (url: string, target: string) => {
			opens.push({ target, url });
		},
	});

	return { errors, listener, opens, records };
}

Deno.test("lightning-navigation handles record and URL navigation messages", () => {
	const { listener, records } = loadLightningNavigation();
	const registeredListener = listener as LightningNavigationListener | null;

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
});

Deno.test("lightning-navigation ignores foreign sources and reports invalid types", () => {
	const { errors, listener, records } = loadLightningNavigation();
	const registeredListener = listener as LightningNavigationListener | null;

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
});

Deno.test("lightning-navigation falls back to open when the Salesforce event API throws", () => {
	const { errors, listener, opens } = loadLightningNavigation({ throwOnGet: true });
	const registeredListener = listener as LightningNavigationListener | null;

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
});

Deno.test("lightning-navigation reports non-error failures and skips fallback when missing", () => {
	const { errors, listener, opens } = loadLightningNavigation({
		throwOnGet: true,
		throwValue: "boom-string",
	});
	const registeredListener = listener as LightningNavigationListener | null;

	assertExists(registeredListener);
	registeredListener({
		data: {
			navigationType: "recordId",
			recordId: "001XYZ",
			what: "lightningNavigation",
		},
		source: globalThis,
	});

	assertEquals(opens, []);
	assertEquals(errors, ["Navigation failed: boom-string"]);
});
