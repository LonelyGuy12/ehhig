import { BaseDeserializer } from './base-deserializer.js';
import { RuleCategory } from '../nodes/index.js';
import { NULL } from '../utils/constants.js';
import { InvalidRuleErrorNodeDeserializer } from './invalid-rule-error-node-deserializer.js';
import { InvalidRuleMarshallingMap } from '../marshalling-utils/invalid-rule-common.js';
import { BinaryTypeMarshallingMap } from '../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * Deserializer for invalid rule nodes.
 * Converts binary data into invalid rule nodes.
 */
class InvalidRuleDeserializer extends BaseDeserializer {
    /**
     * Deserializes an invalid rule node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.InvalidRule);
        node.type = 'InvalidRule';
        node.category = RuleCategory.Invalid;
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case InvalidRuleMarshallingMap.Error:
                    InvalidRuleErrorNodeDeserializer.deserialize(buffer, node.error = {});
                    break;
                case InvalidRuleMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case InvalidRuleMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}.`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { InvalidRuleDeserializer };
