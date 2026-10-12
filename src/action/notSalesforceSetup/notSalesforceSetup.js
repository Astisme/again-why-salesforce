import { initTheme } from "../themeHandler.js";
import { runNotSalesforceSetup } from "./notSalesforceSetup-runtime.js";

await initTheme();
await runNotSalesforceSetup();
