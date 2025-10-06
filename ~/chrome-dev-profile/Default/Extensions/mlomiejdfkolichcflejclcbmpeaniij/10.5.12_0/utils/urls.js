import { isSafari, isOpera, isEdge } from './browser-info.js';
import { debugMode, stagingMode } from './debug.js';

const GHOSTERY_DOMAIN = debugMode ? "ghosterystage.com" : "ghostery.com";
const HOME_PAGE_URL = `https://www.${GHOSTERY_DOMAIN}/`;
const WTM_PAGE_URL = `https://www.${GHOSTERY_DOMAIN}/whotracksme`;
const SUPPORT_PAGE_URL = `https://www.${GHOSTERY_DOMAIN}/support`;
const WHATS_NEW_PAGE_URL = `https://www.${GHOSTERY_DOMAIN}/blog/ghostery-extension-v10-5?embed=1&utm_campaign=whatsnew`;
const REVIEW_PAGE_URL = (() => {
  if (isSafari()) return "https://mygho.st/ReviewSafariPanel";
  if (isOpera()) return "https://mygho.st/ReviewOperaPanel";
  if (isEdge()) return "https://mygho.st/ReviewEdgePanel";
  return "https://mygho.st/ReviewChromePanel";
})();
const BECOME_A_CONTRIBUTOR_PAGE_URL = isSafari() ? "ghosteryapp://www.ghostery.com" : "https://www.ghostery.com/become-a-contributor";
const ENGINE_CONFIGS_ROOT_URL = `https://${stagingMode ? "staging-" : ""}cdn.ghostery.com/adblocker/configs`;
const CDN_URL = stagingMode ? "https://staging-cdn.ghostery.com/" : "https://cdn.ghostery.com/";

export { BECOME_A_CONTRIBUTOR_PAGE_URL, CDN_URL, ENGINE_CONFIGS_ROOT_URL, GHOSTERY_DOMAIN, HOME_PAGE_URL, REVIEW_PAGE_URL, SUPPORT_PAGE_URL, WHATS_NEW_PAGE_URL, WTM_PAGE_URL };
