import Options from '../store/options.js';
import ManagedConfig from '../store/managed-config.js';
import { getBrowser, getOS, isWebkit } from '../utils/browser-info.js';
import { openNotification } from './notifications.js';
import store from '../npm/hybrids/src/store.js';

const browser = getBrowser();
const os = getOS();
if (browser.name !== "oculus" && os !== "android" && !isWebkit()) {
  chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId !== 0 || (await chrome.action.getUserSettings()).isOnToolbar) {
      return;
    }
    const { onboarding, terms } = await store.resolve(Options);
    const managedConfig = await store.resolve(ManagedConfig);
    if (
      // Terms not accepted
      !terms || // Managed config disables the notification
      managedConfig.disableUserControl || managedConfig.disableOnboarding || // The notification was already shown
      onboarding.pinIt
    ) {
      return false;
    }
    openNotification({
      tabId: details.tabId,
      id: "pin-it",
      position: "center"
    });
  });
}
