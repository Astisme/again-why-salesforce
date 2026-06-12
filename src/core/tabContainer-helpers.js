import Tab from "./tab.js";
import { PERSIST_SORT } from "./constants.js";
import { setSettings } from "./functions.js";

/**
 * Returns normalized TabContainer-like JSON from legacy array or object shape.
 *
 * @param {Object|Array} tbContainerObj - Input JSON shape.
 * @return {Object} Normalized object plus `isUsingOldVersion`.
 */
export function getTabContainerFromObj(tbContainerObj) {
	const res = {};
	res.isUsingOldVersion = Array.isArray(tbContainerObj);
	if (res.isUsingOldVersion) {
		// Deprecated legacy array backup shape.
		// the Tabs will automatically get saved in the newer version at the first sync
		res.tabs = tbContainerObj;
	} else {
		// new version of saving the Tabs
		// in a later release, we'll have to remove the deprecated way of saving them.
		// currently this is not possible because we're using this for import as well (meaning someone might have "old" versions of their Tabs backed up as json files
		Object.assign(res, tbContainerObj);
	}
	return res;
}

/**
 * Finds target index for a move operation.
 *
 * @param {Object} [param0={}] - Move options.
 * @param {boolean} [param0.fullMovement=false] - Whether to jump to boundary.
 * @param {boolean} [param0.moveBefore=true] - Whether to move backward/up.
 * @param {number} [param0.minIndex=0] - Minimum allowed index.
 * @param {number} [param0.maxIndex=0] - Maximum allowed index.
 * @param {number} [param0.currentIndex=0] - Current tab index.
 * @param {string|null} [param0.org=null] - Tab org.
 * @param {Tab[]} [param0.tabs=[]] - Current tabs.
 * @return {number} Target index.
 */
export function getMoveIndex({
	fullMovement = false,
	moveBefore = true,
	minIndex = 0,
	maxIndex = 0,
	currentIndex = 0,
	org = null,
	tabs = [],
} = {}) {
	if (fullMovement) {
		return moveBefore ? minIndex : maxIndex;
	}
	const direction = moveBefore ? -1 : 1;
	const clamp = moveBefore ? Math.max : Math.min;
	const boundary = moveBefore ? minIndex : maxIndex;
	let lastIndex;
	for (let offset = 1; offset <= maxIndex; offset++) {
		const candidateIndex = clamp(
			boundary,
			currentIndex + direction * offset,
		);
		if (lastIndex === candidateIndex) {
			break;
		}
		const targetTab = tabs[candidateIndex];
		if (
			org == null || targetTab?.org == null || targetTab.org === org
		) {
			return candidateIndex;
		}
		lastIndex = candidateIndex;
	}
	return boundary;
}

/**
 * Performs case-insensitive comparison for strings.
 *
 * @param {string} a - First element.
 * @param {string} b - Second element.
 * @return {number} Negative if a < b; positive if a > b; 0 if equal.
 */
export function sortFunction(a, b) {
	a = a == null ? "" : String(a);
	b = b == null ? "" : String(b);
	return String(a).localeCompare(
		String(b),
		undefined,
		{
			sensitivity: "base",
		},
	);
}

/**
 * Handles sort invalidation by updating persisted settings.
 *
 * @return {Promise<unknown>} When persisted sort state is cleared.
 */
export function invalidateSort() {
	return setSettings({
		id: PERSIST_SORT,
		enabled: false,
	});
}

/**
 * Checks if tabs are sorted by specific key.
 *
 * @param {Object} [param0={}] - Sort check options.
 * @param {string} param0.key - Key to check.
 * @param {Tab[]} [param0.tabs=[]] - Current tabs.
 * @param {number} [param0.pinnedTabsNo=0] - Pinned count.
 * @return {{isSorted: boolean, isAscending: boolean}} Sort result.
 */
export function checkSortOrderForKey({
	key,
	tabs = [],
	pinnedTabsNo = 0,
} = {}) {
	let asc = true;
	let desc = true;
	for (
		let i = pinnedTabsNo + 1;
		i < tabs.length && (asc || desc);
		i++
	) {
		const comparison = sortFunction(
			tabs[i - 1][key],
			tabs[i][key],
		);
		if (comparison === 0) continue;
		if (comparison > 0) asc = false;
		if (comparison < 0) desc = false;
	}
	return {
		isSorted: asc || desc,
		isAscending: asc && !desc,
	};
}

/**
 * Returns whether tab survives replace/import overwrite filters.
 *
 * @param {Tab} tab - Tab to check.
 * @param {Object} param1 - Filter options.
 * @param {boolean} [param1.resetTabs=true] - Whether generic tabs should be reset.
 * @param {boolean} [param1.removeOrgTabs=false] - Whether org tabs should be removed.
 * @param {string|null} [param1.keepTabsNotThisOrg=null] - Org to preserve.
 * @param {string|null} [param1.removeThisOrgTabs=null] - Org to remove.
 * @return {boolean} Whether tab survives.
 */
function shouldKeepTabForReplace(tab, {
	resetTabs = true,
	removeOrgTabs = false,
	keepTabsNotThisOrg = null,
	removeThisOrgTabs = null,
} = {}) {
	if (resetTabs) {
		if (!removeOrgTabs) {
			return tab.org != null;
		}
		if (keepTabsNotThisOrg != null || removeThisOrgTabs != null) {
			return tab.org != null &&
				(keepTabsNotThisOrg == null ||
					tab.org !== keepTabsNotThisOrg) &&
				(removeThisOrgTabs == null ||
					tab.org !== removeThisOrgTabs);
		}
		return false;
	}
	return tab.org == null ||
		(
			keepTabsNotThisOrg != null &&
			tab.org === keepTabsNotThisOrg
		) ||
		(
			removeThisOrgTabs != null &&
			tab.org !== removeThisOrgTabs
		);
}

