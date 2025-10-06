import { NULL } from '../../utils/constants.js';
import { ValueSerializer } from '../misc/value-serializer.js';
import { isUndefined } from '../../utils/type-guards.js';
import { BaseSerializer } from '../base-serializer.js';
import { MetadataCommentMarshallingMap, FREQUENT_HEADERS_DESERIALIZATION_MAP } from '../../marshalling-utils/comment/metadata-comment-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Value map for binary serialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION}!
 *
 * @note Only 256 values can be represented this way.
 * @note This map is generated from `FREQUENT_HEADERS_DESERIALIZATION_MAP` to keep uppercase characters
 * while deserializing.
 */
let frequentHeadersSerializationMap;
const getFrequentHeadersSerializationMap = () => {
    if (!frequentHeadersSerializationMap) {
        frequentHeadersSerializationMap = new Map(Array.from(FREQUENT_HEADERS_DESERIALIZATION_MAP.entries())
            .map(([key, value]) => [value.toLowerCase(), key]));
    }
    return frequentHeadersSerializationMap;
};
/**
 * `MetadataCommentSerializer` is responsible for serializing metadata comments.
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
class MetadataCommentSerializer extends BaseSerializer {
    /**
     * Serializes a metadata comment node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    // TODO: add support for raws, if ever needed
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.MetadataCommentRuleNode);
        buffer.writeUint8(MetadataCommentMarshallingMap.Marker);
        ValueSerializer.serialize(node.marker, buffer);
        buffer.writeUint8(MetadataCommentMarshallingMap.Header);
        ValueSerializer.serialize(node.header, buffer, getFrequentHeadersSerializationMap(), true);
        buffer.writeUint8(MetadataCommentMarshallingMap.Value);
        ValueSerializer.serialize(node.value, buffer);
        if (!isUndefined(node.start)) {
            buffer.writeUint8(MetadataCommentMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(MetadataCommentMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { MetadataCommentSerializer };
