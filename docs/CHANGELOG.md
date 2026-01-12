# CHANGELOG for Again, Why Salesforce

All notable changes to this project are documented here.\
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

<!--
# Next release
## 🚀 Added
## 🛠 Changed
## 🐛 Fixed
## 💥 Removed
## 🧪 Tests
-->

# v2.2.0

This release represents the turning point with which we run away from "Why Salesforce" as we've addressed the most central bit of the extension: **Tab Management**.

In this new version, you won't have to deal with the popup as much since you'll be able to manager your Tabs from the WAY BIGGER space in your Salesforce Setup page.

To celebrate this even more, we're introducing the ability to have **pinned Tabs** which will always stay at the top of your list until you unpin them.

## 🚀 Added

### Salesforce

1. New Context menus to **temporarily** hide Org Tabs OR Generic Tabs (#109)
2. New Sorting options (settings + context menus): sort **by Usage** (number of times the Tabs were clicked) or **by Date** (last time the Tabs were clicked) (#113)
3. During import, new option to import the metadata from point 2 or skip such data
4. New feature to **pin Tabs** at the beginning of the list (#114) they'll have a different background for easier identification
5. New Context menus to **pin or unpin** Tabs
6. New Context menus to **remove** pinned / unpinned Tabs
7. New Export modal to **select which Tabs** to export (#80)
8. New Import modal to **select which Tabs** to import (#81)
9. New context menu item to **manage saved tabs without opening the popup** (#120)
10. Updated logic of draggable items to take into consideration the pinned Tabs

### Popup

1. Added `a` wrappers so that the images have a tooltip

### Settings

1. New Settings Tabs to style pinned and unpinned Tabs
2. Added optional permission management to the main page (#123)
3. Added review and sponsor buttons at the top-right inside of `review-sponsor-aws` (#123)
4. Added `a` wrappers so that the images have a tooltip

### Background

1. Created dedicated function to retrieve the style settings

### Repository

1. Added eslint to check for JSDocs everywhere in `src`
2. New file `export.js` to deal with export
3. New file `manageTabs.js` to deal with managing Tabs specifically

## 🛠 Changed

### Salesforce

1. Updated the translator to increment the cache when it finds new translations while using placeholders
2. Updated css selector to check whether a Tab is pinned or not
3. Heavily refactored `src/settigs/options.js`
4. `dragHandler` now does not send messages, improving security
5. Updated the Simple Analytics path, removing the unnecessary version which was moved to utm_source #125
6. When moving your Tabs manually, the automatic sorting is now invalidated

### Popup

1. Refactored review and sponsor into `review-sponsor-aws`

### Settings

1. The settings previews now will show only the currently selected ones
2. The settings previews will automatically update from active / inactive state based on which input you're using

### Background

1. Refactored function to create default styles

## 💥 Removed

1. Removed difficult to find popup Tab management (#122)
1. Unused static method Tab.update() (was only used in tests)
1. Unused static methods in TabContainer (were only used in tests)

## 🧪 Tests

1. Added tests for the new metadata fields on Tab and for their sorting options
2. Added tests for pinned Tabs
3. Added tests for new translator feature
4. Added tests for pinned Tabs export
5. Added tests for review-sponsor component

# v2.1.0

## 🚀 Added

### Salesforce

1. Allow sorting options for saved Tabs (by Label, by URL, by Org; ascending and descending). [Read the wiki](https://github.com/Astisme/again-why-salesforce/wiki/Sort-Tabs)
2. Context menus (right-click Tab) now offer one-shot sort actions.
3. New setting: "Keep Tabs sorted" to always auto-sort Tabs.

### Popup

1. Added new button to send a review from your browser's store page (detected dynamically).
2. Added new button to [sponsor the project](https://alfredoit.dev/en/sponsor/) (any amount is appreciated).

### Settings

1. Interactive help icons next to every setting in the Options page.
2. Clicking a help icon opens documentation if a URL is provided.
3. Ensured settings interactions do not conflict (e.g., disabling "Add Tabs in Front" when persistent sorting is enabled).
4. Improved layout, grouping, and responsiveness; added toast notifications for saved settings.
5. New Setting to always add new Tabs as "Org Tabs".
6. New Setting to always place new Tabs at the front.

### Localization

1. New translation strings for Tab sorting (ascending, descending, by Label, URL, Org) in all supported languages.
2. Help/documentation strings for every setting.
3. UI strings for context menu sort actions, sorting errors, and new manifest descriptions.

## 🛠 Changed

### Salesforce

1. TabContainer now tracks sorting state and direction.
2. Improved feedback for Tab sorting actions.

### Settings

1. Refreshed settings layout and grouping for clarity.
2. Improved responsiveness and visual feedback (toasts) for settings changes.

### Documentation

1. Updated README with a link to the new wiki page for Tab Sorting.
2. Documentation/help references throughout settings and README.

### Repo

1. Created `src` folder and moved extension-related scripts into it.
2. Updated `deno.json` to point to `src` instead of `./` for imports.
3. Refactored other files accordingly.

## 🐛 Fixed

### General

1. Improved interaction between persistent sorting and manual Tab placement settings to prevent conflicting behaviors.

## 🧪 Tests

1. Extended test coverage for Tab sorting, persistent sorting, and settings UI interactions.
2. Created tests for background files.
3. Created scaffolding for tests of salesforce and popup files.

# v2.0.2

## 🛠 Changed

### Tab Management

1. Refactored how Tabs are identified and manipulated to include `org` (organization) as a first-class property alongside `label` and `url`.
2. All Tab management operations (move, remove, update, etc.) now consistently distinguish Tabs with the same URL but different orgs.
3. Improved the logic for moving Tabs: Tabs now skip over org-specific Tabs that don't match when reordering.
4. Enhanced removal of Tabs to prevent deleting org-specific Tabs from other orgs by mistake.

### API & Internals

1. Refactored `TabContainer.getTabsByData` and related functions to support strict and flexible organization matching.
2. Updated `TabContainer.getSingleTabByData` to better handle ambiguous/multiple matches and provide clearer errors.
3. Improved test coverage for org-specific Tab operations, edge cases, and ambiguity handling.

### UI & Salesforce Integration

1. Context menu and keyboard commands now pass org information when acting on Tabs.
2. Tab operations in Salesforce content scripts now consistently use org data, ensuring correct Tab manipulation across orgs.
3. Updated the favourite button and logic to detect org-specific Tabs.

## 🐛 Fixed

### Tab Management

1. Fixed bugs where actions could affect the wrong Tab if multiple Tabs shared the same URL but belonged to different orgs.
2. Resolved edge cases in Tab reordering and context menu handling involving org-specific Tabs.
3. Improved error messages and prevention of ambiguous Tab operations.

### UI

1. Addressed inconsistent state of the favourite button when multiple Tabs have the same URL but different orgs.
2. Fixed potential UI errors when updating or toggling Tabs with incomplete org information.

## 🧪 Tests

1. Significantly expanded automated tests for Tab management, especially for edge cases involving org-specific and ambiguous Tabs.
2. Added new test steps for moving and removing org Tabs, verifying correct behavior and error handling in complex scenarios.

# v2.0.1

## 🚀 Added

### Updates to the extension

1. Created Tab.isDuplicate() to check if a Tab exists with or without org.
2. Updated use of TabContainer.exists(), for duplicate prevention and check for current href link.
3. Track new users on the extension using `/version/new-user`

## 🛠 Changed

### Salesforce

1. Send ping for analytics only once a day (added `date` key to check for this).

### Background

1. Allow export on browsers other than Chrome / Firefox / Safari (removed strict check for Safari after Chrome and Firefox).

### Updates to the extension

1. A Tab was considered duplicate only based on the `url`; now multiple Tabs may exist with the same `url` but different `org` values.

### Updates to the repository

1. Updated [Privacy Policy](https://github.com/Astisme/again-why-salesforce/blob/main/docs/PRIVACY_POLICY.md) to reflect new storage options used for analytics.

## 🐛 Fixed

### Salesforce

1. Fixed toast message showing html break (`<br />`) by inserting more `div` elements when there's a line break in the text (`\n`) instead of one single `span` with the text only.
2. Fix drag and drop of Tabs not working (due to using our own `ul` from v2.0.0).

### Popup

1. Fix drag and drop of Tabs not working (due to using our own `ul` from v2.0.0).

# v2.0.0

## 🚀 Added

### Salesforce

1. Custom `<ul>` element for Tab storage (we were relying on one available in Salesforce Setup before)
2. Keyboard shortcuts for common actions
3. On-screen notification when a new extension version is available
4. "Update Tab" directly from a Salesforce Setup modal via context menu (without opening the popup)
5. Option to open "Open in Another Org" links in the same browser tab or in a new tab

### Popup

1. Created popup used to request optional permissions.

### Updates to the extension

1. Full localization support for all languages listed [here](/_locales)
2. New extension settings page
3. Safari rollout, plus a dedicated Safari Installation Guide
4. Simple Analytics integration for user metrics

### Updates to the repository

1. CHANGELOG.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md and SECURITY.md added
2. README.md reordered for better flow

## 🛠 Changed

### Salesforce

1. SVG-based star and slashed-star icons (replacing PNGs); they now work seamlessly when using another extension to switch to dark mode

### Updates to the repository

1. Updated Privacy Policy to reflect new storage options used by settings

## 🐛 Fixed

### Updates to the repository

1. Corrected JSDoc comments throughout the codebase

## ⚠️ Breaking Changes

1. **Removed** support for the `tabTitle` field in saved configurations

# v1.4.8

This release re-adds the `lightning.force.com` pattern for Setup pages. This is needed due to production orgs not yet using the `my.salesforce-setup.com` pattern.

For this version, you may still import Tabs using `tabTitle` and `url` (and `org`); however, from version 1.5.0, you'll have to import Tabs using `label` and `url` (and `org`). All versions of the extension until verion 1.5.0 will automatically redownload the imported list of Tabs with `label` instead of `tabTitle`. We thank you for your understanding.

# v1.4.7

This release presents a new screen used in the popup that is used to request permanent access to Salesforce Setup pages. This is needed due to the last release using only `activeTab`.

For this version, you may still import Tabs using `tabTitle` and `url` (and `org`); however, from version 1.5.0, you'll have to import Tabs using `label` and `url` (and `org`). All versions of the extension until verion 1.5.0 will automatically redownload the imported list of Tabs with `label` instead of `tabTitle`. We thank you for your understanding.

# v1.4.6

This release contains a fix to Chrome's export feature and the removal of the tabs permission (only using `activeTab` now).

For this version, you may still import Tabs using `tabTitle` and `url` (and `org`); however, from version 1.5.0, you'll have to import Tabs using `label` and `url` (and `org`). All versions of the extension until verion 1.5.0 will automatically redownload the imported list of Tabs with `label` instead of `tabTitle`. We thank you for your understanding.

# v1.4.5

This release contains various improvements such as allowing for org-specific Tabs and it also fixes some bugs from the previous version.

For this version, you may still import Tabs using `tabTitle` and `url` (and `org`); however, from version 1.5.0, you'll have to import Tabs using `label` and `url` (and `org`). All versions of the extension until verion 1.5.0 will automatically redownload the imported list of Tabs with `label` instead of `tabTitle`. We thank you for your understanding.

## Bugs squashed

### Context Menus

1. Fixed accidental removal of Context Menu Items after a period of time (by performing a check after a while) #48.

### Salesforce

1. Fixed synchronization of Tabs between browser's tabs and windows #42;
2. Prevented the creation of multiple modals (it is now required to close the previous one) #41.

## New Functionality

### Salesforce

1. More usage of the Toast Message, showing errors when something fails (and also info or warning) #44;
2. Improved the Open Other Org modal (now using text boxes instead of disabled input fields);
3. Changed Import modal to resemble Salesforce's modals #41;
4. When a Tab is org-specific, it is shown in **bold** in the Setup bar #30;
5. When saving a new Tab using the favourite button, the URL is checked to match the Salesforce Ids pattern. If the URL is found to have an Id, it is saved as org-specific automatically #30;
6. Tabs which are org-specific but related to another org, will not be shown and their position will remain fixed #30;
7. Context Menu Items now feature Emojis for faster recall.

### Popup

1. When a Tab is org-specific, a checkbox next to its URL is ticked #30;
2. Tabs which are org-specific but related to another org, will not be shown and their position will remain fixed #30.

## Updates to the repository

1. Implemented Tab object for dealing with user's picked Tabs; #50;
2. Removed call to background page to minify/expand/else a URL (now it's done in Tab);
3. Implemented TabContainer object for managing the user's picked Tabs;
4. Implemented tests for Tab and TabContainer classes;
5. Renamed `tabTitle` to `label` for Tab objects; #50;
6. Tests have been added to the PR and Push pipeline.

# v1.4.4

This release contains fixes to bugs found in the previous version

## Bugs squashed

### Salesforce

1. Fixed bug about context menu items being removed and never available after browser timeout;
2. Fixed issue where the open other org menu item would get stuck when trying to open developer edition orgs + added toast error when the URL does not match the regex used to check it;
3. Fixed issue where context menus would not be available inside Salesforce Setup frames;
4. Added more listeners to know when the user changes window / tab to show the context menus only in Salesforce Setup.

# v1.4.3

This release contains fixes to bugs found in the previous version

## Bugs squashed

### Salesforce

1. Fixed bug when trying to open a link in another Org: when the link is not a Salesforce Setup page, `/setup/lightning/` was added anyways;
2. Fixed bug about context menu items not being reloaded when the browser was closed and reopened.

# v1.4.2

This release contains various improvements which are both quality of life and new function like opening a link into another org.

## New Functionality

This release contains the new features listed below from the previous version.

### Popup

1. Drag functionality improved;
2. Improved color theme update speed for Chrome;
3. When not in Salesforce Setup, the button opens a new tab into the same browser container.
4. Uses background scipt to minify a pasted URL;
5. Better reacts to user input: when both title and URL are filled in, creates a new row but when this is no longer true, the row gets deleted;
6. Implemented warning when the URL inserted is already been saved before;
7. Actually removes the `disabled` attribute instead of setting it to false (Chrome did not like it).

### Salesforce

1. Drag functionality improved;
2. Uses background scipt to minify a pasted URL;
3. Implemented warning when the URL inserted is already been saved before;
4. Implemented context menu items to simplify use of the extension (honorable mentions: "Open in another Org", "Make first/last", "Remove tabs to the left/right");
5. During import, if an issue occurs, a toast message is shown explainig the error;
6. During import, if the user imports some duplicates willingly, a toast message is shown to let them know about it;
7. First implementation of Salesforce's modals (can be seen when trying to open a link or page in another Org);
8. Toast messages now have a dynamic time to persist based on how long the text inside of them is;
9. Toast messages now come in 4 different flavours: success, info, warning, error;
10. Saved tabs URLs which are not linked to another Salesforce Setup page, now open into a new tab by default;
11. Updated "Flows" default tab to the new Standard App (outside of Salesforce Setup);

## Updates to the repository

1. Moved `themeHandler.js` up one directory;
2. Updated some checks made through `||` to `??`;
3. Added `contextMenus` permission;
4. Refactored `content.js` into `favourite-manager.js`, `generator.js`, `import.js` based on where each functionality (and constants) could've been a better fit;

# v1.4.1

This release contains updates to the repository after the initial release on the various platforms and some quality of life improvements.

## New Functionality

This release contains the new features listed below from the previous version.

### Popup

1. Updated button colors on light and dark modes

### Salesforce

1. Import check of the chosen file;
2. Error popup on import error;
3. Ability scroll with mouse left-right when adding a lot of tabs;
4. Ability to override currently favourited tabs during import operation;
5. Now using Lightning Navigation when switching to another Setup page.

## Updates to the repository

1. Updated links to the stores;
2. Updated `gh` command used in action;
3. Removed BSD license after talking to [walters954](https://www.github.com/walters954) (the owner of the upstream repo);
4. Added screenshots of the extension in action (also used on the marketplaces).

# v1.4.0

This release constitutes the baseline from which this extension will be developed.

This version number was chosen because this project was forked from [Why Salesforce](https://www.github.com/walters954/why-salesforce) when it was at version 1.3. We've added a patch version number as well.

## New Functionality

This release contains the new features listed below from the previous version.

### Popup

1. Autosave;
2. Highlight of the currently focused input field;
3. Cleaner referenced URLs by omitting `/lightning/setup/` (you can still write / paste any URL);
4. Automatic creation of a new row when all the previous ones are filled in;
5. Ability to reorder the tabs by dragging;
6. Button to delete all entries;
7. Import and Export functionality;
8. Light / Dark mode;
9. Link to this repository;
10. Button to redirect to Salesforce login when not on a Salesforce page;
11. Button to redirect to Salesforce setup when on a different Salesforce page.

### Salesforce

1. Native Salesforce toast message to show the user a change has been completed (or not);
2. Native Salesforce import selector / drop area to import a `.json` file with the tab names and referenced URLs;
3. Ability to reorder the tabs by dragging;
4. Highlight of the saved tab when on its referenced page;
5. Dynamic creation of a favourite / unfavourite current page button;
6. Reload of tabs when a new one is added / when one (or more) is deleted.

## Updates to the repository

1. Refactoring of the whole code;
2. Creation of dedicated directories;
3. Creation of our own license (when the project was forked, there was none available. Now we feature both the one we picked and also the one from the original project);
4. Updated logo to clarify our existence;
5. Use of Deno v2 instead of Node;
6. Removed `manifest.json` from the repository and used `template-manifest.json` to hold all different attributes for the extension and `build-manifest.mjs` to create the `manifest.json` depending on which browser you want to use.
