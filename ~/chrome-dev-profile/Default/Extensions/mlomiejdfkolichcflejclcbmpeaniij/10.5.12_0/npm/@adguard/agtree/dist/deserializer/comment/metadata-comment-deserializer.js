import { NULL } from '../../utils/constants.js';
import { CommentRuleType, RuleCategory } from '../../nodes/index.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { MetadataCommentMarshallingMap, FREQUENT_HEADERS_DESERIALIZATION_MAP } from '../../marshalling-utils/comment/metadata-comment-common.js';
import { AdblockSyntax } from '../../utils/adblockers.js';
import { ValueDeserializer } from '../misc/value-deserializer.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * `MetadataCommentDeserializer` is responsible for deserializing metadata comments.
 * Metadata comments are special comments that specify some properties of the list.
 *
 * @example
 * For example, in the case of
 * ```adblock
 * ! Title: My List
 * ```
 * the name of the header is `Title`, and the value is `My List`, which means that
 * the list title is `My List`, and it can be used in the adblocker UI.
 * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#special-comments}
 */
class MetadataCommentDeserializer extends BaseDeserializer {
    /**
     * Deserializes a metadata comment node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.MetadataCommentRuleNode);
        node.type = CommentRuleType.MetadataCommentRule;
        node.category = RuleCategory.Comment;
        node.syntax = AdblockSyntax.Common;
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case MetadataCommentMarshallingMap.Marker:
                    ValueDeserializer.deserialize(buffer, node.marker = {});
                    break;
                case MetadataCommentMarshallingMap.Header:
                    // eslint-disable-next-line max-len
                    ValueDeserializer.deserialize(buffer, node.header = {}, FREQUENT_HEADERS_DESERIALIZATION_MAP);
                    break;
                case MetadataCommentMarshallingMap.Value:
                    ValueDeserializer.deserialize(buffer, node.value = {});
                    break;
                case MetadataCommentMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case MetadataCommentMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { MetadataCommentDeserializer };
