import store from '../../../npm/hybrids/src/store.js';

const Tab = {
  id: true,
  title: '',
  hostname: '',
  active: false,
  [store.connect]: {
    async list() {
      const tabs = await chrome.tabs.query({});
      return tabs
        .filter(({ url }) => url !== location.href)
        .map((tab) => ({
          id: tab.id,
          title: tab.title,
          hostname: new URL(tab.url).hostname,
          active: tab.active,
        }));
    },
  },
};

export { Tab as default };
