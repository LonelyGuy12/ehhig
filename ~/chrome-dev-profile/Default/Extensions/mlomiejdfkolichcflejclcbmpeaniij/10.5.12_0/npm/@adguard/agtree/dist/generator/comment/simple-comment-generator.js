import { BaseGenerator } from '../base-generator.js';
import { EMPTY } from '../../utils/constants.js';
import { ValueGenerator } from '../misc/value-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Simple comment generator.
 */
class SimpleCommentGenerator extends BaseGenerator {
    /**
     * Converts a comment rule node to a string.
     *
     * @param node Comment rule node.
     * @returns Raw string.
     */
    static generate(node) {
        let result = EMPTY;
        result += ValueGenerator.generate(node.marker);
        result += ValueGenerator.generate(node.text);
        return result;
    }
}

export { SimpleCommentGenerator };
