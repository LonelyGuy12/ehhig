import '../../ui/theme.js';
/* empty css                  */
import '../../ui/localize.js';
import '../../ui/elements.js';
import './elements.js';
/* empty css           */
import Main from './views/main.js';
import { getOS, getBrowser } from '../../utils/browser-info.js';
import mount from '../../npm/hybrids/src/mount.js';
import router from '../../npm/hybrids/src/router.js';
import { html } from '../../npm/hybrids/src/template/index.js';

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

// Mount the app
mount(document.body, {
  stack: router([Main]),
  browserName: { value: getBrowser().name, reflect: true },
  platformName: { value: getOS(), reflect: true },
  render: ({ stack }) => html`<template layout="row">${stack}</template>`,
});

// Ping telemetry on panel open
chrome.runtime.sendMessage({ action: 'telemetry', event: 'engaged' });

// Sync options with background
chrome.runtime.sendMessage({ action: 'syncOptions' });
