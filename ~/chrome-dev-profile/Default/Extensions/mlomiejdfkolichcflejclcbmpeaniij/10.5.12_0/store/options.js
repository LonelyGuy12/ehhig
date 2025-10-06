import { DEFAULT_REGIONS } from '../utils/regions.js';
import { isOpera, isSafari } from '../utils/browser-info.js';
import CustomFilters from './custom-filters.js';
import ManagedConfig, { TRUSTED_DOMAINS_NONE_ID } from './managed-config.js';
import store from '../npm/hybrids/src/store.js';

const UPDATE_OPTIONS_ACTION_NAME = "updateOptions";
const GLOBAL_PAUSE_ID = "<all_urls>";
const ENGINES = [
  { name: "ads", key: "blockAds" },
  { name: "tracking", key: "blockTrackers" },
  { name: "annoyances", key: "blockAnnoyances" }
];
const LOCAL_OPTIONS = [
  "autoconsent",
  "terms",
  "feedback",
  "sync",
  "revision",
  "filtersUpdatedAt"
];
const PROTECTED_OPTIONS = ["exceptions", "paused"];
const OPTIONS_VERSION = 3;
const Options = {
  // Main features
  blockAds: true,
  blockTrackers: true,
  blockAnnoyances: true,
  // Regional filters
  regionalFilters: {
    enabled: DEFAULT_REGIONS.length > 0,
    regions: DEFAULT_REGIONS.length ? DEFAULT_REGIONS : [String]
  },
  // Advanced features
  customFilters: {
    enabled: false,
    trustedScriptlets: false
  },
  // Experimental features
  autoconsent: { autoAction: "optOut" },
  experimentalFilters: false,
  // SERP protection
  serpTrackingPrevention: true,
  // WhoTracks.Me
  wtmSerpReport: true,
  trackerWheel: false,
  ...!isSafari() ? { trackerCount: true } : {},
  pauseAssistant: true,
  // Onboarding
  terms: false,
  feedback: true,
  onboarding: {
    shown: 0,
    ...isOpera() ? { serpShownAt: 0, serpShown: 0 } : {},
    ...{ pinIt: false } 
  },
  // UI
  panel: { statsType: "graph", notifications: true },
  theme: "",
  // Tracker exceptions
  exceptions: store.record({ global: false, domains: [String] }),
  // Paused domains
  paused: store.record({ revokeAt: 0, assist: false, managed: false }),
  // Sync & Update
  sync: true,
  revision: 0,
  filtersUpdatedAt: 0,
  // What's new
  whatsNewVersion: 0,
  [store.connect]: {
    async get() {
      let { options = {}, optionsVersion } = await chrome.storage.local.get([
        "options",
        "optionsVersion"
      ]);
      if (!optionsVersion) {
        chrome.storage.local.set({ optionsVersion: OPTIONS_VERSION });
      } else if (optionsVersion < OPTIONS_VERSION) {
        await migrate(options, optionsVersion);
      }
      if (!isSafari() && !isOpera()) {
        return manage(options);
      }
      return options;
    },
    async set(_, options) {
      options = options || {};
      await chrome.storage.local.set({
        options: (
          // Firefox does not serialize correctly objects with getters
          options
        )
      });
      chrome.runtime.sendMessage({
        action: UPDATE_OPTIONS_ACTION_NAME
      }).catch(() => {
      });
      return options;
    }
  }
};
const SYNC_OPTIONS = Object.keys(Options).filter(
  (key) => !LOCAL_OPTIONS.includes(key)
);
const REPORT_OPTIONS = [
  ...SYNC_OPTIONS.filter((key) => !PROTECTED_OPTIONS.includes(key)),
  "filtersUpdatedAt"
];
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === UPDATE_OPTIONS_ACTION_NAME) {
    store.clear(Options, false);
    store.get(Options);
  }
});
async function migrate(options, optionsVersion) {
  if (optionsVersion < 2) {
    if (options.paused) {
      options.paused = options.paused.reduce((acc, { id, revokeAt }) => {
        acc[id] = { revokeAt };
        return acc;
      }, {});
    }
    console.debug("[options] Migrated to version 2:", options);
  }
  if (optionsVersion < 3) {
    const { text } = await store.resolve(CustomFilters);
    if (text) {
      options.customFilters = {
        ...options.customFilters,
        enabled: true
      };
    }
    console.debug("[options] Migrated to version 3:", options);
  }
  await chrome.storage.local.set({
    options,
    optionsVersion: OPTIONS_VERSION
  });
}
async function manage(options) {
  const managed = await store.resolve(ManagedConfig);
  if (managed.disableOnboarding === true) {
    options.terms = true;
    options.onboarding = { shown: 1 };
  }
  if (managed.disableUserControl === true) {
    options.sync = false;
    options.paused = {};
  }
  if (managed.disableUserAccount === true) {
    options.sync = false;
  }
  if (managed.disableTrackersPreview === true) {
    options.wtmSerpReport = false;
  }
  if (options.paused) {
    for (const domain of Object.keys(options.paused)) {
      if (options.paused[domain].managed === true) {
        delete options.paused[domain];
      }
    }
  }
  if (managed.trustedDomains[0] !== TRUSTED_DOMAINS_NONE_ID) {
    options.paused ||= {};
    managed.trustedDomains.forEach((domain) => {
      options.paused[domain] = { revokeAt: 0, managed: true };
    });
  }
  return options;
}
function getPausedDetails(options, hostname = "") {
  if (options.paused[GLOBAL_PAUSE_ID]) {
    return options.paused[GLOBAL_PAUSE_ID];
  }
  if (!hostname) return null;
  const pausedHostname = Object.keys(options.paused).find(
    (domain) => hostname.endsWith(domain)
  );
  return pausedHostname ? options.paused[pausedHostname] : null;
}

export { ENGINES, GLOBAL_PAUSE_ID, REPORT_OPTIONS, SYNC_OPTIONS, Options as default, getPausedDetails };
