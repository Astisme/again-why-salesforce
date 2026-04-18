import { assertEquals, assertRejects } from "@std/testing/asserts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";
import { installMockDom } from "../../happydom.test.ts";
import "../../mocks.test.ts";

/**
 * Minimal toast element used by toast module tests.
 */
class ToastElement {
	textContent: string;
	removed = false;

	/**
	 * Creates a toast element with static text content.
	 *
	 * @param {string} textContent Visible text in the toast.
	 */
	constructor(textContent: string) {
		this.textContent = textContent;
	}

	/**
	 * Marks this element as removed.
	 *
	 * @return {void}
	 */
	remove() {
		this.removed = true;
	}
}

type ToastModule = {
	showToast: (message: string | string[], status?: string) => Promise<void>;
};

/**
 * Builds an isolated toast module fixture.
 *
 * @return {Promise<{
 *   appended: ToastElement[];
 *   module: ToastModule;
 *   setHanger: (newHanger: { appendChild: (element: ToastElement) => ToastElement }) => void;
 *   traces: { value: number };
 *   logs: { error: string[]; info: string[]; log: string[]; warn: string[] };
 * }>} Loaded fixture.
 */
async function loadToastFixture() {
	const appended: ToastElement[] = [];
	const traces = { value: 0 };
	const logs = {
		error: [] as string[],
		info: [] as string[],
		log: [] as Array<string | string[]>,
		warn: [] as string[],
	};
	let currentHanger = {
		appendChild: (element: ToastElement) => {
			appended.push(element);
			return element;
		},
	};

	const { module } = await loadIsolatedModule<
		ToastModule,
		Record<string, unknown>
	>({
		modulePath: new URL(
			"../../../src/salesforce/toast.js",
			import.meta.url,
		),
		dependencies: {
			ALL_TOAST_TYPES: new Set(["success", "info", "warning", "error"]),
			TOAST_ERROR: "error",
			TOAST_INFO: "info",
			TOAST_SUCCESS: "success",
			TOAST_WARNING: "warning",
			calculateReadingTime: () => 1,
			generateSldsToastMessage: (message: string[]) =>
				Promise.resolve(new ToastElement(message.join("|"))),
		},
		globals: {
			console: {
				error: (message: string) => logs.error.push(message),
				info: (message: string) => logs.info.push(message),
				log: (message: string) => logs.log.push(message),
				trace: () => {
					traces.value++;
				},
				warn: (message: string) => logs.warn.push(message),
			},
			document: {
				getElementsByClassName: () => [currentHanger],
			},
			setTimeout: (callback: () => void) => {
				callback();
				return 1;
			},
		},
	});

	return {
		appended,
		logs,
		module,
		setHanger: (
			newHanger: { appendChild: (element: ToastElement) => ToastElement },
		) => {
			currentHanger = newHanger;
		},
		traces,
	};
}

Deno.test("toast rejects unknown statuses", async () => {
	const fixture = await loadToastFixture();
	await assertRejects(
		() => fixture.module.showToast("bad", "custom"),
		Error,
		"error_unknown_toast_type",
	);
});

Deno.test("toast appends and logs toasts for all known statuses", async () => {
	const fixture = await loadToastFixture();

	await fixture.module.showToast(["saved", "ok"], "success");
	await fixture.module.showToast("heads-up", "info");
	await fixture.module.showToast("be careful", "warning");
	await fixture.module.showToast("broken", "error");

	assertEquals(fixture.appended.length, 4);
	assertEquals(fixture.logs.log, [["saved", "ok"]]);
	assertEquals(fixture.logs.info, ["heads-up"]);
	assertEquals(fixture.logs.warn, ["be careful"]);
	assertEquals(fixture.logs.error, ["broken"]);
	assertEquals(fixture.traces.value, 2);
	assertEquals(fixture.appended.every((toast) => toast.removed), true);
});

Deno.test("toast reuses the cached hanger after the first lookup", async () => {
	const fixture = await loadToastFixture();
	const secondAppend: ToastElement[] = [];

	await fixture.module.showToast("first", "success");
	fixture.setHanger({
		appendChild: (element: ToastElement) => {
			secondAppend.push(element);
			return element;
		},
	});
	await fixture.module.showToast("second", "success");

	assertEquals(secondAppend.length, 0);
	assertEquals(fixture.appended.length, 2);
});

Deno.test("toast accepts custom statuses present in the allowed status set", async () => {
	const appended: ToastElement[] = [];
	const logs = {
		error: [] as string[],
		info: [] as string[],
		log: [] as Array<string | string[]>,
		warn: [] as string[],
	};
	const hanger = {
		appendChild: (element: ToastElement) => {
			appended.push(element);
			return element;
		},
	};
	const { module } = await loadIsolatedModule<
		ToastModule,
		Record<string, unknown>
	>({
		modulePath: new URL(
			"../../../src/salesforce/toast.js",
			import.meta.url,
		),
		dependencies: {
			ALL_TOAST_TYPES: new Set(["custom"]),
			TOAST_ERROR: "error",
			TOAST_INFO: "info",
			TOAST_SUCCESS: "success",
			TOAST_WARNING: "warning",
			calculateReadingTime: () => 1,
			generateSldsToastMessage: (message: string[]) =>
				Promise.resolve(new ToastElement(message.join("|"))),
		},
		globals: {
			console: {
				error: (message: string) => logs.error.push(message),
				info: (message: string) => logs.info.push(message),
				log: (message: string) => logs.log.push(message),
				trace: () => {},
				warn: (message: string) => logs.warn.push(message),
			},
			document: {
				getElementsByClassName: () => [hanger],
			},
			setTimeout: (callback: () => void) => {
				callback();
				return 1;
			},
		},
	});

	await module.showToast("custom-message", "custom");
	assertEquals(appended.length, 1);
	assertEquals(logs.log.length, 0);
	assertEquals(logs.info.length, 0);
	assertEquals(logs.warn.length, 0);
	assertEquals(logs.error.length, 0);
});

