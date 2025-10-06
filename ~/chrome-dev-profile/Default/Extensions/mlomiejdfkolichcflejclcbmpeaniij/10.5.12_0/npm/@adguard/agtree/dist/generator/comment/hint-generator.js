import { OPEN_PARENTHESIS, COMMA, CLOSE_PARENTHESIS, EMPTY } from '../../utils/constants.js';
import { BaseGenerator } from '../base-generator.js';
import { ParameterListGenerator } from '../misc/parameter-list-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Hint generator.
 */
class HintGenerator extends BaseGenerator {
    /**
     * Generates a string representation of a hint.
     *
     * @param hint Hint AST node
     * @returns String representation of the hint
     */
    static generate(hint) {
        let result = EMPTY;
        result += hint.name.value;
        if (hint.params && hint.params.children.length > 0) {
            result += OPEN_PARENTHESIS;
            result += ParameterListGenerator.generate(hint.params, COMMA);
            result += CLOSE_PARENTHESIS;
        }
        return result;
    }
}

export { HintGenerator };
