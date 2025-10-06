import { BaseSerializer } from '../base-serializer.js';
import { ListItemNodeType } from '../../nodes/index.js';
import { isUndefined } from '../../utils/type-guards.js';
import { NULL } from '../../utils/constants.js';
import { ListItemMarshallingMap } from '../../marshalling-utils/misc/list-item-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Serializer for list item nodes.
 */
class ListItemSerializer extends BaseSerializer {
    /**
     * Serializes a list item to binary format.
     *
     * @param item List item to serialize.
     * @param buffer Output byte buffer.
     * @template T Type of the list item.
     */
    static serialize(item, buffer) {
        switch (item.type) {
            case ListItemNodeType.App:
                buffer.writeUint8(BinaryTypeMarshallingMap.AppNode);
                break;
            case ListItemNodeType.Domain:
                buffer.writeUint8(BinaryTypeMarshallingMap.DomainNode);
                break;
            case ListItemNodeType.Method:
                buffer.writeUint8(BinaryTypeMarshallingMap.MethodNode);
                break;
            case ListItemNodeType.StealthOption:
                buffer.writeUint8(BinaryTypeMarshallingMap.StealthOptionNode);
                break;
            default:
                throw new Error(`Invalid list item type: ${item.type}`);
        }
        buffer.writeUint8(ListItemMarshallingMap.Exception);
        buffer.writeUint8(item.exception ? 1 : 0);
        buffer.writeUint8(ListItemMarshallingMap.Value);
        buffer.writeString(item.value);
        if (!isUndefined(item.start)) {
            buffer.writeUint8(ListItemMarshallingMap.Start);
            buffer.writeUint32(item.start);
        }
        if (!isUndefined(item.end)) {
            buffer.writeUint8(ListItemMarshallingMap.End);
            buffer.writeUint32(item.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { ListItemSerializer };
