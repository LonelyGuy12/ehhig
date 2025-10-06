import store from '../npm/hybrids/src/store.js';

const ElementPickerSelectors = {
  hostnames: store.record([String]),
  [store.connect]: {
    get: async () => {
      const { elementPickerSelectors = {} } = await chrome.storage.local.get([
        "elementPickerSelectors"
      ]);
      return elementPickerSelectors;
    },
    set: async (id, values) => {
      await chrome.storage.local.set({
        elementPickerSelectors: values
      });
      return values;
    }
  }
};
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.elementPickerSelectors) {
    store.sync(ElementPickerSelectors, changes.elementPickerSelectors.newValue);
  }
});

export { ElementPickerSelectors as default };