/**
 * Translates keys by returning plain string values for generator-dependent tests.
 *
 * @param {string | string[] | null} keys Translation keys.
 * @param {string | null} [connector=" "] Join connector for array values.
 * @return {Promise<string | string[]>} Flattened translation output.
 */
function passthroughTranslations(
	keys: string | string[] | null,
	connector: string | null = " ",
) {
	if (keys == null) {
		return "";
	}
	if (Array.isArray(keys)) {
		return keys.map((item) => item ?? "").join(connector ?? " ");
	}
	return keys;
}

/**
 * Adds a `getElementsByClassName` fallback to the mock document.
 *
 * @return {() => void} Cleanup callback restoring previous behavior.
 */
function installGetElementsByClassNamePolyfill() {
	const originalGetElementsByClassName = document.getElementsByClassName;
	Object.defineProperty(document, "getElementsByClassName", {
		configurable: true,
		value: (className: string) => {
			const selector = className
				.split(/\s+/)
				.filter((token) => token !== "")
				.map((token) => `.${token}`)
				.join("");
			return [...document.querySelectorAll(selector)];
		},
		writable: true,
	});
	return () => {
		Object.defineProperty(document, "getElementsByClassName", {
			configurable: true,
			value: originalGetElementsByClassName,
			writable: true,
		});
	};
}

Deno.test("toast canonical import validates status handling, logging branches, and cached hanger reuse", async () => {
	const dom = installMockDom(
		"https://acme.lightning.force.com/lightning/setup/Users/home",
	);
	const restoreGetElementsByClassName =
		installGetElementsByClassNamePolyfill();
	const originalConsole = globalThis.console;
	const originalSetTimeout = globalThis.setTimeout;
	const logs = {
		error: [] as string[],
		info: [] as string[],
		log: [] as Array<string | string[]>,
		trace: 0,
		warn: [] as string[],
	};
	const appendedFirst: HTMLElement[] = [];
	const appendedSecond: HTMLElement[] = [];
	try {
		const generatorModule = await import(
			"../../../src/salesforce/generator.js"
		);
		generatorModule.createGeneratorModule({
			getTranslations: passthroughTranslations,
		});

		const firstHanger = document.createElement("div");
		firstHanger.className = "oneConsoleTabset navexConsoleTabset";
		const originalFirstAppend = firstHanger.appendChild.bind(firstHanger);
		firstHanger.appendChild = ((node: Node) => {
			appendedFirst.push(node as HTMLElement);
			return originalFirstAppend(node);
		}) as HTMLElement["appendChild"];
		document.body.appendChild(firstHanger);

		const secondHanger = document.createElement("div");
		secondHanger.className = "oneConsoleTabset navexConsoleTabset";
		const originalSecondAppend = secondHanger.appendChild.bind(
			secondHanger,
		);
		secondHanger.appendChild = ((node: Node) => {
			appendedSecond.push(node as HTMLElement);
			return originalSecondAppend(node);
		}) as HTMLElement["appendChild"];
		document.body.appendChild(secondHanger);

		Object.defineProperty(globalThis, "setTimeout", {
			configurable: true,
			value: (callback: () => void) => {
				callback();
				return 1;
			},
			writable: true,
		});
		Object.defineProperty(globalThis, "console", {
			configurable: true,
			value: {
				error: (message: string) => logs.error.push(message),
				info: (message: string) => logs.info.push(message),
				log: (message: string | string[]) => logs.log.push(message),
				trace: () => {
					logs.trace++;
				},
				warn: (message: string) => logs.warn.push(message),
			},
			writable: true,
		});

		const toastModule = await import("../../../src/salesforce/toast.js");

		await toastModule.showToast(["saved", "ok"], "success");
		await toastModule.showToast("heads-up", "info");
		await toastModule.showToast("be careful", "warning");
		await toastModule.showToast("broken", "error");

		assertEquals(appendedFirst.length, 4);
		assertEquals(logs.log, [["saved", "ok"]]);
		assertEquals(logs.info, ["heads-up"]);
		assertEquals(logs.warn, ["be careful"]);
		assertEquals(logs.error, ["broken"]);
		assertEquals(logs.trace, 2);

		firstHanger.remove();
		await toastModule.showToast("cached-hanger", "success");
		assertEquals(appendedFirst.length, 5);
		assertEquals(appendedSecond.length, 0);

		await assertRejects(
			() => toastModule.showToast("bad", "custom"),
			Error,
			"error_unknown_toast_type",
		);
	} finally {
		Object.defineProperty(globalThis, "console", {
			configurable: true,
			value: originalConsole,
			writable: true,
		});
		Object.defineProperty(globalThis, "setTimeout", {
			configurable: true,
			value: originalSetTimeout,
			writable: true,
		});
		restoreGetElementsByClassName();
		dom.cleanup();
	}
});
