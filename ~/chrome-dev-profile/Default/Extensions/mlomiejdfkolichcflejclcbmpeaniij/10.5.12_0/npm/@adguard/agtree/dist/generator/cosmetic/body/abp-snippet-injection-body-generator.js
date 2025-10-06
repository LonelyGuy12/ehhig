import { SPACE, SEMICOLON } from '../../../utils/constants.js';
import { BaseGenerator } from '../../base-generator.js';
import { ParameterListGenerator } from '../../misc/parameter-list-generator.js';
import { AbpSnippetInjectionBodyCommon } from '../../../common/abp-snippet-injection-body-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Adblock Plus snippet injection body generator.
 */
class AbpSnippetInjectionBodyGenerator extends BaseGenerator {
    /**
     * Generates a string representation of the Adblock Plus-style snippet call body.
     *
     * @param node Scriptlet injection rule body
     * @returns String representation of the rule body
     * @throws Error if the scriptlet call is empty
     */
    static generate(node) {
        const result = [];
        if (node.children.length === 0) {
            throw new Error(AbpSnippetInjectionBodyCommon.ERROR_MESSAGES.EMPTY_SCRIPTLET_CALL);
        }
        for (const scriptletCall of node.children) {
            if (scriptletCall.children.length === 0) {
                throw new Error(AbpSnippetInjectionBodyCommon.ERROR_MESSAGES.EMPTY_SCRIPTLET_CALL);
            }
            result.push(ParameterListGenerator.generate(scriptletCall, SPACE));
        }
        return result.join(SEMICOLON + SPACE);
    }
}

export { AbpSnippetInjectionBodyGenerator };
