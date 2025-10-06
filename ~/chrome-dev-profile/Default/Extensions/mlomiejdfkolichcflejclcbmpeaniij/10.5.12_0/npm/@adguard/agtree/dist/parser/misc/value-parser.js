import { defaultParserOptions } from '../options.js';
import { BaseParser } from '../base-parser.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Value parser.
 * This parser is very simple, it just exists to provide a consistent interface for parsing.
 */
class ValueParser extends BaseParser {
    /**
     * Parses a value.
     *
     * @param raw Raw input to parse.
     * @param options Global parser options.
     * @param baseOffset Starting offset of the input. Node locations are calculated relative to this offset.
     *
     * @returns Value node.
     */
    static parse(raw, options = defaultParserOptions, baseOffset = 0) {
        const result = {
            type: 'Value',
            value: raw,
        };
        if (options.isLocIncluded) {
            result.start = baseOffset;
            result.end = baseOffset + raw.length;
        }
        return result;
    }
}

export { ValueParser };
