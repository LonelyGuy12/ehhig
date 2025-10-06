import { getSyntaxSerializationMap } from '../marshalling-utils/syntax-serialization-map.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
let syntaxDeserializationMap;
const getSyntaxDeserializationMap = () => {
    if (!syntaxDeserializationMap) {
        syntaxDeserializationMap = new Map(Array.from(getSyntaxSerializationMap(), ([key, value]) => [value, key]));
    }
    return syntaxDeserializationMap;
};

export { getSyntaxDeserializationMap };
