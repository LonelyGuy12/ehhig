import store from '../npm/hybrids/src/store.js';

const ACTION_DISABLE_AUTOCONSENT = "disable-autoconsent";
const ACTION_DISABLE_ANTITRACKING_MODIFICATION = "disable-antitracking-modification";
const ACTION_PAUSE_ASSISTANT = "pause-assistant";
const FLAG_PAUSE_ASSISTANT = "pause-assistant";
const FLAG_FIREFOX_CONTENT_SCRIPT_SCRIPTLETS = "firefox-content-script-scriptlets";
const FLAG_CHROMIUM_INJECT_COSMETICS_ON_RESPONSE_STARTED = "chromium-inject-cosmetics-on-response-started";
const FLAG_EXTENDED_SELECTORS = "extended-selectors";
const FLAG_DYNAMIC_DNR_FIXES = "dynamic-dnr-fixes";
const Config = {
  enabled: true,
  updatedAt: 0,
  domains: store.record({
    actions: [String],
    dismiss: store.record(false)
  }),
  flags: store.record({
    percentage: 0,
    enabled: false
  }),
  // Helper methods
  hasAction({ domains, enabled }) {
    const hostnames = /* @__PURE__ */ new Map();
    return (hostname, action) => {
      if (!enabled || !hostname) return;
      let actions = hostnames.get(hostname);
      if (!actions) {
        actions = /* @__PURE__ */ new Map();
        hostnames.set(hostname, actions);
      }
      if (!actions.has(action)) {
        const domain = Object.keys(domains).find((d) => hostname.endsWith(d));
        const value = !!domain && domains[domain].actions.includes(action);
        actions.set(action, value);
        return value;
      }
      return actions.get(action);
    };
  },
  isDismissed({ domains, enabled }) {
    return (hostname, action) => {
      if (!enabled || !hostname) return;
      const domain = Object.keys(domains).find((d) => hostname.endsWith(d));
      if (!domain) return false;
      return !!domains[domain].dismiss[action];
    };
  },
  hasFlag({ flags, enabled }) {
    return (flag) => {
      if (!enabled || !flag || !flags[flag]) {
        return false;
      }
      return flags[flag].enabled;
    };
  },
  [store.connect]: {
    async get() {
      const { config = {} } = await chrome.storage.local.get(["config"]);
      return config;
    },
    async set(_, values) {
      values ||= {};
      await chrome.storage.local.set({
        config: values
      });
      return values;
    }
  }
};
async function dismissAction(domain, action) {
  const config = await store.resolve(Config);
  const id = Object.keys(config.domains).find((d) => domain.endsWith(d));
  await store.set(Config, {
    domains: { [id]: { dismiss: { [action]: true } } }
  });
}
chrome.storage.onChanged.addListener((changes) => {
  if (changes["config"]) store.clear(Config, false);
});

export { ACTION_DISABLE_ANTITRACKING_MODIFICATION, ACTION_DISABLE_AUTOCONSENT, ACTION_PAUSE_ASSISTANT, FLAG_CHROMIUM_INJECT_COSMETICS_ON_RESPONSE_STARTED, FLAG_DYNAMIC_DNR_FIXES, FLAG_EXTENDED_SELECTORS, FLAG_FIREFOX_CONTENT_SCRIPT_SCRIPTLETS, FLAG_PAUSE_ASSISTANT, Config as default, dismissAction };
