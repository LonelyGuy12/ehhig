/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * @file Customized syntax error class for Adblock Filter Parser.
 */
const ERROR_NAME = 'AdblockSyntaxError';
/**
 * Customized syntax error class for Adblock Filter Parser,
 * which contains the location range of the error.
 */
class AdblockSyntaxError extends SyntaxError {
    /**
     * Start offset of the error.
     */
    start;
    /**
     * End offset of the error.
     */
    end;
    /**
     * Constructs a new `AdblockSyntaxError` instance.
     *
     * @param message Error message.
     * @param start Start offset of the error.
     * @param end End offset of the error.
     */
    constructor(message, start, end) {
        super(message);
        this.name = ERROR_NAME;
        this.start = start;
        this.end = end;
    }
}

export { AdblockSyntaxError };
