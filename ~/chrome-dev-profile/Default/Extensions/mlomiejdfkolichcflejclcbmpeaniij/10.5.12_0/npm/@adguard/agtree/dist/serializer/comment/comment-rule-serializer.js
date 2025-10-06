import { AgentCommentSerializer } from './agent-comment-serializer.js';
import { CommentRuleType } from '../../nodes/index.js';
import { ConfigCommentSerializer } from './config-comment-serializer.js';
import { HintCommentSerializer } from './hint-comment-serializer.js';
import { MetadataCommentSerializer } from './metadata-comment-serializer.js';
import { PreProcessorCommentSerializer } from './pre-processor-comment-serializer.js';
import { SimpleCommentSerializer } from './simple-comment-serializer.js';
import { BaseSerializer } from '../base-serializer.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `CommentRuleSerializer` is responsible for serializing any comment-like adblock rules.
 *
 * @example
 * Example rules:
 *  - Adblock agent rules:
 *      - ```adblock
 *        [AdGuard]
 *        ```
 *      - ```adblock
 *        [Adblock Plus 2.0]
 *        ```
 *      - etc.
 *  - AdGuard hint rules:
 *      - ```adblock
 *        !+ NOT_OPTIMIZED
 *        ```
 *      - ```adblock
 *        !+ NOT_OPTIMIZED PLATFORM(windows)
 *        ```
 *      - etc.
 *  - Pre-processor rules:
 *      - ```adblock
 *        !#if (adguard)
 *        ```
 *      - ```adblock
 *        !#endif
 *        ```
 *      - etc.
 *  - Metadata rules:
 *      - ```adblock
 *        ! Title: My List
 *        ```
 *      - ```adblock
 *        ! Version: 2.0.150
 *        ```
 *      - etc.
 *  - AGLint inline config rules:
 *      - ```adblock
 *        ! aglint-enable some-rule
 *        ```
 *      - ```adblock
 *        ! aglint-disable some-rule
 *        ```
 *      - etc.
 *  - Simple comments:
 *      - Regular version:
 *        ```adblock
 *        ! This is just a comment
 *        ```
 *      - uBlock Origin / "hostlist" version:
 *        ```adblock
 *        # This is just a comment
 *        ```
 *      - etc.
 */
class CommentRuleSerializer extends BaseSerializer {
    /**
     * Serializes a comment rule node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        switch (node.type) {
            case CommentRuleType.AgentCommentRule:
                AgentCommentSerializer.serialize(node, buffer);
                return;
            case CommentRuleType.HintCommentRule:
                HintCommentSerializer.serialize(node, buffer);
                return;
            case CommentRuleType.PreProcessorCommentRule:
                PreProcessorCommentSerializer.serialize(node, buffer);
                return;
            case CommentRuleType.MetadataCommentRule:
                MetadataCommentSerializer.serialize(node, buffer);
                return;
            case CommentRuleType.ConfigCommentRule:
                ConfigCommentSerializer.serialize(node, buffer);
                return;
            case CommentRuleType.CommentRule:
                SimpleCommentSerializer.serialize(node, buffer);
                break;
            default:
                throw new Error('Unknown comment rule type');
        }
    }
}

export { CommentRuleSerializer };
