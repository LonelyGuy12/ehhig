import { NotImplementedError } from '../errors/not-implemented-error.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Base serializer class.
 */
/**
 * Base class for serializers. Each serializer should extend this class.
 */
class BaseSerializer {
    /**
     * Serializes the AST node to a byte buffer.
     *
     * @param node AST node to serialize.
     * @param buffer Output byte buffer to write to.
     * @param args Additional, parser-specific arguments, if needed.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static serialize(node, buffer, ...args) {
        throw new NotImplementedError();
    }
}

export { BaseSerializer };
