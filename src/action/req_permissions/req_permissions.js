import { initTheme } from "../themeHandler.js";
import { runReqPermissions } from "./req_permissions-runtime.js";

await initTheme();
await runReqPermissions();
