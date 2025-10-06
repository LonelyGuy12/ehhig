import { getBrowser, getOS } from '../../../utils/browser-info.js';
import protection from '../illustrations/protection.js';
import pinExtensionChrome from '../assets/pin-extension-chrome.js';
import pinExtensionEdge from '../assets/pin-extension-edge.js';
import pinExtensionOpera from '../assets/pin-extension-opera.js';
import { html } from '../../../npm/hybrids/src/template/index.js';

let screenshotURL = "";
let type = "";
{
  const { name } = getBrowser();
  if (name === "chrome" || name === "brave" || name === "yandex") {
    screenshotURL = pinExtensionChrome;
    type = "chrome";
  } else if (name === "edge" && getOS() !== "android") {
    screenshotURL = pinExtensionEdge;
    type = "edge";
  } else if (name === "opera") {
    screenshotURL = pinExtensionOpera;
    type = "opera";
  }
}
const Success = {
  render: () => html`
    <template layout="column gap">
      <ui-card data-qa="view:success">
        <section layout="block:center column gap:2">
          <div layout="row center">${protection}</div>
          <ui-text type="display-s">Setup Successful</ui-text>
          <ui-text>
            Ghostery is all set to stop trackers in their tracks and protect
            your privacy while browsing!
          </ui-text>
        </section>
      </ui-card>
      ${screenshotURL && html`
        <ui-card>
          <section layout="column gap:2">
            <ui-text type="display-xs" layout="block:center">
              What’s next?
            </ui-text>
            <img
              src="${screenshotURL}"
              layout="width:::full"
              style="border-radius:8px; overflow:hidden;"
            />
            <div layout="row items:center gap">
              <ui-icon
                name="extension-${type}"
                layout="block inline size:3"
                color="tertiary"
              ></ui-icon>
              <ui-text type="label-m">Pin Extension for easy access</ui-text>
            </div>
            <ui-text>
              Click the puzzle icon next to the search bar and pin Ghostery to
              your toolbar.
            </ui-text>
            <ui-text>
              Ghostery will show how many trackers were blocked on a page.
              Clicking on the Ghostery icon reveals more detailed information.
            </ui-text>
          </section>
        </ui-card>
        <onboarding-pin-it browser="${type}"> Pin it here </onboarding-pin-it>
      `}
    </template>
  `
};

export { Success as default };
