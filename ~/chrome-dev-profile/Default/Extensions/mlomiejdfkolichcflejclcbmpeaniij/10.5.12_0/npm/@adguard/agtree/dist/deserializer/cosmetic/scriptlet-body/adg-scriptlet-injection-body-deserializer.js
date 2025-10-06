import { BaseDeserializer } from '../../base-deserializer.js';
import { ScriptletBodyDeserializer } from './scriptlet-body-deserializer.js';
import { FREQUENT_ADG_SCRIPTLET_ARGS_SERIALIZATION_MAP } from '../../../marshalling-utils/cosmetic/body/adg-scriptlet-injection-body-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Value map for binary deserialization. This helps to reduce the size of the serialized data,
 * as it allows us to use a single byte to represent frequently used values.
 */
let frequentAdgScriptletArgsDeserializationMap;
const getFrequentAdgScriptletArgsDeserializationMap = () => {
    if (!frequentAdgScriptletArgsDeserializationMap) {
        frequentAdgScriptletArgsDeserializationMap = new Map(Array.from(FREQUENT_ADG_SCRIPTLET_ARGS_SERIALIZATION_MAP).map(([key, value]) => [value, key]));
    }
    return frequentAdgScriptletArgsDeserializationMap;
};
/**
 * Deserializer for AdGuard scriptlet injection body nodes.
 * Converts binary data into a structured scriptlet call body node specific to AdGuard,
 * using a predefined deserialization map for frequently used scriptlet arguments.
 */
class AdgScriptletInjectionBodyDeserializer extends BaseDeserializer {
    /**
     * Deserializes a scriptlet call body node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     * @throws If the binary data is malformed.
     */
    static deserialize(buffer, node) {
        ScriptletBodyDeserializer.deserialize(buffer, node, getFrequentAdgScriptletArgsDeserializationMap());
    }
}

export { AdgScriptletInjectionBodyDeserializer };
