import { isUndefined } from '../utils/type-guards.js';
import { NetworkRuleType, RuleCategory } from '../nodes/index.js';
import { AdblockSyntax } from '../utils/adblockers.js';
import { clone } from '../utils/clone.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Utility functions for working with network rule nodes
 */
/**
 * Creates a network rule node
 *
 * @param pattern Rule pattern
 * @param modifiers Rule modifiers (optional, default: undefined)
 * @param exception Exception rule flag (optional, default: false)
 * @param syntax Adblock syntax (optional, default: Common)
 * @returns Network rule node
 */
function createNetworkRuleNode(pattern, modifiers = undefined, exception = false, syntax = AdblockSyntax.Common) {
    const result = {
        category: RuleCategory.Network,
        type: NetworkRuleType.NetworkRule,
        syntax,
        exception,
        pattern: {
            type: 'Value',
            value: pattern,
        },
    };
    if (!isUndefined(modifiers)) {
        result.modifiers = clone(modifiers);
    }
    return result;
}

export { createNetworkRuleNode };
