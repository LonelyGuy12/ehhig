/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * @file Constant values used by all parts of the library
 */
// TODO: remove unused constants
// General
/**
 * Empty string.
 */
const EMPTY = '';
const SPACE = ' ';
const TAB = '\t';
const COLON = ':';
const COMMA = ',';
const DOT = '.';
const SEMICOLON = ';';
const AMPERSAND = '&';
const ASTERISK = '*';
const AT_SIGN = '@';
const CARET = '^';
const DOLLAR_SIGN = '$';
const EQUALS = '=';
const EXCLAMATION_MARK = '!';
const HASHMARK = '#';
const PIPE = '|';
const PLUS = '+';
const QUESTION_MARK = '?';
const SLASH = '/';
const UNDERSCORE = '_';
// Escape characters
const BACKSLASH = '\\';
const ESCAPE_CHARACTER = BACKSLASH;
// Newlines
const CR = '\r';
const FF = '\f';
const LF = '\n';
const CRLF = CR + LF;
// Quotes
const BACKTICK_QUOTE = '`';
const DOUBLE_QUOTE = '"';
const SINGLE_QUOTE = '\'';
// Brackets
const OPEN_PARENTHESIS = '(';
const CLOSE_PARENTHESIS = ')';
const OPEN_SQUARE_BRACKET = '[';
const CLOSE_SQUARE_BRACKET = ']';
const OPEN_CURLY_BRACKET = '{';
const CLOSE_CURLY_BRACKET = '}';
// Letters
const SMALL_LETTER_A = 'a';
const SMALL_LETTER_Z = 'z';
// Capital letters
const CAPITAL_LETTER_A = 'A';
const CAPITAL_LETTER_Z = 'Z';
// Numbers as strings
const NUMBER_0 = '0';
const NUMBER_9 = '9';
const REGEX_MARKER = '/';
const ADG_SCRIPTLET_MASK = '//scriptlet';
const UBO_SCRIPTLET_MASK = '+js';
const UBO_SCRIPTLET_MASK_LEGACY = 'script:inject';
const UBO_HTML_MASK = '^';
const UBO_MATCHES_PATH_OPERATOR = 'matches-path';
const ADG_PATH_MODIFIER = 'path';
const ADG_DOMAINS_MODIFIER = 'domain';
const ADG_APP_MODIFIER = 'app';
const ADG_URL_MODIFIER = 'url';
// Modifiers are separated by ",". For example: "script,domain=example.com"
const MODIFIERS_SEPARATOR = ',';
const MODIFIER_ASSIGN_OPERATOR = '=';
const NEGATION_MARKER = '~';
/**
 * The wildcard symbol — `*`.
 */
const WILDCARD = ASTERISK;
/**
 * Classic domain separator.
 *
 * @example
 * ```adblock
 * ! Domains are separated by ",":
 * example.com,~example.org##.ads
 * ```
 */
const COMMA_DOMAIN_LIST_SEPARATOR = ',';
/**
 * Modifier separator for $app, $denyallow, $domain, $method.
 *
 * @example
 * ```adblock
 * ! Domains are separated by "|":
 * ads.js^$script,domains=example.com|~example.org
 * ```
 */
const PIPE_MODIFIER_SEPARATOR = '|';
const CSS_MEDIA_MARKER = '@media';
const CSS_PSEUDO_MARKER = ':';
const CSS_PSEUDO_OPEN = '(';
const CSS_PSEUDO_CLOSE = ')';
const CSS_NOT_PSEUDO = 'not';
const CSS_BLOCK_OPEN = '{';
const CSS_BLOCK_CLOSE = '}';
const HINT_MARKER = '!+';
const HINT_MARKER_LEN = HINT_MARKER.length;
const NETWORK_RULE_EXCEPTION_MARKER = '@@';
const NETWORK_RULE_EXCEPTION_MARKER_LEN = NETWORK_RULE_EXCEPTION_MARKER.length;
const NETWORK_RULE_SEPARATOR = '$';
const AGLINT_COMMAND_PREFIX = 'aglint';
const AGLINT_CONFIG_COMMENT_MARKER = '--';
const PREPROCESSOR_MARKER = '!#';
const PREPROCESSOR_MARKER_LEN = PREPROCESSOR_MARKER.length;
const PREPROCESSOR_SEPARATOR = ' ';
const SAFARI_CB_AFFINITY = 'safari_cb_affinity';
const IF = 'if';
const INCLUDE = 'include';
const NULL = 0;
const UINT8_MAX = 255;
const UINT16_MAX = 65535;

export { ADG_APP_MODIFIER, ADG_DOMAINS_MODIFIER, ADG_PATH_MODIFIER, ADG_SCRIPTLET_MASK, ADG_URL_MODIFIER, AGLINT_COMMAND_PREFIX, AGLINT_CONFIG_COMMENT_MARKER, AMPERSAND, ASTERISK, AT_SIGN, BACKSLASH, BACKTICK_QUOTE, CAPITAL_LETTER_A, CAPITAL_LETTER_Z, CARET, CLOSE_CURLY_BRACKET, CLOSE_PARENTHESIS, CLOSE_SQUARE_BRACKET, COLON, COMMA, COMMA_DOMAIN_LIST_SEPARATOR, CR, CRLF, CSS_BLOCK_CLOSE, CSS_BLOCK_OPEN, CSS_MEDIA_MARKER, CSS_NOT_PSEUDO, CSS_PSEUDO_CLOSE, CSS_PSEUDO_MARKER, CSS_PSEUDO_OPEN, DOLLAR_SIGN, DOT, DOUBLE_QUOTE, EMPTY, EQUALS, ESCAPE_CHARACTER, EXCLAMATION_MARK, FF, HASHMARK, HINT_MARKER, HINT_MARKER_LEN, IF, INCLUDE, LF, MODIFIERS_SEPARATOR, MODIFIER_ASSIGN_OPERATOR, NEGATION_MARKER, NETWORK_RULE_EXCEPTION_MARKER, NETWORK_RULE_EXCEPTION_MARKER_LEN, NETWORK_RULE_SEPARATOR, NULL, NUMBER_0, NUMBER_9, OPEN_CURLY_BRACKET, OPEN_PARENTHESIS, OPEN_SQUARE_BRACKET, PIPE, PIPE_MODIFIER_SEPARATOR, PLUS, PREPROCESSOR_MARKER, PREPROCESSOR_MARKER_LEN, PREPROCESSOR_SEPARATOR, QUESTION_MARK, REGEX_MARKER, SAFARI_CB_AFFINITY, SEMICOLON, SINGLE_QUOTE, SLASH, SMALL_LETTER_A, SMALL_LETTER_Z, SPACE, TAB, UBO_HTML_MASK, UBO_MATCHES_PATH_OPERATOR, UBO_SCRIPTLET_MASK, UBO_SCRIPTLET_MASK_LEGACY, UINT16_MAX, UINT8_MAX, UNDERSCORE, WILDCARD };
