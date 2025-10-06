import { AgentCommentParser } from './agent-comment-parser.js';
import { ConfigCommentParser } from './config-comment-parser.js';
import { HintCommentParser } from './hint-comment-parser.js';
import { MetadataCommentParser } from './metadata-comment-parser.js';
import { PreProcessorCommentParser } from './preprocessor-parser.js';
import { defaultParserOptions } from '../options.js';
import { BaseParser } from '../base-parser.js';
import { SimpleCommentParser } from './simple-comment-parser.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-param-reassign */
/**
 * `CommentParser` is responsible for parsing any comment-like adblock rules.
 *
 * @example
 * Example rules:
 *  - Adblock agent rules:
 *      - ```adblock
 *        [AdGuard]
 *        ```
 *      - ```adblock
 *        [Adblock Plus 2.0]
 *        ```
 *      - etc.
 *  - AdGuard hint rules:
 *      - ```adblock
 *        !+ NOT_OPTIMIZED
 *        ```
 *      - ```adblock
 *        !+ NOT_OPTIMIZED PLATFORM(windows)
 *        ```
 *      - etc.
 *  - Pre-processor rules:
 *      - ```adblock
 *        !#if (adguard)
 *        ```
 *      - ```adblock
 *        !#endif
 *        ```
 *      - etc.
 *  - Metadata rules:
 *      - ```adblock
 *        ! Title: My List
 *        ```
 *      - ```adblock
 *        ! Version: 2.0.150
 *        ```
 *      - etc.
 *  - AGLint inline config rules:
 *      - ```adblock
 *        ! aglint-enable some-rule
 *        ```
 *      - ```adblock
 *        ! aglint-disable some-rule
 *        ```
 *      - etc.
 *  - Simple comments:
 *      - Regular version:
 *        ```adblock
 *        ! This is just a comment
 *        ```
 *      - uBlock Origin / "hostlist" version:
 *        ```adblock
 *        # This is just a comment
 *        ```
 *      - etc.
 */
class CommentParser extends BaseParser {
    /**
     * Checks whether a rule is a comment.
     *
     * @param raw Raw rule
     * @returns `true` if the rule is a comment, `false` otherwise
     */
    static isCommentRule(raw) {
        const trimmed = raw.trim();
        return SimpleCommentParser.isSimpleComment(trimmed) || AgentCommentParser.isAgentRule(trimmed);
    }
    /**
     * Parses a raw rule as comment.
     *
     * @param raw Raw input to parse.
     * @param options Global parser options.
     * @param baseOffset Starting offset of the input. Node locations are calculated relative to this offset.
     * @returns Comment AST or null (if the raw rule cannot be parsed as comment)
     */
    static parse(raw, options = defaultParserOptions, baseOffset = 0) {
        // Ignore non-comment rules
        if (!CommentParser.isCommentRule(raw)) {
            return null;
        }
        // Note: we parse non-functional comments at the end,
        // if the input does not match any of the previous, more specific comment patterns
        return AgentCommentParser.parse(raw, options, baseOffset)
            || HintCommentParser.parse(raw, options, baseOffset)
            || PreProcessorCommentParser.parse(raw, options, baseOffset)
            || MetadataCommentParser.parse(raw, options, baseOffset)
            || ConfigCommentParser.parse(raw, options, baseOffset)
            || SimpleCommentParser.parse(raw, options, baseOffset);
    }
}

export { CommentParser };
