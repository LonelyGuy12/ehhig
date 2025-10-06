import './monkey-patch.js';
import convert$1 from '../../npm/@ghostery/urlfilter2dnr/dist/esm/converters/adguard.js';

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


async function convert(filters) {
  try {
    return await convert$1(filters, {
      resourcesPath: '/rule_resources/redirects',
    });
  } catch (err) {
    console.error('Error converting filters:', err);
    return {
      rules: [],
      errors: [err],
    };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'dnr-converter:convert') {
    convert(msg.filters).then(
      (result) => sendResponse(result),
      (err) => sendResponse({ rules: [], errors: [err.message] }),
    );

    return true;
  }
  return false;
});

export { convert };
