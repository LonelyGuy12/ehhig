import Options from '../../../store/options.js';
import { GHOSTERY_DOMAIN } from '../../../utils/urls.js';
import __vite_glob_0_5 from './addon-health.js';
import __vite_glob_0_11 from './web-trackers.js';
import __vite_glob_0_7 from './performance.js';
import __vite_glob_0_8 from './privacy.js';
import __vite_glob_0_9 from './skip.js';
import Success from './success.js';
import router from '../../../npm/hybrids/src/router.js';
import { msg } from '../../../npm/hybrids/src/localize.js';
import { html } from '../../../npm/hybrids/src/template/index.js';
import store from '../../../npm/hybrids/src/store.js';

const TERMS_AND_CONDITIONS_URL = `https://www.${GHOSTERY_DOMAIN}/privacy/ghostery-terms-and-conditions?utm_source=gbe&utm_campaign=onboarding`;
function acceptTerms(host, event) {
  router.resolve(
    event,
    store.set(Options, {
      terms: true,
      feedback: host.feedback,
      // Engines are initialized for the first time from CDN after onboarding,
      // so we need to update the timestamp to current time
      filtersUpdatedAt: Date.now()
    })
  );
}
const Main = {
  [router.connect]: {
    stack: () => [__vite_glob_0_5, __vite_glob_0_11, __vite_glob_0_7, __vite_glob_0_8, __vite_glob_0_9]
  },
  feedback: true,
  render: ({ feedback }) => html`
    <template layout="column gap:2">
      <ui-card layout="gap:2" layout@390px="gap:3">
        <section layout="block:center column gap" layout@390px="margin:2:0:1">
          <ui-text type="body-m">Welcome to Ghostery</ui-text>
          <ui-text type="display-m">Enable Ghostery to get started</ui-text>
        </section>
        <div layout="column gap:2">
          <ui-text type="display-2xs" layout="block:center">
            Your Community‑Powered Privacy Features:
          </ui-text>
          <div layout="grid:3 gap">
            <onboarding-feature icon="onboarding-adblocking">
              Ad-Blocking
            </onboarding-feature>
            <onboarding-feature icon="onboarding-anti-tracking">
              Anti-Tracking
            </onboarding-feature>
            <onboarding-feature icon="onboarding-never-consent">
              Never-Consent
            </onboarding-feature>
          </div>
        </div>
        <div layout="column gap:2">
          ${false}
          ${html`
            <ui-text type="body-s" underline data-qa="text:description">
              ${msg.html`
                Information about <a href="${router.url(__vite_glob_0_11)}">web trackers</a>,
                <a href="${router.url(__vite_glob_0_5)}">add-on's health</a>, and
                <a href="${router.url(__vite_glob_0_7)}">performance telemetry</a>
                will be shared in accordance with our <a href="${router.url(__vite_glob_0_8)}" target="_blank" rel="noreferrer">Privacy Policy</a>,
                advancing privacy protection for the Ghostery community.
              `}
            </ui-text>
          `}
          <ui-text type="body-s">
            Ghostery uses this information to provide its community-powered
            privacy features, ensuring that personal information—such as
            passwords, browsing history, and page content—is never collected.
          </ui-text>
        </div>
        <div layout="column gap:2">
          <ui-button type="success" layout="height:5.5" data-qa="button:enable">
            <a href="${router.url(Success)}" onclick="${acceptTerms}">
              Enable Ghostery
            </a>
          </ui-button>
          <onboarding-error-card layout="margin:top">
            <ui-text
              type="body-s"
              color="danger-secondary"
              layout="block:center"
            >
              With Ghostery disabled, only the basic functionality of naming
              trackers is available.
            </ui-text>
            <ui-button type="outline-danger" data-qa="button:skip">
              <a href="${router.url(__vite_glob_0_9)}">Keep Disabled</a>
            </ui-button>
          </onboarding-error-card>
        </div>
      </ui-card>
      <ui-button type="transparent" layout="self:center">
        <a href="${TERMS_AND_CONDITIONS_URL}" target="_blank">
          Terms & Conditions
        </a>
      </ui-button>
    </template>
  `
};

export { Main as default };
