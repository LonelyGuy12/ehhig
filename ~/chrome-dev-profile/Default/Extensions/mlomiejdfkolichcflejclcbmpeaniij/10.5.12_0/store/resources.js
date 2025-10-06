import store from '../npm/hybrids/src/store.js';

const Resources = {
  checksums: store.record(""),
  // Engine and dynamic DNR lists file checksums
  autoconsent: store.record(0),
  // Timestamps of Opt-out domains resolved by autoconsent
  [store.connect]: {
    get: async () => chrome.storage.local.get("resources").then(({ resources = {} }) => resources),
    set: async (_, values) => {
      await chrome.storage.local.set({
        resources: values
      });
      return values;
    }
  }
};

export { Resources as default };
