import { Window } from "happydom";
const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.customElements = {
	define: () => {},
};

export function createMockElement() {
	return {
		classList: {
			removed: [] as string[],
			remove(cls: string) {
				this.removed.push(cls);
			},
		},
		// deno-lint-ignore ban-types
		events: {} as Record<string, Function>,
		// deno-lint-ignore ban-types
		addEventListener(event: string, cb: Function) {
			this.events[event] = cb;
		},
	};
}
