import { NotImplementedError } from '../errors/not-implemented-error.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Base deserializer class.
 */
/**
 * Base class for deserializers. Each deserializer should extend this class.
 */
class BaseDeserializer {
    /**
     * Deserializes the AST node from a byte buffer.
     *
     * @param buffer Input byte buffer to read from.
     * @param node Destination node to write to.
     * @param args Additional, parser-specific arguments, if needed.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static deserialize(buffer, node, ...args) {
        throw new NotImplementedError();
    }
}

export { BaseDeserializer };
