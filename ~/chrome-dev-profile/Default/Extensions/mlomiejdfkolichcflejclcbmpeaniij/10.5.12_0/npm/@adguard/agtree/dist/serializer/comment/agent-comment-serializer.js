import { UINT8_MAX, NULL } from '../../utils/constants.js';
import { AgentSerializer } from './agent-serializer.js';
import { isUndefined } from '../../utils/type-guards.js';
import { BaseSerializer } from '../base-serializer.js';
import { AgentCommentMarshallingMap } from '../../marshalling-utils/comment/agent-comment-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `AgentCommentSerializer` is responsible for serializing an Adblock agent comments.
 * Adblock agent comment marks that the filter list is supposed to
 * be used by the specified ad blockers.
 *
 * @example
 *  - ```adblock
 *    [AdGuard]
 *    ```
 *  - ```adblock
 *    [Adblock Plus 2.0]
 *    ```
 *  - ```adblock
 *    [uBlock Origin]
 *    ```
 *  - ```adblock
 *    [uBlock Origin 1.45.3]
 *    ```
 *  - ```adblock
 *    [Adblock Plus 2.0; AdGuard]
 *    ```
 */
class AgentCommentSerializer extends BaseSerializer {
    /**
     * Serializes an adblock agent list node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    // TODO: add support for raws, if ever needed
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.AgentRuleNode);
        const count = node.children.length;
        // If there are no children, we do not write any data related to them, to avoid using unnecessary storage,
        // but children is a required field, so during deserialization we should initialize it as an empty array,
        // if there are no children in the binary data.
        if (count) {
            buffer.writeUint8(AgentCommentMarshallingMap.Children);
            // note: we store the count, because re-construction of the array is faster if we know the length
            // 8 bits is more than enough here
            if (count > UINT8_MAX) {
                throw new Error(`Too many children: ${count}, the limit is ${UINT8_MAX}`);
            }
            buffer.writeUint8(count);
            for (let i = 0; i < count; i += 1) {
                AgentSerializer.serialize(node.children[i], buffer);
            }
        }
        if (!isUndefined(node.start)) {
            buffer.writeUint8(AgentCommentMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(AgentCommentMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { AgentCommentSerializer };
