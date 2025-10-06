import { tokenizeExtended, getFormattedTokenName, TokenType } from '../../../../css-tokenizer/dist/csstokenizer.js';
import { sprintfExports } from '../../../../../../virtual/sprintf.js';
import { AdblockSyntaxError } from '../../errors/adblock-syntax-error.js';
import { ERROR_MESSAGES, END_OF_INPUT } from './constants.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Tokenizer helpers for balanced pairs.
 */
/**
 * Map of opening tokens to their corresponding closing tokens.
 */
const standardTokenPairs = new Map([
    [TokenType.Function, TokenType.CloseParenthesis],
    [TokenType.OpenParenthesis, TokenType.CloseParenthesis],
    [TokenType.OpenSquareBracket, TokenType.CloseSquareBracket],
    [TokenType.OpenCurlyBracket, TokenType.CloseCurlyBracket],
]);
/**
 * Map of opening tokens to their corresponding closing tokens just for function calls. This makes possible a more
 * lightweight and tolerant check for balanced pairs in some cases.
 */
const functionTokenPairs = new Map([
    [TokenType.Function, TokenType.CloseParenthesis],
    [TokenType.OpenParenthesis, TokenType.CloseParenthesis],
]);
/**
 * Helper function to tokenize and ensure balanced pairs.
 *
 * @param raw Raw CSS string to tokenize
 * @param onToken Callback which will be invoked for each token, extended with a `balance` parameter
 * @param onError Error callback which is called when a parsing error is found (optional)
 * @param functionHandlers Custom function handlers (optional)
 * @param tokenPairs Map of opening tokens to their corresponding closing tokens
 * @throws If the input is not balanced
 * @todo Consider adding a `tolerant` flag if error throwing seems too aggressive in the future
 */
const tokenizeWithBalancedPairs = (raw, onToken, onError = () => { }, functionHandlers, tokenPairs = standardTokenPairs) => {
    const stack = [];
    const values = new Set(tokenPairs.values());
    tokenizeExtended(raw, (type, start, end, props, stop) => {
        if (tokenPairs.has(type)) {
            // If the token is an opening token, push its corresponding closing token to the stack.
            // It is safe to use non-null assertion here, because we have checked that the token exists in the map.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            stack.push(tokenPairs.get(type));
        }
        else if (values.has(type)) {
            // If the token is a closing token, check if it matches the last opening token, and if so, pop it.
            if (stack[stack.length - 1] === type) {
                stack.pop();
            }
            else {
                throw new AdblockSyntaxError(sprintfExports.sprintf(ERROR_MESSAGES.EXPECTED_TOKEN_BUT_GOT, getFormattedTokenName(stack[stack.length - 1]), getFormattedTokenName(type)), start, raw.length);
            }
        }
        onToken(type, start, end, props, stack.length, stop);
    }, onError, functionHandlers);
    // If the stack is not empty, then there are some opening tokens that were not closed.
    if (stack.length > 0) {
        throw new AdblockSyntaxError(sprintfExports.sprintf(ERROR_MESSAGES.EXPECTED_TOKEN_BUT_GOT, getFormattedTokenName(stack[stack.length - 1]), END_OF_INPUT), raw.length - 1, raw.length);
    }
};
/**
 * Tokenize and ensure balanced pairs for standard CSS.
 *
 * @param raw Raw CSS string to tokenize
 * @param onToken Callback which will be invoked for each token, extended with a `balance` parameter
 * @param onError Error callback which is called when a parsing error is found (optional)
 * @param functionHandlers Custom function handlers (optional)
 * @throws If the input is not balanced
 */
const tokenizeBalanced = (raw, onToken, onError = () => { }, functionHandlers) => {
    tokenizeWithBalancedPairs(raw, onToken, onError, functionHandlers);
};
/**
 * Tokenize and ensure balanced pairs for function calls.
 *
 * @param raw Raw CSS string to tokenize
 * @param onToken Callback which will be invoked for each token, extended with a `balance` parameter
 * @param onError Error callback which is called when a parsing error is found (optional)
 * @param functionHandlers Custom function handlers (optional)
 * @throws If the input is not balanced
 */
const tokenizeFnBalanced = (raw, onToken, onError = () => { }, functionHandlers) => {
    tokenizeWithBalancedPairs(raw, onToken, onError, functionHandlers, functionTokenPairs);
};

export { tokenizeBalanced, tokenizeFnBalanced };
