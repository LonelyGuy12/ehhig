import { CLOSE_SQUARE_BRACKET, EMPTY, OPEN_SQUARE_BRACKET, DOLLAR_SIGN } from '../../utils/constants.js';
import { AdblockSyntax } from '../../utils/adblockers.js';
import { BaseGenerator } from '../base-generator.js';
import { ModifierListGenerator } from '../misc/modifier-list-generator.js';
import { DomainListGenerator } from '../misc/domain-list-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Cosmetic rule pattern generator.
 */
class CosmeticRulePatternGenerator extends BaseGenerator {
    /**
     * Generates the rule pattern from the AST.
     *
     * @param node Cosmetic rule node
     * @returns Raw rule pattern
     * @example
     * - '##.foo' → ''
     * - 'example.com,example.org##.foo' → 'example.com,example.org'
     * - '[$path=/foo/bar]example.com##.foo' → '[$path=/foo/bar]example.com'
     */
    static generate(node) {
        let result = EMPTY;
        // AdGuard modifiers (if any)
        if (node.syntax === AdblockSyntax.Adg && node.modifiers && node.modifiers.children.length > 0) {
            result += OPEN_SQUARE_BRACKET;
            result += DOLLAR_SIGN;
            result += ModifierListGenerator.generate(node.modifiers);
            result += CLOSE_SQUARE_BRACKET;
        }
        // Domain list (if any)
        result += DomainListGenerator.generate(node.domains);
        return result;
    }
}

export { CosmeticRulePatternGenerator };
