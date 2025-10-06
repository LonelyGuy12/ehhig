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
const ConfigCommentRuleMarshallingMap = {
    Marker: 1,
    Command: 2,
    Params: 3,
    Comment: 4,
    Start: 5,
    End: 6,
};
/**
 * Property map for binary serialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent a property.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION}!
 *
 * @note Only 256 values can be represented this way.
 */
const ConfigNodeMarshallingMap = {
    Value: 1,
    Start: 2,
    End: 3,
};
/**
 * Value map for binary serialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION}!
 *
 * @note Only 256 values can be represented this way.
 *
 * @see {@link https://github.com/AdguardTeam/AGLint/blob/master/src/linter/inline-config.ts}
 */
const FREQUENT_COMMANDS_SERIALIZATION_MAP = new Map([
    ['aglint', 0],
    ['aglint-disable', 1],
    ['aglint-enable', 2],
    ['aglint-disable-next-line', 3],
    ['aglint-enable-next-line', 4],
]);

export { ConfigCommentRuleMarshallingMap, ConfigNodeMarshallingMap, FREQUENT_COMMANDS_SERIALIZATION_MAP };
