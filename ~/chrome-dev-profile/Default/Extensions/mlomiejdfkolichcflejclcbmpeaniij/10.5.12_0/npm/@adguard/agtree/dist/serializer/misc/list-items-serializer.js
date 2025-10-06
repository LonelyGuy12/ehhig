import { ListItemSerializer } from './list-item-serializer.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Serializer for list items.
 */
class ListItemsSerializer {
    /**
     * Serializes a list of items to binary format.
     *
     * @param items List of items to serialize.
     * @param buffer Output byte buffer.
     * @template T Type of the list items.
     */
    static serialize(items, buffer) {
        const { length } = items;
        buffer.writeUint16(length);
        for (let i = 0; i < length; i += 1) {
            ListItemSerializer.serialize(items[i], buffer);
        }
    }
}

export { ListItemsSerializer };
