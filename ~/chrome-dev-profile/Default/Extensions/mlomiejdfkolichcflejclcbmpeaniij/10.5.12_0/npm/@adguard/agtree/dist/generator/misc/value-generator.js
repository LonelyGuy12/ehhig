import { BaseGenerator } from '../base-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Generator for value nodes.
 */
class ValueGenerator extends BaseGenerator {
    /**
     * Converts a value node to a string.
     *
     * @param node Value node.
     * @returns Raw string.
     */
    static generate(node) {
        return node.value;
    }
}

export { ValueGenerator };
