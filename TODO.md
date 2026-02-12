study this file
DO NOT git push
you are NOT ALLOWED to make changes to THIS file, except for what is described here.
do not rush your changes, think them through, we need to have a useful product, not fast updates.

some of these have already been created but there are some issues.
find one of such issues as listed below and work on in. when you've completed it, commit your changes and STOP. when I tell you to `go on`, continue for ONE ISSUE ONLY.
keep your commits concise and reviewable by a human.

before committing, run `deno task fmt` and `deno task lint` and fix whatever comes up as errors (ignore missing-keys-report.json: if you get to it, continue). if everything works fine, run `deno task dev-firefox` and fix any new errors (this command simply builds the extension and is not interactive). if no errors come up, you're allowed to commit with a concise but useful message.
your commit should always contain the changes you made and the completion of the task (if it was achieved and you believe no further action is required on your end)
study what is needed inside `src/salesforce` starting from `tutorial.js`

## important: most of the page changes are not done through a full page reload but with a lightning navigation (we're working in salesforce setup)

the tutorial will automatically ask the user if they want to follow it (only the first time) and will be manually invokable by them with the click of a button inside `action/popup.html`.
if the user does or does not complete the tutorial, do not prompt the user for the tutorial the next time.
create a new file `src/salesforce/tutorial.js`

it will guide the user in these phases to let them understand how to use the extension:

1. tell the user they may restart the tutorial at any time by clicking on the button in the popup
1. highlight the element returned from `src/salesforce/content.getSetupTabUl()` to show where the favourite Tabs are displayed
1. tell to click on the "Users" Tab
1. after the redirect, resume the tutorial and highlight the element with id from `src/salesforce/favourite-manager.SLASHED_STAR_ID` button which is used to remove the current page from the favourites
1. Tell the user we'll redirect them to the Account object; after confirmation, perform the redirect using lightning navigation to `/setup/lightning/ObjectManager/Account/FieldsAndRelationships/view`
1. after the redirect, ask the user to click on the element with id from `src/salesforce/favourite-manager.STAR_ID` button and show them the newly added Tab
1. highlight the Account Tab inside the element returned from `src/salesforce/content.getSetupTabUl()` (which they've just added at the step before) and make them pin it via right-click on the Account Tab > Again, Why Salesforce > Move > Pin (+left-click)
1. highlight the Account Tab again to let them see that the background is changed because it is now pinned and will stay pinned until the Unpin it
1. ask the user to right-click on the page (but not on a link / Tab) and make them open the Manage Tabs modal by right-click on page > Again, Why Salesforce > Manage Tabs (+left-click)
1. tell the user they may manage their Tabs from this screen (present a way to open a background tab pointing to `https://github.com/Astisme/again-why-salesforce/wiki/Manage-Tabs-modal` get `https://github.com/Astisme/again-why-salesforce` from `src/constants.EXTENSION_GITHUB_LINK`)
1. ask the user to drag the "Users" row using the 6 dots on the left and drop it before the Account Tab (the first row)
1. after the drop, explain that they may not move the Users row before the Account one because the latter is pinned, which is why the former got only to the 2nd spot
1. make them close the modal by clicking on save (prevent them from clicking the cancel or the close (X) buttons) so that they may see the toast message that the Tabs were saved
1. Ask them to perform the keyboard shortcut Alt+Comma (MacOS: Option+Comma) so the Settings page will open [find the exact keyboard shortcut with something like `src/background/background.bg_getCommandLinks`]
1. Explain that they'll be able to change the behaviour of the extension by tweaking the options found in this page and that they'll have the possibility to style their Tabs by switching to the related tab found in the header (generic Tabs, Org Tabs, generic pinned Tabs, Org pinned Tabs) and that they'll be able to change both when the Tab is inactive (when they're currently not on the related page) or active (when they are on the related page)
1. tell the user that the tutorial is over and wish them to have fun

- [x] after i click on the tab to navigate to its page, where the next step would be to click on the slashed star, the program cannot find the slashed star
- [x] after i click on an highlighted element, the next step should remove the highlight but it is currently kept forever
- [x] for the step that should redirect to the Account page, the ok button to confirm the redirect is not provided
- [x] after i click on the star after being redirected to the account page, nothing happens and the tutorial freezes
- [x] show the salesforce spinner when the step is completed and hide it when the following step has started
- [x] save the tutorial progress using `/functions.js/sendExtensionMessage` with a what = `export const TUTORIAL_KEY = "tutorial-progress"` from `/constants.js`
- [x] when checking if the user has already completed the tutorial, also check if they have already started it but not completed it. if yes, prompt them to restart from where they left off. if yes, perform lightining redirect to the correct page for the step they have to perform.
- [x] if the user resizes the browser window, the highlight overlay is kept in place. find a better alternative (maybe directly add a css property and toggle the related class? if going this way, do not use `.hightlighted` as this is for other styles)
- [x] use a better way to detect if the user has performed the step action -> if the step requires to listen to a context menu, read the background file and do the same thing
- [x] fix that inside the manage tabs modal, every time a step is performed, a new overlay seems to be added (BUT NO OVERLAY IS ACTUALLY ADDED, SIMPLY THE SCREEN DARKENS MORE AND MORE). find out what could be the cause of this issue reading `src/salesforce/generator.js`
- [ ] fix text for "Users not moved due to pinned" as the users Tab is no longer available
- [ ]
