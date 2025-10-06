/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * @file Known CSS elements and attributes.
 * TODO: Implement a compatibility table for Extended CSS
 */
/**
 * Legacy Extended CSS attribute prefix.
 *
 * @example
 * ```css
 * [-ext-<name>=...]
 * ```
 */
const LEGACY_EXT_CSS_ATTRIBUTE_PREFIX = '-ext-';
/**
 * ABP Extended CSS prefix.
 *
 * @example
 * ```css
 * [-abp-<name>=...]
 * -abp-<name>(...)
 * ```
 */
const ABP_EXT_CSS_PREFIX = '-abp';
/**
 * Known _strict_ Extended CSS pseudo-classes. Please, keep this list sorted.
 * Strict means that these pseudo-classes are not supported by any browser natively,
 * and they always require Extended CSS libraries to work.
 */
const EXT_CSS_PSEUDO_CLASSES_STRICT = new Set([
    // AdGuard
    // https://github.com/AdguardTeam/ExtendedCss
    'contains',
    'if-not',
    'matches-attr',
    'matches-css',
    'matches-property',
    'nth-ancestor',
    'remove',
    'upward',
    'xpath',
    // uBlock Origin
    // https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#procedural-cosmetic-filters
    'has-text',
    'matches-css-after',
    'matches-css-before',
    'matches-path',
    'min-text-length',
    'watch-attr',
    // Adblock Plus
    // https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide-emulation
    '-abp-contains',
    '-abp-has',
    '-abp-properties',
]);
/**
 * _ALL_ known Extended CSS pseudo-classes. Please, keep this list sorted.
 * It includes strict pseudo-classes and additional pseudo-classes that may be
 * supported by some browsers natively.
 */
const EXT_CSS_PSEUDO_CLASSES = new Set([
    ...EXT_CSS_PSEUDO_CLASSES_STRICT,
    /**
     * https://developer.mozilla.org/en-US/docs/Web/CSS/:has
     */
    'has',
    /**
     * https://developer.mozilla.org/en-US/docs/Web/CSS/:is
     */
    'is',
]);

export { ABP_EXT_CSS_PREFIX, EXT_CSS_PSEUDO_CLASSES, EXT_CSS_PSEUDO_CLASSES_STRICT, LEGACY_EXT_CSS_ATTRIBUTE_PREFIX };
