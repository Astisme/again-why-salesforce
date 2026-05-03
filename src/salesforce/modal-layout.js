"use strict";
import { HIDDEN_CLASS } from "../core/constants.js";
import { createModalLayoutModule } from "./runtime/modal-layout-runtime.js";

export const { updateModalBodyOverflow } = createModalLayoutModule({
	hiddenClass: HIDDEN_CLASS,
});
