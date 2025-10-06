import { NEGATION_MARKER, EMPTY } from '../../utils/constants.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Utility class for generating string representations of list items.
 */
class ListItemsGenerator {
    /**
     * Generates a string representation of a list item.
     *
     * @param item List item to generate.
     * @template T Type of the list item.
     *
     * @returns String representation of the list item.
     */
    static generateListItem = (item) => {
        return `${item.exception ? NEGATION_MARKER : EMPTY}${item.value}`;
    };
    /**
     * Generates a string representation of a list of items.
     *
     * @param items List of items to generate.
     * @param separator Separator character.
     * @template T Type of the list items.
     *
     * @returns String representation of the list of items.
     */
    static generate = (items, separator) => {
        return items.map(ListItemsGenerator.generateListItem)
            .join(separator);
    };
}

export { ListItemsGenerator };
