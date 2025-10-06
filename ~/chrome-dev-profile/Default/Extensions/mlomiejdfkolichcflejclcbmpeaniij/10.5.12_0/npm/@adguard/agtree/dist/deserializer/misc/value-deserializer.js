import { NULL, EMPTY } from '../../utils/constants.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { ValueNodeMarshallingMap } from '../../marshalling-utils/misc/value-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Value deserializer.
 */
class ValueDeserializer extends BaseDeserializer {
    /**
     * Deserializes a value node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @param frequentValuesMap Optional map of frequent values.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node, frequentValuesMap) {
        buffer.assertUint8(BinaryTypeMarshallingMap.ValueNode);
        node.type = 'Value';
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case ValueNodeMarshallingMap.Value:
                    node.value = buffer.readString();
                    break;
                case ValueNodeMarshallingMap.FrequentValue:
                    node.value = frequentValuesMap?.get(buffer.readUint8()) ?? EMPTY;
                    break;
                case ValueNodeMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case ValueNodeMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { ValueDeserializer };
