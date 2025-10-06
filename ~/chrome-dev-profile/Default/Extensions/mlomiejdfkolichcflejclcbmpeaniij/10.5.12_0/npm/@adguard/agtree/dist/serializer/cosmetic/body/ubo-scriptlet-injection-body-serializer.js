import { ScriptletBodySerializer } from './scriptlet-body-serializer.js';
import { BaseSerializer } from '../../base-serializer.js';
import { FREQUENT_UBO_SCRIPTLET_ARGS_SERIALIZATION_MAP } from '../../../marshalling-utils/cosmetic/body/ubo-scriptlet-injection-body-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `UboScriptletInjectionBodySerializer` is responsible for serializing the body of a uBlock-style scriptlet rule.
 *
 * Please note that the parser will parse any scriptlet rule if it is syntactically correct.
 * For example, it will parse this:
 * ```adblock
 * example.com##+js(scriptlet0, arg0)
 * ```
 *
 * but it didn't check if the scriptlet `scriptlet0` actually supported by any adblocker.
 *
 * @see {@link https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#scriptlet-injection}
 */
class UboScriptletInjectionBodySerializer extends BaseSerializer {
    /**
     * Serializes a scriptlet call body node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        ScriptletBodySerializer.serialize(node, buffer, FREQUENT_UBO_SCRIPTLET_ARGS_SERIALIZATION_MAP);
    }
}

export { UboScriptletInjectionBodySerializer };
