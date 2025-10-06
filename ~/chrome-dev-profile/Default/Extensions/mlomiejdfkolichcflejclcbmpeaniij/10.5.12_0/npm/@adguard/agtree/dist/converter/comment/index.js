import { CommentRuleType, CommentMarker } from '../../nodes/index.js';
import { SPACE } from '../../utils/constants.js';
import { RuleConverterBase } from '../base-interfaces/rule-converter-base.js';
import { clone } from '../../utils/clone.js';
import { createNodeConversionResult } from '../base-interfaces/conversion-result.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Comment rule converter
 */
/**
 * Comment rule converter class
 *
 * @todo Implement `convertToUbo` and `convertToAbp`
 */
class CommentRuleConverter extends RuleConverterBase {
    /**
     * Converts a comment rule to AdGuard format, if possible.
     *
     * @param rule Rule node to convert
     * @returns An object which follows the {@link NodeConversionResult} interface. Its `result` property contains
     * the array of converted rule nodes, and its `isConverted` flag indicates whether the original rule was converted.
     * If the rule was not converted, the result array will contain the original node with the same object reference
     * @throws If the rule is invalid or cannot be converted
     */
    static convertToAdg(rule) {
        // TODO: Add support for other comment types, if needed
        // Main task is # -> ! conversion
        switch (rule.type) {
            case CommentRuleType.CommentRule:
                // Check if the rule needs to be converted
                if (rule.type === CommentRuleType.CommentRule && rule.marker.value === CommentMarker.Hashmark) {
                    // Add a ! to the beginning of the comment
                    // TODO: Replace with custom clone method
                    const ruleClone = clone(rule);
                    ruleClone.marker.value = CommentMarker.Regular;
                    // Add the hashmark to the beginning of the comment text
                    ruleClone.text.value = `${SPACE}${CommentMarker.Hashmark}${ruleClone.text.value}`;
                    return createNodeConversionResult([ruleClone], true);
                }
                return createNodeConversionResult([rule], false);
            // Leave any other comment rule as is
            default:
                return createNodeConversionResult([rule], false);
        }
    }
}

export { CommentRuleConverter };
