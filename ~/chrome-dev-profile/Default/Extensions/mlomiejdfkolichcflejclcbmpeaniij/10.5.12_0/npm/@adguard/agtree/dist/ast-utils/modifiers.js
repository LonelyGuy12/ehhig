import { isUndefined } from '../utils/type-guards.js';
import { clone } from '../utils/clone.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Utility functions for working with modifier nodes
 */
/**
 * Creates a modifier node
 *
 * @param name Name of the modifier
 * @param value Value of the modifier
 * @param exception Whether the modifier is an exception
 * @returns Modifier node
 */
function createModifierNode(name, value = undefined, exception = false) {
    const result = {
        type: 'Modifier',
        exception,
        name: {
            type: 'Value',
            value: name,
        },
    };
    if (!isUndefined(value)) {
        result.value = {
            type: 'Value',
            value,
        };
    }
    return result;
}
/**
 * Creates a modifier list node
 *
 * @param modifiers Modifiers to put in the list (optional, defaults to an empty list)
 * @returns Modifier list node
 */
function createModifierListNode(modifiers = []) {
    const result = {
        type: 'ModifierList',
        // We need to clone the modifiers to avoid side effects
        children: modifiers.length ? clone(modifiers) : [],
    };
    return result;
}

export { createModifierListNode, createModifierNode };
