import { AgentCommentDeserializer } from './agent-comment-deserializer.js';
import { ConfigCommentDeserializer } from './config-comment-deserializer.js';
import { HintCommentDeserializer } from './hint-comment-deserializer.js';
import { MetadataCommentDeserializer } from './metadata-comment-deserializer.js';
import { PreProcessorCommentDeserializer } from './pre-processor-comment-deserializer.js';
import { SimpleCommentDeserializer } from './simple-comment-deserializer.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `CommentRuleDeserializer` is responsible for deserializing any comment-like adblock rules.
 */
class CommentRuleDeserializer extends BaseDeserializer {
    /**
     * Deserializes a comment rule node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        const type = buffer.peekUint8();
        switch (type) {
            case BinaryTypeMarshallingMap.AgentRuleNode:
                AgentCommentDeserializer.deserialize(buffer, node);
                return;
            case BinaryTypeMarshallingMap.HintRuleNode:
                HintCommentDeserializer.deserialize(buffer, node);
                return;
            case BinaryTypeMarshallingMap.PreProcessorCommentRuleNode:
                PreProcessorCommentDeserializer.deserialize(buffer, node);
                return;
            case BinaryTypeMarshallingMap.MetadataCommentRuleNode:
                MetadataCommentDeserializer.deserialize(buffer, node);
                return;
            case BinaryTypeMarshallingMap.ConfigCommentRuleNode:
                ConfigCommentDeserializer.deserialize(buffer, node);
                return;
            case BinaryTypeMarshallingMap.CommentRuleNode:
                SimpleCommentDeserializer.deserialize(buffer, node);
                return;
            default:
                throw new Error(`Unknown comment rule type: ${type}`);
        }
    }
}

export { CommentRuleDeserializer };
