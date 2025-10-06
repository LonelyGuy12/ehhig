import { ListItemDeserializer } from './list-item-deserializer.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Deserializes lists of items from binary format.
 * Converts binary data to structured item nodes.
 */
class ListItemsDeserializer {
    /**
     * Deserializes a list of items from binary format.
     *
     * @param buffer Input byte buffer.
     * @param items Partial list of items to deserialize.
     * @template T Type of the list items.
     */
    static deserialize = (buffer, items) => {
        const length = buffer.readUint16();
        items.length = length;
        for (let i = 0; i < length; i += 1) {
            ListItemDeserializer.deserialize(buffer, items[i] = {});
        }
    };
}

export { ListItemsDeserializer };
