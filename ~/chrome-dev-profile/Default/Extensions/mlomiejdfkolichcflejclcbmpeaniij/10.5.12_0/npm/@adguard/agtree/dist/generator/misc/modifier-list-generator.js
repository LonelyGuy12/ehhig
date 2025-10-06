import { BaseGenerator } from '../base-generator.js';
import { MODIFIERS_SEPARATOR } from '../../utils/constants.js';
import { ModifierGenerator } from './modifier-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Generator for modifier list nodes.
 */
class ModifierListGenerator extends BaseGenerator {
    /**
     * Converts a modifier list AST to a string.
     *
     * @param ast Modifier list AST
     * @returns Raw string
     */
    static generate(ast) {
        const result = ast.children
            .map(ModifierGenerator.generate)
            .join(MODIFIERS_SEPARATOR);
        return result;
    }
}

export { ModifierListGenerator };
