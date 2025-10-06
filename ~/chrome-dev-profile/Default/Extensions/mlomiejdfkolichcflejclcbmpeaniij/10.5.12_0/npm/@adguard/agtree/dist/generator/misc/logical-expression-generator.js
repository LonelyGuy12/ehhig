import { BaseGenerator } from '../base-generator.js';
import { OperatorValue } from '../../nodes/index.js';
import { NodeType } from '../../parser/misc/logical-expression-parser.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Generator for logical expression nodes.
 */
class LogicalExpressionGenerator extends BaseGenerator {
    /**
     * Generates a string representation of the logical expression (serialization).
     *
     * @param node Expression node
     * @returns String representation of the logical expression
     */
    static generate(node) {
        if (node.type === NodeType.Variable) {
            return node.name;
        }
        if (node.type === NodeType.Operator) {
            const left = LogicalExpressionGenerator.generate(node.left);
            const right = node.right ? LogicalExpressionGenerator.generate(node.right) : undefined;
            const { operator } = node;
            // Special case for NOT operator
            if (operator === OperatorValue.Not) {
                return `${operator}${left}`;
            }
            // Right operand is required for AND and OR operators
            if (!right) {
                throw new Error('Expected right operand');
            }
            return `${left} ${operator} ${right}`;
        }
        if (node.type === NodeType.Parenthesis) {
            const expressionString = LogicalExpressionGenerator.generate(node.expression);
            return `(${expressionString})`;
        }
        // Theoretically, this shouldn't happen if the library is used correctly
        throw new Error('Unexpected node type');
    }
}

export { LogicalExpressionGenerator };
