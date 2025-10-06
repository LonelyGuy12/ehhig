import { parse } from '../npm/tldts-experimental/dist/es6/index.js';
import trackersPreviewCSS from '../content_scripts/trackers-preview.css.js';
import Options, { getPausedDetails } from '../store/options.js';
import { isSerpSupported } from '../utils/opera.js';
import { getWTMStats } from '../utils/wtm-stats.js';
import { isOpera } from '../utils/browser-info.js';
import { openNotification } from './notifications.js';
import store from '../npm/hybrids/src/store.js';

if (isOpera()) {
  const NOTIFICATION_DELAY = 7 * 24 * 60 * 60 * 1e3;
  const NOTIFICATION_SHOW_LIMIT = 4;
  chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId !== 0 || await isSerpSupported()) return;
    const { onboarding, terms } = await store.resolve(Options);
    if (
      // Terms not accepted
      !terms || // The notification was already shown maximum times
      onboarding.serpShown >= NOTIFICATION_SHOW_LIMIT || // The notification was already shown recently
      onboarding.serpShownAt && Date.now() - onboarding.serpShownAt < NOTIFICATION_DELAY
    ) {
      return false;
    }
    openNotification({ tabId: details.tabId, id: "opera-serp" });
  });
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getWTMReport") {
    sendResponse({
      wtmStats: msg.links.map((url) => {
        const { domain } = parse(url);
        return {
          stats: getWTMStats(domain),
          domain
        };
      })
    });
  }
  if (msg.action === "disableWTMReport") {
    store.set(Options, { wtmSerpReport: false });
  }
  return false;
});
const SERP_URL_REGEXP = /^https?:[/][/][^/]*[.](google|bing)[.][a-z]+([.][a-z]+)?([/][a-z]+)*[/]search/;
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.url.match(SERP_URL_REGEXP)) {
    const options = await store.resolve(Options);
    if (options.wtmSerpReport) {
      chrome.scripting.insertCSS({
        target: {
          tabId: details.tabId
        },
        css: trackersPreviewCSS
      });
    }
    if (options.wtmSerpReport || options.serpTrackingPrevention) {
      const files = [];
      if (options.wtmSerpReport) {
        files.push("/content_scripts/trackers-preview.js");
      }
      if (!getPausedDetails(options) && options.serpTrackingPrevention) {
        files.push("/content_scripts/prevent-serp-tracking.js");
      }
      if (files.length === 0) return;
      chrome.scripting.executeScript(
        {
          injectImmediately: true,
          world: chrome.scripting.ExecutionWorld?.ISOLATED ?? "ISOLATED",
          target: {
            tabId: details.tabId
          },
          files
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          }
        }
      );
    }
  }
});
