/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * @file Common options for all parsers.
 */
/**
 * Default parser options.
 */
const defaultParserOptions = Object.freeze({
    tolerant: false,
    isLocIncluded: true,
    parseAbpSpecificRules: true,
    parseUboSpecificRules: true,
    includeRaws: true,
    ignoreComments: false,
    parseHostRules: false,
});

export { defaultParserOptions };
