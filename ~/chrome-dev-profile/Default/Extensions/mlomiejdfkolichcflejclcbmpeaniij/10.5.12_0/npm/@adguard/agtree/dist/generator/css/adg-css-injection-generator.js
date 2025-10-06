import { COLON, SPACE, SEMICOLON, CSS_MEDIA_MARKER, OPEN_CURLY_BRACKET, CLOSE_CURLY_BRACKET, EMPTY } from '../../utils/constants.js';
import { BaseGenerator } from '../base-generator.js';
import { REMOVE_PROPERTY, REMOVE_VALUE } from '../../parser/css/adg-css-injection-parser.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * AdGuard CSS injection generator.
 */
class AdgCssInjectionGenerator extends BaseGenerator {
    static removeDeclaration = `${REMOVE_PROPERTY}${COLON}${SPACE}${REMOVE_VALUE}${SEMICOLON}`;
    /**
     * Serializes an AdGuard CSS injection node into a raw string.
     *
     * @param node Node to serialize.
     * @returns Raw string.
     */
    static generate(node) {
        const result = [];
        if (node.mediaQueryList) {
            result.push(CSS_MEDIA_MARKER, SPACE, node.mediaQueryList.value, SPACE, OPEN_CURLY_BRACKET, SPACE);
        }
        result.push(node.selectorList.value, SPACE, OPEN_CURLY_BRACKET, SPACE);
        if (node.remove) {
            result.push(AdgCssInjectionGenerator.removeDeclaration);
        }
        else if (node.declarationList?.value) {
            result.push(node.declarationList.value);
        }
        result.push(SPACE, CLOSE_CURLY_BRACKET);
        if (node.mediaQueryList) {
            result.push(SPACE, CLOSE_CURLY_BRACKET);
        }
        return result.join(EMPTY);
    }
}

export { AdgCssInjectionGenerator };
