import { ValueDeserializer } from '../misc/value-deserializer.js';
import { NULL } from '../../utils/constants.js';
import { BaseDeserializer } from '../base-deserializer.js';
import { CssInjectionRuleMarshallingMap } from '../../marshalling-utils/cosmetic/body/css-injection-body-common.js';
import { BinaryTypeMarshallingMap } from '../../marshalling-utils/misc/binary-type-common.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Deserializes CSS injection rule body nodes from binary format.
 */
class CssInjectionBodyDeserializer extends BaseDeserializer {
    /**
     * Deserializes CSS injection rule body node from binary format.
     *
     * @param buffer ByteBuffer for reading binary data.
     * @param node Destination node.
     */
    static deserialize(buffer, node) {
        buffer.assertUint8(BinaryTypeMarshallingMap.CssInjectionRuleBody);
        node.type = 'CssInjectionRuleBody';
        node.remove = false;
        let prop = buffer.readUint8();
        while (prop !== NULL) {
            switch (prop) {
                case CssInjectionRuleMarshallingMap.MediaQueryList:
                    ValueDeserializer.deserialize(buffer, node.mediaQueryList = {});
                    break;
                case CssInjectionRuleMarshallingMap.SelectorList:
                    ValueDeserializer.deserialize(buffer, node.selectorList = {});
                    break;
                case CssInjectionRuleMarshallingMap.DeclarationList:
                    ValueDeserializer.deserialize(buffer, node.declarationList = {});
                    break;
                case CssInjectionRuleMarshallingMap.Remove:
                    node.remove = true;
                    break;
                case CssInjectionRuleMarshallingMap.Start:
                    node.start = buffer.readUint32();
                    break;
                case CssInjectionRuleMarshallingMap.End:
                    node.end = buffer.readUint32();
                    break;
                default:
                    throw new Error(`Unknown property: ${prop}`);
            }
            prop = buffer.readUint8();
        }
    }
}

export { CssInjectionBodyDeserializer };
