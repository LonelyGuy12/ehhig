import { BaseGenerator } from '../base-generator.js';
import { SPACE, HINT_MARKER } from '../../utils/constants.js';
import { HintGenerator } from './hint-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Hint comment generator.
 */
class HintCommentGenerator extends BaseGenerator {
    /**
     * Converts a hint rule node to a raw string.
     *
     * @param node Hint rule node
     * @returns Raw string
     */
    static generate(node) {
        let result = HINT_MARKER + SPACE;
        result += node.children.map(HintGenerator.generate).join(SPACE);
        return result;
    }
}

export { HintCommentGenerator };
