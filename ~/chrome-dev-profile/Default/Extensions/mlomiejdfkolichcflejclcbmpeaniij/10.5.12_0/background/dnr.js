import { getPausedDetails, ENGINES } from '../store/options.js';
import Config, { FLAG_DYNAMIC_DNR_FIXES } from '../store/config.js';
import Resources from '../store/resources.js';
import { getDynamicRulesIds, FIXES_ID_RANGE } from '../utils/dnr.js';
import { addListener } from '../utils/options-observer.js';
import { ENGINE_CONFIGS_ROOT_URL } from '../utils/urls.js';
import store from '../npm/hybrids/src/store.js';

{
  let getIds = function(options) {
    if (!options.terms || getPausedDetails(options)) return [];
    const ids = ENGINES.reduce((acc, { name, key }) => {
      if (options[key] && DNR_RESOURCES.includes(name)) acc.push(name);
      return acc;
    }, []);
    if (ids.length && options.regionalFilters.enabled) {
      ids.push(
        ...options.regionalFilters.regions.map((id) => `lang-${id}`).filter((id) => DNR_RESOURCES.includes(id))
      );
    }
    return ids;
  };
  const DNR_RESOURCES = chrome.runtime.getManifest().declarative_net_request.rule_resources.filter(({ enabled }) => !enabled).map(({ id }) => id);
  addListener(async function dnr(options, lastOptions) {
    const ids = getIds(options);
    if (lastOptions && lastOptions.filtersUpdatedAt === options.filtersUpdatedAt && String(ids) === String(getIds(lastOptions))) {
      return;
    }
    const enabledRulesetIds = await chrome.declarativeNetRequest.getEnabledRulesets() || [];
    const config = await store.resolve(Config);
    if (config.hasFlag(FLAG_DYNAMIC_DNR_FIXES)) {
      const DNR_FIXES_KEY = "dnr-fixes";
      const resources = await store.resolve(Resources);
      if (ids.length) {
        if (!resources.checksums[DNR_FIXES_KEY] || lastOptions?.filtersUpdatedAt < options.filtersUpdatedAt) {
          const removeRuleIds = await getDynamicRulesIds(FIXES_ID_RANGE);
          try {
            console.info("[dnr] Updating dynamic fixes rules...");
            const list = await fetch(
              `${ENGINE_CONFIGS_ROOT_URL}/dnr-fixes-v2/allowed-lists.json`
            ).then(
              (res) => res.ok ? res.json() : Promise.reject(
                new Error(
                  `Failed to fetch allowed lists: ${res.statusText}`
                )
              )
            );
            if (list.dnr.checksum !== resources.checksums["dnr-fixes"]) {
              let addRules = await fetch(list.dnr.url).then(
                (res) => res.ok ? res.json() : Promise.reject(
                  new Error(`Failed to fetch DNR rules: ${res.statusText}`)
                )
              );
              for (const [index, rule] of addRules.entries()) {
                if (rule.condition.regexFilter) {
                  const { isSupported } = await chrome.declarativeNetRequest.isRegexSupported({
                    regex: rule.condition.regexFilter
                  });
                  if (!isSupported) {
                    addRules.splice(index, 1);
                  }
                }
              }
              await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: await getDynamicRulesIds(FIXES_ID_RANGE),
                addRules: addRules.map((rule, index) => ({
                  ...rule,
                  id: FIXES_ID_RANGE.start + index
                }))
              });
              console.info(
                "[dnr] Updated dynamic fixes rules:",
                list.dnr.checksum
              );
              await store.set(resources, {
                checksums: { [DNR_FIXES_KEY]: list.dnr.checksum }
              });
            }
          } catch (e) {
            console.error("[dnr] Error while updating dynamic fixes rules:", e);
            if (!removeRuleIds.length) {
              console.warn("[dnr] Falling back to static fixes rules");
              ids.push("fixes");
              await store.set(resources, {
                checksums: { [DNR_FIXES_KEY]: "filesystem" }
              });
            }
          }
        }
      } else if (resources.checksums[DNR_FIXES_KEY]) {
        const removeRuleIds = await getDynamicRulesIds(FIXES_ID_RANGE);
        if (removeRuleIds.length) {
          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds
          });
          await store.set(resources, {
            checksums: { [DNR_FIXES_KEY]: null }
          });
          console.info("[dnr] Removed dynamic fixes rules");
        }
      }
    } else if (ids.length) {
      ids.push("fixes");
    }
    const enableRulesetIds = [];
    const disableRulesetIds = [];
    for (const id of ids) {
      if (!enabledRulesetIds.includes(id)) {
        enableRulesetIds.push(id);
      }
    }
    for (const id of enabledRulesetIds) {
      if (!ids.includes(id)) {
        disableRulesetIds.push(id);
      }
    }
    if (enableRulesetIds.length || disableRulesetIds.length) {
      try {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds,
          disableRulesetIds
        });
        console.info(
          "[dnr] Updated static rulesets:",
          ids.length ? ids.join(", ") : "none"
        );
      } catch (e) {
        console.error(`[dnr] Error while updating static rulesets:`, e);
      }
    }
  });
}
