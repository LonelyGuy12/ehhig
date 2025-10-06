/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * @file Customized error class for conversion errors.
 */
const ERROR_NAME = 'RuleConversionError';
/**
 * Customized error class for conversion errors.
 */
class RuleConversionError extends Error {
    /**
     * Constructs a new `RuleConversionError` instance.
     *
     * @param message Error message
     */
    constructor(message) {
        super(message);
        this.name = ERROR_NAME;
    }
}

export { RuleConversionError };
