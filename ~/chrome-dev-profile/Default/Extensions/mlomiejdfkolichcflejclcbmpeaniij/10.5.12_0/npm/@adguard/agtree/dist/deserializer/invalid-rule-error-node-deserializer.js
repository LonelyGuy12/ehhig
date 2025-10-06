import { BaseDeserializer } from './base-deserializer.js';
import { NULL } from '../utils/constants.js';
import { InvalidRuleErrorNodeMarshallingMap } from '../marshalling-utils/invalid-rule-error-node-common.js';
import { BinaryTypeMarshallingMap } from '../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * Deserializer for invalid rule error nodes.
 * Converts binary data into invalid rule error nodes.
 */
class InvalidRuleErrorNodeDeserializer extends BaseDeserializer {
    /**
     * Deserializes an invalid rule error node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.InvalidRuleErrorNode);
        node.type = 'InvalidRuleError';
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case InvalidRuleErrorNodeMarshallingMap.Name:
                    node.name = buffer.readString();
                    break;
                case InvalidRuleErrorNodeMarshallingMap.Message:
                    node.message = buffer.readString();
                    break;
                case InvalidRuleErrorNodeMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case InvalidRuleErrorNodeMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}.`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { InvalidRuleErrorNodeDeserializer };
