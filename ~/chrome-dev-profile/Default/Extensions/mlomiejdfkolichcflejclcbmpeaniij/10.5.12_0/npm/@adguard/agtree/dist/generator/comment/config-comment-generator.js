import { BaseGenerator } from '../base-generator.js';
import { SPACE, COMMA, EMPTY } from '../../utils/constants.js';
import { ParameterListGenerator } from '../misc/parameter-list-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Converts inline configuration comment nodes to their string format.
 */
class ConfigCommentGenerator extends BaseGenerator {
    /**
     * Converts an inline configuration comment node to a string.
     *
     * @param node Inline configuration comment node
     * @returns Raw string
     */
    static generate(node) {
        let result = EMPTY;
        result += node.marker.value;
        result += SPACE;
        result += node.command.value;
        if (node.params) {
            result += SPACE;
            if (node.params.type === 'ParameterList') {
                result += ParameterListGenerator.generate(node.params, COMMA);
            }
            else {
                // Trim JSON boundaries
                result += JSON.stringify(node.params.value).slice(1, -1).trim();
            }
        }
        // Add comment within the config comment
        if (node.comment) {
            result += SPACE;
            result += node.comment.value;
        }
        return result;
    }
}

export { ConfigCommentGenerator };
