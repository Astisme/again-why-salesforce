import {
	BROWSER,
	DO_NOT_REQUEST_FRAME_PERMISSION,
	HIDDEN_CLASS,
} from "../../core/constants.js";
import {
	requestExportPermission,
	requestFramePatternsPermission,
} from "../../core/functions.js";
import { ensureTranslatorAvailability } from "../../core/translator.js";
import "../themeHandler.js";
import { runReqPermissions } from "./req_permissions-runtime.js";

await runReqPermissions({
	browser: BROWSER,
	doNotRequestFramePermissionKey: DO_NOT_REQUEST_FRAME_PERMISSION,
	ensureTranslatorAvailabilityFn: ensureTranslatorAvailability,
	hiddenClass: HIDDEN_CLASS,
	requestExportPermissionFn: requestExportPermission,
	requestFramePatternsPermissionFn: requestFramePatternsPermission,
});
