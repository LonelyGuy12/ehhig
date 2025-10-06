import { NULL } from '../../utils/constants.js';
import { ParameterListSerializer } from '../misc/parameter-list-serializer.js';
import { ValueSerializer } from '../misc/value-serializer.js';
import { isUndefined } from '../../utils/type-guards.js';
import { BaseSerializer } from '../base-serializer.js';
import { HintNodeMarshallingMap, FREQUENT_HINTS_SERIALIZATION_MAP, FREQUENT_PLATFORMS_SERIALIZATION_MAP } from '../../marshalling-utils/comment/hint-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `HintSerializer` is responsible for serializing AdGuard hints.
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
class HintSerializer extends BaseSerializer {
    /**
     * Serializes a hint node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.HintNode);
        buffer.writeUint8(HintNodeMarshallingMap.Name);
        ValueSerializer.serialize(node.name, buffer, FREQUENT_HINTS_SERIALIZATION_MAP);
        if (!isUndefined(node.params)) {
            buffer.writeUint8(HintNodeMarshallingMap.Params);
            ParameterListSerializer.serialize(node.params, buffer, FREQUENT_PLATFORMS_SERIALIZATION_MAP);
        }
        if (!isUndefined(node.start)) {
            buffer.writeUint8(HintNodeMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(HintNodeMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { HintSerializer };
