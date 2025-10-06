import { BaseSerializer } from './base-serializer.js';
import { isUndefined } from '../utils/type-guards.js';
import { NULL } from '../utils/constants.js';
import { InvalidRuleErrorNodeSerializer } from './invalid-rule-error-node-serializer.js';
import { InvalidRuleMarshallingMap } from '../marshalling-utils/invalid-rule-common.js';
import { BinaryTypeMarshallingMap } from '../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Serializer for invalid rule nodes.
 */
class InvalidRuleSerializer extends BaseSerializer {
    /**
     * Serializes an invalid rule node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.InvalidRule);
        buffer.writeUint8(InvalidRuleMarshallingMap.Error);
        InvalidRuleErrorNodeSerializer.serialize(node.error, buffer);
        if (!isUndefined(node.start)) {
            buffer.writeUint8(InvalidRuleMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(InvalidRuleMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { InvalidRuleSerializer };
