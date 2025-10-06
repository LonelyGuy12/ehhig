/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * A simple function to check if the current browser is Chromium-based.
 *
 * @returns `true` if the current browser is Chromium-based, `false` otherwise.
 * @see {@link https://stackoverflow.com/a/62797156}
 */
const isChromium = () => {
    return typeof window !== 'undefined'
        && (Object.prototype.hasOwnProperty.call(window, 'chrome')
            || (typeof window.navigator !== 'undefined'
                && /chrome/i.test(window.navigator.userAgent)));
};

export { isChromium };
