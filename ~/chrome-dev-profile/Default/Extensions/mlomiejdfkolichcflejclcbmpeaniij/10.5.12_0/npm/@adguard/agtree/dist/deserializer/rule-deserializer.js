import { BaseDeserializer } from './base-deserializer.js';
import { CommentRuleDeserializer } from './comment/comment-rule-deserializer.js';
import { CosmeticRuleDeserializer } from './cosmetic/cosmetic-rule-deserializer.js';
import { HostRuleDeserializer } from './network/host-rule-deserializer.js';
import { NetworkRuleDeserializer } from './network/network-rule-deserializer.js';
import { EmptyRuleDeserializer } from './empty-rule-deserializer.js';
import { InvalidRuleDeserializer } from './invalid-rule-deserializer.js';
import { BinaryTypeMarshallingMap } from '../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `RuleDeserializer` is responsible for deserializing the rules.
 *
 * It automatically determines the category and syntax of the rule, so you can pass any kind of rule to it.
 */
class RuleDeserializer extends BaseDeserializer {
    /**
     * Deserializes a rule node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     */
    static deserialize(buffer, node) {
        // lookup instead of storing +1 byte
        const type = buffer.peekUint8();
        switch (type) {
            case BinaryTypeMarshallingMap.AgentRuleNode:
            case BinaryTypeMarshallingMap.HintRuleNode:
            case BinaryTypeMarshallingMap.PreProcessorCommentRuleNode:
            case BinaryTypeMarshallingMap.MetadataCommentRuleNode:
            case BinaryTypeMarshallingMap.ConfigCommentRuleNode:
            case BinaryTypeMarshallingMap.CommentRuleNode:
                CommentRuleDeserializer.deserialize(buffer, node);
                break;
            case BinaryTypeMarshallingMap.ElementHidingRule:
            case BinaryTypeMarshallingMap.CssInjectionRule:
            case BinaryTypeMarshallingMap.ScriptletInjectionRule:
            case BinaryTypeMarshallingMap.HtmlFilteringRule:
            case BinaryTypeMarshallingMap.JsInjectionRule:
                CosmeticRuleDeserializer.deserialize(buffer, node);
                break;
            case BinaryTypeMarshallingMap.NetworkRuleNode:
                NetworkRuleDeserializer.deserialize(buffer, node);
                break;
            case BinaryTypeMarshallingMap.HostRuleNode:
                HostRuleDeserializer.deserialize(buffer, node);
                break;
            case BinaryTypeMarshallingMap.EmptyRule:
                EmptyRuleDeserializer.deserialize(buffer, node);
                break;
            case BinaryTypeMarshallingMap.InvalidRule:
                InvalidRuleDeserializer.deserialize(buffer, node);
                break;
            default:
                throw new Error('Unknown rule category');
        }
    }
}

export { RuleDeserializer };
