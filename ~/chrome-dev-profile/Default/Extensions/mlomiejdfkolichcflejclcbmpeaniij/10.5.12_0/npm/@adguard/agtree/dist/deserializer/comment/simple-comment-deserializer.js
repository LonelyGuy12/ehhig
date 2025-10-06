import { NULL } from '../../utils/constants.js';
import { CommentRuleType, RuleCategory } from '../../nodes/index.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { AdblockSyntax } from '../../utils/adblockers.js';
import { SimpleCommentMarshallingMap } from '../../marshalling-utils/comment/simple-comment-common.js';
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
 * `SimpleCommentDeserializer` is responsible for deserializing simple comments.
 *
 * Some comments have a special meaning in adblock syntax, like agent comments or hints,
 * but this parser is only responsible for parsing regular comments,
 * whose only purpose is to provide some human-readable information.
 *
 * @example
 * ```adblock
 * ! This is a simple comment
 * # This is a simple comment, but in host-like syntax
 * ```
 */
class SimpleCommentDeserializer extends BaseDeserializer {
    /**
     * Deserializes a simple comment node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.CommentRuleNode);
        node.type = CommentRuleType.CommentRule;
        node.category = RuleCategory.Comment;
        node.syntax = AdblockSyntax.Common;
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case SimpleCommentMarshallingMap.Marker:
                    ValueDeserializer.deserialize(buffer, node.marker = {});
                    break;
                case SimpleCommentMarshallingMap.Text:
                    ValueDeserializer.deserialize(buffer, node.text = {});
                    break;
                case SimpleCommentMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case SimpleCommentMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { SimpleCommentDeserializer };
