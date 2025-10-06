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
const AgentNodeMarshallingMap = {
    Adblock: 1,
    Version: 2,
    Start: 3,
    End: 4,
};
/**
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
const FREQUENT_AGENTS_DESERIALIZATION_MAP = new Map([
    // AdGuard
    [0, 'AdGuard'],
    [1, 'ADG'],
    // uBlock Origin
    [2, 'uBlock Origin'],
    [3, 'uBlock'],
    [4, 'uBO'],
    // Adblock Plus
    [5, 'Adblock Plus'],
    [6, 'AdblockPlus'],
    [7, 'ABP'],
    [8, 'AdBlock'],
]);

export { AgentNodeMarshallingMap, FREQUENT_AGENTS_DESERIALIZATION_MAP };
