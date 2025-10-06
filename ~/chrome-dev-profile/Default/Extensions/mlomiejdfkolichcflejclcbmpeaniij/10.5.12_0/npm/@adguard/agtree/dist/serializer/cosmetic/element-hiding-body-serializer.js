import { BaseSerializer } from '../base-serializer.js';
import { ValueSerializer } from '../misc/value-serializer.js';
import { isUndefined } from '../../utils/type-guards.js';
import { NULL } from '../../utils/constants.js';
import { ElementHidingRuleMarshallingMap } from '../../marshalling-utils/cosmetic/body/element-hiding-body-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Serializer for element hiding rule body nodes.
 */
class ElementHidingBodySerializer extends BaseSerializer {
    /**
     * Serializes an element hiding rule body node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.ElementHidingRuleBody);
        buffer.writeUint8(ElementHidingRuleMarshallingMap.SelectorList);
        ValueSerializer.serialize(node.selectorList, buffer);
        if (!isUndefined(node.start)) {
            buffer.writeUint8(ElementHidingRuleMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(ElementHidingRuleMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { ElementHidingBodySerializer };
