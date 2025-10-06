import { NULL } from '../../utils/constants.js';
import { ValueSerializer } from '../misc/value-serializer.js';
import { isUndefined } from '../../utils/type-guards.js';
import { BaseSerializer } from '../base-serializer.js';
import { AgentNodeMarshallingMap, FREQUENT_AGENTS_DESERIALIZATION_MAP } from '../../marshalling-utils/comment/agent-common.js';
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
 */
let frequentAgentsSerializationMap;
const getFrequentAgentsSerializationMap = () => {
    if (!frequentAgentsSerializationMap) {
        frequentAgentsSerializationMap = new Map(Array.from(FREQUENT_AGENTS_DESERIALIZATION_MAP).map(([key, value]) => [value.toLowerCase(), key]));
    }
    return frequentAgentsSerializationMap;
};
/**
 * `AgentSerializer` is responsible for serializing single adblock agent elements into a binary format.
 */
class AgentSerializer extends BaseSerializer {
    /**
     * Serializes an agent node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.AgentNode);
        buffer.writeUint8(AgentNodeMarshallingMap.Adblock);
        ValueSerializer.serialize(node.adblock, buffer, getFrequentAgentsSerializationMap(), true);
        if (!isUndefined(node.version)) {
            buffer.writeUint8(AgentNodeMarshallingMap.Version);
            ValueSerializer.serialize(node.version, buffer);
        }
        if (!isUndefined(node.start)) {
            buffer.writeUint8(AgentNodeMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(AgentNodeMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { AgentSerializer };
