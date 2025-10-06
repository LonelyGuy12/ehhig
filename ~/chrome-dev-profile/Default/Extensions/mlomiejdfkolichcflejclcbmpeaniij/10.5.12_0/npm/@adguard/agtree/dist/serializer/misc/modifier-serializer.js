import { NULL } from '../../utils/constants.js';
import { ValueSerializer } from './value-serializer.js';
import { isUndefined } from '../../utils/type-guards.js';
import { BaseSerializer } from '../base-serializer.js';
import { ModifierNodeMarshallingMap, FREQUENT_MODIFIERS_SERIALIZATION_MAP, FREQUENT_REDIRECT_MODIFIERS_SERIALIZATION_MAP } from '../../marshalling-utils/misc/modifier-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `ModifierSerializer` is responsible for serializing modifiers.
 *
 * @example
 * `match-case`, `~third-party`, `domain=example.com|~example.org`
 */
class ModifierSerializer extends BaseSerializer {
    /**
     * Serializes a modifier node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.ModifierNode);
        buffer.writeUint8(ModifierNodeMarshallingMap.Name);
        ValueSerializer.serialize(node.name, buffer, FREQUENT_MODIFIERS_SERIALIZATION_MAP);
        if (!isUndefined(node.value)) {
            buffer.writeUint8(ModifierNodeMarshallingMap.Value);
            ValueSerializer.serialize(node.value, buffer, FREQUENT_REDIRECT_MODIFIERS_SERIALIZATION_MAP.get(node.name.value));
        }
        buffer.writeUint8(ModifierNodeMarshallingMap.Exception);
        buffer.writeUint8(node.exception ? 1 : 0);
        if (!isUndefined(node.start)) {
            buffer.writeUint8(ModifierNodeMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(ModifierNodeMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { ModifierSerializer };
