// deno-lint-ignore-file no-explicit-any
import Tab from "/tab.js";
import TabContainer from "/tabContainer.js";
import "/salesforce/generator.js ";
import "/salesforce/favourite-manager.js";
import "/dragHandler.js";
import "/salesforce/import.js";
import "/salesforce/content.js";

// Make available to content scripts
(globalThis as any).Tab = Tab;
(globalThis as any).TabContainer = TabContainer;
