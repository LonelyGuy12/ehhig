import { NULL } from '../../utils/constants.js';
import { RuleCategory, CommentRuleType } from '../../nodes/index.js';
import { HintDeserializer } from './hint-deserializer.js';
import { AdblockSyntax } from '../../utils/adblockers.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { HintCommentMarshallingMap } from '../../marshalling-utils/comment/hint-comment-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';
import { getSyntaxDeserializationMap } from '../syntax-deserialization-map.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * `HintCommentDeserializer` is responsible for deserializing AdGuard hint rules.
 *
 * @example
 * The following hint rule
 * ```adblock
 * !+ NOT_OPTIMIZED PLATFORM(windows)
 * ```
 * contains two hints: `NOT_OPTIMIZED` and `PLATFORM`.
 * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#hints}
 */
class HintCommentDeserializer extends BaseDeserializer {
    /**
     * Deserializes a hint rule node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.HintRuleNode);
        node.category = RuleCategory.Comment;
        node.type = CommentRuleType.HintCommentRule;
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case HintCommentMarshallingMap.Syntax:
                    node.syntax = getSyntaxDeserializationMap().get(buffer.readUint8()) ?? AdblockSyntax.Common;
                    break;
                case HintCommentMarshallingMap.Children:
                    node.children = new Array(buffer.readUint8());
                    // read children
                    for (let i = 0; i < node.children.length; i += 1) {
                        HintDeserializer.deserialize(buffer, node.children[i] = {});
                    }
                    break;
                case HintCommentMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case HintCommentMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
        // Maybe children are not present in the binary data,
        // in this case, we should initialize it as an empty array.
        if (!node.children) {
            node.children = [];
        }
    }
}

export { HintCommentDeserializer };
