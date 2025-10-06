import '../npm/tldts-experimental/npm/tldts-core/dist/es6/src/options.js';
import '../npm/@ghostery/adblocker/dist/esm/data-view.js';
import '../npm/@ghostery/adblocker/dist/esm/fetch.js';
import '../npm/@ghostery/adblocker/dist/esm/filters/cosmetic.js';
import { parseFilters } from '../npm/@ghostery/adblocker/dist/esm/lists.js';
import '../npm/@ghostery/adblocker/dist/esm/request.js';
import '../npm/@remusao/small/dist/esm/index.js';
import '../npm/@ghostery/adblocker/dist/esm/filters/network.js';
import '../npm/@ghostery/adblocker/dist/esm/preprocessor.js';
import { init, create, ELEMENT_PICKER_ENGINE, remove, FIXES_ENGINE } from '../utils/engines.js';
import ElementPickerSelectors from '../store/element-picker-selectors.js';
import { setup, reloadMainEngine } from './adblocker.js';
import store from '../npm/hybrids/src/store.js';

/**
 * Ghostery Browser Extension
 * https://www.ghostery.com/
 *
 * Copyright 2017-present Ghostery GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0
 */


// Observe element picker selectors to update the adblocker engine
store.observe(ElementPickerSelectors, async (_, model, lastModel) => {
  let entries = Object.entries(model.hostnames);

  // Skip update if there is no change in the model
  if (!lastModel) {
    // and there is no entries, so engine is not needed
    if (!entries.length) return;
    // or engine already exists and it initializes correctly
    if (await init(ELEMENT_PICKER_ENGINE)) return;
  }

  if (entries.length) {
    const elementPickerFilters = entries.reduce(
      (acc, [hostname, selectors]) => {
        for (const selector of selectors) {
          acc.push(`${hostname}##${selector}`);
        }
        return acc;
      },
      [],
    );

    const { cosmeticFilters } = parseFilters(elementPickerFilters.join('\n'));

    create(ELEMENT_PICKER_ENGINE, {
      cosmeticFilters,
      config: (await init(FIXES_ENGINE)).config,
    });

    console.log(
      `[element-picker] Engine updated with ${
        elementPickerFilters.length
      } selectors for ${entries.length} hostnames`,
    );
  } else {
    remove(ELEMENT_PICKER_ENGINE);
    console.log('[element-picker] No selectors - engine removed');
  }

  setup.pending && (await setup.pending);
  await reloadMainEngine();
});

// Initialize element picker selectors
// to ensure that store.observe() is called
store.resolve(ElementPickerSelectors);
