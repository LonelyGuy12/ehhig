import { BaseSerializer } from './base-serializer.js';
import { isUndefined } from '../utils/type-guards.js';
import { NULL } from '../utils/constants.js';
import { EmptyRuleMarshallingMap } from '../marshalling-utils/empty-rule-common.js';
import { BinaryTypeMarshallingMap } from '../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Serializer for empty rule nodes.
 */
class EmptyRuleSerializer extends BaseSerializer {
    /**
     * Serializes an empty rule node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.EmptyRule);
        if (!isUndefined(node.start)) {
            buffer.writeUint8(EmptyRuleMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(EmptyRuleMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { EmptyRuleSerializer };
