import { BaseDeserializer } from '../base-deserializer.js';
import { ListItemNodeType } from '../../nodes/index.js';
import { NULL } from '../../utils/constants.js';
import { ListItemMarshallingMap } from '../../marshalling-utils/misc/list-item-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * `ListItemDeserializer` is responsible for deserializing list item nodes from binary format.
 *
 * @example
 * `app`, `domain`, `method`, `stealth-option`
 */
class ListItemDeserializer extends BaseDeserializer {
    /**
     * Deserializes a list item from binary format.
     *
     * @param buffer Input byte buffer.
     * @param node Partial list item to deserialize.
     * @template T Type of the list item.
     */
    static deserialize = (buffer, node) => {
        const type = buffer.readUint8();
        switch (type) {
            case BinaryTypeMarshallingMap.AppNode:
                node.type = ListItemNodeType.App;
                break;
            case BinaryTypeMarshallingMap.DomainNode:
                node.type = ListItemNodeType.Domain;
                break;
            case BinaryTypeMarshallingMap.MethodNode:
                node.type = ListItemNodeType.Method;
                break;
            case BinaryTypeMarshallingMap.StealthOptionNode:
                node.type = ListItemNodeType.StealthOption;
                break;
            default:
                throw new Error(`Invalid list item type: ${type}`);
        }
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case ListItemMarshallingMap.Exception:
                    node.exception = buffer.readUint8() === 1;
                    break;
                case ListItemMarshallingMap.Value:
                    node.value = buffer.readString();
                    break;
                case ListItemMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case ListItemMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${type}`);
            }
            prop = buffer.readUint8();
        }
    };
}

export { ListItemDeserializer };
