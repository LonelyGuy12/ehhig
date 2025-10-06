import { BaseGenerator } from '../../base-generator.js';
import { CLOSE_PARENTHESIS, EMPTY, UBO_SCRIPTLET_MASK, OPEN_PARENTHESIS } from '../../../utils/constants.js';
import { ParameterListGenerator } from '../../misc/parameter-list-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * uBlock scriptlet injection body generator.
 */
class UboScriptletInjectionBodyGenerator extends BaseGenerator {
    /**
     * Error messages used by the generator.
     */
    static ERROR_MESSAGES = {
        NO_MULTIPLE_SCRIPTLET_CALLS: 'uBO syntaxes does not support multiple scriptlet calls within one single rule',
    };
    /**
     * Generates a string representation of the uBlock scriptlet call body.
     *
     * @param node Scriptlet injection rule body
     * @returns String representation of the rule body
     * @throws Error if the scriptlet call has multiple parameters
     */
    static generate(node) {
        const result = [];
        if (node.children.length > 1) {
            throw new Error(UboScriptletInjectionBodyGenerator.ERROR_MESSAGES.NO_MULTIPLE_SCRIPTLET_CALLS);
        }
        // During generation, we only support the modern scriptlet mask
        result.push(UBO_SCRIPTLET_MASK);
        result.push(OPEN_PARENTHESIS);
        if (node.children.length > 0) {
            const [parameterListNode] = node.children;
            result.push(ParameterListGenerator.generate(parameterListNode));
        }
        result.push(CLOSE_PARENTHESIS);
        return result.join(EMPTY);
    }
}

export { UboScriptletInjectionBodyGenerator };
