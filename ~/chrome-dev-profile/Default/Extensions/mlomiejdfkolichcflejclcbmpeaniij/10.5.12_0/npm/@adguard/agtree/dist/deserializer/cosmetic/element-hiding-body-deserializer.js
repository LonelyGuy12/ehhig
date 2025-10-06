import { BaseDeserializer } from '../base-deserializer.js';
import { NULL } from '../../utils/constants.js';
import { ElementHidingRuleMarshallingMap } from '../../marshalling-utils/cosmetic/body/element-hiding-body-common.js';
import { ValueDeserializer } from '../misc/value-deserializer.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * Deserializes element hiding rule body nodes from binary data.
 * Populates the provided node with the deserialized data.
 */
class ElementHidingBodyDeserializer extends BaseDeserializer {
    /**
     * Deserializes an element hiding rule body node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     */
    static deserializeElementHidingBody(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.ElementHidingRuleBody);
        node.type = 'ElementHidingRuleBody';
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case ElementHidingRuleMarshallingMap.SelectorList:
                    ValueDeserializer.deserialize(buffer, node.selectorList = {});
                    break;
                case ElementHidingRuleMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case ElementHidingRuleMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Unknown property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { ElementHidingBodyDeserializer };
