import { SPACE, COLON, EMPTY } from '../../utils/constants.js';
import { ValueGenerator } from '../misc/value-generator.js';
import { BaseGenerator } from '../base-generator.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Metadata comment generator.
 */
class MetadataCommentGenerator extends BaseGenerator {
    /**
     * Converts a metadata comment rule node to a string.
     *
     * @param node Metadata comment rule node.
     * @returns Raw string.
     */
    static generate(node) {
        let result = EMPTY;
        result += ValueGenerator.generate(node.marker);
        result += SPACE;
        result += ValueGenerator.generate(node.header);
        result += COLON;
        result += SPACE;
        result += ValueGenerator.generate(node.value);
        return result;
    }
}

export { MetadataCommentGenerator };
