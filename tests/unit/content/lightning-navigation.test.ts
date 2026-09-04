import {
	assertEquals,
	assertExists,
	assertStrictEquals,
} from "@std/testing/asserts";
import {
	createLightningNavigationModule,
	registerLightningNavigation,
} from "../../../src/salesforce/lightning-navigation.js";

type LightningNavigationListener = (event: {
	data: {
		fallbackURL?: string;
		navigationType: string;
		recordId?: string;
		url?: string;
		what?: string;
	};
	source: object;
}) => void;

type LightningNavigationParams = {
	recordId?: string;
	url?: string;
};

type LightningNavigationAura = {
	get: (eventName: string) => {
		fire: () => void;
		setParams: (params: LightningNavigationParams) => void;
	};
};

type LightningNavigationRecord = {
	eventName: string;
	params: LightningNavigationParams[];
};

type LightningNavigationAuraFactory = (
	records: LightningNavigationRecord[],
) => LightningNavigationAura;

/**
 * Creates a Salesforce Aura mock that records requested navigation events.
 *
 * @param {LightningNavigationRecord[]} records Aura event records.
 * @return {LightningNavigationAura} Aura event mock.
 */
function createAuraMock(records: LightningNavigationRecord[]) {
	return {
		get(eventName: string) {
			const record = { eventName, params: [] as LightningNavigationParams[] };
			records.push(record);
			return {
				fire() {},
				setParams(params: LightningNavigationParams) {
					record.params.push(params);
				},
			};
		},
	};
}

/**
 * Creates a Salesforce Aura mock that fails when used.
 *
 * @return {LightningNavigationAura} Failing Aura event mock.
 */
function createFailingAuraMock() {
	return {
		get() {
			throw new Error("boom");
		},
	};
}

/**
 * Creates a Lightning navigation module and captures its page side effects.
 *
 * @param {LightningNavigationAuraFactory} [createAura=createAuraMock] Aura mock factory.
 * @return {{
 *   errors: string[];
 *   module: ReturnType<typeof createLightningNavigationModule>;
 *   opens: { target: string; url: string; }[];
 *   records: LightningNavigationRecord[];
 * }} Lightning navigation test harness.
 */
function createLightningNavigationHarness(
	createAura: LightningNavigationAuraFactory = createAuraMock,
) {
	const errors: string[] = [];
	const opens: { target: string; url: string }[] = [];
	const records: LightningNavigationRecord[] = [];
	const module = createLightningNavigationModule({
		aura: createAura(records),
		consoleRef: {
			error(message) {
				errors.push(message);
			},
		},
		openRef(url, target) {
			opens.push({ target, url });
		},
		windowRef: globalThis,
	});

	return { errors, module, opens, records };
}
Deno.test("lightning-navigation handles record and URL navigation messages", () => {
	const { module, records } = createLightningNavigationHarness();

	module.handleMessage({
		data: {
			navigationType: "recordId",
			recordId: "001ABC",
			what: "lightningNavigation",
		},
		source: globalThis,
	});
	module.handleMessage({
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
	const { errors, module, records } = createLightningNavigationHarness();

	module.handleMessage({
		data: {
			navigationType: "recordId",
			recordId: "001ABC",
			what: "not-lightningNavigation",
		},
		source: globalThis,
	});
	module.handleMessage({
		data: {
			navigationType: "recordId",
			recordId: "001ABC",
			what: "lightningNavigation",
		},
		source: {},
	});
	module.handleMessage({
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
	const { errors, module, opens } = createLightningNavigationHarness(
		createFailingAuraMock,
	);

	module.handleMessage({
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

Deno.test("lightning-navigation registers a typed page-message listener", () => {
	const records: LightningNavigationRecord[] = [];
	let listener: LightningNavigationListener | undefined;
	const module = registerLightningNavigation({
		addEventListener(_type, registeredListener) {
			listener = registeredListener;
		},
		aura: createAuraMock(records),
		windowRef: globalThis,
	});

	assertExists(listener);
	assertStrictEquals(listener, module.handleMessage);
});
