import { BaseGenerator } from '../base-generator.js';
import { ListItemsGenerator } from './list-items-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Domain list generator.
 */
class DomainListGenerator extends BaseGenerator {
    /**
     * Converts a domain list node to a string.
     *
     * @param node Domain list node.
     *
     * @returns Raw string.
     */
    static generate(node) {
        return ListItemsGenerator.generate(node.children, node.separator);
    }
}

export { DomainListGenerator };
