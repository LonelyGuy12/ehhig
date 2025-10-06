import '../../ui/theme.js';
/* empty css                  */
import '../../ui/localize.js';
import '../../ui/elements.js';
import Options from '../../store/options.js';
import { setupNotificationPage } from '../../utils/notifications.js';
import { WHATS_NEW_PAGE_URL } from '../../utils/urls.js';
import whatsNewImage from './assets/whats-new.js';
import store from '../../npm/hybrids/src/store.js';
import mount from '../../npm/hybrids/src/mount.js';
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


const close = setupNotificationPage(390);

store.set(Options, {
  whatsNewVersion: new URLSearchParams(location.search).get('whatsNewVersion'),
});

mount(document.body, {
  render: () => html`
    <template layout="block overflow">
      <ui-notification-dialog onclose="${close}">
        <span slot="title">What’s New in Ghostery</span>
        <img
          src="${whatsNewImage}"
          alt="What's New"
          style="border-radius:8px"
        />
        <ui-text layout="block:center" color="secondary">
          Discover fresh features, key improvements, and upgrades driven by
          community contributions - all in one place.
        </ui-text>
        <ui-button type="wtm" layout="self:center">
          <a href="${WHATS_NEW_PAGE_URL}" target="_blank" onclick="${close}">
            See What's New
          </a>
        </ui-button>
      </ui-notification-dialog>
    </template>
  `,
});
