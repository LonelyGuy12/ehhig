import { MODIFIER_ASSIGN_OPERATOR, EMPTY, NEGATION_MARKER } from '../../utils/constants.js';
import { BaseGenerator } from '../base-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Generator for modifier nodes.
 */
class ModifierGenerator extends BaseGenerator {
    /**
     * Converts a modifier AST node to a string.
     *
     * @param modifier Modifier AST node to convert
     * @returns String representation of the modifier
     */
    static generate(modifier) {
        let result = EMPTY;
        if (modifier.exception) {
            result += NEGATION_MARKER;
        }
        result += modifier.name.value;
        if (modifier.value !== undefined) {
            result += MODIFIER_ASSIGN_OPERATOR;
            result += modifier.value.value;
        }
        return result;
    }
}

export { ModifierGenerator };
