import { evalSnippets as snippets } from '../npm/@duckduckgo/autoconsent/dist/autoconsent.esm.js';
import rules from '../npm/@duckduckgo/autoconsent/rules/rules.json.js';
import { parse } from '../npm/tldts-experimental/dist/es6/index.js';
import Options, { getPausedDetails } from '../store/options.js';
import Config, { ACTION_DISABLE_AUTOCONSENT } from '../store/config.js';
import Resources from '../store/resources.js';
import store from '../npm/hybrids/src/store.js';

async function initialize(msg, tab, frameId) {
  const [options, config] = await Promise.all([
    store.resolve(Options),
    store.resolve(Config)
  ]);
  if (options.terms && options.blockAnnoyances) {
    const hostname = tab.url ? parse(tab.url).hostname : "";
    if (getPausedDetails(options, hostname) || config.hasAction(hostname, ACTION_DISABLE_AUTOCONSENT)) {
      return;
    }
    try {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "autoconsent",
          type: "initResp",
          rules,
          config: {
            autoAction: options.autoconsent.autoAction,
            enableCosmeticRules: false,
            enableFilterList: false
          }
        },
        {
          frameId
        }
      );
    } catch {
    }
  }
}
async function evalCode(snippetId, id, tabId, frameId) {
  const [result] = await chrome.scripting.executeScript({
    target: {
      tabId,
      frameIds: [frameId]
    },
    world: chrome.scripting.ExecutionWorld?.MAIN ?? ("MAIN"),
    func: snippets[snippetId]
  });
  await chrome.tabs.sendMessage(
    tabId,
    {
      action: "autoconsent",
      id,
      type: "evalResp",
      result: result.result
    },
    {
      frameId
    }
  );
}
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action !== "autoconsent") return;
  if (!sender.tab) return;
  const frameId = sender.frameId;
  switch (msg.type) {
    case "init":
      return initialize(msg, sender.tab, frameId);
    case "eval":
      return evalCode(msg.snippetId, msg.id, sender.tab.id, frameId);
    case "optInResult":
    case "optOutResult": {
      if (msg.result === true) {
        const { domain } = parse(sender.url);
        if (domain) {
          store.set(Resources, { autoconsent: { [domain]: Date.now() } });
        }
      }
      break;
    }
  }
});