/**
 * Returns existing tabs after applying replace/import overwrite rules.
 *
 * @param {Object} param0 - Filter options.
 * @param {Tab[]} [param0.currentTabs=[]] - Current tabs to filter.
 * @param {number} [param0.pinnedTabsNo=0] - Current pinned-tab count.
 * @param {boolean} [param0.resetTabs=true] - Whether generic tabs should be reset.
 * @param {boolean} [param0.removeOrgTabs=false] - Whether org tabs should be removed.
 * @param {string|null} [param0.keepTabsNotThisOrg=null] - Org to preserve.
 * @param {string|null} [param0.removeThisOrgTabs=null] - Org to remove.
 * @return {{tabs: Tab[], pinnedTabsNo: number}} Filtered tabs and pinned count.
 */
export function getFilteredReplaceState({
	currentTabs = [],
	pinnedTabsNo = 0,
	resetTabs = true,
	removeOrgTabs = false,
	keepTabsNotThisOrg = null,
	removeThisOrgTabs = null,
} = {}) {
	if (
		resetTabs && removeOrgTabs && keepTabsNotThisOrg == null &&
		removeThisOrgTabs == null
	) {
		return {
			tabs: [],
			pinnedTabsNo: 0,
		};
	}
	if (!(resetTabs || removeOrgTabs)) {
		return {
			tabs: Array.from(currentTabs),
			pinnedTabsNo,
		};
	}
	const conf = {
		resetTabs,
		removeOrgTabs,
		keepTabsNotThisOrg,
		removeThisOrgTabs,
	};
	const pinnedTabs = currentTabs.slice(0, pinnedTabsNo).filter((tab) =>
		shouldKeepTabForReplace(tab, conf)
	);
	const otherTabs = currentTabs.slice(pinnedTabsNo).filter((tab) =>
		shouldKeepTabForReplace(tab, conf)
	);
	return {
		tabs: [...pinnedTabs, ...otherTabs],
		pinnedTabsNo: pinnedTabs.length,
	};
}

/**
 * Removes per-tab metadata keys from imported tabs.
 *
 * @param {Tab[]} [tabs=[]] - Imported tabs.
 * @return {Tab[]} Tabs without metadata.
 */
export function stripImportedTabMetadata(tabs = []) {
	const metadataKeys = Tab.metadataKeys;
	return tabs.map((tab) =>
		Object.fromEntries(
			Object.entries(tab).filter(([key]) => !metadataKeys.has(key)),
		)
	);
}

/**
 * Splits imported pinned tabs from remaining imported tabs without mutating state.
 *
 * @param {Object} [param0={}] - Import options.
 * @param {number} [param0.pinnedTabsNo=0] - Requested pinned-tab count.
 * @param {Tab[]} [param0.importedArr=[]] - Imported tabs.
 * @param {Tab[]} [param0.existingPinnedTabs=[]] - Existing pinned tabs.
 * @param {boolean} [param0.resetTabs=false] - Whether current state is reset first.
 * @return {{importedPinnedTabs: Tab[], remainingImportedTabs: Tab[], pinnedTabsNo: number, importedTabs: number}} Prepared pinned import state.
 */
export function prepareImportedPinnedTabs({
	pinnedTabsNo = 0,
	importedArr = [],
	existingPinnedTabs = [],
	resetTabs = false,
} = {}) {
	const clampedPinnedTabsNo = Math.max(
		0,
		Math.min(
			pinnedTabsNo ?? 0,
			importedArr.length,
		),
	);
	if (clampedPinnedTabsNo <= 0) {
		return {
			importedPinnedTabs: [],
			remainingImportedTabs: Array.from(importedArr),
			pinnedTabsNo: 0,
			importedTabs: 0,
		};
	}
	const requestedPinnedTabs = importedArr.slice(0, clampedPinnedTabsNo);
	const remainingImportedTabs = importedArr.slice(clampedPinnedTabsNo);
	if (resetTabs) {
		return {
			importedPinnedTabs: requestedPinnedTabs,
			remainingImportedTabs,
			pinnedTabsNo: requestedPinnedTabs.length,
			importedTabs: requestedPinnedTabs.length,
		};
	}
	const existingPinnedTabKeys = new Set(
		existingPinnedTabs.map((tab) => `${tab?.url}|${tab?.org}`),
	);
	const seenImportedPinnedTabs = new Set();
	const importedPinnedTabs = requestedPinnedTabs.filter(
		(tab, index, arr) => {
			const tabKey = `${tab?.url}|${tab?.org}`;
			// Keep first imported copy only, and skip tabs already present in pinned segment.
			if (
				arr.findIndex((item) => item.equals?.(tab) || item === tab) !==
					index ||
				existingPinnedTabKeys.has(tabKey) ||
				seenImportedPinnedTabs.has(tabKey)
			) {
				return false;
			}
			seenImportedPinnedTabs.add(tabKey);
			return true;
		},
	);
	return {
		importedPinnedTabs,
		remainingImportedTabs,
		pinnedTabsNo: importedPinnedTabs.length,
		importedTabs: importedPinnedTabs.length,
	};
}
