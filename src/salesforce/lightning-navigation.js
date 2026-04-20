// This script is injected in Salesforce context and does not share the context with the rest of the scripts in this directory.
import { createLightningNavigationModule } from "./runtime/lightning-navigation-runtime.js";

createLightningNavigationModule({
	auraApi: $A,
	addEventListenerFn: addEventListener,
	consoleRef: console,
	openFn: open,
});
