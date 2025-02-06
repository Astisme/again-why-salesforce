"use strict";
export const SETUP_LIGHTNING = "/lightning/setup/";
export const WHY_KEY = "againWhySalesforce";
export const HTTPS = "https://";
export const LIGHTNING_FORCE_COM = ".lightning.force.com";
export const MY_SALESFORCE_SETUP_COM = ".my.salesforce-setup.com";
export const MY_SALESFORCE_COM = ".my.salesforce.com";
export const SALESFORCE_ID_PATTERN =
	/(?:^|\/|=)([a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})(?:$|\/|\?|&)/;

export const FRAME_PATTERNS = [
	`${HTTPS}*${MY_SALESFORCE_SETUP_COM}/*`,
	`${HTTPS}*${LIGHTNING_FORCE_COM}/*`,
	`${HTTPS}*${MY_SALESFORCE_COM}/*`,
];

// add `/setup/lightning/` to the framePatterns
export const CONTEXT_MENU_PATTERNS = FRAME_PATTERNS.map((item) =>
	`${item.substring(0, item.length - 2)}${SETUP_LIGHTNING}*`
);

export const CONTEXT_MENU_PATTERNS_REGEX = CONTEXT_MENU_PATTERNS.map((item) =>
	item.replaceAll("\*", ".*")
);

export const BROWSER = typeof browser == "undefined" ? chrome : browser;
