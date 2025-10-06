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
const MetadataCommentMarshallingMap = {
    Marker: 1,
    Header: 2,
    Value: 3,
    Start: 4,
    End: 5,
};
/**
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
const FREQUENT_HEADERS_DESERIALIZATION_MAP = new Map([
    [1, 'Checksum'],
    [2, 'Description'],
    [3, 'Expires'],
    [4, 'Homepage'],
    [5, 'Last Modified'],
    [6, 'LastModified'],
    [7, 'Licence'],
    [8, 'License'],
    [9, 'Time Updated'],
    [10, 'TimeUpdated'],
    [11, 'Version'],
    [12, 'Title'],
]);

export { FREQUENT_HEADERS_DESERIALIZATION_MAP, MetadataCommentMarshallingMap };
