/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * @file Customized error for binary schema mismatch.
 */
const ERROR_NAME = 'BinarySchemaMismatchError';
/**
 * Customized error for binary schema mismatch.
 */
class BinarySchemaMismatchError extends Error {
    /**
     * Expected schema version.
     */
    expectedVersion;
    /**
     * Actual schema version.
     */
    actualVersion;
    /**
     * Constructs a new `BinarySchemaMismatchError` instance.
     *
     * @param expectedVersion Expected schema version.
     * @param actualVersion Actual schema version.
     */
    constructor(expectedVersion, actualVersion) {
        super(`Expected schema version ${expectedVersion}, but got ${actualVersion}`);
        this.name = ERROR_NAME;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }
}

export { BinarySchemaMismatchError };
