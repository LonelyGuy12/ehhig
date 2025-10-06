import '../npm/tldts-experimental/npm/tldts-core/dist/es6/src/options.js';
import '../npm/@ghostery/adblocker/dist/esm/data-view.js';
import '../npm/@ghostery/adblocker/dist/esm/fetch.js';
import '../npm/@ghostery/adblocker/dist/esm/filters/cosmetic.js';
import { parseFilter } from '../npm/@ghostery/adblocker/dist/esm/lists.js';
import '../npm/@ghostery/adblocker/dist/esm/request.js';
import '../npm/@remusao/small/dist/esm/index.js';
import '../npm/@ghostery/adblocker/dist/esm/filters/network.js';
import '../npm/@ghostery/adblocker/dist/esm/preprocessor.js';
import Options from '../store/options.js';
import { addListener } from '../utils/options-observer.js';
import { getTracker } from '../utils/trackerdb.js';
import convert from '../utils/dnr-converter.js';
import { EXCEPTIONS_RULE_PRIORITY, getDynamicRulesIds, EXCEPTIONS_ID_RANGE } from '../utils/dnr.js';
import store from '../npm/hybrids/src/store.js';

async function updateFilters() {
  const options = await store.resolve(Options);
  const rules = [];
  for (const [id, exception] of Object.entries(options.exceptions)) {
    const tracker = await getTracker(id) || {
      domains: [id],
      filters: []
    };
    const domains = !exception.global ? exception.domains : void 0;
    const filters = tracker.filters.concat(tracker.domains.map((domain) => `||${domain}^`)).map((f) => parseFilter(f)).filter((filter) => filter.isNetworkFilter()).map((filter) => `@@${filter.toString()}`);
    if (!filters.length) continue;
    const result = await convert(filters);
    for (const rule of result.rules) {
      if (domains && domains.length) {
        rule.condition.initiatorDomains = domains.concat(
          rule.condition.initiatorDomains || []
        );
      }
      rules.push({
        ...rule,
        priority: EXCEPTIONS_RULE_PRIORITY + rule.priority
      });
    }
  }
  const addRules = rules.map((rule, index) => ({
    ...rule,
    id: EXCEPTIONS_RULE_PRIORITY + index
  }));
  const removeRuleIds = await getDynamicRulesIds(EXCEPTIONS_ID_RANGE);
  if (addRules.length || removeRuleIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules,
      removeRuleIds
    });
    console.info("[exceptions] Updated DNR rules");
  }
}
{
  addListener(
    "filtersUpdatedAt",
    async function updateExceptions(value, lastValue) {
      if (lastValue !== void 0 && value !== 0) {
        await updateFilters();
      }
    }
  );
  addListener(
    "exceptions",
    async function updateExceptions(value, lastValue) {
      if (lastValue === void 0) return;
      await updateFilters();
    }
  );
}
