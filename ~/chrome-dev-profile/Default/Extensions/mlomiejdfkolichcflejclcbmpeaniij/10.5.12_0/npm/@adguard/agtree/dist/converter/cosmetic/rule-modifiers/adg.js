import { RuleConversionError } from '../../../errors/rule-conversion-error.js';
import { createModifierNode } from '../../../ast-utils/modifiers.js';
import { RegExpUtils } from '../../../utils/regexp.js';
import { REGEX_MARKER, OPEN_SQUARE_BRACKET, CLOSE_SQUARE_BRACKET, COMMA, ESCAPE_CHARACTER } from '../../../utils/constants.js';
import { StringUtils } from '../../../utils/string.js';
import { MultiValueMap } from '../../../utils/multi-value-map.js';
import { clone } from '../../../utils/clone.js';
import { createConversionResult } from '../../base-interfaces/conversion-result.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Cosmetic rule modifier converter from uBO to ADG
 */
const UBO_MATCHES_PATH_OPERATOR = 'matches-path';
const ADG_PATH_MODIFIER = 'path';
/**
 * Special characters in modifier regexps that should be escaped
 */
const SPECIAL_MODIFIER_REGEX_CHARS = new Set([
    OPEN_SQUARE_BRACKET,
    CLOSE_SQUARE_BRACKET,
    COMMA,
    ESCAPE_CHARACTER,
]);
/**
 * Helper class for converting cosmetic rule modifiers from uBO to ADG
 */
class AdgCosmeticRuleModifierConverter {
    /**
     * Converts a uBO cosmetic rule modifier list to ADG, if possible.
     *
     * @param modifierList Cosmetic rule modifier list node to convert
     * @returns An object which follows the {@link ConversionResult} interface. Its `result` property contains
     * the converted node, and its `isConverted` flag indicates whether the original node was converted.
     * If the node was not converted, the result will contain the original node with the same object reference
     * @throws If the modifier list cannot be converted
     * @see {@link https://github.com/gorhill/uBlock/wiki/Procedural-cosmetic-filters#cosmetic-filter-operators}
     */
    static convertFromUbo(modifierList) {
        const conversionMap = new MultiValueMap();
        modifierList.children.forEach((modifier, index) => {
            // :matches-path
            if (modifier.name.value === UBO_MATCHES_PATH_OPERATOR) {
                if (!modifier.value) {
                    throw new RuleConversionError(`'${UBO_MATCHES_PATH_OPERATOR}' operator requires a value`);
                }
                const value = RegExpUtils.isRegexPattern(modifier.value.value)
                    ? StringUtils.escapeCharacters(modifier.value.value, SPECIAL_MODIFIER_REGEX_CHARS)
                    : modifier.value.value;
                // Convert uBO's `:matches-path(...)` operator to ADG's `$path=...` modifier
                conversionMap.add(index, createModifierNode(ADG_PATH_MODIFIER, 
                // We should negate the regexp if the modifier is an exception
                modifier.exception
                    // eslint-disable-next-line max-len
                    ? `${REGEX_MARKER}${RegExpUtils.negateRegexPattern(RegExpUtils.patternToRegexp(value))}${REGEX_MARKER}`
                    : value));
            }
        });
        // Check if we have any converted modifiers
        if (conversionMap.size) {
            const modifierListClone = clone(modifierList);
            // Replace the original modifiers with the converted ones
            modifierListClone.children = modifierListClone.children.map((modifier, index) => {
                const convertedModifier = conversionMap.get(index);
                return convertedModifier ?? modifier;
            }).flat();
            return createConversionResult(modifierListClone, true);
        }
        // Otherwise, just return the original modifier list
        return createConversionResult(modifierList, false);
    }
}

export { AdgCosmeticRuleModifierConverter };
