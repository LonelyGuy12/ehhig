import { NotImplementedError } from '../errors/not-implemented-error.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @file Base generator class.
 */
/**
 * Base class for generators. Each generator should extend this class.
 */
class BaseGenerator {
    /**
     * Generates a string from the AST node.
     *
     * @param node AST node to generate a string from.
     */
    static generate(node) {
        throw new NotImplementedError();
    }
}

export { BaseGenerator };
