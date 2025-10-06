/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * Property map for binary serialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent a property.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION}!
 *
 * @note Only 256 values can be represented this way.
 */
const HintNodeMarshallingMap = {
    Name: 1,
    Params: 2,
    Start: 3,
    End: 4,
};
/**
 * Value map for binary serialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION}!
 *
 * @note Only 256 values can be represented this way.
 */
const FREQUENT_HINTS_SERIALIZATION_MAP = new Map([
    ['NOT_OPTIMIZED', 0],
    ['PLATFORM', 1],
    ['NOT_PLATFORM', 2],
]);
/**
 * Value map for binary serialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION}!
 *
 * @note Only 256 values can be represented this way.
 */
const FREQUENT_PLATFORMS_SERIALIZATION_MAP = new Map([
    ['windows', 0],
    ['mac', 1],
    ['android', 2],
    ['ios', 3],
    ['ext_chromium', 4],
    ['ext_ff', 5],
    ['ext_edge', 6],
    ['ext_opera', 7],
    ['ext_safari', 8],
    ['ext_android_cb', 9],
    ['ext_ublock', 10],
]);

export { FREQUENT_HINTS_SERIALIZATION_MAP, FREQUENT_PLATFORMS_SERIALIZATION_MAP, HintNodeMarshallingMap };
