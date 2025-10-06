import { getOffscreenImageData } from '../ui/wheel.js';
import { order } from '../ui/categories.js';
import DailyStats from '../store/daily-stats.js';
import Options, { getPausedDetails } from '../store/options.js';
import { isSerpSupported } from '../utils/opera.js';
import { addListener } from '../utils/options-observer.js';
import AutoSyncingMap from '../utils/map.js';
import { getMetadata, getUnidentifiedTracker } from '../utils/trackerdb.js';
import ExtendedRequest from '../utils/request.js';
import { isWebkit, isOpera } from '../utils/browser-info.js';
import { sendRequests } from './logger.js';
import store from '../npm/hybrids/src/store.js';

const tabStats = new AutoSyncingMap({ storageKey: "tabStats:v1" });
const chromeAction = chrome.action || chrome.browserAction;
const { icons } = chrome.runtime.getManifest();
{
  Object.keys(icons).forEach((key) => {
    icons[key] = `/${icons[key]}`;
  });
}
const inactiveIcons = Object.keys(icons).reduce((acc, key) => {
  acc[key] = icons[key].replace(".", "-inactive.");
  return acc;
}, {});
function setBadgeColor(color = "#3f4146") {
  chromeAction.setBadgeBackgroundColor({ color });
}
addListener("terms", async function stats(terms) {
  if (!terms) {
    await chromeAction.setBadgeText({ text: "!" });
    setBadgeColor(
      "#f13436"
      /* danger-500 */
    );
  } else {
    await chromeAction.setBadgeText({ text: "" });
    setBadgeColor();
  }
});
async function hasAccessToPage(tabId) {
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, css: "" });
    return true;
  } catch {
    return false;
  }
}
async function refreshIcon(tabId) {
  const options = await store.resolve(Options);
  if (isOpera() && options.terms) {
    isSerpSupported().then(async (supported) => {
      if (!supported) {
        setBadgeColor(
          await hasAccessToPage(tabId) ? void 0 : "#f13436"
        );
      }
    });
  }
  const stats2 = tabStats.get(tabId);
  if (!stats2) return;
  const inactive = !options.terms || !!getPausedDetails(options, stats2.hostname);
  const data = {};
  if (options.trackerWheel && stats2.trackers.length > 0) {
    data.imageData = getOffscreenImageData(
      128,
      stats2.trackers.map((t) => t.category),
      { grayscale: inactive }
    );
  } else {
    data.path = inactive ? inactiveIcons : icons;
  }
  chromeAction.setIcon({ tabId, ...data }, () => {
    if (chrome.runtime.lastError) {
      console.error(
        "setIcon failed for tabId",
        tabId,
        "(most likely the tab was closed)",
        chrome.runtime.lastError
      );
    }
  });
  if (Options.trackerCount) {
    try {
      await chromeAction.setBadgeText({
        tabId,
        text: options.trackerCount ? String(stats2.trackers.length) : ""
      });
    } catch (e) {
      console.error("Error while trying update the badge", e);
    }
  }
}
const delayMap = /* @__PURE__ */ new Map();
function updateIcon(tabId, force) {
  if (delayMap.has(tabId)) {
    if (!force) return;
    clearTimeout(delayMap.get(tabId));
  }
  delayMap.set(
    tabId,
    setTimeout(
      () => {
        delayMap.delete(tabId);
        refreshIcon(tabId);
      },
      // Firefox flickers when updating the icon, so we should expand the debounce delay
      250
    )
  );
  refreshIcon(tabId);
}
const REQUESTS_LIMIT = 100;
const OBSERVED_REQUESTS_LIMIT = 25;
async function pushTabStats(stats2, requests) {
  const options = await store.resolve(Options);
  let trackersUpdated = false;
  sendRequests(requests);
  for (const request of requests) {
    const metadata = getMetadata(request) || (request.blocked || request.modified || options.exceptions[request.hostname]) && getUnidentifiedTracker(request.hostname);
    if (metadata) {
      let tracker = stats2.trackers.find((t) => t.id === metadata.id);
      if (!tracker) {
        tracker = { ...metadata, requests: [] };
        stats2.trackers.push(tracker);
        trackersUpdated = true;
      }
      const savedRequest = tracker.requests.find((r) => r.url === request.url);
      if (savedRequest) {
        savedRequest.blocked = savedRequest.blocked || request.blocked;
        tracker.blocked = tracker.blocked || savedRequest.blocked;
        savedRequest.modified = savedRequest.modified || request.modified;
        tracker.modified = tracker.modified || savedRequest.modified;
      } else {
        tracker.requestsCount = (tracker.requestsCount || 0) + 1;
        tracker.blocked = tracker.blocked || request.blocked;
        tracker.modified = tracker.modified || request.modified;
        if (tracker.requests.length > REQUESTS_LIMIT) {
          tracker.requests = tracker.requests.slice(0, REQUESTS_LIMIT - 1);
        }
        if (request.blocked || request.modified || tracker.requests.filter((r) => !r.blocked && !r.modified).length < OBSERVED_REQUESTS_LIMIT) {
          tracker.requests.unshift({
            id: request.requestId,
            url: request.url,
            blocked: request.blocked,
            modified: request.modified
          });
        }
      }
    }
  }
  return trackersUpdated;
}
const deferred = Promise.resolve();
async function updateTabStats(tabId, requests) {
  await deferred;
  const stats2 = tabStats.get(tabId);
  if (!stats2) return;
  if (stats2.incognito === void 0) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    stats2.incognito = tab?.incognito ?? false;
  }
  requests = requests.filter(
    // As a fallback, we assume that the request is from the origin URL
    (request) => !request.sourceHostname || request.sourceHostname.endsWith(stats2.hostname)
  );
  let trackersUpdated = await pushTabStats(stats2, requests);
  if (isWebkit() && chrome.declarativeNetRequest.getMatchedRules) {
    try {
      const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules({
        tabId,
        minTimeStamp: stats2.timestamp
      });
      const notFoundRequests = [];
      for (const info of rulesMatchedInfo) {
        if (!info.request || !info.request.url) break;
        let found = false;
        for (const tracker of stats2.trackers) {
          for (const request of tracker.requests) {
            if (request.url === info.request.url) {
              found = true;
              request.blocked = true;
              tracker.blocked = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          const request = ExtendedRequest.fromRequestDetails({
            url: info.request.url,
            originUrl: stats2.url
          });
          request.blocked = true;
          notFoundRequests.push(request);
        }
      }
      if (notFoundRequests.length) {
        trackersUpdated = await pushTabStats(stats2, notFoundRequests) || trackersUpdated;
      }
    } catch (e) {
      console.error("[stats] Failed to get matched rules for stats", e);
    }
  }
  if (stats2 === tabStats.get(tabId)) {
    tabStats.set(tabId, stats2);
    if (trackersUpdated) {
      updateIcon(tabId);
      stats2.trackers.sort(
        (a, b) => order.indexOf(a.category) - order.indexOf(b.category)
      );
    }
  }
}
async function flushTabStatsToDailyStats(tabId) {
  const stats2 = tabStats.get(tabId);
  if (!stats2 || !stats2.trackers.length || stats2.incognito) return;
  let trackersBlocked = 0;
  let trackersModified = 0;
  for (const tracker of stats2.trackers) {
    trackersBlocked += tracker.blocked ? 1 : 0;
    trackersModified += tracker.modified ? 1 : 0;
  }
  const dailyStats = await store.resolve(
    DailyStats,
    (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  );
  await store.set(dailyStats, {
    trackersBlocked: dailyStats.trackersBlocked + trackersBlocked,
    trackersModified: dailyStats.trackersModified + trackersModified,
    pages: dailyStats.pages + 1,
    patterns: [
      .../* @__PURE__ */ new Set([...dailyStats.patterns, ...stats2.trackers.map((t) => t.id)])
    ]
  });
}
const PANEL_URL = chrome.runtime.getURL("pages/panel/index.html");
function setupTabStats(details) {
  if (details.url === PANEL_URL) return;
  flushTabStatsToDailyStats(details.tabId);
  const request = ExtendedRequest.fromRequestDetails(details);
  if (request.isHttp || request.isHttps) {
    tabStats.set(details.tabId, {
      hostname: request.hostname,
      domain: request.domain,
      url: request.url,
      trackers: [],
      timestamp: details.timeStamp
    });
  } else {
    tabStats.delete(details.tabId);
  }
  updateIcon(details.tabId, true);
}
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.tabId > -1 && details.parentFrameId === -1) {
    setupTabStats(details);
  }
});
{
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (sender.url && sender.frameId !== void 0 && sender.tab?.id > -1) {
      switch (msg.action) {
        case "stats:update":
          updateTabStats(
            sender.tab.id,
            msg.urls.map(
              (url) => ExtendedRequest.fromRequestDetails({
                url,
                originUrl: sender.url,
                tabId: sender.tab.id,
                requestId: Math.random().toString(36).substring(2, 20)
              })
            )
          );
          break;
      }
    }
    return false;
  });
}
if (chrome.webRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.tabId < 0 || details.type === "main_frame") return;
      const request = ExtendedRequest.fromRequestDetails(details);
      updateTabStats(details.tabId, [request]);
    },
    {
      urls: ["<all_urls>"]
    }
  );
  chrome.webRequest.onBeforeRedirect.addListener(
    (details) => {
      if (details.redirectUrl.startsWith("chrome-extension://")) {
        const request = ExtendedRequest.fromRequestDetails(details);
        request.blocked = true;
        updateTabStats(details.tabId, [request]);
      }
    },
    { urls: ["<all_urls>"] }
  );
  chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (details.error === "net::ERR_BLOCKED_BY_CLIENT") {
        const stats2 = tabStats.get(details.tabId);
        if (!stats2) return;
        for (const tracker of stats2.trackers) {
          for (const request2 of tracker.requests) {
            if (request2.id === details.requestId) {
              request2.blocked = true;
              tracker.blocked = true;
            }
          }
        }
        const request = ExtendedRequest.fromRequestDetails(details);
        request.blocked = true;
        updateTabStats(details.tabId, [request]);
      }
    },
    {
      urls: ["<all_urls>"]
    }
  );
}
chrome.tabs.onRemoved.addListener((tabId) => {
  flushTabStatsToDailyStats(tabId);
  tabStats.delete(tabId);
});

export { tabStats, updateTabStats };
