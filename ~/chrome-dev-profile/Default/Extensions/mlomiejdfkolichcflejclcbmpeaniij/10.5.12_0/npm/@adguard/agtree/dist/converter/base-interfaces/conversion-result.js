/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * @file Conversion result interface and helper functions
 */
/**
 * Helper function to create a generic conversion result.
 *
 * @param result Conversion result
 * @param isConverted Indicates whether the input item was converted
 * @template T Type of the item to convert
 * @template U Type of the conversion result (defaults to `T`, but can be `T[]` as well)
 * @returns Generic conversion result
 */
// eslint-disable-next-line max-len
function createConversionResult(result, isConverted) {
    return {
        result,
        isConverted,
    };
}
/**
 * Helper function to create a node conversion result.
 *
 * @param nodes Array of nodes
 * @param isConverted Indicates whether the input item was converted
 * @template T Type of the node (extends `Node`)
 * @returns Node conversion result
 */
function createNodeConversionResult(nodes, isConverted) {
    return createConversionResult(nodes, isConverted);
}

export { createConversionResult, createNodeConversionResult };
