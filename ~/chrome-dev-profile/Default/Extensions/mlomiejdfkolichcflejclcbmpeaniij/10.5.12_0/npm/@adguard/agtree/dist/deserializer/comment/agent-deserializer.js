import { NULL } from '../../utils/constants.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { AgentNodeMarshallingMap, FREQUENT_AGENTS_DESERIALIZATION_MAP } from '../../marshalling-utils/comment/agent-common.js';
import { getAdblockSyntax } from '../../common/agent-common.js';
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
 * `AgentDeserializer` is responsible for deserializing single adblock agent elements.
 *
 * @example
 * If the adblock agent rule is
 * ```adblock
 * [Adblock Plus 2.0; AdGuard]
 * ```
 * then the adblock agents are `Adblock Plus 2.0` and `AdGuard`, and this
 * class is responsible for parsing them. The rule itself is parsed by
 * `AgentCommentSerializer`, which uses this class to parse single agents.
 */
class AgentDeserializer extends BaseDeserializer {
    /**
     * Deserializes an agent node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.AgentNode);
        node.type = 'Agent';
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case AgentNodeMarshallingMap.Adblock:
                    // eslint-disable-next-line max-len
                    ValueDeserializer.deserialize(buffer, node.adblock = {}, FREQUENT_AGENTS_DESERIALIZATION_MAP);
                    if (node.adblock) {
                        node.syntax = getAdblockSyntax(node.adblock.value);
                    }
                    break;
                case AgentNodeMarshallingMap.Version:
                    ValueDeserializer.deserialize(buffer, node.version = {});
                    break;
                case AgentNodeMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case AgentNodeMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Invalid property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { AgentDeserializer };
