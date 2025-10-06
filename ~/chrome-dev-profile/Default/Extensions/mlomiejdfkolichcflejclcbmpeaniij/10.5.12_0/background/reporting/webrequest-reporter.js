import '../../npm/@whotracksme/reporting/reporting/src/patterns.js';
import '../../npm/@whotracksme/reporting/reporting/src/logger.js';
import '../../npm/tldts-experimental/npm/tldts-core/dist/es6/src/options.js';
import '../../npm/@whotracksme/reporting/reporting/src/pages.js';
import '../../npm/@whotracksme/reporting/reporting/src/http.js';
import '../../npm/linkedom/esm/cached.js';
import RequestReporter from '../../npm/@whotracksme/reporting/reporting/src/request/index.js';
import { getPausedDetails } from '../../store/options.js';
import ExtendedRequest from '../../utils/request.js';
import { addListener } from '../../utils/options-observer.js';
import Config, { ACTION_DISABLE_ANTITRACKING_MODIFICATION } from '../../store/config.js';
import { updateTabStats } from '../stats.js';
import config from './config.js';
import communication from './communication.js';
import urlReporter from './url-reporter.js';
import store from '../../npm/hybrids/src/store.js';

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


let webRequestReporter = null;

if (chrome.webRequest) {
  let options = {};
  addListener(function webRequestReporting(value) {
    options = value;
  });

  let remoteConfig;
  store.resolve(Config).then((remote) => {
    remoteConfig = remote;
  });

  webRequestReporter = new RequestReporter(config.request, {
    onMessageReady: urlReporter.forwardRequestReporterMessage.bind(urlReporter),
    countryProvider: urlReporter.countryProvider,
    trustedClock: communication.trustedClock,
    isRequestAllowed: (state) => {
      const hostname = state.tabUrlParts.hostname;
      return (
        !options.blockTrackers ||
        !!getPausedDetails(options, hostname) ||
        remoteConfig?.hasAction(
          hostname,
          ACTION_DISABLE_ANTITRACKING_MODIFICATION,
        )
      );
    },
    onTrackerInteraction: (event, state) => {
      if (event === 'observed') {
        return;
      }

      const request = ExtendedRequest.fromRequestDetails({
        url: state.url,
        originUrl: state.tabUrl,
      });
      request.modified = true;

      updateTabStats(state.tabId, [request]);
    },
  });

  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.action === 'mousedown') {
      webRequestReporter.recordClick(msg.event, msg.context, msg.href, sender);
    }
  });
}

const webRequestReporter$1 = webRequestReporter;

export { webRequestReporter$1 as default };
