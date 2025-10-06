import { SEMICOLON, SPACE, CLOSE_SQUARE_BRACKET, OPEN_SQUARE_BRACKET } from '../../utils/constants.js';
import { BaseGenerator } from '../base-generator.js';
import { AgentGenerator } from './agent-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Generator for agent comment rules.
 */
class AgentCommentGenerator extends BaseGenerator {
    /**
     * Converts an adblock agent AST to a string.
     *
     * @param ast Agent rule AST
     * @returns Raw string
     */
    static generate(ast) {
        let result = OPEN_SQUARE_BRACKET;
        result += ast.children
            .map(AgentGenerator.generate)
            .join(SEMICOLON + SPACE);
        result += CLOSE_SQUARE_BRACKET;
        return result;
    }
}

export { AgentCommentGenerator };
