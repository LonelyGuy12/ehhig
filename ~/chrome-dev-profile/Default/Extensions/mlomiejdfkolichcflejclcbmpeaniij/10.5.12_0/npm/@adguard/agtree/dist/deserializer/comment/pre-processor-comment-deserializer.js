import { NULL } from '../../utils/constants.js';
import { CommentRuleType, RuleCategory } from '../../nodes/index.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { PreProcessorRuleMarshallingMap, FREQUENT_PARAMS_SERIALIZATION_MAP, FREQUENT_DIRECTIVES_SERIALIZATION_MAP } from '../../marshalling-utils/comment/pre-processor-comment-common.js';
import { AdblockSyntax } from '../../utils/adblockers.js';
import { ValueDeserializer } from '../misc/value-deserializer.js';
import { LogicalExpressionDeserializer } from '../misc/logical-expression-deserializer.js';
import { ParameterListDeserializer } from '../misc/parameter-list-deserializer.js';
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
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
let frequentDirectivesDeserializationMap;
const getFrequentDirectivesDeserializationMap = () => {
    if (!frequentDirectivesDeserializationMap) {
        frequentDirectivesDeserializationMap = new Map(Array.from(FREQUENT_DIRECTIVES_SERIALIZATION_MAP).map(([key, value]) => [value, key]));
    }
    return frequentDirectivesDeserializationMap;
};
/**
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
let frequentParamsDeserializationMap;
const getFrequentParamsDeserializationMap = () => {
    if (!frequentParamsDeserializationMap) {
        frequentParamsDeserializationMap = new Map(Array.from(FREQUENT_PARAMS_SERIALIZATION_MAP).map(([key, value]) => [value, key]));
    }
    return frequentParamsDeserializationMap;
};
/**
 * `PreProcessorCommentDeserializer` is responsible for deserializing preprocessor rules.
 * Pre-processor comments are special comments that are used to control the behavior of the filter list processor.
 * Please note that this parser only handles general syntax for now, and does not validate the parameters at
 * the parsing stage.
 *
 * @example
 * If your rule is
 * ```adblock
 * !#if (adguard)
 * ```
 * then the directive's name is `if` and its value is `(adguard)`, but the parameter list
 * is not parsed / validated further.
 * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#pre-processor-directives}
 * @see {@link https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#pre-parsing-directives}
 */
class PreProcessorCommentDeserializer extends BaseDeserializer {
    /**
     * Deserializes a pre-processor comment node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.PreProcessorCommentRuleNode);
        node.type = CommentRuleType.PreProcessorCommentRule;
        node.category = RuleCategory.Comment;
        node.syntax = AdblockSyntax.Common;
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case PreProcessorRuleMarshallingMap.Name:
                    // eslint-disable-next-line max-len
                    ValueDeserializer.deserialize(buffer, node.name = {}, getFrequentDirectivesDeserializationMap());
                    break;
                case PreProcessorRuleMarshallingMap.Syntax:
                    node.syntax = getSyntaxDeserializationMap().get(buffer.readUint8()) ?? AdblockSyntax.Common;
                    break;
                case PreProcessorRuleMarshallingMap.Params:
                    switch (buffer.peekUint8()) {
                        case BinaryTypeMarshallingMap.ValueNode:
                            ValueDeserializer.deserialize(buffer, node.params = {});
                            break;
                        case BinaryTypeMarshallingMap.ParameterListNode:
                            // eslint-disable-next-line max-len
                            ParameterListDeserializer.deserialize(buffer, node.params = {}, getFrequentParamsDeserializationMap());
                            break;
                        case BinaryTypeMarshallingMap.ExpressionOperatorNode:
                        case BinaryTypeMarshallingMap.ExpressionParenthesisNode:
                        case BinaryTypeMarshallingMap.ExpressionVariableNode:
                            LogicalExpressionDeserializer.deserialize(buffer, node.params = {});
                            break;
                        default:
                            throw new Error(`Invalid binary type: ${prop}`);
                    }
                    break;
                case PreProcessorRuleMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case PreProcessorRuleMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { PreProcessorCommentDeserializer };
