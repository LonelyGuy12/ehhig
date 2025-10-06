import { BaseSerializer } from '../../base-serializer.js';
import { ScriptletBodySerializer } from './scriptlet-body-serializer.js';
import { FREQUENT_ABP_SNIPPET_ARGS_SERIALIZATION_MAP } from '../../../marshalling-utils/cosmetic/body/abp-snippet-injection-body-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * `AbpSnippetInjectionBodySerializer` is responsible for serializing the body of an Adblock Plus-style snippet rule.
 *
 * Please note that the serializer will serialize any scriptlet rule if it is syntactically correct.
 * For example, it will serialize this:
 * ```adblock
 * example.com#$#snippet0 arg0
 * ```
 *
 * but it doesn't check if the scriptlet `snippet0` is actually supported by any adblocker.
 *
 * @see {@link https://help.eyeo.com/adblockplus/snippet-filters-tutorial}
 */
class AbpSnippetInjectionBodySerializer extends BaseSerializer {
    /**
     * Serializes a scriptlet call body node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        ScriptletBodySerializer.serialize(node, buffer, FREQUENT_ABP_SNIPPET_ARGS_SERIALIZATION_MAP);
    }
}

export { AbpSnippetInjectionBodySerializer };
