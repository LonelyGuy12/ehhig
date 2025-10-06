import { SPACE, HASHMARK, EMPTY } from '../../utils/constants.js';
import { BaseGenerator } from '../base-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Generator for host rule nodes.
 */
class HostRuleGenerator extends BaseGenerator {
    /**
     * Converts a host rule node to a raw string.
     *
     * @param node Host rule node.
     * @returns Raw string.
     */
    static generate(node) {
        const result = [];
        if (node.ip) {
            result.push(node.ip.value);
        }
        if (node.hostnames) {
            result.push(SPACE);
            result.push(node.hostnames.children.map(({ value }) => value).join(SPACE));
        }
        if (node.comment) {
            result.push(SPACE);
            result.push(HASHMARK);
            result.push(SPACE);
            result.push(node.comment.value);
        }
        return result.join(EMPTY);
    }
}

export { HostRuleGenerator };
