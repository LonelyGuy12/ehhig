import { BaseGenerator } from '../base-generator.js';
import { SPACE, EMPTY } from '../../utils/constants.js';
import { isUndefined } from '../../utils/type-guards.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Generator for adblock agent nodes.
 * This class is responsible for converting adblock agent nodes into their string representation.
 */
class AgentGenerator extends BaseGenerator {
    /**
     * Converts an adblock agent node to a string.
     *
     * @param value Agent node
     * @returns Raw string
     */
    static generate(value) {
        let result = EMPTY;
        // Agent adblock name
        result += value.adblock.value;
        // Agent adblock version (if present)
        if (!isUndefined(value.version)) {
            // Add a space between the name and the version
            result += SPACE;
            result += value.version.value;
        }
        return result;
    }
}

export { AgentGenerator };
