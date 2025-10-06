import { NULL } from '../../utils/constants.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { HintNodeMarshallingMap, FREQUENT_PLATFORMS_SERIALIZATION_MAP, FREQUENT_HINTS_SERIALIZATION_MAP } from '../../marshalling-utils/comment/hint-common.js';
import { ValueDeserializer } from '../misc/value-deserializer.js';
import { ParameterListDeserializer } from '../misc/parameter-list-deserializer.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
let frequentHintsDeserializationMap;
const getFrequentHintsDeserializationMap = () => {
    if (!frequentHintsDeserializationMap) {
        frequentHintsDeserializationMap = new Map(Array.from(FREQUENT_HINTS_SERIALIZATION_MAP).map(([key, value]) => [value, key]));
    }
    return frequentHintsDeserializationMap;
};
/**
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
let frequentPlatformsDeserializationMap;
const getFrequentPlatformsDeserializationMap = () => {
    if (!frequentPlatformsDeserializationMap) {
        frequentPlatformsDeserializationMap = new Map(Array.from(FREQUENT_PLATFORMS_SERIALIZATION_MAP).map(([key, value]) => [value, key]));
    }
    return frequentPlatformsDeserializationMap;
};
/**
 * `HintDeserializer` is responsible for deserializing AdGuard hints.
 *
 * @example
 * If the hint rule is
 * ```adblock
 * !+ NOT_OPTIMIZED PLATFORM(windows)
 * ```
 * then the hints are `NOT_OPTIMIZED` and `PLATFORM(windows)`, and this
 * class is responsible for parsing them. The rule itself is parsed by
 * the `HintRuleParser`, which uses this class to parse single hints.
 */
class HintDeserializer extends BaseDeserializer {
    /**
     * Deserializes a hint node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.HintNode);
        node.type = 'Hint';
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case HintNodeMarshallingMap.Name:
                    // eslint-disable-next-line max-len
                    ValueDeserializer.deserialize(buffer, node.name = {}, getFrequentHintsDeserializationMap());
                    break;
                case HintNodeMarshallingMap.Params:
                    // eslint-disable-next-line max-len
                    ParameterListDeserializer.deserialize(buffer, node.params = {}, getFrequentPlatformsDeserializationMap());
                    break;
                case HintNodeMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case HintNodeMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { HintDeserializer, getFrequentPlatformsDeserializationMap };
