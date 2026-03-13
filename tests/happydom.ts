import { Window } from "happydom";
const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.CustomEvent = window.CustomEvent;
globalThis.customElements = window.customElements;

export function createMockElement() {
	return {
		classList: {
			list: [] as string[],
			add(cls: string) {
				if (!this.list.includes(cls)) {
					this.list.push(cls);
				}
			},
			remove(cls: string) {
				const index = this.list.indexOf(cls);
				if (index !== -1) {
					this.list.splice(index, 1);
				}
			},
			toggle(cls: string, force: boolean) {
				if (force != null) {
					if (force) {
						this.add(cls);
					} else {
						this.remove(cls);
					}
					return;
				}
				if (this.list.includes(cls)) {
					this.remove(cls);
				} else {
					this.add(cls);
				}
			},
		},
		// deno-lint-ignore ban-types
		events: {} as Record<string, Function>,
		// deno-lint-ignore ban-types
		addEventListener(event: string, cb: Function) {
			this.events[event] = cb;
		},
		attributes: {} as Map<string, string>,
		setAttribute(key: string, value: string) {
			this.attributes[key] = value;
		},
	};
}
