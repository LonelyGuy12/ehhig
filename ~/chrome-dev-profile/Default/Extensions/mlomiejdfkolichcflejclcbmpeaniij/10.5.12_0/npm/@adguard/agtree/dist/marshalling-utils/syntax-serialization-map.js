import { AdblockSyntax } from '../utils/adblockers.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Value map for binary serialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION}!
 *
 * @note Only 256 values can be represented this way.
 */
let syntaxSerializationMap;
const getSyntaxSerializationMap = () => {
    if (!syntaxSerializationMap) {
        syntaxSerializationMap = new Map([
            [AdblockSyntax.Common, 0],
            [AdblockSyntax.Abp, 1],
            [AdblockSyntax.Adg, 2],
            [AdblockSyntax.Ubo, 3],
        ]);
    }
    return syntaxSerializationMap;
};

export { getSyntaxSerializationMap };
