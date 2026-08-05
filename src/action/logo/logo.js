"use strict";
import { BROWSER, WHAT_THEME } from "../../core/constants.js";
import { initTheme } from "../themeHandler.js";
import { runLogo } from "./logo-runtime.js";

runLogo({
	browser: BROWSER,
	initTheme: initTheme,
	whatTheme: WHAT_THEME,
});
