// importDependentFiles.ts
import { Tab } from '/tab.js';
import { TabContainer, allTabs } from '/tabContainer.js';
import "/salesforce/generator.js ";
import "/salesforce/favourite-manager.js";
import "/dragHandler.js";
import "/salesforce/import.js";
import "/salesforce/content.js";

// Make available to content scripts
(globalThis as any).Tab = Tab;
(globalThis as any).TabContainer = TabContainer;
(globalThis as any).allTabs = allTabs;
