import { NULL } from '../../utils/constants.js';
import { isUndefined } from '../../utils/type-guards.js';
import { ValueSerializer } from '../misc/value-serializer.js';
import { BaseSerializer } from '../base-serializer.js';
import { SimpleCommentMarshallingMap } from '../../marshalling-utils/comment/simple-comment-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `SimpleCommentSerializer` is responsible for serializing simple comments.
 * Some comments have a special meaning in adblock syntax, like agent comments or hints,
 * but this serializer is only responsible for serializing regular comments,
 * whose only purpose is to provide some human-readable information.
 *
 * @example
 * ```adblock
 * ! This is a simple comment
 * # This is a simple comment, but in host-like syntax
 * ```
 */
class SimpleCommentSerializer extends BaseSerializer {
    /**
     * Serializes a simple comment rule node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    // TODO: add support for raws, if ever needed
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.CommentRuleNode);
        buffer.writeUint8(SimpleCommentMarshallingMap.Marker);
        ValueSerializer.serialize(node.marker, buffer);
        buffer.writeUint8(SimpleCommentMarshallingMap.Text);
        ValueSerializer.serialize(node.text, buffer);
        if (!isUndefined(node.start)) {
            buffer.writeUint8(SimpleCommentMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(SimpleCommentMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { SimpleCommentSerializer };
