import { UINT16_MAX, NULL } from '../../utils/constants.js';
import { isUndefined } from '../../utils/type-guards.js';
import { BaseSerializer } from '../base-serializer.js';
import { ModifierSerializer } from './modifier-serializer.js';
import { ModifierListNodeMarshallingMap } from '../../marshalling-utils/misc/modifier-list-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `ModifierListSerializer` is responsible for serializing modifier lists. Please note that the name is not
 * uniform, "modifiers" are also known as "options".
 *
 * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-modifiers}
 * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#non-basic-rules-modifiers}
 * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#options}
 */
class ModifierListSerializer extends BaseSerializer {
    /**
     * Serializes a modifier list node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.ModifierListNode);
        const count = node.children.length;
        // If there are no children, we do not write any data related to them, to avoid using unnecessary storage,
        // but children is a required field, so during deserialization we should initialize it as an empty array,
        // if there are no children in the binary data.
        if (count) {
            buffer.writeUint8(ModifierListNodeMarshallingMap.Children);
            // note: we store the count, because re-construction of the array is faster if we know the length
            if (count > UINT16_MAX) {
                throw new Error(`Too many modifiers: ${count}, the limit is ${UINT16_MAX}`);
            }
            buffer.writeUint16(count);
            for (let i = 0; i < count; i += 1) {
                ModifierSerializer.serialize(node.children[i], buffer);
            }
        }
        if (!isUndefined(node.start)) {
            buffer.writeUint8(ModifierListNodeMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(ModifierListNodeMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { ModifierListSerializer };
