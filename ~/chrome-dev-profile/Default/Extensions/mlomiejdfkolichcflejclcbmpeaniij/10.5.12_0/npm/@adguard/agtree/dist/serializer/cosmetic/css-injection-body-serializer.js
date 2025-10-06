import { ValueSerializer } from '../misc/value-serializer.js';
import { isUndefined } from '../../utils/type-guards.js';
import { NULL } from '../../utils/constants.js';
import { BaseSerializer } from '../base-serializer.js';
import { CssInjectionRuleMarshallingMap } from '../../marshalling-utils/cosmetic/body/css-injection-body-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Serializer for CSS injection rule body nodes.
 */
class CssInjectionBodySerializer extends BaseSerializer {
    /**
     * Serializes a CSS injection rule body node to binary format.
     *
     * @param node Node to serialize.
     * @param buffer ByteBuffer for writing binary data.
     */
    static serialize(node, buffer) {
        buffer.writeUint8(BinaryTypeMarshallingMap.CssInjectionRuleBody);
        if (node.mediaQueryList) {
            buffer.writeUint8(CssInjectionRuleMarshallingMap.MediaQueryList);
            ValueSerializer.serialize(node.mediaQueryList, buffer);
        }
        buffer.writeUint8(CssInjectionRuleMarshallingMap.SelectorList);
        ValueSerializer.serialize(node.selectorList, buffer);
        if (node.declarationList) {
            buffer.writeUint8(CssInjectionRuleMarshallingMap.DeclarationList);
            ValueSerializer.serialize(node.declarationList, buffer);
        }
        if (node.remove) {
            buffer.writeUint8(CssInjectionRuleMarshallingMap.Remove);
        }
        if (!isUndefined(node.start)) {
            buffer.writeUint8(CssInjectionRuleMarshallingMap.Start);
            buffer.writeUint32(node.start);
        }
        if (!isUndefined(node.end)) {
            buffer.writeUint8(CssInjectionRuleMarshallingMap.End);
            buffer.writeUint32(node.end);
        }
        buffer.writeUint8(NULL);
    }
}

export { CssInjectionBodySerializer };
