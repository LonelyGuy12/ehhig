import Options, { GLOBAL_PAUSE_ID } from '../store/options.js';
import { addListener } from '../utils/options-observer.js';
import ManagedConfig, { TRUSTED_DOMAINS_NONE_ID } from '../store/managed-config.js';
import { getDynamicRulesIds, PAUSED_ID_RANGE, PAUSED_RULE_PRIORITY } from '../utils/dnr.js';
import store from '../npm/hybrids/src/store.js';

const PAUSED_ALARM_PREFIX = "options:revoke";
const ALL_RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "media",
  "websocket",
  "webtransport",
  "webbundle",
  "other"
];
addListener("paused", async (paused, lastPaused) => {
  const alarms = (await chrome.alarms.getAll()).filter(
    ({ name }) => name.startsWith(PAUSED_ALARM_PREFIX)
  );
  const revokeHostnames = Object.entries(paused).filter(
    ([, { revokeAt }]) => revokeAt
  );
  alarms.forEach(({ name }) => {
    if (!revokeHostnames.find(([id]) => name === `${PAUSED_ALARM_PREFIX}:${id}`)) {
      chrome.alarms.clear(name);
    }
  });
  if (revokeHostnames.length) {
    revokeHostnames.filter(([id]) => !alarms.some(({ name }) => name === id)).forEach(([id, { revokeAt }]) => {
      chrome.alarms.create(`${PAUSED_ALARM_PREFIX}:${id}`, {
        when: revokeAt
      });
    });
  }
  if (lastPaused || // Managed mode can update the rules at any time - so we need to update
  // the rules even if the paused state hasn't changed
  (await store.resolve(ManagedConfig)).trustedDomains[0] !== TRUSTED_DOMAINS_NONE_ID) {
    const removeRuleIds = await getDynamicRulesIds(PAUSED_ID_RANGE);
    const hostnames = Object.keys(paused);
    let globalPause = false;
    if (hostnames.includes(GLOBAL_PAUSE_ID)) {
      globalPause = true;
    }
    if (hostnames.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
          {
            id: 1,
            priority: PAUSED_RULE_PRIORITY,
            action: { type: "allow" },
            condition: {
              initiatorDomains: globalPause ? void 0 : hostnames,
              resourceTypes: ALL_RESOURCE_TYPES
            }
          },
          {
            id: 2,
            priority: PAUSED_RULE_PRIORITY,
            action: { type: "allow" },
            condition: {
              requestDomains: globalPause ? void 0 : hostnames,
              resourceTypes: ALL_RESOURCE_TYPES
            }
          },
          {
            id: 3,
            priority: PAUSED_RULE_PRIORITY,
            action: { type: "allowAllRequests" },
            condition: {
              initiatorDomains: globalPause ? void 0 : hostnames,
              resourceTypes: ["main_frame", "sub_frame"]
            }
          }
        ],
        removeRuleIds
      });
      console.log("[dnr] Pause rules updated:", hostnames.join(", "));
    } else if (removeRuleIds.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds
      });
      console.log("[dnr] Pause rules cleared");
    }
  }
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(PAUSED_ALARM_PREFIX)) {
    const id = alarm.name.slice(PAUSED_ALARM_PREFIX.length + 1);
    store.set(Options, { paused: { [id]: null } });
  }
});
