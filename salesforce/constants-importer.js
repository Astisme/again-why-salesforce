"use strict";

globalThis.Tab = import(chrome.runtime.getURL('tab.js')).Tab;
globalThis.TabContainer = import(chrome.runtime.getURL('tab.js')).TabContainer;
