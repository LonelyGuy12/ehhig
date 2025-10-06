import z, { ZodError, record as recordType, string as stringType, number as numberType, object as objectType, unknown as unknownType } from '../../npm/zod/lib/index.js';
import { fromZodError } from '../../../../zod-validation-error/v3/index.js';
import { getPublicSuffix } from '../../../../tldts/dist/es6/index.js';
import { Logger } from '../../../logger/dist/es/index.js';
import { isValidScriptletName, isRedirectResourceCompatibleWithAdg } from '../../../scriptlets/dist/validators/index.js';
import isCidr from '../../../../../virtual/index.js';
import isIp from '../../../../../virtual/index2.js';
import { contains } from '../../../../cidr-tools/index.js';
import { tokenizeExtended, TokenType, decodeIdent } from '../../../css-tokenizer/dist/csstokenizer.js';
import punycode from '../../../../../virtual/punycode.js';
import { getRedirectFilename } from '../../../scriptlets/dist/redirects/index.js';
import { RuleParser } from '../../../agtree/dist/parser/rule-parser.js';
import { RuleGenerator } from '../../../agtree/dist/generator/rule-generator.js';
import { InputByteBuffer } from '../../../agtree/dist/utils/input-byte-buffer.js';
import { RuleConverter } from '../../../agtree/dist/converter/rule.js';
import { RuleDeserializer } from '../../../agtree/dist/deserializer/rule-deserializer.js';
import { RuleCategory, NetworkRuleType, CosmeticRuleType } from '../../../agtree/dist/nodes/index.js';
import { PIPE_MODIFIER_SEPARATOR, COMMA_DOMAIN_LIST_SEPARATOR, ADG_SCRIPTLET_MASK } from '../../../agtree/dist/utils/constants.js';
import { DomainUtils } from '../../../agtree/dist/utils/domain.js';
import { QuoteUtils, QuoteType } from '../../../agtree/dist/utils/quotes.js';
import { CosmeticRuleSeparatorUtils } from '../../../agtree/dist/utils/cosmetic-rule-separator.js';
import { CosmeticRuleBodyGenerator } from '../../../agtree/dist/generator/cosmetic/cosmetic-rule-body-generator.js';
import { scriptlets } from '../../../scriptlets/dist/scriptlets/index.js';
import { AdblockSyntax } from '../../../agtree/dist/utils/adblockers.js';
import { DomainListParser } from '../../../agtree/dist/parser/misc/domain-list-parser.js';
import { defaultParserOptions } from '../../../agtree/dist/parser/options.js';

/**
 * Checks if error has message.
 *
 * @param error Error object.
 *
 * @returns If param is error.
 */
function isErrorWithMessage(error) {
    return (typeof error === 'object'
        && error !== null
        && 'message' in error
        && typeof error.message === 'string');
}
/**
 * Converts error to the error with message.
 *
 * @param maybeError Possible error.
 *
 * @returns Error with message.
 */
function toErrorWithMessage(maybeError) {
    if (isErrorWithMessage(maybeError)) {
        return maybeError;
    }
    try {
        return new Error(JSON.stringify(maybeError));
    }
    catch {
        // fallback in case there's an error stringifying the maybeError
        // like with circular references for example.
        return new Error(String(maybeError));
    }
}
/**
 * Converts error object to error with message. This method might be helpful to handle thrown errors.
 *
 * @param error Error object.
 *
 * @returns Message of the error.
 */
function getErrorMessage(error) {
    // Special case: pretty print Zod errors
    if (error instanceof ZodError) {
        return fromZodError(error).toString();
    }
    return toErrorWithMessage(error).message;
}

/**
 * RequestType is the request types enumeration.
 * Important: the enumeration is marked as const to avoid side effects when
 * importing it into an extension.
 */
const RequestType = {
    /**
     * No value is set. Syntax sugar to simplify code.
     */
    NotSet: 0,
    /**
     * Main frame.
     */
    Document: 1,
    /**
     * (iframe) $subdocument.
     */
    SubDocument: 2, // 1 << 1
    /**
     * (javascript, etc) $script.
     */
    Script: 4, // 1 << 2
    /**
     * (css) $stylesheet.
     */
    Stylesheet: 8, // 1 << 3
    /**
     * (flash, etc) $object.
     */
    Object: 16, // 1 << 4
    /**
     * (any image) $image.
     */
    Image: 32, // 1 << 5
    /**
     * (ajax/fetch) $xmlhttprequest.
     */
    XmlHttpRequest: 64, // 1 << 6
    /**
     * (video/music) $media.
     */
    Media: 128, // 1 << 7
    /**
     * (any custom font) $font.
     */
    Font: 256, // 1 << 8
    /**
     * (a websocket connection) $websocket.
     */
    WebSocket: 512, // 1 << 9
    /**
     * (navigator.sendBeacon()) $ping.
     */
    Ping: 1024, // 1 << 10
    /**
     * Csp_report.
     */
    CspReport: 2048, // 1 << 11
    /**
     * Any other request type.
     */
    Other: 4096, // 1 << 12
};

var HTTPMethod;
(function (HTTPMethod) {
    HTTPMethod["GET"] = "GET";
    HTTPMethod["POST"] = "POST";
    HTTPMethod["PUT"] = "PUT";
    HTTPMethod["DELETE"] = "DELETE";
    HTTPMethod["PATCH"] = "PATCH";
    HTTPMethod["HEAD"] = "HEAD";
    HTTPMethod["OPTIONS"] = "OPTIONS";
    HTTPMethod["CONNECT"] = "CONNECT";
    HTTPMethod["TRACE"] = "TRACE";
})(HTTPMethod || (HTTPMethod = {}));
/**
 * Method modifier class.
 * Rules with $method modifier will be applied only to requests with specified methods.
 *
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#method-modifier}
 */
class MethodModifier {
    /**
     * Request methods separator.
     */
    static PIPE_SEPARATOR = '|';
    /**
     * List of permitted methods or null.
     */
    permittedValues;
    /**
     * List of restricted methods or null.
     */
    restrictedValues;
    /**
     * Constructor.
     *
     * @param methodsStr Value of the modifier.
     */
    constructor(methodsStr) {
        if (methodsStr === '') {
            throw new SyntaxError('$method modifier value cannot be empty');
        }
        const permittedMethods = [];
        const restrictedMethods = [];
        const parts = methodsStr.toUpperCase().split(MethodModifier.PIPE_SEPARATOR);
        for (let i = 0; i < parts.length; i += 1) {
            let method = parts[i].trim();
            let restricted = false;
            if (method.startsWith('~')) {
                restricted = true;
                method = method.substring(1);
            }
            if (!MethodModifier.isHTTPMethod(method)) {
                throw new SyntaxError(`Invalid $method modifier value: ${method}`);
            }
            if (restricted) {
                restrictedMethods.push(method);
            }
            else {
                permittedMethods.push(method);
            }
        }
        if (restrictedMethods.length > 0 && permittedMethods.length > 0) {
            throw new SyntaxError(`Negated values cannot be mixed with non-negated values: ${methodsStr}`);
        }
        this.restrictedValues = restrictedMethods.length > 0 ? restrictedMethods : null;
        this.permittedValues = permittedMethods.length > 0 ? permittedMethods : null;
    }
    static isHTTPMethod = (value) => value in HTTPMethod;
}

/* eslint-disable jsdoc/require-description-complete-sentence */
/**
 * @file Describes types from declarativeNetRequest,
 * since @types/chrome does not contain actual information.
 *
 * Updated 07/09/2022.
 */
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-DomainType
 */
var DomainType;
(function (DomainType) {
    DomainType["FirstParty"] = "firstParty";
    DomainType["ThirdParty"] = "thirdParty";
})(DomainType || (DomainType = {}));
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
 */
var ResourceType;
(function (ResourceType) {
    ResourceType["MainFrame"] = "main_frame";
    ResourceType["SubFrame"] = "sub_frame";
    ResourceType["Stylesheet"] = "stylesheet";
    ResourceType["Script"] = "script";
    ResourceType["Image"] = "image";
    ResourceType["Font"] = "font";
    ResourceType["Object"] = "object";
    ResourceType["XmlHttpRequest"] = "xmlhttprequest";
    ResourceType["Ping"] = "ping";
    ResourceType["Media"] = "media";
    ResourceType["WebSocket"] = "websocket";
    ResourceType["Other"] = "other";
    // Temporary not using
    // TODO: Add csp_report handler similar to AG-24613 but in declarative way.
    // CspReport = 'csp_report',
    // WebTransport = 'webtransport',
    // WebBundle = 'webbundle',
})(ResourceType || (ResourceType = {}));
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-QueryKeyValue
 */
const QueryKeyValueValidator = z.strictObject({
    key: z.string(),
    replaceOnly: z.boolean().optional(),
    value: z.string(),
});
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-QueryTransform
 */
const QueryTransformValidator = z.strictObject({
    addOrReplaceParams: QueryKeyValueValidator.array().optional(),
    removeParams: z.string().array().optional(),
});
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-URLTransform
 */
const URLTransformValidator = z.strictObject({
    fragment: z.string().optional(),
    host: z.string().optional(),
    password: z.string().optional(),
    path: z.string().optional(),
    port: z.string().optional(),
    query: z.string().optional(),
    queryTransform: QueryTransformValidator.optional(),
    scheme: z.string().optional(),
    username: z.string().optional(),
});
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-Redirect
 */
const RedirectValidator = z.strictObject({
    extensionPath: z.string().optional(),
    regexSubstitution: z.string().optional(),
    transform: URLTransformValidator.optional(),
    url: z.string().optional(),
});
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-HeaderOperation
 */
var HeaderOperation;
(function (HeaderOperation) {
    HeaderOperation["Append"] = "append";
    HeaderOperation["Set"] = "set";
    HeaderOperation["Remove"] = "remove";
})(HeaderOperation || (HeaderOperation = {}));
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ModifyHeaderInfo
 */
const ModifyHeaderInfoValidator = z.strictObject({
    header: z.string(),
    operation: z.nativeEnum(HeaderOperation),
    value: z.string().optional(),
});
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RuleActionType
 */
var RuleActionType;
(function (RuleActionType) {
    RuleActionType["BLOCK"] = "block";
    RuleActionType["REDIRECT"] = "redirect";
    RuleActionType["ALLOW"] = "allow";
    RuleActionType["UPGRADE_SCHEME"] = "upgradeScheme";
    RuleActionType["MODIFY_HEADERS"] = "modifyHeaders";
    /**
     * For allowAllRequests rules {@link RuleCondition.resourceTypes} may only
     * include the 'sub_frame' and 'main_frame' resource types.
     */
    RuleActionType["ALLOW_ALL_REQUESTS"] = "allowAllRequests";
})(RuleActionType || (RuleActionType = {}));
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RuleAction
 */
const RuleActionValidator = z.strictObject({
    redirect: RedirectValidator.optional(),
    requestHeaders: ModifyHeaderInfoValidator.array().optional(),
    responseHeaders: ModifyHeaderInfoValidator.array().optional(),
    type: z.nativeEnum(RuleActionType),
});
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RequestMethod
 */
var RequestMethod;
(function (RequestMethod) {
    RequestMethod["Connect"] = "connect";
    RequestMethod["Delete"] = "delete";
    RequestMethod["Get"] = "get";
    RequestMethod["Head"] = "head";
    RequestMethod["Options"] = "options";
    RequestMethod["Patch"] = "patch";
    RequestMethod["Post"] = "post";
    RequestMethod["Put"] = "put";
})(RequestMethod || (RequestMethod = {}));
/**
 * Map {@link HTTPMethod} to declarative {@link RequestMethod}.
 */
const DECLARATIVE_REQUEST_METHOD_MAP = {
    [HTTPMethod.GET]: RequestMethod.Get,
    [HTTPMethod.POST]: RequestMethod.Post,
    [HTTPMethod.PUT]: RequestMethod.Put,
    [HTTPMethod.DELETE]: RequestMethod.Delete,
    [HTTPMethod.PATCH]: RequestMethod.Patch,
    [HTTPMethod.HEAD]: RequestMethod.Head,
    [HTTPMethod.OPTIONS]: RequestMethod.Options,
    [HTTPMethod.CONNECT]: RequestMethod.Connect,
};
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RuleCondition
 */
const RuleConditionValidator = z.strictObject({
    domainType: z.nativeEnum(DomainType).optional(),
    excludedInitiatorDomains: z.string().array().optional(),
    excludedRequestDomains: z.string().array().optional(),
    excludedRequestMethods: z.nativeEnum(RequestMethod).array().optional(),
    excludedResourceTypes: z.nativeEnum(ResourceType).array().optional(),
    excludedTabIds: z.number().array().optional(),
    initiatorDomains: z.string().array().optional(),
    isUrlFilterCaseSensitive: z.boolean().optional(),
    regexFilter: z.string().optional(),
    requestDomains: z.string().array().optional(),
    requestMethods: z.nativeEnum(RequestMethod).array().optional(),
    /**
     * If none of the `excludedResourceTypes` and `resourceTypes` are specified,
     * all resource types except "main_frame" will be matched.
     */
    resourceTypes: z.nativeEnum(ResourceType).array().optional(),
    tabIds: z.number().array().optional(),
    urlFilter: z.string().optional(),
});
/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-Rule
 */
const DeclarativeRuleValidator = z.strictObject({
    action: RuleActionValidator,
    condition: RuleConditionValidator,
    id: z.number(),
    priority: z.number().optional(),
});
/**
 * Map request types to declarative types.
 */
const DECLARATIVE_RESOURCE_TYPES_MAP = {
    [ResourceType.MainFrame]: RequestType.Document,
    [ResourceType.SubFrame]: RequestType.SubDocument,
    [ResourceType.Stylesheet]: RequestType.Stylesheet,
    [ResourceType.Script]: RequestType.Script,
    [ResourceType.Image]: RequestType.Image,
    [ResourceType.Font]: RequestType.Font,
    [ResourceType.Object]: RequestType.Object,
    [ResourceType.XmlHttpRequest]: RequestType.XmlHttpRequest,
    [ResourceType.Ping]: RequestType.Ping,
    // TODO: what should match this resource type?
    // [ResourceType.CSP_REPORT]: RequestType.Document,
    [ResourceType.Media]: RequestType.Media,
    [ResourceType.WebSocket]: RequestType.WebSocket,
    [ResourceType.Other]: RequestType.Other,
};

/**
 * @file Separate file for the `isSafeRule` function, because it can be used
 * outside of the declarative converter to check if a rule is safe, e.g. for
 * passing rules to "skip review" in CWS.
 */
/**
 * List of declarative rule actions which are considered safe.
 *
 * @see {@link https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#safe_rules}
 */
const SAFE_RULE_ACTIONS = new Set([
    RuleActionType.BLOCK,
    RuleActionType.ALLOW,
    RuleActionType.ALLOW_ALL_REQUESTS,
    RuleActionType.UPGRADE_SCHEME,
]);
/**
 * Checks whether the declarative rule is safe.
 *
 * @see {@link https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#safe_rules}
 *
 * @param rule Declarative rule to check.
 *
 * @returns True if the rule is safe, otherwise false.
 */
const isSafeRule = (rule) => {
    return SAFE_RULE_ACTIONS.has(rule.action.type);
};

var ErrorStatusCodes;
(function (ErrorStatusCodes) {
    ErrorStatusCodes[ErrorStatusCodes["ComplexRegex"] = 1001] = "ComplexRegex";
    ErrorStatusCodes[ErrorStatusCodes["RuleLimit"] = 1002] = "RuleLimit";
    ErrorStatusCodes[ErrorStatusCodes["RegexpRuleLimit"] = 1003] = "RegexpRuleLimit";
    ErrorStatusCodes[ErrorStatusCodes["RemoveparamRegexpIsNotSupported"] = 1004] = "RemoveparamRegexpIsNotSupported";
    ErrorStatusCodes[ErrorStatusCodes["RemoveparamInversionIsNotSupported"] = 1005] = "RemoveparamInversionIsNotSupported";
})(ErrorStatusCodes || (ErrorStatusCodes = {}));
const EMPTY_STRING = '';
const SEPARATOR = '|';
const SPACE = ' ';
const WILDCARD = '*';
const LF = '\n';
const CR = '\r';
const FF = '\f';
const TAB = '\t';

/**
 * @file Smaller utility functions that cannot be classified in other files here,
 * but it is not worth creating a separate file for them.
 */
/**
 * Helper function to serialize data to JSON and optionally prettify it.
 * Its just helps to keep the code clean and readable.
 *
 * @param data Data to serialize.
 * @param pretty If `true`, the JSON will be prettified with tabs.
 *
 * @returns Serialized JSON.
 */
function serializeJson(data, pretty = false) {
    return JSON.stringify(data, null, pretty ? TAB : undefined);
}

/**
 * Splits the string by the delimiter, ignoring escaped delimiters
 * and without tokenizing.
 * Works for plain strings that don't include string representation of
 * complex entities, e.g $replace modifier values.
 *
 * @param string String to split.
 * @param delimiter Delimiter.
 * @param escapeCharacter Escape character.
 * @param preserveEmptyTokens If true, preserve empty parts.
 * @param shouldUnescape If true, unescape characters.
 *
 * @returns Array of string parts.
 */
function splitByDelimiterWithEscapeCharacter(string, delimiter, escapeCharacter, preserveEmptyTokens, shouldUnescape = true) {
    if (!string) {
        return [];
    }
    if (string.startsWith(delimiter)) {
        // eslint-disable-next-line no-param-reassign
        string = string.substring(1);
    }
    let words = [];
    if (!string.includes(escapeCharacter)) {
        words = string.split(delimiter);
        return words;
    }
    let chars = [];
    const makeWord = () => {
        const word = chars.join('');
        words.push(word);
        chars = [];
    };
    for (let i = 0; i < string.length; i += 1) {
        const char = string.charAt(i);
        const isLastChar = i === (string.length - 1);
        if (char === delimiter) {
            const isEscapedChar = i > 0 && string[i - 1] === escapeCharacter;
            if (isEscapedChar) {
                if (shouldUnescape) {
                    chars.splice(chars.length - 1, 1);
                }
                chars.push(char);
            }
            else {
                makeWord();
            }
            if (isLastChar) {
                makeWord();
            }
        }
        else if (isLastChar) {
            chars.push(char);
            makeWord();
        }
        else {
            chars.push(char);
        }
    }
    return words;
}
/**
 * `djb2` hash algorithm.
 *
 * NOTE: This version uses some bit operands to exclude overflow MAX_SAFE_INTEGER
 * (and moreover, exclude overflow 2^32).
 *
 * @see {@link https://gist.github.com/eplawless/52813b1d8ad9af510d85?permalink_comment_id=3367765#gistcomment-3367765}
 *
 * @param str String to get hash.
 *
 * @returns Hash.
 */
function fastHash(str) {
    if (str.length === 0) {
        return 0;
    }
    // A magic constant that gives good distribution.
    let hash = 5381;
    for (let i = 0; i < str.length; i += 1) {
        hash = hash * 33 ^ str.charCodeAt(i);
    }
    return hash >>> 0;
}
/**
 * `djb2` hash algorithm with sign bit masked off to fit 31 bits.
 *
 * @param str String to get hash.
 *
 * @returns Hash from 0 to 2^31-1.
 */
function fastHash31(str) {
    // Mask off sign bit to keep value in range [0, ..., 2^31‑1].
    return fastHash(str) & 0x7fffffff;
}
/**
 * Replaces all occurrences of find with replace in str.
 *
 * @param str The string in which to replace all occurrences of the find string.
 * @param find The substring to find in the string.
 * @param replace The substring to replace the find string with.
 *
 * @returns The string with all occurrences of find replaced by replace.
 */
function replaceAll(str, find, replace) {
    if (!str) {
        return str;
    }
    return str.split(find).join(replace);
}
/**
 * Checks if arrays are equal.
 *
 * @param left Array.
 * @param right Array.
 *
 * @returns {boolean} True on equality.
 */
function stringArraysEquals(left, right) {
    if (!left || !right) {
        return !left && !right;
    }
    if (left.length !== right.length) {
        return false;
    }
    for (let i = 0; i < left.length; i += 1) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if arrays have an intersection.
 *
 * @param left Array.
 * @param right Array.
 *
 * @returns {boolean} True on equality.
 */
function stringArraysHaveIntersection(left, right) {
    if (!left || !right) {
        return true;
    }
    for (let i = 0; i < left.length; i += 1) {
        if (right.includes(left[i])) {
            return true;
        }
    }
    return false;
}
/**
 * Checks if string contains spaces.
 *
 * @param str String to check.
 *
 * @returns `true` if string contains spaces, `false` otherwise.
 */
function hasSpaces(str) {
    return str.includes(SPACE);
}
/**
 * Check if the given value is a string.
 *
 * @param value Value to check.
 *
 * @returns `true` if value is a string, `false` otherwise.
 */
function isString(value) {
    return typeof value === 'string';
}
/**
 * Unescapes the specified character in the string.
 *
 * @param str String to escape.
 * @param char Character to escape.
 *
 * @returns The string with the specified character unescaped.
 */
function unescapeChar(str, char) {
    return str.replace(`\\${char}`, char);
}
/**
 * Finds the next line break index in the string starting from the specified index.
 * Supports LF, CR, FF and CRLF line breaks.
 *
 * @param str String to search in.
 * @param startIndex  Start index. Default is 0.
 *
 * @returns A tuple with the line break index and the line break length.
 * If the line break is not found, returns the string length and 0.
 */
function findNextLineBreakIndex(str, startIndex = 0) {
    const { length } = str;
    let offset = startIndex;
    while (offset < length) {
        const char = str[offset];
        if (char === LF || char === FF) {
            return [offset, 1];
        }
        if (char === CR) {
            return str[offset + 1] === LF ? [offset, 2] : [offset, 1];
        }
        offset += 1;
    }
    return [length, 0];
}
/**
 * Finds the next occurrence of a specified character in a string that is not preceded by an escape (`\`).
 *
 * @param str The input string to search within.
 * @param char The character to find in the string.
 * @param [startIndex] The index to start searching from.
 *
 * @returns The index of the next unescaped occurrence of the character, or the length of the string if not found.
 */
const findNextUnescapedIndex = (str, char, startIndex = 0) => {
    let i = str.indexOf(char, startIndex);
    while (i !== -1 && str[i - 1] === '\\') {
        i = str.indexOf(char, i + 1);
    }
    return i === -1 ? str.length : i;
};
/**
 * Determines whether a given Unicode code point corresponds to a numeric digit (0-9).
 *
 * @param codePoint The Unicode code point to check.
 *
 * @returns `true` if the code point represents a numeric character (0-9), otherwise `false`.
 */
const isNumber = (codePoint) => {
    return codePoint >= 48 && codePoint <= 57;
};
/**
 * Determines whether a given Unicode code point corresponds to an alphabetical letter (a-z, A-Z).
 *
 * @param codePoint The Unicode code point to check.
 *
 * @returns `true` if the code point represents an alphabetic character, otherwise `false`.
 */
const isAlpha = (codePoint) => {
    const codePointLower = codePoint | 0x20;
    return codePointLower >= 97 && codePointLower <= 122;
};
/**
 * Determines whether a given Unicode code point corresponds to an alphanumeric character (a-z, A-Z, 0-9).
 *
 * @param codePoint The Unicode code point to check.
 *
 * @returns `true` if the code point represents an alphanumeric character, otherwise `false`.
 */
const isAlphaNumeric = (codePoint) => {
    return isAlpha(codePoint) || isNumber(codePoint);
};

/* eslint-disable max-classes-per-file */
/**
 * Default rule index for source mapping.
 *
 * It is -1, similar to `Array.indexOf()` return value when element is not found.
 */
const RULE_INDEX_NONE = -1;
/**
 * Rule with index.
 */
// TODO: Consider remove this because rule already has an index field
class IndexedRule {
    /**
     * Rule.
     */
    rule;
    /**
     * Index.
     */
    index;
    /**
     * Constructor.
     *
     * @param rule Rule.
     * @param index Index of the rule.
     */
    constructor(rule, index) {
        this.rule = rule;
        this.index = index;
    }
}

/* eslint-disable prefer-regex-literals */
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
// should be escaped . * + ? ^ $ { } ( ) | [ ] / \
// except of * | ^
const specialCharacters = ['.', '+', '?', '$', '{', '}', '(', ')', '[', ']', '/', '\\'];
const reSpecialCharacters = new RegExp(`[${specialCharacters.join('\\')}]`, 'g');
const reSpecialCharactersFull = /[.*+?^${}()|[\]\\]/g;
const reEscapedSpecialCharactersFull = /\\[.*+?^${}()|[\]\\]/g;
const protocolMarker = String.raw `:\/\/`;
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#using_special_characters_in_strings
const escapeSequence = {
    n: '\n',
    r: '\r',
    t: '\t',
    b: '\b',
    f: '\f',
    v: '\v',
};
/**
 * Class with static helper methods for working with basic filtering rules patterns.
 *
 * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules}
 *
 * @returns The escaped string.
 */
class SimpleRegex {
    /**
     * Matching the beginning of an address. With this character you don't
     * have to specify a particular protocol and subdomain in address mask.
     * It means, `||` stands for `http://*.`, `https://*.`, `ws://*.`, `wss://*.` at once.
     */
    static MASK_START_URL = '||';
    /**
     * REGEX_START_URL corresponds to MASK_START_URL.
     */
    static REGEX_START_URL = '^(http|https|ws|wss)://([a-z0-9-_.]+\\.)?';
    /**
     * A pointer to the beginning or the end of address. The value depends on the
     * character placement in the mask. For example, a rule `swf|` corresponds
     * to `http://example.com/annoyingflash.swf`, but not to `http://example.com/swf/index.html`.
     * `|http://example.org` corresponds to `http://example.org`,
     * but not to `http://domain.com?url=http://example.org`.
     */
    static MASK_PIPE = '|';
    /**
     * REGEX_END_STRING corresponds to MASK_PIPE if it is in the end of a pattern.
     */
    static REGEX_END_STRING = '$';
    /**
     * REGEX_START_STRING corresponds to MASK_PIPE if it is in the beginning of a pattern.
     */
    static REGEX_START_STRING = '^';
    /**
     * Separator character mark. Separator character is any character,
     * but a letter, a digit, or one of the following: _ - .
     */
    static MASK_SEPARATOR = '^';
    /**
     * REGEX_SEPARATOR corresponds to MASK_SEPARATOR.
     */
    static REGEX_SEPARATOR = '([^ a-zA-Z0-9.%_-]|$)';
    /**
     * This is a wildcard character. It is used to represent "any set of characters".
     * This can also be an empty string or a string of any length.
     */
    static MASK_ANY_CHARACTER = '*';
    /**
     * Path separator.
     */
    static MASK_BACKSLASH = '/';
    /**
     * REGEX_ANY_CHARACTER corresponds to MASK_ANY_CHARACTER.
     */
    static REGEX_ANY_CHARACTER = '.*';
    /**
     * Enclose regex in two backslashes to mark a regex rule.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#regular-expressions-support}
     */
    static MASK_REGEX_RULE = '/';
    /**
     *  Regex for matching special characters in modifier regex pattern.
     */
    static reModifierPatternSpecialCharacters = /[[\],\\]/g;
    /**
     * Regex for matching escaped special characters in modifier regex pattern.
     */
    static reModifierPatternEscapedSpecialCharacters = /\\[[\],\\]/g;
    /**
     * If string starts with exclamation mark "!" we consider it as comment.
     */
    static MASK_COMMENT = '!';
    /**
     * Min length of rule shortcut
     * This value has been picked as a result of performance experiments.
     */
    static MIN_SHORTCUT_LENGTH = 3;
    /**
     * Min length of generic rule shortcut.
     */
    static MIN_GENERIC_RULE_LENGTH = 4;
    /**
     * Regex with basic matching pattern special characters.
     */
    static rePatternSpecialCharacters = new RegExp('[*^|]');
    /**
     * Extracts the shortcut from the rule's pattern.
     * Shortcut is the longest substring of the pattern that does not contain
     * any special characters.
     *
     * Please note, that the shortcut is always lower-case!
     *
     * @param pattern Network rule's pattern.
     *
     * @returns The shortcut or the empty string if we could not extract any.
     */
    static extractShortcut(pattern) {
        if (pattern.startsWith(this.MASK_REGEX_RULE) && pattern.endsWith(this.MASK_REGEX_RULE)) {
            return this.extractRegexpShortcut(pattern);
        }
        return this.extractBasicShortcut(pattern);
    }
    /**
     * Searches for the longest substring of the pattern that
     * does not contain any special characters: `*`, `^`, `|`.
     *
     * @param pattern Network rule's pattern.
     *
     * @returns The shortcut or the empty string.
     */
    static extractBasicShortcut(pattern) {
        let longest = '';
        const parts = pattern.split(this.rePatternSpecialCharacters);
        for (const part of parts) {
            if (part.length > longest.length) {
                longest = part;
            }
        }
        return (longest || '').toLowerCase();
    }
    /**
     * Extracts the longest substring from the provided regex pattern that does not
     * contain any special regex symbols or constructs that invalidate it for use
     * as a quick match shortcut.
     * The pattern is expected to be enclosed in forward slashes (e.g., `/example/`),
     * and may optionally contain a protocol marker (`://`),
     * which is ignored to prevent trivial matches like "http".
     *
     * This method discards many complex regex features (e.g., groups, character
     * classes, certain escaped sequences) when forming the shortcut, and always
     * returns the result in lower-case. If no valid substring is found, it returns
     * an empty string.
     *
     * @param pattern The input regex pattern, including the enclosing slashes.
     * For example: `/https?:\\/\\/example\\.com/`.
     *
     * @returns The longest valid substring usable as a shortcut, or an empty string if none is found.
     */
    static extractRegexpShortcut(pattern) {
        const { length } = pattern;
        if (!pattern
            // length should be at least 3: "/x/", "//" does not make sense
            || length < 3
            // regex pattern should start and end with '/'
            || pattern[0] !== '/'
            || pattern[length - 1] !== '/') {
            return '';
        }
        const protocolIndex = pattern.indexOf(protocolMarker);
        /**
         * `i` is our primary index into the pattern;
         * we skip the initial `/` or jump after the protocol marker `://`.
         */
        let i = protocolIndex !== -1
            ? protocolIndex + protocolMarker.length
            : 1;
        let longestToken = '';
        let longestTokenInGroup = '';
        let currentToken = '';
        /**
         * Resets `currentToken` and updates `longestTokenInGroup` if `currentToken` is longer.
         */
        const resetCurrentToken = () => {
            if (currentToken.length > longestTokenInGroup.length) {
                longestTokenInGroup = currentToken;
            }
            currentToken = '';
        };
        /**
         * Resets `longestTokenInGroup` and updates `longestToken` if `longestTokenInGroup` is longer.
         */
        const resetGroupToken = () => {
            if (longestTokenInGroup.length > longestToken.length) {
                longestToken = longestTokenInGroup;
            }
            longestTokenInGroup = '';
        };
        /**
         * Track parenthesis group nesting.
         */
        let groupBalance = 0;
        /**
         * Skip everything up to the closing parenthesis for the current group
         * (including nested groups).
         * This method moves `i` to the position of the closing parenthesis.
         */
        const ignoreCurrentGroup = () => {
            // Ignoring group means we should drop the current token
            currentToken = '';
            longestTokenInGroup = '';
            const startBalance = groupBalance;
            while (i < length) {
                // If `(` is not escaped, increment group count
                if (pattern[i] === '(' && pattern[i - 1] !== '\\') {
                    groupBalance += 1;
                }
                // If `)` is not escaped, decrement group count
                if (pattern[i] === ')' && pattern[i - 1] !== '\\') {
                    groupBalance -= 1;
                    // Once we return to the level before this group started, stop
                    if (groupBalance < startBalance) {
                        break;
                    }
                }
                i += 1;
            }
        };
        while (i < length) {
            const char = pattern[i];
            // 1) Handle escaped sequences
            if (char === '\\') {
                // Skip the backslash
                i += 1;
                const escaped = pattern[i];
                switch (escaped) {
                    // Ignore predefined character classes: \d, \D, \s, \S, \w, \W
                    case 'd':
                    case 'D':
                    case 's':
                    case 'S':
                    case 'w':
                    case 'W':
                    // Ignore special characters: \t, \r, \n, \v, \f, \b, \0
                    // eslint-disable-next-line no-fallthrough
                    case 't':
                    case 'r':
                    case 'n':
                    case 'v':
                    case 'f':
                    case 'b':
                    case '0':
                        resetCurrentToken();
                        i += 1;
                        continue;
                    // Ignore control characters: \cX — control character X
                    case 'c':
                        resetCurrentToken();
                        // skip 'c' and the following character
                        i += 2;
                        continue;
                    // Ignore \xhh
                    case 'x':
                        resetCurrentToken();
                        // skip 'x' and the following 2 characters
                        i += 3;
                        continue;
                    // Ignore \uhhhh
                    case 'u':
                        resetCurrentToken();
                        // skip 'u' and the following 4 characters
                        i += 5;
                        continue;
                    // Ignore named backreference: \k<...>
                    case 'k':
                        resetCurrentToken();
                        // skip 'k'
                        i += 1;
                        if (pattern[i] === '<') {
                            // Skip until the closing '>'
                            i = findNextUnescapedIndex(pattern, '>', i) + 1;
                        }
                        continue;
                    // Special case: add escaped '.' or '/' to the current token
                    case '.':
                    case '/':
                        currentToken += escaped;
                        i += 1;
                        continue;
                    default:
                        resetCurrentToken();
                        i += 1;
                        continue;
                }
            }
            // 2) Handle "regular" characters (i.e., not after a backslash)
            switch (char) {
                // Ignore custom character classes, like [xyz], [^xyz], [\b], [a-z], etc.
                case '[':
                    resetCurrentToken();
                    i = findNextUnescapedIndex(pattern, ']', i) + 1;
                    continue;
                // Ignore disjunctions (alternations), like a|b|c
                // Note: shortcut should be present in all possible tested strings,
                // this is why we ignore disjunctions
                case '|':
                    ignoreCurrentGroup();
                    continue;
                // Ignore specific quantifiers, like x{n}, x{n,}, x{n,m}
                case '{':
                    resetCurrentToken();
                    i = findNextUnescapedIndex(pattern, '}', i) + 1;
                    continue;
                // Handle group open
                case '(':
                    resetCurrentToken();
                    resetGroupToken();
                    groupBalance += 1;
                    // Skip `(`
                    i += 1;
                    // Ignore negative lookahead: (?!...) and negative lookbehind: (?<!...)
                    // Negative lookbehind and lookahead contain data that should not be present in the tested strings,
                    // this is why we ignore them
                    if (pattern.indexOf('?!', i) === i || pattern.indexOf('?<!', i) === i) {
                        ignoreCurrentGroup();
                    }
                    // Ignore name section from named groups: (?<...>
                    if (pattern.indexOf('?<', i) === i) {
                        // Skip until the closing '>'
                        i = findNextUnescapedIndex(pattern, '>', i + 2) + 1;
                    }
                    continue;
                // Handle group close
                case ')':
                    resetCurrentToken();
                    resetGroupToken();
                    groupBalance -= 1;
                    // Skip `)`
                    i += 1;
                    continue;
                // Handle special regex symbols: . * + ? ^ $ /
                case '.':
                case '*':
                case '+':
                case '?':
                case '^':
                case '$':
                case '/':
                    resetCurrentToken();
                    i += 1;
                    continue;
                default:
                    // For performance, let's check if it's a valid token char
                    // Note: isValidRegexpShortcutChar checks for alphanumeric or
                    // escaped '.' or '/'
                    if (isAlphaNumeric(char.charCodeAt(0))) {
                        currentToken += char;
                    }
                    else {
                        // If it's not a valid char for a shortcut, reset
                        resetCurrentToken();
                    }
                    i += 1;
                    break;
            }
        }
        // Finalize the last token
        resetCurrentToken();
        resetGroupToken();
        return longestToken.toLowerCase();
    }
    /**
     * PatternToRegexp is a helper method for creating regular expressions from the simple
     * wildcard-based syntax which is used in basic filters.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules}
     *
     * @param pattern Basic rule pattern.
     *
     * @returns Regular expression.
     */
    static patternToRegexp(pattern) {
        if (pattern === this.MASK_START_URL
            || pattern === this.MASK_PIPE
            || pattern === this.MASK_ANY_CHARACTER
            || pattern === '') {
            return this.REGEX_ANY_CHARACTER;
        }
        if (pattern.startsWith(this.MASK_REGEX_RULE) && pattern.endsWith(this.MASK_REGEX_RULE)) {
            // This is a regex rule, just remove the regex markers
            return pattern.substring(this.MASK_REGEX_RULE.length, pattern.length - this.MASK_REGEX_RULE.length);
        }
        // Escape special characters except of * | ^
        let regex = pattern.replace(reSpecialCharacters, '\\$&');
        // Now escape "|" characters but avoid escaping them in the special places
        if (regex.startsWith(this.MASK_START_URL)) {
            regex = regex.substring(0, this.MASK_START_URL.length)
                + replaceAll(regex.substring(this.MASK_START_URL.length, regex.length - this.MASK_PIPE.length), this.MASK_PIPE, `\\${this.MASK_PIPE}`)
                + regex.substring(regex.length - this.MASK_PIPE.length);
        }
        else {
            regex = regex.substring(0, this.MASK_PIPE.length)
                + replaceAll(regex.substring(this.MASK_PIPE.length, regex.length - this.MASK_PIPE.length), this.MASK_PIPE, `\\${this.MASK_PIPE}`)
                + regex.substring(regex.length - this.MASK_PIPE.length);
        }
        // Replace special URL masks
        regex = replaceAll(regex, this.MASK_ANY_CHARACTER, this.REGEX_ANY_CHARACTER);
        regex = replaceAll(regex, this.MASK_SEPARATOR, this.REGEX_SEPARATOR);
        // Replace start URL and pipes
        if (regex.startsWith(this.MASK_START_URL)) {
            regex = this.REGEX_START_URL + regex.substring(this.MASK_START_URL.length);
        }
        else if (regex.startsWith(this.MASK_PIPE)) {
            regex = this.REGEX_START_STRING + regex.substring(this.MASK_PIPE.length);
        }
        if (regex.endsWith(this.MASK_PIPE)) {
            regex = regex.substring(0, regex.length - this.MASK_PIPE.length) + this.REGEX_END_STRING;
        }
        return regex;
    }
    /**
     * Creates RegExp object from string in '/reg_exp/gi' format.
     *
     * @param str The string to escape.
     *
     * @returns The created RegExp object.
     */
    static patternFromString(str) {
        const parts = splitByDelimiterWithEscapeCharacter(str, '/', '\\');
        let modifiers = (parts[1] || '');
        if (modifiers.indexOf('g') < 0) {
            modifiers += 'g';
        }
        return new RegExp(parts[0], modifiers);
    }
    /**
     * Escapes characters with special meaning inside a regular expression.
     *
     * @param str The string to escape.
     * @param searchPattern Pattern for detecting special characters. Optional.
     *
     * @returns The escaped string.
     */
    static escapeRegexSpecials(str, searchPattern = reSpecialCharactersFull) {
        return str.replace(searchPattern, '\\$&');
    }
    /**
     * Unescapes characters with special meaning inside a regular expression.
     *
     * @param str The string to unescape.
     * @param searchPattern Pattern for detecting special characters. Optional.
     *
     * @returns The unescaped string.
     */
    static unescapeRegexSpecials(str, searchPattern = reEscapedSpecialCharactersFull) {
        return str.replace(searchPattern, (match) => match.substring(1));
    }
    /**
     * Check if pattern is Regex.
     *
     * @param str The string to check.
     *
     * @returns True if the string is a regex pattern, false otherwise.
     */
    static isRegexPattern(str) {
        return str.startsWith('/') && str.endsWith('/');
    }
    /**
     * Unescapes special characters in a string.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#using_special_characters_in_strings}
     *
     * @param str The string to unescape.
     *
     * @returns The unescaped string.
     */
    static unescapeSpecials(str) {
        const keys = Object.keys(escapeSequence).join('|');
        const regex = new RegExp(`\\\\(${keys})`, 'g');
        return str.replace(regex, (match, group) => {
            return escapeSequence[group];
        });
    }
}

/**
 * Export logger implementation.
 */
const logger = new Logger(console);

/**
 * Pipe separator.
 */
const PIPE_SEPARATOR$1 = '|';
/**
 * This is a helper class that is used specifically to work
 * with domains restrictions.
 *
 * There are two options how you can add a domain restriction:
 * - `$domain` modifier;
 * - domains list for the cosmetic rules.
 *
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#domain-modifier}
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#cosmetic-rules}
 *
 * The only difference between them is that in one case we use `|` as a separator,
 * and in the other case - `,`.
 *
 * @example
 * `||example.org^$domain=example.com|~sub.example.com` -- network rule
 * `example.com,~sub.example.com##banner` -- cosmetic rule
 */
class DomainModifier {
    /**
     * List of permitted domains or null.
     */
    permittedDomains;
    /**
     * List of restricted domains or null.
     */
    restrictedDomains;
    /**
     * Processes domain list node, which means extracting permitted and restricted
     * domains from it.
     *
     * @param domainListNode Domain list node to process.
     *
     * @returns Processed domain list (permitted and restricted domains) ({@link ProcessedDomainList}).
     */
    static processDomainList(domainListNode) {
        const result = {
            permittedDomains: [],
            restrictedDomains: [],
        };
        const { children: domains } = domainListNode;
        for (const { exception, value: domain } of domains) {
            const domainLowerCased = domain.toLowerCase();
            if (!SimpleRegex.isRegexPattern(domain) && domain.includes(WILDCARD) && !domain.endsWith(WILDCARD)) {
                throw new SyntaxError(`Wildcards are only supported for top-level domains: "${domain}"`);
            }
            if (exception) {
                result.restrictedDomains.push(domainLowerCased);
            }
            else {
                result.permittedDomains.push(domainLowerCased);
            }
        }
        return result;
    }
    /**
     * Parses the `domains` string and initializes the object.
     *
     * @param domains Domain list string or AGTree DomainList node.
     * @param separator Separator — `,` or `|`.
     *
     * @throws An error if the domains string is empty or invalid.
     */
    constructor(domains, separator) {
        let processed;
        if (isString(domains)) {
            const node = DomainListParser.parse(domains.trim(), { ...defaultParserOptions, isLocIncluded: false }, 0, separator);
            if (node.children.length === 0) {
                throw new SyntaxError('At least one domain must be specified');
            }
            processed = DomainModifier.processDomainList(node);
        }
        else {
            // domain list node stores the separator
            if (separator !== domains.separator) {
                throw new SyntaxError('Separator mismatch');
            }
            processed = DomainModifier.processDomainList(domains);
        }
        // Unescape separator character in domains
        processed.permittedDomains = processed.permittedDomains.map((domain) => unescapeChar(domain, separator));
        processed.restrictedDomains = processed.restrictedDomains.map((domain) => unescapeChar(domain, separator));
        this.restrictedDomains = processed.restrictedDomains.length > 0 ? processed.restrictedDomains : null;
        this.permittedDomains = processed.permittedDomains.length > 0 ? processed.permittedDomains : null;
    }
    /**
     * Checks if the filtering rule is allowed on this domain.
     *
     * @param domain Domain to check.
     *
     * @returns True if the filtering rule is allowed on this domain.
     */
    matchDomain(domain) {
        if (this.hasRestrictedDomains()) {
            if (DomainModifier.isDomainOrSubdomainOfAny(domain, this.restrictedDomains)) {
                // Domain or host is restricted
                // i.e. $domain=~example.org
                return false;
            }
        }
        if (this.hasPermittedDomains()) {
            if (!DomainModifier.isDomainOrSubdomainOfAny(domain, this.permittedDomains)) {
                // Domain is not among permitted
                // i.e. $domain=example.org and we're checking example.com
                return false;
            }
        }
        return true;
    }
    /**
     * Checks if rule has permitted domains.
     *
     * @returns True if the rule has permitted domains.
     */
    hasPermittedDomains() {
        return !!this.permittedDomains && this.permittedDomains.length > 0;
    }
    /**
     * Checks if rule has restricted domains.
     *
     * @returns True if the rule has restricted domains.
     */
    hasRestrictedDomains() {
        return !!this.restrictedDomains && this.restrictedDomains.length > 0;
    }
    /**
     * Gets list of permitted domains.
     *
     * @returns List of permitted domains or null if none.
     */
    getPermittedDomains() {
        return this.permittedDomains;
    }
    /**
     * Gets list of restricted domains.
     *
     * @returns List of restricted domains or null if none.
     */
    getRestrictedDomains() {
        return this.restrictedDomains;
    }
    /**
     * Checks if `domain` is the same or a subdomain
     * of any of `domains`.
     *
     * @param domain Domain to check.
     * @param domains Domains list to check against.
     *
     * @returns True if `domain` is the same or a subdomain of any of `domains`.
     */
    static isDomainOrSubdomainOfAny(domain, domains) {
        for (let i = 0; i < domains.length; i += 1) {
            const d = domains[i];
            if (DomainModifier.isWildcardDomain(d)) {
                if (DomainModifier.matchAsWildcard(d, domain)) {
                    return true;
                }
            }
            if (domain === d || (domain.endsWith(d) && domain.endsWith(`.${d}`))) {
                return true;
            }
            if (SimpleRegex.isRegexPattern(d)) {
                try {
                    /**
                     * Regular expressions are cached internally by the browser
                     * (for instance, they're stored in the CompilationCache in V8/Chromium),
                     * so calling the constructor here should not be a problem.
                     *
                     * TODO: use SimpleRegex.patternFromString(d) after it is refactored to not add 'g' flag.
                     */
                    const domainPattern = new RegExp(d.slice(1, -1));
                    if (domainPattern.test(domain)) {
                        return true;
                    }
                }
                catch {
                    logger.error(`[tsurl.DomainModifier.isDomainOrSubdomainOfAny]: invalid regular expression as domain pattern: "${d}"`);
                }
                continue;
            }
        }
        return false;
    }
    /**
     * Checks if domain ends with wildcard.
     *
     * @param domain Domain string to check.
     *
     * @returns True if domain ends with wildcard.
     */
    static isWildcardDomain(domain) {
        return domain.endsWith('.*');
    }
    /**
     * Checks if domain string does not ends with wildcard and is not regex pattern.
     *
     * @param domain Domain string to check.
     *
     * @returns True if given domain is a wildcard or regexp pattern.
     */
    static isWildcardOrRegexDomain(domain) {
        return DomainModifier.isWildcardDomain(domain) || SimpleRegex.isRegexPattern(domain);
    }
    /**
     * Checks if wildcard matches domain.
     *
     * @param wildcard The wildcard pattern to match against the domain.
     * @param domainNameToCheck The domain name to check against the wildcard pattern.
     *
     * @returns True if wildcard matches domain.
     */
    static matchAsWildcard(wildcard, domainNameToCheck) {
        const wildcardedDomainToCheck = DomainModifier.genTldWildcard(domainNameToCheck);
        if (wildcardedDomainToCheck) {
            return wildcardedDomainToCheck === wildcard
                || (wildcardedDomainToCheck.endsWith(wildcard) && wildcardedDomainToCheck.endsWith(`.${wildcard}`));
        }
        return false;
    }
    /**
     * Generates from domain tld wildcard.
     *
     * @param domainName The domain name to generate the TLD wildcard for.
     *
     * @returns String is empty if tld for provided domain name doesn't exists.
     *
     * @example
     * `google.com` -> `google.*`
     * `youtube.co.uk` -> `youtube.*`
     */
    static genTldWildcard(domainName) {
        // To match eTld like "com.ru" we use allowPrivateDomains wildcard
        // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/2650
        const tld = getPublicSuffix(domainName, { allowPrivateDomains: true });
        if (tld) {
            // lastIndexOf() is needed not to match the domain, e.g. 'www.chrono24.ch'.
            // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/2312.
            return `${domainName.slice(0, domainName.lastIndexOf(`.${tld}`))}.*`;
        }
        return '';
    }
}

/**
 * Replace modifier class.
 */
class ReplaceModifier {
    /**
     * Replace option value.
     */
    replaceOption;
    /**
     * Replace option apply function.
     */
    replaceApply;
    /**
     * Constructor.
     *
     * @param value Replace modifier value.
     */
    constructor(value) {
        const parsed = ReplaceModifier.parseReplaceOption(value);
        this.replaceOption = parsed.optionText;
        this.replaceApply = parsed.apply;
    }
    /**
     * Parses replace option.
     *
     * @param option Replace option.
     *
     * @returns Parsed replace option.
     */
    static parseReplaceOption(option) {
        if (!option) {
            return {
                apply: (x) => x,
                optionText: '',
            };
        }
        const parts = splitByDelimiterWithEscapeCharacter(option, '/', '\\');
        let modifiers = (parts[2] || '');
        if (modifiers.indexOf('g') < 0) {
            modifiers += 'g';
        }
        const pattern = new RegExp(parts[0], modifiers);
        // unescape replacement alias
        let replacement = parts[1].replace(/\\\$/g, '$');
        replacement = SimpleRegex.unescapeSpecials(replacement);
        const apply = (input) => input.replace(pattern, replacement);
        return {
            apply,
            optionText: option,
        };
    }
    /**
     * Replace content.
     *
     * @returns The replace option value.
     */
    getValue() {
        return this.replaceOption;
    }
    /**
     * Replace apply function.
     *
     * @returns The function to apply the replacement.
     */
    getApplyFunc() {
        return this.replaceApply;
    }
}

const CSP_HEADER_NAME = 'Content-Security-Policy';
/**
 * Csp modifier class.
 */
class CspModifier {
    /**
     * Csp directive.
     *
     * @returns The CSP directive.
     */
    cspDirective;
    /**
     * Is allowlist rule.
     */
    isAllowlist;
    /**
     * Constructor.
     *
     * @param value Value of the modifier.
     * @param isAllowlist Whether the rule is an allowlist rule or not.
     */
    constructor(value, isAllowlist) {
        this.cspDirective = value;
        this.isAllowlist = isAllowlist;
        this.validateCspDirective();
    }
    /**
     * Csp directive.
     *
     * @returns The CSP directive.
     */
    getValue() {
        return this.cspDirective;
    }
    /**
     * Validates CSP rule.
     */
    validateCspDirective() {
        /**
         * CSP directive may be empty in case of allowlist rule,
         * it means to disable all $csp rules matching the allowlist rule.
         *
         * @see {@link https://github.com/AdguardTeam/AdguardBrowserExtension/issues/685}
         */
        if (!this.isAllowlist && !this.cspDirective) {
            throw new Error('Invalid $CSP rule: CSP directive must not be empty');
        }
        if (this.cspDirective) {
            /**
             * Forbids report-to and report-uri directives.
             *
             * @see {@link https://github.com/AdguardTeam/AdguardBrowserExtension/issues/685#issue-228287090}
             */
            const cspDirective = this.cspDirective.toLowerCase();
            if (cspDirective.indexOf('report-') >= 0) {
                throw new Error(`Forbidden CSP directive: ${cspDirective}`);
            }
        }
    }
}

/**
 * Cookie modifier class.
 *
 * Learn more about it here:
 * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/961.
 */
class CookieModifier {
    /**
     * Cookie `maxAge` name.
     */
    static MAX_AGE = 'maxAge';
    /**
     * Cookie `sameSite` name.
     */
    static SAME_SITE = 'sameSite';
    /**
     * Option value.
     */
    optionValue;
    /**
     * Regexp value.
     */
    regex;
    /**
     * Cookie name.
     */
    cookieName;
    /**
     * Cookie `sameSite` value.
     */
    sameSite;
    /**
     * Cookie `maxAge` value.
     */
    maxAge;
    /**
     * Constructor.
     *
     * @param value Value of the modifier.
     */
    constructor(value) {
        // Save the source text of the option modifier
        this.optionValue = value || '';
        this.regex = null;
        this.cookieName = null;
        this.sameSite = null;
        this.maxAge = null;
        // Parse cookie name/regex
        const parts = this.optionValue.split(/;/);
        if (parts.length < 1) {
            throw new Error(`Cannot parse ${this.optionValue}`);
        }
        const cookieName = parts[0];
        if (cookieName.startsWith('/') && cookieName.endsWith('/')) {
            const pattern = cookieName.substring(1, cookieName.length - 1);
            // Save regex to be used further for matching cookies
            this.regex = new RegExp(pattern);
        }
        else {
            // Match by cookie name
            this.cookieName = cookieName;
        }
        // Parse other cookie options
        if (parts.length > 1) {
            for (let i = 1; i < parts.length; i += 1) {
                const nameValue = parts[i].split('=');
                const optionName = nameValue[0];
                const optionValue = nameValue[1];
                if (optionName === CookieModifier.MAX_AGE) {
                    this.maxAge = parseInt(optionValue, 10);
                }
                else if (optionName === CookieModifier.SAME_SITE) {
                    this.sameSite = optionValue;
                }
                else {
                    throw new Error(`Unknown $cookie option: ${optionName}`);
                }
            }
        }
    }
    /**
     * Gets modifier value.
     *
     * @returns Modifier value.
     */
    getValue() {
        return this.optionValue;
    }
    /**
     * First cookie name.
     *
     * @returns The first cookie name.
     */
    getCookieName() {
        return this.cookieName;
    }
    /**
     * Max age cookie value.
     *
     * @returns The max age cookie value.
     */
    getMaxAge() {
        return this.maxAge;
    }
    /**
     * Same site cookie value.
     *
     * @returns The same site cookie value.
     */
    getSameSite() {
        return this.sameSite;
    }
    /**
     * Checks if cookie with the specified name matches this option.
     *
     * @param name Cookie name.
     *
     * @returns True if matches, false otherwise.
     */
    matches(name) {
        if (!name) {
            return false;
        }
        if (this.regex) {
            return this.regex.test(name);
        }
        if (this.cookieName) {
            return this.cookieName === name;
        }
        // Empty regex and cookieName means that we must match all cookies
        return true;
    }
    /**
     * Checks if cookie rule has an empty $cookie option.
     *
     * @returns True if $cookie option is empty.
     */
    isEmpty() {
        return !this.regex && !this.cookieName;
    }
    /**
     * Checks if the given modifier is an instance of CookieModifier.
     *
     * @param m The modifier to check.
     *
     * @returns True if the modifier is an instance of CookieModifier, false otherwise.
     */
    static isCookieModifier = (m) => {
        return m instanceof CookieModifier;
    };
}

/**
 * Array of all stealth options available, even those which are not supported by browser extension.
 */
var UniversalStealthOption;
(function (UniversalStealthOption) {
    UniversalStealthOption["HideSearchQueries"] = "searchqueries";
    UniversalStealthOption["DoNotTrack"] = "donottrack";
    UniversalStealthOption["ThirdPartyCookies"] = "3p-cookie";
    UniversalStealthOption["FirstPartyCookies"] = "1p-cookie";
    UniversalStealthOption["ThirdPartyCache"] = "3p-cache";
    UniversalStealthOption["ThirdPartyAuth"] = "3p-auth";
    UniversalStealthOption["WebRTC"] = "webrtc";
    UniversalStealthOption["Push"] = "push";
    UniversalStealthOption["Location"] = "location";
    UniversalStealthOption["Flash"] = "flash";
    UniversalStealthOption["Java"] = "java";
    UniversalStealthOption["HideReferrer"] = "referrer";
    UniversalStealthOption["UserAgent"] = "useragent";
    UniversalStealthOption["IP"] = "ip";
    UniversalStealthOption["XClientData"] = "xclientdata";
    UniversalStealthOption["DPI"] = "dpi";
})(UniversalStealthOption || (UniversalStealthOption = {}));
/**
 * List of stealth options, supported by browser extension, which can be disabled by $stealth modifier.
 *
 * Following stealth options are initialized on the engine start
 * and can't be disabled via $stealth modifier:
 * - `Block trackers` and `Remove tracking parameters`, as they are applied by a specific
 *   rule lists, initialized on app start;
 * - `Disabling WebRTC`, as it is not being applied on per-request basis.
 */
var StealthOptionName;
(function (StealthOptionName) {
    StealthOptionName["HideSearchQueries"] = "searchqueries";
    StealthOptionName["DoNotTrack"] = "donottrack";
    StealthOptionName["HideReferrer"] = "referrer";
    StealthOptionName["XClientData"] = "xclientdata";
    StealthOptionName["FirstPartyCookies"] = "1p-cookie";
    StealthOptionName["ThirdPartyCookies"] = "3p-cookie";
})(StealthOptionName || (StealthOptionName = {}));
const StealthModifierOptions = new Set(Object.values(StealthOptionName));
const UniversalStealthOptions = new Set(Object.values(UniversalStealthOption));
const StealthOption = {
    NotSet: 0,
    [StealthOptionName.HideSearchQueries]: 1,
    [StealthOptionName.DoNotTrack]: 1 << 1,
    [StealthOptionName.HideReferrer]: 1 << 2,
    [StealthOptionName.XClientData]: 1 << 3,
    [StealthOptionName.FirstPartyCookies]: 1 << 4,
    [StealthOptionName.ThirdPartyCookies]: 1 << 5,
};
/**
 * Stealth modifier class.
 * Rules with $stealth modifier will disable specified stealth options for matched requests.
 *
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#stealth-modifier}
 */
class StealthModifier {
    PIPE_SEPARATOR = '|';
    options = StealthOption.NotSet;
    /**
     * Parses the options string and creates a new stealth modifier instance.
     *
     * @param optionsStr Options string.
     *
     * @throws SyntaxError on inverted stealth options, which are not supported.
     */
    constructor(optionsStr) {
        if (optionsStr.trim().length === 0) {
            return;
        }
        // This prevents parsing invalid syntax as rule without supported options
        if (optionsStr.includes(',')) {
            throw new SyntaxError(`Invalid separator of stealth options used: "${optionsStr}"`);
        }
        const tokens = optionsStr.split(this.PIPE_SEPARATOR);
        for (let i = 0; i < tokens.length; i += 1) {
            const optionName = tokens[i].trim();
            if (optionName === '') {
                continue;
            }
            if (optionName.startsWith('~')) {
                throw new SyntaxError(`Inverted $stealth modifier values are not allowed: "${optionsStr}"`);
            }
            if (!StealthModifier.isValidStealthOption(optionName)) {
                throw new SyntaxError(`Invalid $stealth option in modifier value: "${optionsStr}"`);
            }
            // Skip options which are not supported by browser extension
            if (!StealthModifier.isSupportedStealthOption(optionName)) {
                continue;
            }
            const option = StealthOption[optionName];
            if (this.options & option) {
                // TODO: Change log level to 'warn' after AG-42379
                logger.trace(`[tsurl.StealthModifier.constructor]: duplicate $stealth modifier value "${optionName}" in "${optionsStr}"`);
            }
            this.options |= option;
        }
        if (this.options === StealthOption.NotSet) {
            // TODO: Change log level to 'warn' after AG-42379
            logger.trace(`[tsurl.StealthModifier.constructor]: $stealth modifier does not contain any options supported by browser extension: "${optionsStr}"`);
        }
    }
    /**
     * Checks if the given string is a valid $stealth option, supported by browser extension.
     *
     * @param option Option name.
     *
     * @returns True if the given string is a valid $stealth option.
     */
    static isSupportedStealthOption = (option) => StealthModifierOptions.has(option);
    /**
     * Checks if the given string is a valid $stealth option.
     *
     * @param option Option name.
     *
     * @returns True if the given string is a valid $stealth option.
     */
    static isValidStealthOption = (option) => UniversalStealthOptions.has(option);
    /**
     * Checks if this stealth modifier has values.
     *
     * @returns True if this stealth modifier has at least one value.
     */
    hasValues() {
        return this.options !== StealthOption.NotSet;
    }
    /**
     * Checks if this stealth modifier is disabling the given stealth option.
     *
     * @param optionName Stealth option name.
     *
     * @returns True if this stealth modifier is disabling the given stealth option.
     */
    hasStealthOption(optionName) {
        const option = StealthOption[optionName];
        return !!(option && this.options & option);
    }
}

/**
 * Redirect modifier class.
 */
class RedirectModifier {
    /**
     * Redirect title.
     */
    redirectTitle;
    /**
     * Is redirecting only blocked requests
     * See $redirect-rule options.
     */
    isRedirectingOnlyBlocked = false;
    /**
     * Constructor.
     *
     * @param value Redirect modifier value.
     * @param isAllowlist Is allowlist rule.
     * @param isRedirectingOnlyBlocked Is redirect-rule modifier.
     */
    constructor(value, isAllowlist, isRedirectingOnlyBlocked = false) {
        RedirectModifier.validate(value, isAllowlist);
        this.redirectTitle = value;
        this.isRedirectingOnlyBlocked = isRedirectingOnlyBlocked;
    }
    /**
     * Redirect title.
     *
     * @returns The redirect title.
     */
    getValue() {
        return this.redirectTitle;
    }
    /**
     * Validates redirect rule.
     *
     * @param redirectTitle The title of the redirect.
     * @param isAllowlist Indicates if the rule is an allowlist rule.
     */
    static validate(redirectTitle, isAllowlist) {
        if (isAllowlist && !redirectTitle) {
            return;
        }
        if (!redirectTitle) {
            throw new SyntaxError('Invalid $redirect rule, redirect value must not be empty');
        }
        if (!isRedirectResourceCompatibleWithAdg(redirectTitle)) {
            throw new SyntaxError('$redirect modifier is invalid');
        }
    }
}

/**
 * Splits url into parts.
 *
 * @param url The URL to be checked.
 *
 * @returns An object containing the path, query, and hash of the URL.
 */
function splitUrl(url) {
    let strippedUrl = url;
    let hash = '';
    const hashIndex = url.indexOf('#');
    if (hashIndex >= 0) {
        hash = url.slice(hashIndex);
        strippedUrl = url.slice(0, hashIndex);
    }
    let query = '';
    const queryIndex = url.indexOf('?');
    if (queryIndex >= 0) {
        query = strippedUrl.slice(queryIndex + 1);
        strippedUrl = strippedUrl.slice(0, queryIndex);
    }
    return {
        path: strippedUrl,
        query,
        hash,
    };
}
/**
 * Normalizes url query parameters.
 *
 * @param query The query string to be normalized.
 *
 * @returns The normalized query string.
 */
function normalizeQuery(query) {
    // Cleanup empty params (p0=0&=2&=3)
    let result = query
        .split('&')
        .filter((x) => x && !x.startsWith('='))
        .join('&');
    // If we've collapsed the URL to the point where there's an '&' against the '?'
    // then we need to get rid of that.
    while (result.charAt(0) === '&') {
        result = result.slice(1);
    }
    return result;
}
/**
 * Removes query params from url by regexp.
 *
 * @param url The URL from which query parameters will be removed.
 * @param regExp The regular expression to match query parameters.
 * @param invert Remove every parameter in url except the ones matched regexp.
 *
 * @returns The URL with the specified query parameters removed.
 */
function cleanUrlParamByRegExp(url, regExp, invert = false) {
    const searchIndex = url.indexOf('?');
    // If no params, nothing to modify
    if (searchIndex === -1) {
        return url;
    }
    const split = splitUrl(url);
    /**
     * We are checking both regular param and decoded param, in case if regexp
     * contains decoded params and url contains encoded params.
     *
     * @see {@link https://github.com/AdguardTeam/AdguardBrowserExtension/issues/3015}
     */
    let modifiedQuery;
    if (invert) {
        modifiedQuery = split.query
            .split('&')
            .filter((x) => x && (x.match(regExp) || decodeURIComponent(x).match(regExp)))
            .join('&');
    }
    else {
        modifiedQuery = split.query
            .split('&')
            .filter((x) => {
            const test = x.includes('=') ? x : `${x}=`;
            return !test.match(regExp) && !decodeURIComponent(test).match(regExp);
        })
            .join('&');
    }
    // Do not normalize if regexp is not applied
    if (modifiedQuery === split.query) {
        return url;
    }
    modifiedQuery = normalizeQuery(modifiedQuery);
    let result = split.path;
    if (modifiedQuery) {
        result += `?${modifiedQuery}`;
    }
    return result + split.hash;
}
/**
 * Extract relative part from hierarchical structured URL.
 *
 * @param url The URL from which the relative part will be extracted.
 *
 * @returns The relative part of the URL or null if not found.
 */
const getRelativeUrl = (url) => {
    const i = url.indexOf('/', url.indexOf('://') + 3);
    return i !== -1 ? url.slice(i) : null;
};

/**
 * Query parameters filtering modifier class.
 * Works with `$removeparam` modifier.
 */
class RemoveParamModifier {
    /**
     * Value of the modifier.
     */
    value;
    /**
     * Is modifier valid for MV3 or not.
     *
     * @returns True if the modifier is valid for MV3, false otherwise.
     */
    mv3Valid = true;
    /**
     * RegExp to apply.
     */
    valueRegExp;
    /**
     * Constructor.
     *
     * @param value The value used to initialize the modifier.
     */
    constructor(value) {
        this.value = value;
        let rawValue = value;
        // TODO: Seems like negation not using in valueRegExp
        if (value.startsWith('~')) {
            rawValue = value.substring(1);
            this.mv3Valid = false;
        }
        if (rawValue.startsWith('/')) {
            this.valueRegExp = SimpleRegex.patternFromString(rawValue);
            this.mv3Valid = false;
        }
        else {
            if (rawValue.includes('|')) {
                throw new Error('Unsupported option in $removeparam: multiple values are not allowed');
            }
            // no need to match "&" in the beginning, because we are splitting by "&"
            // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/3076
            this.valueRegExp = new RegExp(`^${SimpleRegex.escapeRegexSpecials(rawValue)}=[^&#]*$`, 'g');
        }
    }
    /**
     * Modifier value.
     *
     * @returns The value of the modifier.
     */
    getValue() {
        return this.value;
    }
    /**
     * Is modifier valid for MV3 or not.
     *
     * @returns True if the modifier is valid for MV3, false otherwise.
     */
    getMV3Validity() {
        return this.mv3Valid;
    }
    /**
     * Checks if the given modifier is an instance of RemoveParamModifier.
     *
     * @param m The modifier to check.
     *
     * @returns True if the modifier is an instance of RemoveParamModifier, false otherwise.
     */
    static isRemoveParamModifier = (m) => {
        return m instanceof RemoveParamModifier;
    };
    /**
     * Removes query parameters from url.
     *
     * @param url The URL from which query parameters should be removed.
     *
     * @returns The URL with the query parameters removed.
     */
    removeParameters(url) {
        const sepIndex = url.indexOf('?');
        if (sepIndex < 0) {
            return url;
        }
        if (!this.value) {
            return url.substring(0, sepIndex);
        }
        if (sepIndex === url.length - 1) {
            return url;
        }
        if (this.value.startsWith('~')) {
            return cleanUrlParamByRegExp(url, this.valueRegExp, true);
        }
        return cleanUrlParamByRegExp(url, this.valueRegExp);
    }
}

/**
 * Headers filtering modifier class.
 * Rules with $removeheader modifier are intended to remove headers from HTTP requests and responses.
 */
class RemoveHeaderModifier {
    /**
     * List of forbidden headers.
     */
    static FORBIDDEN_HEADERS = [
        'access-control-allow-origin',
        'access-control-allow-credentials',
        'access-control-allow-headers',
        'access-control-allow-methods',
        'access-control-expose-headers',
        'access-control-max-age',
        'access-control-request-headers',
        'access-control-request-method',
        'origin',
        'timing-allow-origin',
        'allow',
        'cross-origin-embedder-policy',
        'cross-origin-opener-policy',
        'cross-origin-resource-policy',
        'content-security-policy',
        'content-security-policy-report-only',
        'expect-ct',
        'feature-policy',
        'origin-isolation',
        'strict-transport-security',
        'upgrade-insecure-requests',
        'x-content-type-options',
        'x-download-options',
        'x-frame-options',
        'x-permitted-cross-domain-policies',
        'x-powered-by',
        'x-xss-protection',
        'public-key-pins',
        'public-key-pins-report-only',
        'sec-websocket-key',
        'sec-websocket-extensions',
        'sec-websocket-accept',
        'sec-websocket-protocol',
        'sec-websocket-version',
        'p3p',
        'sec-fetch-mode',
        'sec-fetch-dest',
        'sec-fetch-site',
        'sec-fetch-user',
        'referrer-policy',
        'content-type',
        'content-length',
        'accept',
        'accept-encoding',
        'host',
        'connection',
        'transfer-encoding',
        'upgrade',
    ];
    /**
     * Request prefix.
     */
    static REQUEST_PREFIX = 'request:';
    /**
     * Prefixed headers are applied to request headers.
     */
    isRequestModifier;
    /**
     * Effective header name to be removed.
     */
    applicableHeaderName;
    /**
     * Value.
     */
    value;
    /**
     * Is rule valid or not.
     */
    valid;
    /**
     * Constructor.
     *
     * @param value Value of the modifier.
     * @param isAllowlist Whether the rule is an allowlist rule or not.
     */
    constructor(value, isAllowlist) {
        this.value = value.toLowerCase();
        if (!isAllowlist && !this.value) {
            throw new SyntaxError('Invalid $removeheader rule, removeheader value must not be empty');
        }
        this.isRequestModifier = this.value.startsWith(RemoveHeaderModifier.REQUEST_PREFIX);
        const headerName = this.isRequestModifier
            ? this.value.substring(RemoveHeaderModifier.REQUEST_PREFIX.length)
            : this.value;
        // Values with ":" are not supported in MV3 declarative rules, e.g. "$removeheader=dnt:1"
        this.valid = RemoveHeaderModifier.isAllowedHeader(headerName) && !headerName.includes(':');
        this.applicableHeaderName = this.valid ? headerName : null;
    }
    /**
     * Modifier value.
     *
     * @returns The value of the modifier.
     */
    getValue() {
        return this.value;
    }
    /**
     * Modifier validity.
     *
     * @returns True if the rule is valid, false otherwise.
     */
    get isValid() {
        return this.valid;
    }
    /**
     * Checks if the given modifier is an instance of RemoveHeaderModifier.
     *
     * @param m The modifier to check.
     *
     * @returns True if the modifier is an instance of RemoveHeaderModifier, false otherwise.
     */
    static isRemoveHeaderModifier = (m) => {
        return m instanceof RemoveHeaderModifier;
    };
    /**
     * Returns effective header name to be removed.
     *
     * @param isRequestHeaders Flag to determine that the header is a *request* header,
     * otherwise *response* header.
     *
     * @returns The applicable header name if valid, otherwise null.
     */
    getApplicableHeaderName(isRequestHeaders) {
        if (!this.applicableHeaderName) {
            return null;
        }
        if (isRequestHeaders !== this.isRequestModifier) {
            return null;
        }
        return this.applicableHeaderName;
    }
    /**
     * Some headers are forbidden to remove.
     *
     * @param headerName Header name to check.
     *
     * @returns True if the header is allowed to be removed, false otherwise.
     */
    static isAllowedHeader(headerName) {
        return !this.FORBIDDEN_HEADERS.includes(headerName);
    }
}

/**
 * This is a helper class that is used specifically to work with app restrictions.
 *
 * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#app}
 *
 * @example
 * ```adblock
 * ||baddomain.com^$app=org.example.app
 * ||baddomain.com^$app=org.example.app1|org.example.app2
 * ```
 */
class AppModifier {
    /**
     * List of permitted apps or null.
     */
    permittedApps;
    /**
     * List of restricted apps or null.
     */
    restrictedApps;
    /**
     * Parses the `apps` string.
     *
     * @param apps Apps string.
     *
     * @throws An error if the app string is empty or invalid.
     */
    constructor(apps) {
        if (!apps) {
            throw new SyntaxError('$app modifier cannot be empty');
        }
        const permittedApps = [];
        const restrictedApps = [];
        const parts = apps.split(SEPARATOR);
        for (let i = 0; i < parts.length; i += 1) {
            let app = parts[i];
            let restricted = false;
            if (app.startsWith('~')) {
                restricted = true;
                app = app.substring(1).trim();
            }
            if (app === '') {
                throw new SyntaxError(`Empty app specified in "${apps}"`);
            }
            if (restricted) {
                restrictedApps.push(app);
            }
            else {
                permittedApps.push(app);
            }
        }
        this.restrictedApps = restrictedApps.length > 0 ? restrictedApps : null;
        this.permittedApps = permittedApps.length > 0 ? permittedApps : null;
    }
}

/**
 * Header modifier class.
 * The $header modifier allows matching the HTTP response
 * by a specific header with (optionally) a specific value.
 *
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#header-modifier}
 */
class HeaderModifier {
    /**
     * Colon separator.
     */
    COLON_SEPARATOR = ':';
    /**
     * Forward slash regexp marker.
     */
    FORWARD_SLASH = '/';
    /**
     * Header name to match on request.
     */
    header;
    /**
     * Header value to match on request.
     * Empty string if value is not specified, and, in that case,
     * only header name will be matched.
     */
    value;
    /**
     * Constructor.
     *
     * @param headerStr Header modifier value.
     */
    constructor(headerStr) {
        if (headerStr === '') {
            throw new SyntaxError('$header modifier value cannot be empty');
        }
        const separatorIndex = headerStr.indexOf(this.COLON_SEPARATOR);
        if (separatorIndex === -1) {
            this.header = headerStr;
            this.value = null;
            return;
        }
        this.header = headerStr.slice(0, separatorIndex);
        const rawValue = headerStr.slice(separatorIndex + 1);
        if (rawValue === '') {
            throw new SyntaxError(`Invalid $header modifier value: "${headerStr}"`);
        }
        if (rawValue.startsWith(this.FORWARD_SLASH) && rawValue.endsWith(this.FORWARD_SLASH)) {
            this.value = new RegExp(rawValue.slice(1, -1));
        }
        else {
            this.value = rawValue;
        }
    }
    /**
     * Returns header modifier value.
     *
     * @returns Header modifier value.
     */
    getHeaderModifierValue() {
        return {
            header: this.header,
            value: this.value,
        };
    }
}

/**
 * `$to` modifier class.
 * Rules with $to modifier are limited to requests made to the specified domains and their subdomains.
 *
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#to-modifier}
 */
class ToModifier {
    /**
     * Domains separator.
     */
    static PIPE_SEPARATOR = '|';
    /**
     * List of permitted domains or null.
     */
    permittedValues;
    /**
     * List of restricted domains or null.
     */
    restrictedValues;
    /**
     * Constructor.
     *
     * @param domainsStr String with domains separated by `|`.
     */
    constructor(domainsStr) {
        if (!domainsStr) {
            throw new SyntaxError('$to modifier value cannot be empty');
        }
        const permittedDomains = [];
        const restrictedDomains = [];
        const parts = domainsStr.toLowerCase().split(ToModifier.PIPE_SEPARATOR);
        for (let i = 0; i < parts.length; i += 1) {
            let domain = parts[i].trim();
            let restricted = false;
            if (domain.startsWith('~')) {
                restricted = true;
                domain = domain.substring(1);
            }
            if (domain === '') {
                throw new SyntaxError(`Empty domain specified in "${domainsStr}"`);
            }
            if (restricted) {
                restrictedDomains.push(domain);
            }
            else {
                permittedDomains.push(domain);
            }
        }
        this.restrictedValues = restrictedDomains.length > 0 ? restrictedDomains : null;
        this.permittedValues = permittedDomains.length > 0 ? permittedDomains : null;
    }
}

const PERMISSIONS_POLICY_HEADER_NAME = 'Permissions-Policy';
const COMMA_SEPARATOR = ',';
const PIPE_SEPARATOR = '|';
/**
 * Permissions modifier class.
 * Allows setting permission policies, effectively blocking specific page functionality.
 *
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#permissions-modifier}
 */
class PermissionsModifier {
    /**
     * Permission Policy directive.
     */
    permissionPolicyDirective;
    /**
     * Regular expression to apply correct separators.
     * It replaces escaped commas and pipe separators with commas.
     */
    static RE_SEPARATOR_REPLACE = new RegExp(`(\\\\${COMMA_SEPARATOR}|\\${PIPE_SEPARATOR})`, 'g');
    /**
     * Constructor.
     *
     * @param permissionPolicyStr The permission policy string to be set.
     * @param isAllowlist Indicates if the permission policy is for an allowlist.
     */
    constructor(permissionPolicyStr, isAllowlist) {
        this.permissionPolicyDirective = permissionPolicyStr
            .replace(PermissionsModifier.RE_SEPARATOR_REPLACE, COMMA_SEPARATOR);
        PermissionsModifier.validatePermissionPolicyDirective(this.permissionPolicyDirective, isAllowlist);
    }
    /**
     * Returns permission policy allowlist string.
     *
     * @returns Permission policy allowlist string.
     */
    getValue() {
        return this.permissionPolicyDirective;
    }
    /**
     * Validates permission policy directive.
     *
     * @param directive The permission policy directive to validate.
     * @param isAllowlist Indicates if the directive is for an allowlist.
     *
     * @throws SyntaxError on invalid permission policy directive.
     */
    static validatePermissionPolicyDirective(directive, isAllowlist) {
        /**
         * $permissions modifier value may be empty only in case of allowlist rule,
         * it means to disable all $permissions rules matching the rule pattern.
         */
        if (!isAllowlist && !directive) {
            throw new SyntaxError('Invalid $permissions rule: permissions directive must not be empty');
        }
    }
}

/**
 * Compatibility types are used to configure engine for better support of different libraries
 * For example:
 *  extension doesn't support $app modifier. So if we set in configuration CompatibilityTypes.Extension,
 *  engine would ignore rules with $app modifier.
 */
var CompatibilityTypes;
(function (CompatibilityTypes) {
    CompatibilityTypes[CompatibilityTypes["Extension"] = 1] = "Extension";
    CompatibilityTypes[CompatibilityTypes["CoreLibs"] = 2] = "CoreLibs";
    CompatibilityTypes[CompatibilityTypes["Dns"] = 4] = "Dns";
})(CompatibilityTypes || (CompatibilityTypes = {}));
/**
 * Application configuration class.
 */
class Configuration {
    defaultConfig = {
        engine: null,
        version: null,
        verbose: false,
        compatibility: null,
    };
    /**
     * {'extension'|'corelibs'} engine application type.
     */
    engine = null;
    /**
     * {string} version.
     */
    version = null;
    /**
     * {boolean} verbose flag.
     */
    verbose = false;
    /**
     * Compatibility flag.
     */
    compatibility = CompatibilityTypes.Extension;
    constructor(inputConfig) {
        const config = { ...this.defaultConfig, ...inputConfig };
        this.engine = config.engine;
        this.version = config.version;
        this.verbose = config.verbose;
        this.compatibility = config.compatibility;
    }
}
// eslint-disable-next-line import/no-mutable-exports
let config = new Configuration();
/**
 * Checks config is compatible with input level.
 *
 * @param compatibilityLevel Compatibility level to check against.
 *
 * @returns True if compatible, otherwise false.
 */
function isCompatibleWith(compatibilityLevel) {
    if (config.compatibility === null) {
        return false;
    }
    return (config.compatibility & compatibilityLevel) === compatibilityLevel;
}

const NETWORK_RULE_OPTIONS = {
    THIRD_PARTY: 'third-party',
    FIRST_PARTY: 'first-party',
    MATCH_CASE: 'match-case',
    IMPORTANT: 'important',
    DOMAIN: 'domain',
    DENYALLOW: 'denyallow',
    ELEMHIDE: 'elemhide',
    GENERICHIDE: 'generichide',
    SPECIFICHIDE: 'specifichide',
    GENERICBLOCK: 'genericblock',
    JSINJECT: 'jsinject',
    URLBLOCK: 'urlblock',
    CONTENT: 'content',
    DOCUMENT: 'document',
    DOC: 'doc',
    STEALTH: 'stealth',
    POPUP: 'popup',
    EMPTY: 'empty',
    MP4: 'mp4',
    SCRIPT: 'script',
    STYLESHEET: 'stylesheet',
    SUBDOCUMENT: 'subdocument',
    OBJECT: 'object',
    IMAGE: 'image',
    XMLHTTPREQUEST: 'xmlhttprequest',
    MEDIA: 'media',
    FONT: 'font',
    WEBSOCKET: 'websocket',
    OTHER: 'other',
    PING: 'ping',
    BADFILTER: 'badfilter',
    CSP: 'csp',
    REPLACE: 'replace',
    COOKIE: 'cookie',
    REDIRECT: 'redirect',
    REDIRECTRULE: 'redirect-rule',
    REMOVEPARAM: 'removeparam',
    REMOVEHEADER: 'removeheader',
    JSONPRUNE: 'jsonprune',
    HLS: 'hls',
    REFERRERPOLICY: 'referrerpolicy',
    APP: 'app',
    NETWORK: 'network',
    EXTENSION: 'extension',
    NOOP: '_',
    CLIENT: 'client',
    DNSREWRITE: 'dnsrewrite',
    DNSTYPE: 'dnstype',
    CTAG: 'ctag',
    HEADER: 'header',
    METHOD: 'method',
    TO: 'to',
    PERMISSIONS: 'permissions',
    ALL: 'all',
};
const OPTIONS_DELIMITER = '$';
const MASK_ALLOWLIST = '@@';
const NOT_MARK = '~';

/**
 * This is the base class representing double values modifiers.
 */
class BaseValuesModifier {
    /**
     * List of permitted values or null.
     */
    permitted;
    /**
     * List of restricted values or null.
     */
    restricted;
    /**
     * Value.
     */
    value;
    /**
     * Parses the values string.
     *
     * @param values Values string.
     *
     * @throws An error if the string is empty or invalid.
     */
    constructor(values) {
        if (!values) {
            throw new SyntaxError('Modifier cannot be empty');
        }
        this.value = values;
        const permittedValues = [];
        const restrictedValues = [];
        const parts = values.split(SEPARATOR);
        for (let i = 0; i < parts.length; i += 1) {
            let app = parts[i];
            let restricted = false;
            if (app.startsWith('~')) {
                restricted = true;
                app = app.substring(1).trim();
            }
            if (app === '') {
                throw new SyntaxError(`Empty values specified in "${values}"`);
            }
            if (restricted) {
                restrictedValues.push(app);
            }
            else {
                permittedValues.push(app);
            }
        }
        this.restricted = restrictedValues.length > 0 ? restrictedValues : null;
        this.permitted = permittedValues.length > 0 ? permittedValues : null;
    }
    getPermitted() {
        return this.permitted;
    }
    getRestricted() {
        return this.restricted;
    }
    getValue() {
        return this.value;
    }
    match(value) {
        if (!this.restricted && !this.permitted) {
            return true;
        }
        if (this.restricted && this.restricted.includes(value)) {
            return false;
        }
        if (this.permitted) {
            return this.permitted.includes(value);
        }
        return true;
    }
}

// eslint-disable-next-line max-classes-per-file
/**
 * Netmasks class.
 */
class NetmasksCollection {
    ipv4Masks = [];
    ipv6Masks = [];
    /**
     * Returns true if any of the containing masks contains provided value.
     *
     * @param value Value to check.
     *
     * @returns True if any of the containing masks contains provided value.
     */
    contains(value) {
        if (isIp.v4(value)) {
            return this.ipv4Masks.some((x) => contains(x, value));
        }
        return this.ipv6Masks.some((x) => contains(x, value));
    }
}
/**
 * The client modifier allows specifying clients this rule will be working for.
 * It accepts client names (not ClientIDs), IP addresses, or CIDR ranges.
 */
class ClientModifier extends BaseValuesModifier {
    permittedNetmasks;
    restrictedNetmasks;
    /**
     * Constructor.
     *
     * @param value Value of the modifier.
     */
    constructor(value) {
        super(value);
        const permitted = this.getPermitted();
        if (permitted) {
            this.permitted = ClientModifier.stripValues(permitted);
            this.permittedNetmasks = ClientModifier.parseNetmasks(this.permitted);
        }
        const restricted = this.getRestricted();
        if (restricted) {
            this.restricted = ClientModifier.stripValues(restricted);
            this.restrictedNetmasks = ClientModifier.parseNetmasks(this.restricted);
        }
    }
    /**
     * Unquotes and unescapes string.
     *
     * @param values Values to process.
     *
     * @returns Unquoted and unescaped values.
     */
    static stripValues(values) {
        return values.map((v) => {
            if ((v.startsWith('"') && v.endsWith('"'))
                || (v.startsWith('\'') && v.endsWith('\''))) {
                // eslint-disable-next-line no-param-reassign
                v = v.substr(1, v.length - 2);
            }
            return v.replace(/\\/ig, '');
        });
    }
    /**
     * Checks if this modifier matches provided params.
     *
     * @param clientName Client name.
     * @param clientIP Client IP.
     *
     * @returns True if this modifier matches provided params.
     */
    matchAny(clientName, clientIP) {
        if (this.restricted) {
            if (clientName && this.restricted.includes(clientName)) {
                return false;
            }
            if (clientIP && this.restricted.includes(clientIP)) {
                return false;
            }
            return true;
        }
        if (this.restrictedNetmasks) {
            if (clientIP && this.restrictedNetmasks.contains(clientIP)) {
                return false;
            }
            return true;
        }
        if (this.permitted) {
            if (clientName && this.permitted.includes(clientName)) {
                return true;
            }
            if (clientIP && this.permitted.includes(clientIP)) {
                return true;
            }
        }
        if (this.permittedNetmasks) {
            if (clientIP && this.permittedNetmasks.contains(clientIP)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Parses netmasks from client's strings.
     *
     * @param values Values to parse.
     *
     * @returns Parsed netmasks.
     */
    static parseNetmasks(values) {
        const result = new NetmasksCollection();
        values.forEach((x) => {
            const cidrVersion = isCidr(x);
            if (cidrVersion === 4) {
                result.ipv4Masks.push(x);
            }
            else if (cidrVersion === 6) {
                result.ipv6Masks.push(x);
            }
        });
        return result;
    }
}

/**
 * The dnsrewrite response modifier allows replacing the content of the response
 * to the DNS request for the matching hosts.
 *
 * TODO: This modifier is not yet implemented.
 *
 * @see {@link https://github.com/AdguardTeam/AdGuardHome/wiki/Hosts-Blocklists#dnsrewrite}
 */
class DnsRewriteModifier {
    /**
     * Value.
     */
    value;
    /**
     * Constructor.
     *
     * @param value Modifier value.
     */
    constructor(value) {
        this.value = value;
    }
    /**
     * Modifier value.
     *
     * @returns The value of the modifier.
     */
    getValue() {
        return this.value;
    }
}

/**
 * The `$dnstype` modifier allows specifying DNS request type on which this rule will be triggered.
 */
class DnsTypeModifier extends BaseValuesModifier {
    /**
     * Constructor.
     *
     * @param value The value used to initialize the modifier.
     */
    constructor(value) {
        super(value);
        if (this.permitted) {
            this.restricted = null;
        }
    }
}

/**
 * The ctag modifier allows to block domains only for specific types of DNS client tags.
 */
class CtagModifier extends BaseValuesModifier {
    /**
     * The list of allowed tags.
     */
    static ALLOWED_TAGS = [
        // By device type:
        'device_audio',
        'device_camera',
        'device_gameconsole',
        'device_laptop',
        'device_nas',
        'device_pc',
        'device_phone',
        'device_printer',
        'device_securityalarm',
        'device_tablet',
        'device_tv',
        'device_other',
        // By operating system:
        'os_android',
        'os_ios',
        'os_linux',
        'os_macos',
        'os_windows',
        'os_other',
        // By user group:
        'user_admin',
        'user_regular',
        'user_child',
    ];
    /**
     * Constructor.
     *
     * @param value Value of the modifier.
     */
    constructor(value) {
        super(value);
        this.validate();
    }
    /**
     * Validates tag values.
     */
    validate() {
        if (!this.getValue()) {
            throw new Error('Invalid rule: Ctag modifier must not be empty');
        }
        const tags = this.permitted ? this.permitted : this.restricted;
        if (tags && tags.some((x) => !CtagModifier.ALLOWED_TAGS.includes(x))) {
            throw new Error('Invalid rule: Invalid ctag modifier');
        }
    }
}

/**
 * Rule pattern class.
 *
 * This class parses rule pattern text to simple fields.
 */
class Pattern {
    /**
     * Original pattern text.
     */
    pattern;
    /**
     * Shortcut string.
     */
    shortcut;
    /**
     * If this pattern already prepared indicator.
     */
    prepared;
    /**
     * Parsed hostname.
     */
    hostname;
    /**
     * Parsed regular expression.
     */
    regex;
    /**
     * Invalid regex flag.
     */
    regexInvalid;
    /**
     * Domain specific pattern flag.
     */
    patternDomainSpecific;
    /**
     * If true, pattern and shortcut are the same.
     * In this case, we don't actually need to use `matchPattern`
     * if shortcut was already matched.
     */
    patternShortcut;
    /**
     * If pattern is match-case regex.
     */
    matchcase;
    /**
     * Constructor.
     *
     * @param pattern Pattern.
     * @param matchcase Flag for case-sensitive matching, default is false.
     */
    constructor(pattern, matchcase = false) {
        this.pattern = pattern;
        this.shortcut = SimpleRegex.extractShortcut(this.pattern);
        this.matchcase = matchcase;
    }
    /**
     * Checks if this rule pattern matches the specified request.
     *
     * @param request Request to check.
     * @param shortcutMatched If true, it means that the request already matches
     * this pattern's shortcut and we don't need to match it again.
     *
     * @returns True if pattern matches.
     */
    matchPattern(request, shortcutMatched) {
        this.prepare();
        if (this.patternShortcut) {
            return shortcutMatched || this.matchShortcut(request.urlLowercase);
        }
        if (this.hostname) {
            // If we have a `||example.org^` rule, it's easier to match
            // against the request's hostname only without matching
            // a regular expression.
            return request.hostname === this.hostname
                || ( // First light check without new string memory allocation
                request.hostname.endsWith(this.hostname)
                    // Strict check
                    && request.hostname.endsWith(`.${this.hostname}`));
        }
        // If the regular expression is invalid, just return false right away.
        if (this.regexInvalid || !this.regex) {
            return false;
        }
        // This is needed for DNS filtering only, not used in browser blocking.
        if (this.shouldMatchHostname(request)) {
            return this.regex.test(request.hostname);
        }
        return this.regex.test(request.url);
    }
    /**
     * Checks if this rule pattern matches the specified relative path string.
     * This method is used in cosmetic rules to implement the $path modifier matching logic.
     *
     * @param path Path to check.
     *
     * @returns True if pattern matches.
     */
    matchPathPattern(path) {
        this.prepare();
        if (this.hostname) {
            return false;
        }
        const pathIsEmptyString = this.pattern === '';
        // No-value $path should match root URL
        if (pathIsEmptyString && path === '/') {
            return true;
        }
        if (!pathIsEmptyString && this.patternShortcut) {
            return this.matchShortcut(path);
        }
        // If the regular expression is invalid, just return false right away.
        if (this.regexInvalid || !this.regex) {
            return false;
        }
        return this.regex.test(path);
    }
    /**
     * Simply checks if shortcut is a substring of the URL.
     *
     * @param str Shortcut to check.
     *
     * @returns True if the shortcut is a substring of the URL.
     */
    matchShortcut(str) {
        return str.indexOf(this.shortcut) >= 0;
    }
    /**
     * Prepares this pattern.
     */
    prepare() {
        if (this.prepared) {
            return;
        }
        this.prepared = true;
        // If shortcut and pattern are the same, we don't need to actually compile
        // a regex and can simply use matchShortcut instead,
        // except for the $match-case modifier
        if (this.pattern === this.shortcut && !this.matchcase) {
            this.patternShortcut = true;
            return;
        }
        // Rules like `/example/*` are rather often in the real-life filters,
        // we might want to process them.
        if (this.pattern.startsWith(this.shortcut)
            && this.pattern.length === this.shortcut.length + 1
            && this.pattern.endsWith('*')) {
            this.patternShortcut = true;
            return;
        }
        if (this.pattern.startsWith(SimpleRegex.MASK_START_URL)
            && this.pattern.endsWith(SimpleRegex.MASK_SEPARATOR)
            && this.pattern.indexOf('*') < 0
            && this.pattern.indexOf('/') < 0) {
            this.hostname = this.pattern.slice(2, this.pattern.length - 1);
            return;
        }
        this.compileRegex();
    }
    /**
     * Compiles this pattern regex.
     */
    compileRegex() {
        const regexText = SimpleRegex.patternToRegexp(this.pattern);
        try {
            let flags = 'i';
            if (this.matchcase) {
                flags = '';
            }
            this.regex = new RegExp(regexText, flags);
        }
        catch (e) {
            this.regexInvalid = true;
        }
    }
    /**
     * Checks if we should match hostnames and not the URL
     * this is important for the cases when we use urlfilter for DNS-level blocking
     * Note, that even though we may work on a DNS-level, we should still sometimes match full URL instead.
     *
     * @param request Request to check.
     *
     * @returns True if the hostname should be matched.
     */
    shouldMatchHostname(request) {
        if (!request.isHostnameRequest) {
            return false;
        }
        return !this.isPatternDomainSpecific();
    }
    /**
     * In case pattern starts with the following it targets some specific domain.
     *
     * @returns True if the pattern targets a specific domain.
     */
    isPatternDomainSpecific() {
        if (this.patternDomainSpecific === undefined) {
            this.patternDomainSpecific = this.pattern.startsWith(SimpleRegex.MASK_START_URL)
                || this.pattern.startsWith('http://')
                || this.pattern.startsWith('https:/')
                || this.pattern.startsWith('://');
        }
        return this.patternDomainSpecific;
    }
}

/* eslint-disable no-param-reassign */
/**
 * Counts the number of set bits (1s) in a 32-bit number using Hamming Weight (SWAR) method.
 *
 * @param a Number to count bits in.
 *
 * @returns The number of bits set to 1.
 */
function getBitCount(a) {
    a -= ((a >>> 1) & 0x55555555);
    a = (a & 0x33333333) + ((a >>> 2) & 0x33333333);
    a = (a + (a >>> 4)) & 0x0F0F0F0F;
    a += (a >>> 8);
    a += (a >>> 16);
    return a & 0x3F;
}
/**
 * Count the number of bits enabled in a number based on a bit mask.
 *
 * @param base Base number to check.
 * @param mask Mask to apply.
 *
 * @returns Number of bits set in `base & mask`.
 */
function countEnabledBits(base, mask) {
    return getBitCount(base & mask);
}

/**
 * NetworkRuleOption is the enumeration of various rule options.
 * In order to save memory, we store some options as a flag.
 *
 * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#basic-rule-modifiers}
 */
var NetworkRuleOption;
(function (NetworkRuleOption) {
    /**
     * No value is set. Syntax sugar to simplify code.
     */
    NetworkRuleOption[NetworkRuleOption["NotSet"] = 0] = "NotSet";
    /**
     * $third-party modifier.
     */
    NetworkRuleOption[NetworkRuleOption["ThirdParty"] = 1] = "ThirdParty";
    /**
     * $match-case modifier.
     */
    NetworkRuleOption[NetworkRuleOption["MatchCase"] = 2] = "MatchCase";
    /**
     * $important modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Important"] = 4] = "Important";
    // Allowlist rules modifiers
    // Each of them can disable part of the functionality
    /**
     * $elemhide modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Elemhide"] = 8] = "Elemhide";
    /**
     * $generichide modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Generichide"] = 16] = "Generichide";
    /**
     * $specifichide modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Specifichide"] = 32] = "Specifichide";
    /**
     * $genericblock modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Genericblock"] = 64] = "Genericblock";
    /**
     * $jsinject modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Jsinject"] = 128] = "Jsinject";
    /**
     * $urlblock modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Urlblock"] = 256] = "Urlblock";
    /**
     * $content modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Content"] = 512] = "Content";
    /**
     * $extension modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Extension"] = 1024] = "Extension";
    /**
     * $stealth modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Stealth"] = 2048] = "Stealth";
    // Other modifiers
    /**
     * $popup modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Popup"] = 4096] = "Popup";
    /**
     * $csp modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Csp"] = 8192] = "Csp";
    /**
     * $replace modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Replace"] = 16384] = "Replace";
    /**
     * $cookie modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Cookie"] = 32768] = "Cookie";
    /**
     * $redirect modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Redirect"] = 65536] = "Redirect";
    /**
     * $badfilter modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Badfilter"] = 131072] = "Badfilter";
    /**
     * $removeparam modifier.
     */
    NetworkRuleOption[NetworkRuleOption["RemoveParam"] = 262144] = "RemoveParam";
    /**
     * $removeheader modifier.
     */
    NetworkRuleOption[NetworkRuleOption["RemoveHeader"] = 524288] = "RemoveHeader";
    /**
     * $jsonprune modifier.
     */
    NetworkRuleOption[NetworkRuleOption["JsonPrune"] = 1048576] = "JsonPrune";
    /**
     * $hls modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Hls"] = 2097152] = "Hls";
    // Compatibility dependent
    /**
     * $network modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Network"] = 4194304] = "Network";
    /**
     * Dns modifiers.
     */
    NetworkRuleOption[NetworkRuleOption["Client"] = 8388608] = "Client";
    NetworkRuleOption[NetworkRuleOption["DnsRewrite"] = 16777216] = "DnsRewrite";
    NetworkRuleOption[NetworkRuleOption["DnsType"] = 33554432] = "DnsType";
    NetworkRuleOption[NetworkRuleOption["Ctag"] = 67108864] = "Ctag";
    /**
     * $method modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Method"] = 134217728] = "Method";
    /**
     * $to modifier.
     */
    NetworkRuleOption[NetworkRuleOption["To"] = 268435456] = "To";
    /**
     * $permissions modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Permissions"] = 536870912] = "Permissions";
    /**
     * $header modifier.
     */
    NetworkRuleOption[NetworkRuleOption["Header"] = 1073741824] = "Header";
})(NetworkRuleOption || (NetworkRuleOption = {}));
/**
 * NetworkRuleOptions is the enumeration of various rule options groups
 * needed for validation.
 */
var NetworkRuleGroupOptions;
(function (NetworkRuleGroupOptions) {
    /**
     * Allowlist-only modifiers.
     */
    NetworkRuleGroupOptions[NetworkRuleGroupOptions["AllowlistOnly"] = 4088] = "AllowlistOnly";
    /**
     * Options supported by host-level network rules.
     */
    NetworkRuleGroupOptions[NetworkRuleGroupOptions["OptionHostLevelRules"] = 125960196] = "OptionHostLevelRules";
    /**
     * Cosmetic option modifiers.
     */
    NetworkRuleGroupOptions[NetworkRuleGroupOptions["CosmeticOption"] = 696] = "CosmeticOption";
    /**
     * Removeparam compatible modifiers.
     *
     * $removeparam rules are compatible only with content type modifiers ($subdocument, $script, $stylesheet, etc)
     * except $document (using by default) and this list of modifiers.
     */
    NetworkRuleGroupOptions[NetworkRuleGroupOptions["RemoveParamCompatibleOptions"] = 393223] = "RemoveParamCompatibleOptions";
    /**
     * Removeheader compatible modifiers.
     *
     * $removeheader rules are compatible only with content type modifiers ($subdocument, $script, $stylesheet, etc)
     * except $document (using by default) and this list of modifiers.
     */
    NetworkRuleGroupOptions[NetworkRuleGroupOptions["RemoveHeaderCompatibleOptions"] = 1074397191] = "RemoveHeaderCompatibleOptions";
    /**
     * Permissions compatible modifiers.
     *
     * $permissions is compatible with the limited list of modifiers: $domain, $important, and $subdocument.
     */
    NetworkRuleGroupOptions[NetworkRuleGroupOptions["PermissionsCompatibleOptions"] = 537001988] = "PermissionsCompatibleOptions";
    /**
     * Header compatible modifiers.
     *
     * $header is compatible with the limited list of modifiers:
     * - $important
     * - $csp
     * - $removeheader (on response headers)
     * - $third-party
     * - $match-case
     * - $badfilter
     * - $domain
     * - all content type modifiers ($subdocument, $script, $stylesheet, etc).
     */
    NetworkRuleGroupOptions[NetworkRuleGroupOptions["HeaderCompatibleOptions"] = 1074405383] = "HeaderCompatibleOptions";
})(NetworkRuleGroupOptions || (NetworkRuleGroupOptions = {}));
/**
 * Basic network filtering rule.
 *
 * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules}
 */
class NetworkRule {
    ruleIndex;
    filterListId;
    allowlist;
    pattern;
    /**
     * Domains in denyallow modifier providing exceptions for permitted domains.
     *
     * @see {@link https://github.com/AdguardTeam/CoreLibs/issues/1304}
     */
    denyAllowDomains = null;
    /**
     * Flag with all enabled rule options.
     */
    enabledOptions = NetworkRuleOption.NotSet;
    /**
     * Flag with all disabled rule options.
     */
    disabledOptions = NetworkRuleOption.NotSet;
    /**
     * Flag with all permitted request types.
     */
    permittedRequestTypes = RequestType.NotSet;
    /**
     * Flag with all restricted request types.
     */
    restrictedRequestTypes = RequestType.NotSet;
    /**
     * Rule Advanced modifier.
     */
    advancedModifier = null;
    /**
     * Rule Domain modifier.
     */
    domainModifier = null;
    /**
     * Rule App modifier.
     */
    appModifier = null;
    /**
     * Rule Method modifier.
     */
    methodModifier = null;
    /**
     * Rule header modifier.
     */
    headerModifier = null;
    /**
     * Rule To modifier.
     */
    toModifier = null;
    /**
     * Rule Stealth modifier.
     */
    stealthModifier = null;
    /**
     * Rule priority, which is needed when the engine has to choose between
     * several rules matching the query. This value is calculated based on
     * the rule modifiers enabled or disabled and rounded up
     * to the smallest integer greater than or equal to the calculated weight
     * in the {@link calculatePriorityWeight}.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-1
     */
    priorityWeight = 1;
    /**
     * Rules with base modifiers, from category 1, each of them adds 1
     * to the weight of the rule.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-1
     */
    static CATEGORY_1_OPTIONS_MASK = NetworkRuleOption.ThirdParty
        | NetworkRuleOption.MatchCase
        | NetworkRuleOption.DnsRewrite;
    /**
     * The priority weight used in {@link calculatePriorityWeight} for rules
     * with permitted request types and methods.
     * The value 50 is chosen in order to cover (with a margin) all possible
     * combinations and variations of rules from categories with a lower
     * priority (each of them adds 1 to the rule priority).
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-2
     */
    static CategoryTwoWeight = 50;
    /**
     * The priority weight used in {@link calculatePriorityWeight} for rules
     * with allowed domains.
     * The value 100 is chosen to cover all possible combinations and variations
     * of rules from categories with a lower priority, for example a rule with
     * one allowed query type will get priority 100 (50 + 50/1), but for allowed
     * domains with any number of domains we will get at least 101 (for 100
     * domains: 100 + 100/100; for 200 100 + 100/200; or even for 10000:
     * 100 + 100/10000) because the resulting weight is rounded up.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-3
     */
    static CategoryThreeWeight = 100;
    /**
     * The priority weight used in {@link calculatePriorityWeight}
     * for $redirect rules.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-6
     */
    static CategoryFourWeight = 10 ** 3;
    /**
     * The priority weight used in {@link calculatePriorityWeight} for rules
     * with specific exceptions.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-4
     */
    static CategoryFiveWeight = 10 ** 4;
    /**
     * Rules with specific exclusions, from category 4, each of them adds
     * {@link SpecificExceptionsWeight} to the weight of the rule.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-4
     */
    static SPECIFIC_EXCLUSIONS_MASK = NetworkRuleOption.Elemhide
        | NetworkRuleOption.Generichide
        | NetworkRuleOption.Specifichide
        | NetworkRuleOption.Content
        | NetworkRuleOption.Urlblock
        | NetworkRuleOption.Genericblock
        | NetworkRuleOption.Jsinject
        | NetworkRuleOption.Extension;
    /**
     * The priority weight used in {@link calculatePriorityWeight} for rules
     * with allowlist mark '@@'.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-5
     */
    static CategorySixWeight = 10 ** 5;
    /**
     * The priority weight used in {@link calculatePriorityWeight}
     * for $important rules.
     *
     * @see https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-7
     */
    static CategorySevenWeight = 10 ** 6;
    /**
     * Separates the rule pattern from the list of modifiers.
     *
     * ```
     * rule = ["@@"] pattern [ "$" modifiers ]
     * modifiers = [modifier0, modifier1[, ...[, modifierN]]]
     * ```
     */
    static OPTIONS_DELIMITER = OPTIONS_DELIMITER;
    /**
     * A marker that is used in rules of exception.
     * To turn off filtering for a request, start your rule with this marker.
     */
    static MASK_ALLOWLIST = MASK_ALLOWLIST;
    /**
     * Mark that negates options.
     */
    static NOT_MARK = NOT_MARK;
    /**
     * Rule options.
     */
    static OPTIONS = NETWORK_RULE_OPTIONS;
    /**
     * Rule options that can be negated.
     */
    static NEGATABLE_OPTIONS = new Set([
        // General options
        NetworkRule.OPTIONS.FIRST_PARTY,
        NetworkRule.OPTIONS.THIRD_PARTY,
        NetworkRule.OPTIONS.MATCH_CASE,
        NetworkRule.OPTIONS.DOCUMENT,
        NetworkRule.OPTIONS.DOC,
        // Content type options
        NetworkRule.OPTIONS.SCRIPT,
        NetworkRule.OPTIONS.STYLESHEET,
        NetworkRule.OPTIONS.SUBDOCUMENT,
        NetworkRule.OPTIONS.OBJECT,
        NetworkRule.OPTIONS.IMAGE,
        NetworkRule.OPTIONS.XMLHTTPREQUEST,
        NetworkRule.OPTIONS.MEDIA,
        NetworkRule.OPTIONS.FONT,
        NetworkRule.OPTIONS.WEBSOCKET,
        NetworkRule.OPTIONS.OTHER,
        NetworkRule.OPTIONS.PING,
        // Dns modifiers
        NetworkRule.OPTIONS.EXTENSION,
    ]);
    /**
     * Advanced option modifier names.
     */
    static ADVANCED_OPTIONS = new Set([
        NetworkRule.OPTIONS.CSP,
        NetworkRule.OPTIONS.REPLACE,
        NetworkRule.OPTIONS.COOKIE,
        NetworkRule.OPTIONS.REDIRECT,
        NetworkRule.OPTIONS.REDIRECTRULE,
        NetworkRule.OPTIONS.REMOVEPARAM,
        NetworkRule.OPTIONS.REMOVEHEADER,
        NetworkRule.OPTIONS.PERMISSIONS,
        NetworkRule.OPTIONS.CLIENT,
        NetworkRule.OPTIONS.DNSREWRITE,
        NetworkRule.OPTIONS.DNSTYPE,
        NetworkRule.OPTIONS.CTAG,
    ]);
    /**
     * Returns the rule index.
     *
     * @returns Rule index.
     */
    getIndex() {
        return this.ruleIndex;
    }
    /**
     * Returns the identifier of the filter from which the rule was received.
     *
     * @returns Identifier of the filter from which the rule was received.
     */
    getFilterListId() {
        return this.filterListId;
    }
    /**
     * Each rule has its own priority, which is necessary when several rules
     * match the request and the filtering system needs to select one of them.
     * Priority is measured as a positive integer.
     * In the case of a conflict between two rules with the same priority value,
     * it is not specified which one of them will be chosen.
     *
     * @returns Rule priority.
     */
    getPriorityWeight() {
        return this.priorityWeight;
    }
    /**
     * Returns rule pattern,
     * which currently is used only in the rule validator module.
     *
     * @returns Rule pattern.
     */
    getPattern() {
        return this.pattern.pattern;
    }
    /**
     * Returns `true` if the rule is "allowlist", e.g. if it disables other
     * rules when the pattern matches the request.
     *
     * @returns True if the rule is an allowlist rule.
     */
    isAllowlist() {
        return this.allowlist;
    }
    /**
     * Checks if the rule is a document-level allowlist rule with $urlblock or
     * $genericblock or $content.
     * This means that the rule is supposed to disable or modify blocking
     * of the page sub-requests.
     * For instance, `@@||example.org^$urlblock` unblocks all sub-requests.
     *
     * @returns True if the rule is a document-level allowlist rule with specific modifiers.
     */
    isDocumentLevelAllowlistRule() {
        if (!this.isAllowlist()) {
            return false;
        }
        return this.isOptionEnabled(NetworkRuleOption.Urlblock)
            || this.isOptionEnabled(NetworkRuleOption.Genericblock)
            || this.isOptionEnabled(NetworkRuleOption.Content);
    }
    /**
     * Checks if the rule completely disables filtering.
     *
     * @returns True if the rule completely disables filtering.
     */
    isFilteringDisabled() {
        if (!this.isAllowlist()) {
            return false;
        }
        return this.isOptionEnabled(NetworkRuleOption.Elemhide)
            && this.isOptionEnabled(NetworkRuleOption.Content)
            && this.isOptionEnabled(NetworkRuleOption.Urlblock)
            && this.isOptionEnabled(NetworkRuleOption.Jsinject);
    }
    /**
     * The longest part of pattern without any special characters.
     * It is used to improve the matching performance.
     *
     * @returns The longest part of the pattern without any special characters.
     */
    getShortcut() {
        return this.pattern.shortcut;
    }
    /**
     * Gets list of permitted domains.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#domain-modifier}
     *
     * @returns List of permitted domains or null if none.
     */
    getPermittedDomains() {
        if (this.domainModifier) {
            return this.domainModifier.getPermittedDomains();
        }
        return null;
    }
    /**
     * Gets list of restricted domains.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#domain-modifier}
     *
     * @returns List of restricted domains or null if none.
     */
    getRestrictedDomains() {
        if (this.domainModifier) {
            return this.domainModifier.getRestrictedDomains();
        }
        return null;
    }
    /**
     * Gets list of denyAllow domains.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#denyallow-modifier}
     *
     * @returns List of denyAllow domains or null if none.
     */
    getDenyAllowDomains() {
        return this.denyAllowDomains;
    }
    /**
     * Get list of permitted $to domains.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#to-modifier}
     *
     * @returns List of permitted $to domains or null if none.
     */
    getPermittedToDomains() {
        if (this.toModifier) {
            return this.toModifier.permittedValues;
        }
        return null;
    }
    /**
     * Get list of restricted $to domains.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#to-modifier}
     *
     * @returns List of restricted $to domains or null if none.
     */
    getRestrictedToDomains() {
        if (this.toModifier) {
            return this.toModifier.restrictedValues;
        }
        return null;
    }
    /**
     * Gets list of permitted domains.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#app}
     *
     * @returns List of permitted domains or null if none.
     */
    getPermittedApps() {
        if (this.appModifier) {
            return this.appModifier.permittedApps;
        }
        return null;
    }
    /**
     * Gets list of restricted domains.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#app}
     *
     * @returns List of restricted domains or null if none.
     */
    getRestrictedApps() {
        if (this.appModifier) {
            return this.appModifier.restrictedApps;
        }
        return null;
    }
    /**
     * Gets list of permitted methods.
     *
     * @see {@link https://kb.adguard.com/general/how-to-create-your-own-ad-filters#method-modifier}
     *
     * @returns List of permitted methods or null if none.
     */
    getRestrictedMethods() {
        if (this.methodModifier) {
            return this.methodModifier.restrictedValues;
        }
        return null;
    }
    /**
     * Gets list of restricted methods.
     *
     * @see {@link https://kb.adguard.com/general/how-to-create-your-own-ad-filters#method-modifier}
     *
     * @returns List of restricted methods or null if none.
     */
    getPermittedMethods() {
        if (this.methodModifier) {
            return this.methodModifier.permittedValues;
        }
        return null;
    }
    /**
     * Flag with all permitted request types.
     * The value {@link RequestType.NotSet} here means "all request types are allowed".
     *
     * @returns The flag with all permitted request types.
     */
    getPermittedRequestTypes() {
        return this.permittedRequestTypes;
    }
    /**
     * Flag with all restricted request types.
     * The value {@link RequestType.NotSet} here means "no type of request is restricted".
     *
     * @returns The flag with all restricted request types.
     */
    getRestrictedRequestTypes() {
        return this.restrictedRequestTypes;
    }
    /**
     * Advanced modifier.
     *
     * @returns The advanced modifier or null if none.
     */
    getAdvancedModifier() {
        return this.advancedModifier;
    }
    /**
     * Stealth modifier.
     *
     * @returns The stealth modifier or null if none.
     */
    getStealthModifier() {
        return this.stealthModifier;
    }
    /**
     * Advanced modifier value.
     *
     * @returns The advanced modifier value or null if none.
     */
    getAdvancedModifierValue() {
        return this.advancedModifier && this.advancedModifier.getValue();
    }
    /**
     * Retrieves the header modifier value.
     *
     * @returns The header modifier value or null if none.
     */
    getHeaderModifierValue() {
        if (!this.headerModifier) {
            return null;
        }
        return this.headerModifier.getHeaderModifierValue();
    }
    /**
     * Returns true if rule's pattern is a regular expression.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#regexp-support}
     *
     * @returns True if the rule pattern is a regular expression.
     */
    isRegexRule() {
        return (this.getPattern().startsWith(SimpleRegex.MASK_REGEX_RULE)
            && this.getPattern().endsWith(SimpleRegex.MASK_REGEX_RULE));
    }
    /**
     * Checks if this filtering rule matches the specified request.
     *
     * @param request Request to check.
     * @param useShortcut The flag to use this rule shortcut.
     *
     * @returns True if the rule matches the request.
     *
     * In case we use Trie in lookup table, we don't need to use shortcut cause we already check if request's url
     * includes full rule shortcut.
     */
    match(request, useShortcut = true) {
        // Regex rules should not be tested by shortcut
        if (useShortcut && !this.matchShortcut(request)) {
            return false;
        }
        if (this.isOptionEnabled(NetworkRuleOption.Method) && !this.matchMethod(request.method)) {
            return false;
        }
        if (this.isOptionEnabled(NetworkRuleOption.ThirdParty) && !request.thirdParty) {
            return false;
        }
        if (this.isOptionDisabled(NetworkRuleOption.ThirdParty) && request.thirdParty) {
            return false;
        }
        if (!this.matchRequestType(request.requestType)) {
            return false;
        }
        if (!this.matchDomainModifier(request)) {
            return false;
        }
        if (this.isOptionEnabled(NetworkRuleOption.RemoveParam)
            || this.isOptionEnabled(NetworkRuleOption.Permissions)) {
            if (!this.matchRequestTypeExplicit(request.requestType)) {
                return false;
            }
        }
        if (!this.matchDenyAllowDomains(request.hostname)) {
            return false;
        }
        if (this.isOptionEnabled(NetworkRuleOption.To) && !this.matchToModifier(request.hostname)) {
            return false;
        }
        if (!this.matchDnsType(request.dnsType)) {
            return false;
        }
        if (!this.matchClientTags(request.clientTags)) {
            return false;
        }
        if (!this.matchClient(request.clientName, request.clientIP)) {
            return false;
        }
        return this.pattern.matchPattern(request, true);
    }
    /**
     * Simply checks if shortcut is a substring of the URL.
     *
     * @param request Request to check.
     *
     * @returns True if the shortcut is a substring of the URL.
     */
    matchShortcut(request) {
        return request.urlLowercase.indexOf(this.getShortcut()) >= 0;
    }
    /**
     * Check if request matches domain modifier by request referrer (general case) or by request target.
     *
     * In some cases the $domain modifier can match not only the referrer domain, but also the target domain.
     * This happens when the following is true (1 AND ((2 AND 3) OR 4):
     *
     * 1) The request has $document request type (not subdocument)
     * 2) The rule's pattern doesn't match any particular domain(s)
     * 3) The rule's pattern doesn't contain regular expressions
     * 4) The $domain modifier contains only excluded domains (e.g., $domain=~example.org|~example.com).
     *
     * When all these conditions are met, the domain modifier will match both the referrer domain and the target domain.
     *
     * @see {@link https://github.com/AdguardTeam/tsurlfilter/issues/45}
     *
     * @param request The request to check.
     *
     * @returns True if the rule matches the domain modifier.
     */
    matchDomainModifier(request) {
        if (!this.domainModifier) {
            return true;
        }
        const { domainModifier } = this;
        const isDocumentType = request.requestType === RequestType.Document;
        const hasOnlyExcludedDomains = !domainModifier.hasPermittedDomains()
            && domainModifier.hasRestrictedDomains();
        const patternIsRegex = this.isRegexRule();
        const patternIsDomainSpecific = this.pattern.isPatternDomainSpecific();
        const matchesTargetByPatternCondition = !patternIsRegex && !patternIsDomainSpecific;
        if (isDocumentType && (hasOnlyExcludedDomains || matchesTargetByPatternCondition)) {
            // check if matches source hostname if exists or if matches target hostname
            return (request.sourceHostname && domainModifier.matchDomain(request.sourceHostname))
                || domainModifier.matchDomain(request.hostname);
        }
        return domainModifier.matchDomain(request.sourceHostname || '');
    }
    /**
     * Checks if the filtering rule is allowed on this domain.
     *
     * @param domain The request's domain.
     *
     * @returns True if the rule must be applied to the request.
     */
    matchDenyAllowDomains(domain) {
        if (!this.denyAllowDomains) {
            return true;
        }
        if (this.denyAllowDomains.length > 0) {
            if (DomainModifier.isDomainOrSubdomainOfAny(domain, this.denyAllowDomains)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Checks if the request domain matches the specified conditions.
     *
     * @param domain The request's domain.
     *
     * @returns True if the request domain matches the permitted domains and does not match the restricted domains.
     */
    matchToModifier(domain) {
        if (!this.toModifier) {
            return true;
        }
        /**
         * The request's domain must be either explicitly permitted or not be included
         * in the list of restricted domains for the rule to apply.
         */
        const permittedDomains = this.getPermittedToDomains();
        const restrictedDomains = this.getRestrictedToDomains();
        let matches = false;
        if (permittedDomains) {
            matches = DomainModifier.isDomainOrSubdomainOfAny(domain, permittedDomains);
        }
        if (restrictedDomains) {
            matches = !DomainModifier.isDomainOrSubdomainOfAny(domain, restrictedDomains);
        }
        return matches;
    }
    /**
     * Return `true` if this rule matches with the tags associated with a client.
     *
     * @param clientTags Client tags.
     *
     * @returns True if the rule matches the client tags.
     */
    matchClientTags(clientTags) {
        const advancedModifier = this.getAdvancedModifier();
        if (!advancedModifier || !(advancedModifier instanceof CtagModifier)) {
            return true;
        }
        if (!clientTags) {
            return false;
        }
        const cTagsModifier = advancedModifier;
        return clientTags.every((x) => cTagsModifier.match(x));
    }
    /**
     * Returns TRUE if the rule matches with the specified client.
     *
     * @param clientName The name of the client.
     * @param clientIP The IP address of the client.
     *
     * @returns True if the rule matches the client.
     */
    matchClient(clientName, clientIP) {
        const advancedModifier = this.getAdvancedModifier();
        if (!advancedModifier || !(advancedModifier instanceof ClientModifier)) {
            return true;
        }
        if (!clientName && !clientIP) {
            return false;
        }
        const modifier = advancedModifier;
        return modifier.matchAny(clientName, clientIP);
    }
    /**
     * Return `true` if this rule matches with the request DNS type.
     *
     * @param dnstype The DNS type to check.
     *
     * @returns True if the rule matches the DNS type.
     */
    matchDnsType(dnstype) {
        const advancedModifier = this.getAdvancedModifier();
        if (!advancedModifier || !(advancedModifier instanceof DnsTypeModifier)) {
            return true;
        }
        if (!dnstype) {
            return false;
        }
        const modifier = advancedModifier;
        return modifier.match(dnstype);
    }
    /**
     * Checks if the request's type matches the rule properties.
     *
     * @param requestType Request type to check.
     *
     * @returns True if the rule must be applied to the request.
     */
    matchRequestType(requestType) {
        if (this.permittedRequestTypes !== RequestType.NotSet) {
            if ((this.permittedRequestTypes & requestType) !== requestType) {
                return false;
            }
        }
        if (this.restrictedRequestTypes !== RequestType.NotSet) {
            if ((this.restrictedRequestTypes & requestType) === requestType) {
                return false;
            }
        }
        return true;
    }
    /**
     * In case of $removeparam, $permissions modifier,
     * we only allow it to target other content types if the rule has an explicit content-type modifier.
     *
     * @param requestType Request type to check.
     *
     * @returns True if the rule must be applied to the request.
     */
    matchRequestTypeExplicit(requestType) {
        if (this.permittedRequestTypes === RequestType.NotSet
            && this.restrictedRequestTypes === RequestType.NotSet
            && requestType !== RequestType.Document
            && requestType !== RequestType.SubDocument) {
            return false;
        }
        return this.matchRequestType(requestType);
    }
    /**
     * Checks if request's method matches with the rule.
     *
     * @param method Request's method.
     *
     * @returns True, if rule must be applied to the request.
     */
    matchMethod(method) {
        if (!method || !MethodModifier.isHTTPMethod(method)) {
            return false;
        }
        /**
         * Request's method must be either explicitly
         * permitted or not be included in list of restricted methods
         * for the rule to apply.
         */
        const permittedMethods = this.getPermittedMethods();
        if (permittedMethods?.includes(method)) {
            return true;
        }
        const restrictedMethods = this.getRestrictedMethods();
        return !!restrictedMethods && !restrictedMethods.includes(method);
    }
    /**
     * Checks if request's response headers matches with
     * the rule's $header modifier value.
     *
     * @param responseHeadersItems Request's response headers.
     *
     * @returns True, if rule must be applied to the request.
     */
    matchResponseHeaders(responseHeadersItems) {
        if (!responseHeadersItems || responseHeadersItems.length === 0) {
            return false;
        }
        const ruleData = this.getHeaderModifierValue();
        if (!ruleData) {
            return false;
        }
        const { header: ruleHeaderName, value: ruleHeaderValue, } = ruleData;
        return responseHeadersItems.some((responseHeadersItem) => {
            const { name: responseHeaderName, value: responseHeaderValue, } = responseHeadersItem;
            // Header name matching is case-insensitive
            if (ruleHeaderName.toLowerCase() !== responseHeaderName.toLowerCase()) {
                return false;
            }
            if (ruleHeaderValue === null) {
                return true;
            }
            // Unlike header name, header value matching is case-sensitive
            if (typeof ruleHeaderValue === 'string') {
                return ruleHeaderValue === responseHeaderValue;
            }
            if (responseHeaderValue && ruleHeaderValue instanceof RegExp) {
                return ruleHeaderValue.test(responseHeaderValue);
            }
            return false;
        });
    }
    /**
     * Checks if a network rule is too general.
     *
     * @param node AST node of the network rule.
     *
     * @returns True if the rule is too general.
     */
    static isTooGeneral(node) {
        return !(node.modifiers?.children?.length) && node.pattern.value.length < 4;
    }
    /**
     * Creates an instance of the {@link NetworkRule}.
     * It parses this rule and extracts the rule pattern (see {@link SimpleRegex}),
     * and rule modifiers.
     *
     * @param node AST node of the network rule.
     * @param filterListId ID of the filter list this rule belongs to.
     * @param ruleIndex Line start index in the source filter list; it will be used to find the original rule text
     * in the filtering log when a rule is applied. Default value is {@link RULE_INDEX_NONE} which means that
     * the rule does not have source index.
     *
     * @throws Error if it fails to parse the rule.
     */
    constructor(node, filterListId, ruleIndex = RULE_INDEX_NONE) {
        this.ruleIndex = ruleIndex;
        this.filterListId = filterListId;
        this.allowlist = node.exception;
        const pattern = node.pattern.value;
        if (pattern && hasSpaces(pattern)) {
            throw new SyntaxError('Rule has spaces, seems to be an host rule');
        }
        if (node.modifiers?.children?.length) {
            this.loadOptions(node.modifiers);
        }
        if (NetworkRule.isTooGeneral(node)) {
            throw new SyntaxError(`Rule is too general: ${RuleGenerator.generate(node)}`);
        }
        this.calculatePriorityWeight();
        this.pattern = new Pattern(pattern, this.isOptionEnabled(NetworkRuleOption.MatchCase));
    }
    /**
     * Parses the options string and saves them.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-modifiers}
     *
     * @param options Modifier list node.
     *
     * @throws An error if there is an unsupported modifier.
     */
    loadOptions(options) {
        for (const option of options.children) {
            let value = EMPTY_STRING;
            if (option.value && option.value.value) {
                value = option.value.value;
            }
            this.loadOption(option.name.value, value, option.exception);
        }
        this.validateOptions();
    }
    /**
     * Returns true if rule contains (enabled or disabled) specified option.
     * Please note, that options have three state: enabled, disabled, undefined.
     *
     * @param option Rule option to check.
     *
     * @returns True if rule contains (enabled or disabled) specified option.
     */
    hasOption(option) {
        return this.isOptionEnabled(option) || this.isOptionDisabled(option);
    }
    /**
     * Returns true if rule has at least one cosmetic option enabled.
     *
     * @returns True if the rule has at least one cosmetic option enabled.
     */
    hasCosmeticOption() {
        return (this.enabledOptions & NetworkRuleGroupOptions.CosmeticOption) !== 0;
    }
    /**
     * Returns true if the specified option is enabled.
     * Please note, that options have three state: enabled, disabled, undefined.
     *
     * @param option Rule option to check.
     *
     * @returns True if the specified option is enabled.
     */
    isOptionEnabled(option) {
        return (this.enabledOptions & option) === option;
    }
    /**
     * Returns true if one and only option is enabled.
     *
     * @param option Rule option to check.
     *
     * @returns True if the specified option is enabled.
     */
    isSingleOptionEnabled(option) {
        return this.enabledOptions === option;
    }
    /**
     * Returns true if the specified option is disabled.
     * Please note, that options have three state: enabled, disabled, undefined.
     *
     * @param option Rule option to check.
     *
     * @returns True if the specified option is disabled.
     */
    isOptionDisabled(option) {
        return (this.disabledOptions & option) === option;
    }
    /**
     * Checks if the rule has higher priority that the specified rule:
     * `allowlist + $important` > `$important` > `redirect` > `allowlist` > `basic rules`.
     *
     * @param r Rule to compare with.
     *
     * @returns True if the rule has higher priority than `r`.
     */
    isHigherPriority(r) {
        return this.priorityWeight > r.priorityWeight;
    }
    /**
     * Returns true if the rule is considered "generic"
     * "generic" means that the rule is not restricted to a limited set of domains
     * Please note that it might be forbidden on some domains, though.
     *
     * @returns True if the rule is considered "generic".
     */
    isGeneric() {
        return !this.domainModifier?.hasPermittedDomains();
    }
    /**
     * Returns true if this rule negates the specified rule.
     * Only makes sense when this rule has a `badfilter` modifier.
     *
     * @param specifiedRule Rule to check.
     *
     * @returns True if this rule negates the specified rule.
     */
    negatesBadfilter(specifiedRule) {
        if (!this.isOptionEnabled(NetworkRuleOption.Badfilter)) {
            return false;
        }
        if (this.allowlist !== specifiedRule.allowlist) {
            return false;
        }
        if (this.pattern.pattern !== specifiedRule.pattern.pattern) {
            return false;
        }
        if (this.permittedRequestTypes !== specifiedRule.permittedRequestTypes) {
            return false;
        }
        if (this.restrictedRequestTypes !== specifiedRule.restrictedRequestTypes) {
            return false;
        }
        if ((this.enabledOptions ^ NetworkRuleOption.Badfilter) !== specifiedRule.enabledOptions) {
            return false;
        }
        if (this.disabledOptions !== specifiedRule.disabledOptions) {
            return false;
        }
        if (!stringArraysEquals(this.getRestrictedDomains(), specifiedRule.getRestrictedDomains())) {
            return false;
        }
        if (!stringArraysHaveIntersection(this.getPermittedDomains(), specifiedRule.getPermittedDomains())) {
            return false;
        }
        return true;
    }
    /**
     * Checks if this rule can be used for hosts-level blocking.
     *
     * @returns True if the rule can be used for hosts-level blocking.
     */
    isHostLevelNetworkRule() {
        if (this.domainModifier?.hasPermittedDomains() || this.domainModifier?.hasRestrictedDomains()) {
            return false;
        }
        if (this.permittedRequestTypes !== 0 && this.restrictedRequestTypes !== 0) {
            return false;
        }
        if (this.disabledOptions !== NetworkRuleOption.NotSet) {
            return false;
        }
        if (this.enabledOptions !== NetworkRuleOption.NotSet) {
            return ((this.enabledOptions
                & NetworkRuleGroupOptions.OptionHostLevelRules)
                | (this.enabledOptions
                    ^ NetworkRuleGroupOptions.OptionHostLevelRules)) === NetworkRuleGroupOptions.OptionHostLevelRules;
        }
        return true;
    }
    /**
     * Enables or disables the specified option.
     *
     * @param option Option to enable or disable.
     * @param enabled True to enable, false to disable.
     * @param skipRestrictions Skip options allowlist/blacklist restrictions.
     *
     * @throws An error if the option we're trying to enable cannot be.
     * For instance, you cannot enable $elemhide for blacklist rules.
     */
    setOptionEnabled(option, enabled, skipRestrictions = false) {
        if (!skipRestrictions) {
            if (!this.allowlist && (option & NetworkRuleGroupOptions.AllowlistOnly) === option) {
                throw new SyntaxError(`Modifier ${NetworkRuleOption[option]} cannot be used in blacklist rule`);
            }
        }
        if (enabled) {
            this.enabledOptions |= option;
        }
        else {
            this.disabledOptions |= option;
        }
    }
    /**
     * Permits or forbids the specified request type.
     * "Permits" means that the rule will match **only** the types that are permitted.
     * "Restricts" means that the rule will match **all but restricted**.
     *
     * @param requestType Request type.
     * @param permitted True if it's permitted (whic).
     */
    setRequestType(requestType, permitted) {
        if (permitted) {
            this.permittedRequestTypes |= requestType;
        }
        else {
            this.restrictedRequestTypes |= requestType;
        }
    }
    /**
     * Sets and validates exceptionally allowed domains presented in $denyallow modifier.
     *
     * @param optionValue Denyallow modifier value.
     */
    setDenyAllowDomains(optionValue) {
        const domainModifier = new DomainModifier(optionValue, PIPE_SEPARATOR$1);
        if (domainModifier.restrictedDomains && domainModifier.restrictedDomains.length > 0) {
            throw new SyntaxError('Invalid modifier: $denyallow domains cannot be negated');
        }
        if (domainModifier.permittedDomains) {
            if (domainModifier.permittedDomains.some(DomainModifier.isWildcardOrRegexDomain)) {
                throw new SyntaxError('Invalid modifier: $denyallow does not support wildcards and regex domains');
            }
        }
        this.denyAllowDomains = domainModifier.permittedDomains;
    }
    /**
     * Loads the specified modifier.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-modifiers}
     *
     * @param optionName Modifier name.
     * @param optionValue Modifier value.
     * @param exception True if the modifier is negated.
     *
     * @throws An error if there is an unsupported modifier.
     */
    loadOption(optionName, optionValue, exception = false) {
        const { OPTIONS, NEGATABLE_OPTIONS } = NetworkRule;
        if (optionName.startsWith(OPTIONS.NOOP)) {
            /**
             * A noop modifier does nothing and can be used to increase some rules readability.
             * It consists of the sequence of underscore characters (_) of any length
             * and can appear in a rule as many times as it's needed.
             */
            if (!optionName.split(OPTIONS.NOOP).some((s) => !!s)) {
                return;
            }
        }
        // TODO: Speed up this by creating a map from names to bit mask positions
        if (exception && !NEGATABLE_OPTIONS.has(optionName)) {
            throw new SyntaxError(`Invalid modifier: '${optionName}' cannot be negated`);
        }
        switch (optionName) {
            // General options
            // $first-party, $~first-party
            case OPTIONS.FIRST_PARTY:
                this.setOptionEnabled(NetworkRuleOption.ThirdParty, exception);
                break;
            // $third-party, $~third-party
            case OPTIONS.THIRD_PARTY:
                this.setOptionEnabled(NetworkRuleOption.ThirdParty, !exception);
                break;
            // $match-case, $~match-case
            case OPTIONS.MATCH_CASE:
                this.setOptionEnabled(NetworkRuleOption.MatchCase, !exception);
                break;
            // $important
            case OPTIONS.IMPORTANT:
                this.setOptionEnabled(NetworkRuleOption.Important, true);
                break;
            // $domain
            case OPTIONS.DOMAIN:
                this.domainModifier = new DomainModifier(optionValue, PIPE_SEPARATOR$1);
                break;
            // $denyallow
            case OPTIONS.DENYALLOW:
                this.setDenyAllowDomains(optionValue);
                break;
            // $method modifier
            case OPTIONS.METHOD: {
                this.setOptionEnabled(NetworkRuleOption.Method, true);
                this.methodModifier = new MethodModifier(optionValue);
                break;
            }
            // $header modifier
            case OPTIONS.HEADER:
                this.setOptionEnabled(NetworkRuleOption.Header, true);
                this.headerModifier = new HeaderModifier(optionValue);
                break;
            // $to modifier
            case OPTIONS.TO: {
                this.setOptionEnabled(NetworkRuleOption.To, true);
                this.toModifier = new ToModifier(optionValue);
                break;
            }
            // Document-level allowlist rules
            // $elemhide
            case OPTIONS.ELEMHIDE:
                this.setOptionEnabled(NetworkRuleOption.Elemhide, true);
                this.setRequestType(RequestType.Document, true);
                this.setRequestType(RequestType.SubDocument, true);
                break;
            // $generichide
            case OPTIONS.GENERICHIDE:
                this.setOptionEnabled(NetworkRuleOption.Generichide, true);
                this.setRequestType(RequestType.Document, true);
                this.setRequestType(RequestType.SubDocument, true);
                break;
            // $specifichide
            case OPTIONS.SPECIFICHIDE:
                this.setOptionEnabled(NetworkRuleOption.Specifichide, true);
                this.setRequestType(RequestType.Document, true);
                this.setRequestType(RequestType.SubDocument, true);
                break;
            // $genericblock
            case OPTIONS.GENERICBLOCK:
                this.setOptionEnabled(NetworkRuleOption.Genericblock, true);
                this.setRequestType(RequestType.Document, true);
                this.setRequestType(RequestType.SubDocument, true);
                break;
            // $jsinject
            case OPTIONS.JSINJECT:
                this.setOptionEnabled(NetworkRuleOption.Jsinject, true);
                this.setRequestType(RequestType.Document, true);
                this.setRequestType(RequestType.SubDocument, true);
                break;
            // $urlblock
            case OPTIONS.URLBLOCK:
                this.setOptionEnabled(NetworkRuleOption.Urlblock, true);
                this.setRequestType(RequestType.Document, true);
                this.setRequestType(RequestType.SubDocument, true);
                break;
            // $content
            case OPTIONS.CONTENT:
                this.setOptionEnabled(NetworkRuleOption.Content, true);
                this.setRequestType(RequestType.Document, true);
                this.setRequestType(RequestType.SubDocument, true);
                break;
            // $document, $doc / $~document, $~doc
            case OPTIONS.DOCUMENT:
            case OPTIONS.DOC:
                if (exception) {
                    this.setRequestType(RequestType.Document, false);
                    break;
                }
                this.setRequestType(RequestType.Document, true);
                // In the case of allowlist rules $document implicitly includes
                // all these modifiers: `$content`, `$elemhide`, `$jsinject`,
                // `$urlblock`.
                if (this.isAllowlist()) {
                    this.setOptionEnabled(NetworkRuleOption.Elemhide, true, true);
                    this.setOptionEnabled(NetworkRuleOption.Jsinject, true, true);
                    this.setOptionEnabled(NetworkRuleOption.Urlblock, true, true);
                    this.setOptionEnabled(NetworkRuleOption.Content, true, true);
                }
                break;
            // $stealth
            case OPTIONS.STEALTH:
                this.setOptionEnabled(NetworkRuleOption.Stealth, true);
                this.stealthModifier = new StealthModifier(optionValue);
                break;
            // $popup
            case OPTIONS.POPUP:
                this.setOptionEnabled(NetworkRuleOption.Popup, true);
                break;
            // Content type options
            // $script, $~script
            case OPTIONS.SCRIPT:
                this.setRequestType(RequestType.Script, !exception);
                break;
            // $stylesheet, $~stylesheet
            case OPTIONS.STYLESHEET:
                this.setRequestType(RequestType.Stylesheet, !exception);
                break;
            // $subdocument, $~subdocument
            case OPTIONS.SUBDOCUMENT:
                this.setRequestType(RequestType.SubDocument, !exception);
                break;
            // $object, $~object
            case OPTIONS.OBJECT:
                this.setRequestType(RequestType.Object, !exception);
                break;
            // $image, $~image
            case OPTIONS.IMAGE:
                this.setRequestType(RequestType.Image, !exception);
                break;
            // $xmlhttprequest, $~xmlhttprequest
            case OPTIONS.XMLHTTPREQUEST:
                this.setRequestType(RequestType.XmlHttpRequest, !exception);
                break;
            // $media, $~media
            case OPTIONS.MEDIA:
                this.setRequestType(RequestType.Media, !exception);
                break;
            // $font, $~font
            case OPTIONS.FONT:
                this.setRequestType(RequestType.Font, !exception);
                break;
            // $websocket, $~websocket
            case OPTIONS.WEBSOCKET:
                this.setRequestType(RequestType.WebSocket, !exception);
                break;
            // $other, $~other
            case OPTIONS.OTHER:
                this.setRequestType(RequestType.Other, !exception);
                break;
            // $ping, $~ping
            case OPTIONS.PING:
                this.setRequestType(RequestType.Ping, !exception);
                break;
            // Special modifiers
            // $badfilter
            case OPTIONS.BADFILTER:
                this.setOptionEnabled(NetworkRuleOption.Badfilter, true);
                break;
            // $csp
            case OPTIONS.CSP:
                this.setOptionEnabled(NetworkRuleOption.Csp, true);
                this.advancedModifier = new CspModifier(optionValue, this.isAllowlist());
                break;
            // $replace
            case OPTIONS.REPLACE:
                this.setOptionEnabled(NetworkRuleOption.Replace, true);
                this.advancedModifier = new ReplaceModifier(optionValue);
                break;
            // $cookie
            case OPTIONS.COOKIE:
                this.setOptionEnabled(NetworkRuleOption.Cookie, true);
                this.advancedModifier = new CookieModifier(optionValue);
                break;
            // $redirect
            case OPTIONS.REDIRECT:
                this.setOptionEnabled(NetworkRuleOption.Redirect, true);
                this.advancedModifier = new RedirectModifier(optionValue, this.isAllowlist());
                break;
            // $redirect-rule
            case OPTIONS.REDIRECTRULE:
                this.setOptionEnabled(NetworkRuleOption.Redirect, true);
                this.advancedModifier = new RedirectModifier(optionValue, this.isAllowlist(), true);
                break;
            // $removeparam
            case OPTIONS.REMOVEPARAM:
                this.setOptionEnabled(NetworkRuleOption.RemoveParam, true);
                this.advancedModifier = new RemoveParamModifier(optionValue);
                break;
            // $removeheader
            case OPTIONS.REMOVEHEADER:
                this.setOptionEnabled(NetworkRuleOption.RemoveHeader, true);
                this.advancedModifier = new RemoveHeaderModifier(optionValue, this.isAllowlist());
                break;
            // $permissions
            case OPTIONS.PERMISSIONS:
                this.setOptionEnabled(NetworkRuleOption.Permissions, true);
                this.advancedModifier = new PermissionsModifier(optionValue, this.isAllowlist());
                break;
            // $jsonprune
            // simple validation of jsonprune rules for compiler
            // https://github.com/AdguardTeam/FiltersCompiler/issues/168
            case OPTIONS.JSONPRUNE:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension does not support $jsonprune modifier yet');
                }
                this.setOptionEnabled(NetworkRuleOption.JsonPrune, true);
                // TODO: should be properly implemented later
                // https://github.com/AdguardTeam/tsurlfilter/issues/71
                break;
            // $hls
            // simple validation of hls rules for compiler
            // https://github.com/AdguardTeam/FiltersCompiler/issues/169
            case OPTIONS.HLS:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension does not support $hls modifier yet');
                }
                this.setOptionEnabled(NetworkRuleOption.Hls, true);
                // TODO: should be properly implemented later
                // https://github.com/AdguardTeam/tsurlfilter/issues/72
                break;
            // $referrerpolicy
            // simple validation of referrerpolicy rules for compiler
            // https://github.com/AdguardTeam/FiltersCompiler/issues/191
            case OPTIONS.REFERRERPOLICY:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension does not support $referrerpolicy modifier');
                }
                // do nothing as $referrerpolicy is supported by CoreLibs-based apps only.
                // it is needed for proper rule conversion performed by FiltersCompiler
                // so rules with $referrerpolicy modifier is not marked as invalid
                break;
            // Dns modifiers
            // $client
            case OPTIONS.CLIENT:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension doesn\'t support $client modifier');
                }
                this.setOptionEnabled(NetworkRuleOption.Client, true);
                this.advancedModifier = new ClientModifier(optionValue);
                break;
            // $dnsrewrite
            case OPTIONS.DNSREWRITE:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension doesn\'t support $dnsrewrite modifier');
                }
                this.setOptionEnabled(NetworkRuleOption.DnsRewrite, true);
                this.advancedModifier = new DnsRewriteModifier(optionValue);
                break;
            // $dnstype
            case OPTIONS.DNSTYPE:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension doesn\'t support $dnstype modifier');
                }
                this.setOptionEnabled(NetworkRuleOption.DnsType, true);
                this.advancedModifier = new DnsTypeModifier(optionValue);
                break;
            // $ctag
            case OPTIONS.CTAG:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension doesn\'t support $ctag modifier');
                }
                this.setOptionEnabled(NetworkRuleOption.Ctag, true);
                this.advancedModifier = new CtagModifier(optionValue);
                break;
            // $app
            case OPTIONS.APP:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension doesn\'t support $app modifier');
                }
                this.appModifier = new AppModifier(optionValue);
                break;
            // $network
            case OPTIONS.NETWORK:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension doesn\'t support $network modifier');
                }
                this.setOptionEnabled(NetworkRuleOption.Network, true);
                break;
            // $extension, $~extension
            case OPTIONS.EXTENSION:
                if (isCompatibleWith(CompatibilityTypes.Extension)) {
                    throw new SyntaxError('Extension doesn\'t support $extension modifier');
                }
                this.setOptionEnabled(NetworkRuleOption.Extension, !exception);
                break;
            // $all
            case OPTIONS.ALL:
                if (this.isAllowlist()) {
                    throw new SyntaxError('Rule with $all modifier can not be allowlist rule');
                }
                // Set all request types
                Object.values(RequestType).forEach((type) => {
                    this.setRequestType(type, true);
                });
                this.setOptionEnabled(NetworkRuleOption.Popup, true);
                break;
            // $empty and $mp4
            // Deprecated in favor of $redirect
            case OPTIONS.EMPTY:
            case OPTIONS.MP4:
                // Do nothing.
                break;
            default: {
                // clear empty values
                const modifierView = [optionName, optionValue]
                    .filter((i) => i)
                    .join('=');
                throw new SyntaxError(`Unknown modifier: ${modifierView}`);
            }
        }
    }
    /**
     * To calculate priority, we've categorized modifiers into different groups.
     * These groups are ranked based on their priority, from lowest to highest.
     * A modifier that significantly narrows the scope of a rule adds more
     * weight to its total priority. Conversely, if a rule applies to a broader
     * range of requests, its priority decreases.
     *
     * It's worth noting that there are cases where a single-parameter modifier
     * has a higher priority than multi-parameter ones. For instance, in
     * the case of `$domain=example.com|example.org`, a rule that includes two
     * domains has a slightly broader effective area than a rule with one
     * specified domain, therefore its priority is lower.
     *
     * The base priority weight of any rule is 1. If the calculated priority
     * is a floating-point number, it will be **rounded up** to the smallest
     * integer greater than or equal to the calculated weight.
     *
     * @see {@link NetworkRule.PermittedRequestTypeWeight}
     * @see {@link NetworkRule.PermittedDomainWeight}
     * @see {@link NetworkRule.SpecificExceptionsWeight}
     * @see {@link NetworkRule.AllowlistRuleWeight}
     * @see {@link NetworkRule.RedirectRuleWeight}
     * @see {@link NetworkRule.ImportantRuleWeight}
     * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-counting}
     */
    calculatePriorityWeight() {
        // Base modifiers, category 1.
        this.priorityWeight += countEnabledBits(this.enabledOptions, NetworkRule.CATEGORY_1_OPTIONS_MASK);
        this.priorityWeight += countEnabledBits(this.disabledOptions, NetworkRule.CATEGORY_1_OPTIONS_MASK);
        /**
         * When dealing with a negated domain, app, method, or content-type,
         * we add a point for the existence of the modifier itself, regardless
         * of the quantity of negated domains or content-types. This is because
         * the rule's scope is already infinitely broad. Put simply,
         * by prohibiting multiple domains, content-types, methods or apps,
         * the scope of the rule becomes only minimally smaller.
         */
        if (this.denyAllowDomains && this.denyAllowDomains.length > 0) {
            this.priorityWeight += 1;
        }
        const { domainModifier } = this;
        if (domainModifier?.hasRestrictedDomains()) {
            this.priorityWeight += 1;
        }
        if (this.methodModifier?.restrictedValues && this.methodModifier.restrictedValues.length > 0) {
            this.priorityWeight += 1;
        }
        if (this.restrictedRequestTypes !== RequestType.NotSet) {
            this.priorityWeight += 1;
        }
        // $to modifier is basically a replacement for a regular expression
        // See https://github.com/AdguardTeam/KnowledgeBase/pull/196#discussion_r1221401215
        if (this.toModifier) {
            this.priorityWeight += 1;
        }
        /**
         * Category 2: permitted request types, methods, headers, $popup.
         * Specified content-types add `50 + 50 / number_of_content_types`,
         * for example: `||example.com^$image,script` will add
         * `50 + 50 / 2 = 50 + 25 = 75` to the total weight of the rule.
         * The `$popup` also belongs to this category, because it implicitly
         * adds the modifier `$document`.
         * Similarly, specific exceptions add `$document,subdocument`.
         *
         * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#priority-category-2}
         */
        if (this.permittedRequestTypes !== RequestType.NotSet) {
            const numberOfPermittedRequestTypes = getBitCount(this.permittedRequestTypes);
            // More permitted request types mean less priority weight.
            const relativeWeight = NetworkRule.CategoryTwoWeight / numberOfPermittedRequestTypes;
            this.priorityWeight += NetworkRule.CategoryTwoWeight + relativeWeight;
        }
        if (this.methodModifier?.permittedValues && this.methodModifier.permittedValues.length > 0) {
            // More permitted request methods mean less priority weight.
            const relativeWeight = NetworkRule.CategoryTwoWeight / this.methodModifier.permittedValues.length;
            this.priorityWeight += NetworkRule.CategoryTwoWeight + relativeWeight;
        }
        if (this.headerModifier) {
            // $header modifier in the rule adds 50
            this.priorityWeight += NetworkRule.CategoryTwoWeight;
        }
        /**
         * Category 3: permitted domains.
         * Specified domains through `$domain` and specified applications
         * through `$app` add `100 + 100 / number_domains (or number_applications)`,
         * for example:
         * `||example.com^$domain=example.com|example.org|example.net`
         * will add `100 + 100 / 3 = 134.3 = 134` or
         * `||example.com^$app=org.example.app1|org.example.app2`
         * will add `100 + 100 / 2 = 151`.
         */
        if (domainModifier?.hasPermittedDomains()) {
            // More permitted domains mean less priority weight.
            const relativeWeight = NetworkRule.CategoryThreeWeight / domainModifier.getPermittedDomains().length;
            this.priorityWeight += NetworkRule.CategoryThreeWeight + relativeWeight;
        }
        // Category 4: redirect rules.
        if (this.isOptionEnabled(NetworkRuleOption.Redirect)) {
            this.priorityWeight += NetworkRule.CategoryFourWeight;
        }
        // Category 5: specific exceptions.
        this.priorityWeight += NetworkRule.CategoryFiveWeight * countEnabledBits(this.enabledOptions, NetworkRule.SPECIFIC_EXCLUSIONS_MASK);
        // Category 6: allowlist rules.
        if (this.isAllowlist()) {
            this.priorityWeight += NetworkRule.CategorySixWeight;
        }
        // Category 7: important rules.
        if (this.isOptionEnabled(NetworkRuleOption.Important)) {
            this.priorityWeight += NetworkRule.CategorySevenWeight;
        }
        // Round up to avoid overlap between different categories of rules.
        this.priorityWeight = Math.ceil(this.priorityWeight);
    }
    /**
     * Validates rule options.
     */
    validateOptions() {
        if (this.advancedModifier instanceof RemoveParamModifier) {
            this.validateRemoveParamRule();
        }
        else if (this.advancedModifier instanceof RemoveHeaderModifier) {
            this.validateRemoveHeaderRule();
        }
        else if (this.advancedModifier instanceof PermissionsModifier) {
            this.validatePermissionsRule();
        }
        else if (this.headerModifier instanceof HeaderModifier) {
            this.validateHeaderRule();
        }
        else if (this.toModifier !== null) {
            this.validateToRule();
        }
        else if (this.denyAllowDomains !== null) {
            this.validateDenyallowRule();
        }
    }
    /**
     * Validates $header rule.
     *
     * $header is compatible with the limited list of modifiers:
     * - $important
     * - $csp
     * - $removeheader (on response headers)
     * - $third-party
     * - $match-case
     * - $badfilter
     * - $domain
     * - all content type modifiers ($subdocument, $script, $stylesheet, etc).
     *
     * The rules with any other modifiers are considered invalid and will be discarded.
     */
    validateHeaderRule() {
        if ((this.enabledOptions | NetworkRuleGroupOptions.HeaderCompatibleOptions)
            !== NetworkRuleGroupOptions.HeaderCompatibleOptions) {
            throw new SyntaxError('$header rules are not compatible with some other modifiers');
        }
        if (this.advancedModifier && this.isOptionEnabled(NetworkRuleOption.RemoveHeader)) {
            const removeHeaderValue = this.getAdvancedModifierValue();
            if (!removeHeaderValue || removeHeaderValue.includes('request:')) {
                const message = '$header rules are only compatible with response headers removal of $removeheader.';
                throw new SyntaxError(message);
            }
        }
    }
    /**
     * $permissions rules are not compatible with any other
     * modifiers except $domain, $important, and $subdocument.
     * The rules with any other modifiers are considered invalid and will be discarded.
     */
    validatePermissionsRule() {
        if ((this.enabledOptions | NetworkRuleGroupOptions.PermissionsCompatibleOptions)
            !== NetworkRuleGroupOptions.PermissionsCompatibleOptions) {
            throw new SyntaxError('$permissions rules are not compatible with some other modifiers');
        }
    }
    /**
     * $removeparam rules are not compatible with any other modifiers except $domain,
     * $third-party, $app, $important, $match-case and permitted content type modifiers ($script, $stylesheet, etc).
     * The rules with any other modifiers are considered invalid and will be discarded.
     */
    validateRemoveParamRule() {
        if ((this.enabledOptions | NetworkRuleGroupOptions.RemoveParamCompatibleOptions)
            !== NetworkRuleGroupOptions.RemoveParamCompatibleOptions) {
            throw new SyntaxError('$removeparam rules are not compatible with some other modifiers');
        }
    }
    /**
     * $removeheader rules are not compatible with any other modifiers except $domain,
     * $third-party, $app, $important, $match-case and permitted content type modifiers ($script, $stylesheet, etc).
     * The rules with any other modifiers are considered invalid and will be discarded.
     */
    validateRemoveHeaderRule() {
        if ((this.enabledOptions | NetworkRuleGroupOptions.RemoveHeaderCompatibleOptions)
            !== NetworkRuleGroupOptions.RemoveHeaderCompatibleOptions) {
            throw new SyntaxError('$removeheader rules are not compatible with some other modifiers');
        }
        if (this.headerModifier && this.isOptionEnabled(NetworkRuleOption.Header)) {
            const removeHeaderValue = this.getAdvancedModifierValue();
            if (!removeHeaderValue || removeHeaderValue.includes('request:')) {
                const message = 'Request headers removal of $removeheaders is not compatible with $header rules.';
                throw new SyntaxError(message);
            }
        }
    }
    /**
     * $to rules are not compatible $denyallow - these rules considered invalid
     * and will be discarded.
     */
    validateToRule() {
        if (this.denyAllowDomains) {
            throw new SyntaxError('modifier $to is not compatible with $denyallow modifier');
        }
    }
    /**
     * $denyallow rules are not compatible $to - these rules considered invalid
     * and will be discarded.
     */
    validateDenyallowRule() {
        if (this.toModifier) {
            throw new SyntaxError('modifier $to is not compatible with $denyallow modifier');
        }
    }
}

/**
 * @file Known CSS / Extended CSS elements.
 */
/**
 * Supported Extended CSS pseudo-classes.
 *
 * These pseudo-classes are not supported by browsers natively, so we need Extended CSS library to support them.
 *
 * Please keep this list sorted alphabetically.
 */
const SUPPORTED_EXT_CSS_PSEUDO_CLASSES = new Set([
    /**
     * Pseudo-classes :is(), and :not() may use native implementation.
     *
     * @see {@link https://github.com/AdguardTeam/ExtendedCss#extended-css-is}
     * @see {@link https://github.com/AdguardTeam/ExtendedCss#extended-css-not}
     */
    /**
     * :has() should also be conditionally considered as extended and should not be in this list,
     * for details check: https://github.com/AdguardTeam/ExtendedCss#extended-css-has,
     * but there is a bug with content blocker in safari:
     * for details check: https://bugs.webkit.org/show_bug.cgi?id=248868.
     *
     * TODO: remove 'has' later.
     */
    '-abp-contains', // alias for 'contains'
    '-abp-has', // alias for 'has'
    'contains',
    'has', // some browsers support 'has' natively
    'has-text', // alias for 'contains'
    'if',
    'if-not',
    'matches-attr',
    'matches-css',
    'matches-css-after', // deprecated, replaced by 'matches-css'
    'matches-css-before', // deprecated, replaced by 'matches-css'
    'matches-property',
    'nth-ancestor',
    'remove',
    'upward',
    'xpath',
]);
/**
 * Supported native CSS pseudo-classes.
 *
 * These pseudo-classes are supported by browsers natively, so we don't need Extended CSS library to support them.
 *
 * The problem with pseudo-classes is that any unknown pseudo-class makes browser ignore the whole CSS rule,
 * which contains a lot more selectors. So, if CSS selector contains a pseudo-class, we should try to validate it.
 * One more problem with pseudo-classes is that they are actively used in uBlock, hence it may mess AG styles.
 *
 * Please keep this list sorted alphabetically.
 */
const SUPPORTED_CSS_PSEUDO_CLASSES = new Set([
    'active', // https://developer.mozilla.org/en-US/docs/Web/CSS/:active
    'checked', // https://developer.mozilla.org/en-US/docs/Web/CSS/:checked
    'disabled', // https://developer.mozilla.org/en-US/docs/Web/CSS/:disabled
    'empty', // https://developer.mozilla.org/en-US/docs/Web/CSS/:empty
    'enabled', // https://developer.mozilla.org/en-US/docs/Web/CSS/:enabled
    'first-child', // https://developer.mozilla.org/en-US/docs/Web/CSS/:first-child
    'first-of-type', // https://developer.mozilla.org/en-US/docs/Web/CSS/:first-of-type
    'focus', // https://developer.mozilla.org/en-US/docs/Web/CSS/:focus
    'has', // https://developer.mozilla.org/en-US/docs/Web/CSS/:has
    'hover', // https://developer.mozilla.org/en-US/docs/Web/CSS/:hover
    'in-range', // https://developer.mozilla.org/en-US/docs/Web/CSS/:in-range
    'invalid', // https://developer.mozilla.org/en-US/docs/Web/CSS/:invalid
    'is', // https://developer.mozilla.org/en-US/docs/Web/CSS/:is
    'lang', // https://developer.mozilla.org/en-US/docs/Web/CSS/:lang
    'last-child', // https://developer.mozilla.org/en-US/docs/Web/CSS/:last-child
    'last-of-type', // https://developer.mozilla.org/en-US/docs/Web/CSS/:last-of-type
    'link', // https://developer.mozilla.org/en-US/docs/Web/CSS/:link
    'not', // https://developer.mozilla.org/en-US/docs/Web/CSS/:not
    'nth-child', // https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child
    'nth-last-child', // https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-last-child
    'nth-last-of-type', // https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-last-of-type
    'nth-of-type', // https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-of-type
    'only-child', // https://developer.mozilla.org/en-US/docs/Web/CSS/:only-child
    'only-of-type', // https://developer.mozilla.org/en-US/docs/Web/CSS/:only-of-type
    'optional', // https://developer.mozilla.org/en-US/docs/Web/CSS/:optional
    'out-of-range', // https://developer.mozilla.org/en-US/docs/Web/CSS/:out-of-range
    'read-only', // https://developer.mozilla.org/en-US/docs/Web/CSS/:read-only
    'read-write', // https://developer.mozilla.org/en-US/docs/Web/CSS/:read-write
    'required', // https://developer.mozilla.org/en-US/docs/Web/CSS/:required
    'root', // https://developer.mozilla.org/en-US/docs/Web/CSS/:root
    'target', // https://developer.mozilla.org/en-US/docs/Web/CSS/:target
    'valid', // https://developer.mozilla.org/en-US/docs/Web/CSS/:valid
    'visited', // https://developer.mozilla.org/en-US/docs/Web/CSS/:visited
    'where', // https://developer.mozilla.org/en-US/docs/Web/CSS/:where
]);
/**
 * Every Extended CSS pseudo-class should start with this prefix.
 *
 * @see {@link https://github.com/AdguardTeam/ExtendedCss#-backward-compatible-syntax}
 */
const EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX = '-ext-';
/**
 * Supported legacy Extended CSS attribute selectors.
 *
 * Attribute selector way is deprecated and will be removed completely in the future,
 * we replaced it with Extended CSS pseudo-classes. For example, instead of
 * `[-ext-has="a[href]"]` you should use `:has(a[href])`.
 *
 * Please keep this list sorted alphabetically.
 */
const SUPPORTED_EXT_CSS_ATTRIBUTE_SELECTORS = new Set([
    `${EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX}has`,
    `${EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX}contains`,
    `${EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX}has-text`,
    `${EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX}matches-css`,
    `${EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX}matches-css-before`,
    `${EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX}matches-css-after`,
]);
/**
 * Known CSS functions that aren't allowed in CSS injection rules, because they
 * able to load external resources. Please, keep this list sorted.
 */
const FORBIDDEN_CSS_FUNCTIONS = new Set([
    // https://developer.mozilla.org/en-US/docs/Web/CSS/cross-fade
    '-webkit-cross-fade',
    'cross-fade',
    // https://developer.mozilla.org/en-US/docs/Web/CSS/image
    'image',
    // https://developer.mozilla.org/en-US/docs/Web/CSS/image-set
    '-webkit-image-set',
    'image-set',
    // https://developer.mozilla.org/en-US/docs/Web/CSS/url
    'url',
]);

/**
 * @file Selector list validator.
 */
/**
 * Does a basic validation of a selector list.
 * Checks for unsupported pseudo-classes and attribute selectors,
 * and determines if the selector is an Extended CSS selector.
 *
 * @param selectorList Selector list to validate.
 *
 * @returns Validation result, see {@link CssValidationResult}.
 *
 * @note This is a basic validation for the most necessary things, it does not guarantee that the CSS is completely
 * valid.
 */
const validateSelectorList = (selectorList) => {
    const result = {
        isValid: true,
        isExtendedCss: false,
    };
    try {
        let prevIsDoubleColon = false;
        let prevToken;
        let prevNonWhitespaceToken;
        tokenizeExtended(selectorList, (token, start, end) => {
            if ((token === TokenType.Function || token === TokenType.Ident)
                && prevToken === TokenType.Colon
                && !prevIsDoubleColon) {
                // whitespace is NOT allowed between the ':' and the pseudo-class name, like ': active('
                const name = selectorList.slice(start, 
                // function tokens look like 'func(', so we need to remove the last character
                token === TokenType.Function ? end - 1 : end);
                // function name may contain escaped characters, like '\75' instead of 'u', so we need to decode it
                const decodedName = decodeIdent(name);
                if (SUPPORTED_EXT_CSS_PSEUDO_CLASSES.has(decodedName)) {
                    result.isExtendedCss = true;
                }
                else if (!SUPPORTED_CSS_PSEUDO_CLASSES.has(decodedName)) {
                    throw new Error(`Unsupported pseudo-class: ':${decodedName}'`);
                }
            }
            else if (token === TokenType.Ident && prevNonWhitespaceToken === TokenType.OpenSquareBracket) {
                // whitespace is allowed between the '[' and the attribute name, like '[ attr]'
                const attributeName = selectorList.slice(start, end);
                if (attributeName.startsWith(EXT_CSS_ATTRIBUTE_SELECTOR_PREFIX)) {
                    result.isExtendedCss = true;
                    if (!SUPPORTED_EXT_CSS_ATTRIBUTE_SELECTORS.has(attributeName)) {
                        throw new Error(`Unsupported Extended CSS attribute selector: '${attributeName}'`);
                    }
                }
            }
            else if (token === TokenType.OpenCurlyBracket || token === TokenType.CloseCurlyBracket) {
                throw new Error('Curly brackets are not allowed in selector lists');
            }
            else if (token === TokenType.Comment) {
                throw new Error('Comments are not allowed in selector lists');
            }
            // memorize tokens, we need them later
            if (token === TokenType.Colon) {
                prevIsDoubleColon = prevToken === TokenType.Colon;
            }
            prevToken = token;
            if (token !== TokenType.Whitespace) {
                prevNonWhitespaceToken = token;
            }
        });
    }
    catch (error) {
        result.isValid = false;
        result.errorMessage = getErrorMessage(error);
    }
    return result;
};

/**
 * @file Declaration list validator.
 */
const REMOVE_PROPERTY = 'remove';
const REMOVE_LENGTH = REMOVE_PROPERTY.length;
/**
 * Check if function name is forbidden. If so, throws an error.
 *
 * @param functionName Function name to check.
 *
 * @throws Error if function name is forbidden.
 */
const checkFunctionName = (functionName) => {
    // function name may contain escaped characters, like '\75' instead of 'u', so we need to decode it
    const decodedFunctionName = decodeIdent(functionName);
    if (FORBIDDEN_CSS_FUNCTIONS.has(decodedFunctionName)) {
        throw new Error(`Using '${decodedFunctionName}()' is not allowed`);
    }
};
/**
 * Does a basic validation of a declaration list.
 * Checks for unsafe resource loading and determines if the declaration list is an Extended CSS declaration list.
 *
 * @param declarationList Declaration list to validate.
 *
 * @returns Validation result, see {@link CssValidationResult}.
 *
 * @note This is a basic validation for the most necessary things, it does not guarantee that the CSS is completely
 * valid.
 */
const validateDeclarationList = (declarationList) => {
    const result = {
        isValid: true,
        isExtendedCss: false,
    };
    try {
        tokenizeExtended(declarationList, (token, start, end) => {
            switch (token) {
                // Special case: according to CSS specs, sometimes url() is handled as a separate token type
                case TokenType.Url:
                case TokenType.BadUrl:
                    throw new Error("Using 'url()' is not allowed");
                case TokenType.Function:
                    // we need -1 to exclude closing bracket, because function tokens look like 'func('
                    checkFunctionName(declarationList.slice(start, end - 1));
                    break;
                case TokenType.Ident:
                    // do a fast check before getting the substring
                    if (end - start === REMOVE_LENGTH) {
                        // TODO: Improve this check, and check the whole `remove: true` sequence.
                        // Please note that the `remove : true` case also valid.
                        if (decodeIdent(declarationList.slice(start, end)) === REMOVE_PROPERTY) {
                            result.isExtendedCss = true;
                        }
                    }
                    break;
                case TokenType.Comment:
                    throw new Error('Comments are not allowed in declaration lists');
                default:
                    break;
            }
        });
    }
    catch (error) {
        result.isValid = false;
        result.errorMessage = getErrorMessage(error);
    }
    return result;
};

/* eslint-disable max-classes-per-file */
class ScriptletParams {
    props = null;
    constructor(name, args) {
        if (typeof name !== 'undefined') {
            this.props = {
                name,
                args: args || [],
            };
        }
    }
    get name() {
        return this.props?.name;
    }
    get args() {
        return this.props?.args ?? [];
    }
    toString() {
        const result = [];
        result.push(ADG_SCRIPTLET_MASK);
        result.push('(');
        if (this.name) {
            result.push(QuoteUtils.setStringQuoteType(this.name, QuoteType.Single));
        }
        if (this.args.length) {
            result.push(', ');
            result.push(this.args.map((arg) => QuoteUtils.setStringQuoteType(arg, QuoteType.Single)).join(', '));
        }
        result.push(')');
        return result.join(EMPTY_STRING);
    }
}
/**
 * @typedef {import('./cosmetic-result').CosmeticResult} CosmeticResult
 */
/**
 * Implements a basic cosmetic rule.
 *
 * Cosmetic rules syntax are almost similar and looks like this.
 * ```
 * rule = [domains] "marker" content
 * domains = [domain0, domain1[, ...[, domainN]]]
 * ```
 *
 * The rule type is defined by the `type` property, you can find the list of them
 * in the {@link CosmeticRuleType} enumeration.
 *
 * What matters, though, is what's in the `content` part of it.
 *
 * @example
 * `example.org##.banner` -- element hiding rule
 * `example.org#$#.banner { display: block; }` -- CSS rule
 * `example.org#%#window.x=1;` -- JS rule
 * `example.org#%#//scriptlet('scriptlet-name')` -- Scriptlet rule
 * `example.org$$div[id="test"]` -- HTML filtering rule
 */
class CosmeticRule {
    ruleIndex;
    filterListId;
    content;
    type;
    allowlist = false;
    extendedCss = false;
    /**
     * $domain modifier pattern. It is only set if $domain modifier is specified for this rule.
     */
    domainModifier = null;
    /**
     * $path modifier pattern. It is only set if $path modifier is specified for this rule.
     */
    pathModifier;
    /**
     * $url modifier pattern. It is only set if $url modifier is specified for this rule,
     * but $path and $domain modifiers are not.
     *
     * TODO: add this to test cases.
     */
    urlModifier;
    /**
     * Js script to execute.
     */
    script = undefined;
    /**
     * Object with script code ready to execute and debug, domain values.
     *
     * @private
     */
    scriptData = null;
    /**
     * Object with scriptlet function and params.
     *
     * @private
     */
    scriptletData = null;
    /**
     * Scriptlet parameters.
     */
    scriptletParams;
    /**
     * If the rule contains scriptlet content.
     */
    isScriptlet = false;
    getIndex() {
        return this.ruleIndex;
    }
    getFilterListId() {
        return this.filterListId;
    }
    /**
     * Returns the rule content.
     *
     * @returns The content of the rule.
     */
    getContent() {
        return this.content;
    }
    /**
     * Cosmetic rule type (always present).
     *
     * @returns The type of the cosmetic rule.
     */
    getType() {
        return this.type;
    }
    /**
     * Allowlist means that this rule is meant to disable other rules,
     * i.e. an exception rule.
     *
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#elemhide-exceptions}
     *
     * @returns True if the rule is an allowlist rule, false otherwise.
     */
    isAllowlist() {
        return this.allowlist;
    }
    /**
     * Returns script ready to execute or null
     * Rebuilds scriptlet script if debug or domain params change.
     *
     * @param options Script options.
     *
     * @returns Script code or null.
     */
    getScript(options = {}) {
        const { debug = false, frameUrl } = options;
        const { scriptData } = this;
        if (scriptData && !this.isScriptlet) {
            return scriptData.code;
        }
        if (scriptData && scriptData.debug === debug) {
            if (frameUrl) {
                if (frameUrl === scriptData.frameUrl) {
                    return scriptData.code;
                }
            }
            else {
                return scriptData.code;
            }
        }
        this.initScript(options);
        return this.scriptData?.code ?? null;
    }
    /**
     * Gets list of permitted domains.
     *
     * @returns List of permitted domains or null if no domain modifier is set.
     */
    getPermittedDomains() {
        if (this.domainModifier) {
            return this.domainModifier.getPermittedDomains();
        }
        return null;
    }
    /**
     * Gets list of restricted domains.
     *
     * @returns List of restricted domains or null if no domain modifier is set.
     */
    getRestrictedDomains() {
        if (this.domainModifier) {
            return this.domainModifier.getRestrictedDomains();
        }
        return null;
    }
    /**
     * Returns true if the rule is considered "generic"
     * "generic" means that the rule is not restricted to a limited set of domains
     * Please note that it might be forbidden on some domains, though.
     *
     * @returns True if the rule is generic, false otherwise.
     */
    isGeneric() {
        return !this.domainModifier?.hasPermittedDomains();
    }
    /**
     * Checks if the rule is ExtendedCss.
     *
     * @returns True if the rule is ExtendedCss, false otherwise.
     */
    isExtendedCss() {
        return this.extendedCss;
    }
    /**
     * Processes cosmetic rule modifiers, e.g. `$path`.
     *
     * @see {@link https://adguard.com/kb/general/ad-filtering/create-own-filters/#modifiers-for-non-basic-type-of-rules}
     *
     * @param ruleNode Cosmetic rule node to process.
     *
     * @returns Processed modifiers ({@link ProcessedModifiers}) or `null` if there are no modifiers.
     */
    static processModifiers(ruleNode) {
        // Do nothing if there are no modifiers in the rule node
        if (!ruleNode.modifiers) {
            return null;
        }
        const result = {};
        // We don't allow duplicate modifiers, so we collect them in a set
        const usedModifiers = new Set();
        // Destructure the modifiers array just for convenience
        const { children: modifierNodes } = ruleNode.modifiers;
        // AGTree parser tolerates this case: [$]example.com##.foo
        // However, we should throw an error here if the modifier list is empty
        // (if the modifier list isn't specified at all, then ruleNode.modifiers
        // will be undefined, so we won't get here)
        if (modifierNodes.length < 1) {
            throw new SyntaxError('Modifiers list cannot be be empty');
        }
        for (const modifierNode of modifierNodes) {
            const modifierName = modifierNode.name.value;
            // Check if the modifier is already used
            if (usedModifiers.has(modifierName)) {
                throw new Error(`Duplicated modifier: '${modifierName}'`);
            }
            // Mark the modifier as used by adding it to the set
            usedModifiers.add(modifierName);
            const modifierValue = modifierNode.value?.value || EMPTY_STRING;
            // Every modifier should have a value at the moment, so for simplicity we throw an error here if the
            // modifier value is not present.
            // TODO: Improve this when we decide to add modifiers without values
            if (modifierValue.length < 1 && modifierName !== "path" /* CosmeticRuleModifier.Path */) {
                throw new SyntaxError(`'$${modifierName}' modifier should have a value`);
            }
            // Process the modifier based on its name
            switch (modifierName) {
                case "domain" /* CosmeticRuleModifier.Domain */:
                    if (ruleNode.domains.children.length > 0) {
                        throw new SyntaxError(`'$${modifierName}' modifier is not allowed in a domain-specific rule`);
                    }
                    result.domainModifier = new DomainModifier(modifierValue, PIPE_MODIFIER_SEPARATOR);
                    break;
                case "path" /* CosmeticRuleModifier.Path */:
                    result.pathModifier = new Pattern(SimpleRegex.isRegexPattern(modifierValue)
                        // eslint-disable-next-line max-len
                        ? SimpleRegex.unescapeRegexSpecials(modifierValue, SimpleRegex.reModifierPatternEscapedSpecialCharacters)
                        : modifierValue);
                    break;
                case "url" /* CosmeticRuleModifier.Url */:
                    if (ruleNode.domains.children.length > 0) {
                        throw new SyntaxError(`'$${modifierName}' modifier is not allowed in a domain-specific rule`);
                    }
                    result.urlModifier = new Pattern(SimpleRegex.isRegexPattern(modifierValue)
                        // eslint-disable-next-line max-len
                        ? SimpleRegex.unescapeRegexSpecials(modifierValue, SimpleRegex.reModifierPatternEscapedSpecialCharacters)
                        : modifierValue);
                    break;
                // Don't allow unknown modifiers
                default:
                    throw new SyntaxError(`'$${modifierName}' modifier is not supported`);
            }
        }
        // $url modifier can't be used with other modifiers
        // TODO: Extend / change this check if we decide to add more such modifiers
        if (result.urlModifier && usedModifiers.size > 1) {
            throw new SyntaxError(`'$${"url" /* CosmeticRuleModifier.Url */}' modifier cannot be used with other modifiers`);
        }
        return result;
    }
    /**
     * Validates cosmetic rule node.
     *
     * @param ruleNode Cosmetic rule node to validate.
     *
     * @returns Validation result {@link ValidationResult}.
     */
    static validate(ruleNode) {
        const result = {
            isValid: true,
            isExtendedCss: false,
        };
        let scriptletName;
        let selectorListValidationResult;
        const { type: ruleType } = ruleNode;
        try {
            // Common validation: every cosmetic rule has a domain list
            if (ruleNode.domains?.children.length) {
                // Iterate over the domain list and check every domain
                for (const { value: domain } of ruleNode.domains.children) {
                    if (!DomainUtils.isValidDomainOrHostname(domain)) {
                        throw new Error(`'${domain}' is not a valid domain name`);
                    }
                }
            }
            // Type-specific validation
            switch (ruleType) {
                case CosmeticRuleType.ElementHidingRule:
                    selectorListValidationResult = validateSelectorList(ruleNode.body.selectorList.value);
                    if (!selectorListValidationResult.isValid) {
                        throw new Error(selectorListValidationResult.errorMessage);
                    }
                    // Detect ExtendedCss and unsupported pseudo-classes
                    result.isExtendedCss = selectorListValidationResult.isExtendedCss;
                    break;
                case CosmeticRuleType.CssInjectionRule:
                    selectorListValidationResult = validateSelectorList(ruleNode.body.selectorList.value);
                    if (!selectorListValidationResult.isValid) {
                        throw new Error(selectorListValidationResult.errorMessage);
                    }
                    // Detect ExtendedCss and unsupported pseudo-classes
                    result.isExtendedCss = selectorListValidationResult.isExtendedCss;
                    // AGTree won't allow the following rule:
                    // `#$#selector { remove: true; padding: 0; }`
                    // because it mixes removal and non-removal declarations.
                    if (ruleNode.body.declarationList) {
                        // eslint-disable-next-line max-len
                        const declarationListValidationResult = validateDeclarationList(ruleNode.body.declarationList.value);
                        if (!declarationListValidationResult.isValid) {
                            throw new Error(declarationListValidationResult.errorMessage);
                        }
                        // If the selector list is not ExtendedCss, then we should set this flag based on the
                        // declaration list validation result
                        if (!result.isExtendedCss) {
                            result.isExtendedCss = declarationListValidationResult.isExtendedCss;
                        }
                    }
                    break;
                case CosmeticRuleType.ScriptletInjectionRule:
                    // Scriptlet name is the first child of the parameter list
                    // eslint-disable-next-line max-len
                    scriptletName = QuoteUtils.removeQuotes(ruleNode.body.children[0]?.children[0]?.value ?? EMPTY_STRING);
                    // Special case: scriptlet name is empty, e.g. '#%#//scriptlet()'
                    if (scriptletName.length === 0) {
                        break;
                    }
                    // Check if the scriptlet name is valid
                    if (!isValidScriptletName(scriptletName)) {
                        throw new Error(`'${scriptletName}' is not a known scriptlet name`);
                    }
                    break;
                case CosmeticRuleType.HtmlFilteringRule:
                    // TODO: Validate HTML filtering rules
                    break;
                case CosmeticRuleType.JsInjectionRule:
                    // TODO: Validate JS injection rules
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            result.isValid = false;
            result.errorMessage = getErrorMessage(error);
        }
        return result;
    }
    /**
     * Checks if the domain list contains any domains, but returns `false` if only
     * the wildcard domain is specified.
     *
     * @param domainListNode Domain list node to check.
     *
     * @returns `true` if the domain list contains any domains, `false` otherwise.
     */
    static isAnyDomainSpecified(domainListNode) {
        if (domainListNode.children.length > 0) {
            // Skip wildcard domain list (*)
            return !(domainListNode.children.length === 1 && domainListNode.children[0].value === WILDCARD);
        }
        return false;
    }
    /**
     * Creates an instance of the {@link CosmeticRule}.
     * It parses the rule and extracts the permitted/restricted domains,
     * and also the cosmetic rule's content.
     *
     * Depending on the rule type, the content might be transformed in
     * one of the helper classes, or kept as string when it's appropriate.
     *
     * @param node AST node of the cosmetic rule.
     * @param filterListId ID of the filter list this rule belongs to.
     * @param ruleIndex Line start index in the source filter list; it will be used to find the original rule text
     * in the filtering log when a rule is applied. Default value is {@link RULE_INDEX_NONE} which means that
     * the rule does not have source index.
     *
     * @throws Error if it fails to parse the rule.
     */
    constructor(node, filterListId, ruleIndex = RULE_INDEX_NONE) {
        this.ruleIndex = ruleIndex;
        this.filterListId = filterListId;
        this.allowlist = CosmeticRuleSeparatorUtils.isException(node.separator.value);
        this.type = node.type;
        this.isScriptlet = node.type === CosmeticRuleType.ScriptletInjectionRule;
        this.content = CosmeticRuleBodyGenerator.generate(node);
        // Store the scriptlet parameters. They will be used later, when we initialize the scriptlet,
        // but at this point we need to store them in order to avoid double parsing
        if (node.type === CosmeticRuleType.ScriptletInjectionRule) {
            // Transform complex node into a simple array of strings
            const params = node.body.children[0]?.children.map((param) => (param === null ? EMPTY_STRING : QuoteUtils.removeQuotesAndUnescape(param.value))) ?? [];
            this.scriptletParams = new ScriptletParams(params[0] ?? '', params.slice(1));
        }
        else {
            this.scriptletParams = new ScriptletParams();
        }
        const validationResult = CosmeticRule.validate(node);
        // We should throw an error if the validation failed for any reason
        if (!validationResult.isValid) {
            throw new SyntaxError(validationResult.errorMessage);
        }
        // Check if the rule is ExtendedCss
        const isExtendedCssSeparator = CosmeticRuleSeparatorUtils.isExtendedCssMarker(node.separator.value);
        this.extendedCss = isExtendedCssSeparator || validationResult.isExtendedCss;
        // Process cosmetic rule modifiers
        const processedModifiers = CosmeticRule.processModifiers(node);
        if (processedModifiers) {
            if (processedModifiers.domainModifier) {
                this.domainModifier = processedModifiers.domainModifier;
            }
            if (processedModifiers.pathModifier) {
                this.pathModifier = processedModifiers.pathModifier;
            }
            if (processedModifiers.urlModifier) {
                this.urlModifier = processedModifiers.urlModifier;
            }
        }
        // Process domain list, if at least one domain is specified
        const { domains: domainListNode } = node;
        if (CosmeticRule.isAnyDomainSpecified(domainListNode)) {
            this.domainModifier = new DomainModifier(domainListNode, COMMA_DOMAIN_LIST_SEPARATOR);
        }
    }
    /**
     * Match returns true if this rule can be used on the specified request.
     *
     * @param request Request to check.
     *
     * @returns True if the rule matches the request, false otherwise.
     */
    match(request) {
        if (!this.domainModifier
            && !this.pathModifier
            && !this.urlModifier) {
            return true;
        }
        if (this.urlModifier) {
            return this.urlModifier.matchPattern(request, false);
        }
        if (this.domainModifier) {
            if (!this.domainModifier.matchDomain(request.hostname)) {
                return false;
            }
        }
        if (this.pathModifier) {
            const path = getRelativeUrl(request.urlLowercase);
            if (path) {
                return this.pathModifier.matchPathPattern(path);
            }
            return false;
        }
        return true;
    }
    /**
     * Returns the scriptlet's data consisting of the scriptlet function and its arguments.
     * This method is supposed to be used in the manifest V3 extension.
     *
     * @returns The scriptlet data or null if not available.
     */
    getScriptletData() {
        if (this.scriptletData) {
            return this.scriptletData;
        }
        this.initScript();
        return this.scriptletData;
    }
    /**
     * Updates this.scriptData and this.scriptletData when it is necessary in a lazy way.
     *
     * @param options Initialization options for the script.
     */
    initScript(options = {}) {
        const { debug = false, frameUrl } = options;
        const ruleContent = this.getContent();
        if (!this.isScriptlet) {
            this.scriptData = {
                code: ruleContent,
            };
            return;
        }
        // A scriptlet without a name can only be an allowlist scriptlet
        // https://github.com/AdguardTeam/Scriptlets/issues/377
        // or it is considered invalid if the scriptlet was invalid.
        // This does not require finding scriptData and scriptletData.
        if (!this.scriptletParams?.name) {
            return;
        }
        const params = {
            args: this.scriptletParams.args,
            engine: config.engine || EMPTY_STRING,
            name: this.scriptletParams.name,
            verbose: debug,
            domainName: frameUrl,
            version: config.version || EMPTY_STRING,
        };
        this.scriptData = {
            code: scriptlets.invoke(params) ?? null,
            debug,
            frameUrl,
        };
        this.scriptletData = {
            func: scriptlets.getScriptletFunction(params.name),
            params,
        };
    }
}

/**
 * Implements a host rule.
 *
 * HostRule is a structure for simple host-level rules (i.e. /etc/hosts syntax).
 * More details: http://man7.org/linux/man-pages/man5/hosts.5.html.
 * It also supports "just domain" syntax. In this case, the IP will be set to `0.0.0.0`.
 *
 * Rules syntax looks like this.
 * ```
 * IP_address canonical_hostname [aliases...]
 * ```
 *
 * Examples:
 * `192.168.1.13 bar.mydomain.org bar` -- ipv4
 * `ff02::1 ip6-allnodes` -- ipv6
 * `::1 localhost ip6-localhost ip6-loopback` -- ipv6 aliases
 * `example.org` -- "just domain" syntax.
 *
 * @returns True if this rule can be used on the specified hostname.
 */
class HostRule {
    ruleIndex;
    filterListId;
    hostnames = [];
    ip = '';
    invalid = false;
    /**
     * Constructor.
     *
     * Parses the rule and creates a new HostRule instance.
     *
     * @param node Original rule text.
     * @param filterListId ID of the filter list this rule belongs to.
     * @param ruleIndex Index of the rule.
     *
     * @throws Error if it fails to parse the rule.
     */
    constructor(node, filterListId, ruleIndex = RULE_INDEX_NONE) {
        this.ruleIndex = ruleIndex;
        this.filterListId = filterListId;
        this.ip = node.ip.value;
        if (node.hostnames.children.length === 0) {
            this.invalid = true;
            return;
        }
        this.hostnames = node.hostnames.children.map((hostname) => hostname.value);
    }
    /**
     * Match returns true if this rule can be used on the specified hostname.
     *
     * @param hostname Hostname to check.
     *
     * @returns True if the hostname matches one of the hostnames in the rule.
     */
    match(hostname) {
        return this.hostnames.includes(hostname);
    }
    /**
     * Returns list id.
     *
     * @returns The filter list ID.
     */
    getFilterListId() {
        return this.filterListId;
    }
    /**
     * Returns rule index.
     *
     * @returns The rule index.
     */
    getIndex() {
        return this.ruleIndex;
    }
    /**
     * Returns ip address.
     *
     * @returns IP address.
     */
    getIp() {
        return this.ip;
    }
    /**
     * Returns hostnames.
     *
     * @returns Array of hostnames.
     */
    getHostnames() {
        return this.hostnames;
    }
    /**
     * Checks if the rule is invalid.
     *
     * @returns True if the rule is invalid.
     */
    isInvalid() {
        return this.invalid;
    }
}

/**
 * Helper function to create an allowlist rule node for a given domain.
 *
 * @param domain Domain to create an allowlist rule for.
 *
 * @returns Allowlist rule node or null.
 */
const createAllowlistRuleNode = (domain) => {
    const domainToUse = domain.startsWith('www.') ? domain.substring(4) : domain;
    if (!domainToUse) {
        return null;
    }
    let pattern;
    // Special case: Wildcard TLD + N domain
    if (domainToUse.startsWith('*.')) {
        pattern = `${SimpleRegex.MASK_START_URL}${domainToUse.slice(2)}`;
    }
    else {
        // In other cases we use regexp to match domain and it`s 'www' subdomain strictly.
        let regexp = '';
        // transform allowlist domain special characters
        for (let i = 0; i < domainToUse.length; i += 1) {
            const char = domainToUse[i];
            // transform wildcard to regexp equivalent
            if (char === '*') {
                regexp += '.*';
                // escape domain separator
            }
            else if (char === '.') {
                regexp += String.raw `\.`;
            }
            else {
                regexp += char;
            }
        }
        pattern = String.raw `///(www\.)?${regexp}/`;
    }
    const node = {
        category: RuleCategory.Network,
        type: NetworkRuleType.NetworkRule,
        syntax: AdblockSyntax.Common,
        exception: true,
        pattern: {
            type: 'Value',
            value: pattern,
        },
        modifiers: {
            type: 'ModifierList',
            children: [
                {
                    type: 'Modifier',
                    name: {
                        type: 'Value',
                        value: 'document',
                    },
                },
                {
                    type: 'Modifier',
                    name: {
                        type: 'Value',
                        value: 'important',
                    },
                },
            ],
        },
    };
    return node;
};

/**
 * Rule builder class.
 */
class RuleFactory {
    /**
     * Creates rule of suitable class from text string
     * It returns null if the line is empty or if it is a comment.
     *
     * TODO: Pack `ignore*` parameters and `silent` into one object with flags.
     *
     * @param node Rule node.
     * @param filterListId List id.
     * @param ruleIndex Line start index in the source filter list; it will be used to find the original rule text
     * in the filtering log when a rule is applied. Default value is {@link RULE_INDEX_NONE} which means that
     * the rule does not have source index.
     * @param ignoreNetwork Do not create network rules.
     * @param ignoreCosmetic Do not create cosmetic rules.
     * @param ignoreHost Do not create host rules.
     * @param silent Log the error for `true`, otherwise throw an exception on
     * a rule creation.
     *
     * @returns IRule object or null.
     *
     * @throws Error when `silent` flag is passed as false on rule creation error.
     */
    static createRule(node, filterListId, ruleIndex = RULE_INDEX_NONE, ignoreNetwork = false, ignoreCosmetic = false, ignoreHost = true, silent = true) {
        try {
            switch (node.category) {
                case RuleCategory.Invalid:
                case RuleCategory.Empty:
                case RuleCategory.Comment:
                    return null;
                case RuleCategory.Cosmetic:
                    if (ignoreCosmetic) {
                        return null;
                    }
                    return new CosmeticRule(node, filterListId, ruleIndex);
                case RuleCategory.Network:
                    if (node.type === NetworkRuleType.HostRule) {
                        if (ignoreHost) {
                            return null;
                        }
                        return new HostRule(node, filterListId, ruleIndex);
                    }
                    if (ignoreNetwork) {
                        return null;
                    }
                    return new NetworkRule(node, filterListId, ruleIndex);
                default:
                    // should not happen in normal operation
                    return null;
            }
        }
        catch (e) {
            let msg = `"${getErrorMessage(e)}" in the rule: `;
            try {
                msg += `"${RuleGenerator.generate(node)}"`;
            }
            catch (generateError) {
                msg += `"${JSON.stringify(node)}" (generate error: ${getErrorMessage(generateError)})`;
            }
            if (silent) {
                logger.debug(`[tsurl.RuleFactory.createRule]: error: ${msg}`);
            }
            else {
                throw new Error(msg);
            }
        }
        return null;
    }
    /**
     * Creates allowlist rule for domain.
     *
     * @param domain Domain name.
     * @param filterListId List id.
     * @param ruleIndex Line start index in the source filter list.
     *
     * @returns Allowlist rule or null.
     */
    static createAllowlistRule(domain, filterListId, ruleIndex = RULE_INDEX_NONE) {
        const node = createAllowlistRuleNode(domain);
        if (!node) {
            return null;
        }
        return new NetworkRule(node, filterListId, ruleIndex);
    }
}

/**
 * Network rule with node.
 */
class NetworkRuleWithNode {
    rule;
    node;
    /**
     * Creates an instance of NetworkRuleWithNode.
     *
     * @param rule Network rule.
     * @param node Network rule node.
     */
    constructor(rule, node) {
        this.rule = rule;
        this.node = node;
    }
    /** @inheritdoc */
    getIndex() {
        return this.rule.getIndex();
    }
    /** @inheritdoc */
    getFilterListId() {
        return this.rule.getFilterListId();
    }
}

/**
 * Network rule with index and hashes for pattern and rule's text.
 *
 * This class is "wrapper" around simple IndexedRule for the needs of DNR converter:
 * pattern hashes are needed to quickly compare two different network rules with the same,
 * while rule's text hash is needed to keep ID of the rule in the filter the same
 * between several runs. Thus is needed to be able to use "skip review" option in CWS.
 */
class IndexedNetworkRuleWithHash extends IndexedRule {
    /**
     * Rule's hash created with {@link fastHash}. Needed to quickly compare
     * two different network rules with the same pattern part for future
     * checking of $badfilter application from one of them to another.
     *
     * Hash is create only from "pattern" part of the rule.
     */
    hash;
    /**
     * Constructor.
     *
     * @param rule Item of {@link NetworkRule}.
     * @param index Rule's index.
     * @param hash Hash of the rule.
     */
    constructor(rule, index, hash) {
        super(rule, index);
        this.hash = hash;
    }
    /**
     * Creates hash for pattern part of the network rule and return it. Needed
     * to quickly compare two different rules with the same pattern part for
     * future checking of $badfilter application from one of them to another.
     *
     * @param networkRule Item of {@link NetworkRule}.
     *
     * @returns Hash for pattern part of the network rule.
     */
    static createRulePatternHash(networkRule) {
        // TODO: Improve this part: maybe use trie-lookup-table and .getShortcut()?
        // or use agtree to collect pattern + all enabled network options without values
        const significantPart = networkRule.getPattern();
        return fastHash(significantPart);
    }
    /**
     * Gets hash for whole text of the network rule and return it. Needed
     * to keep ID of the rule in the filter the same between several runs. Thus
     * is needed to be able to use "skip review" option in CWS.
     *
     * @param salt Salt for hash, needed to make hash unique event if the rule
     * is the same (e.g. for different filters). To keep check simple, we just
     * use numbers.
     *
     * @returns Hash for pattern part of the network rule.
     */
    getRuleTextHash(salt) {
        const textOfNetworkRule = RuleGenerator.generate(this.rule.node);
        // Append a null-char to not collide with legitimate rule text.
        const trialText = salt === undefined ? textOfNetworkRule : `${textOfNetworkRule}\0${salt}`;
        return fastHash31(trialText);
    }
    /**
     * Create {@link IndexedNetworkRuleWithHash} from rule. If an error
     * was detected during the conversion - return it.
     *
     * @param filterId Filter id.
     * @param index Rule's buffer index in that filter.
     * @param ruleConvertedToAGSyntax Rule which was converted to AG syntax.
     *
     * @throws Error when conversion failed.
     *
     * @returns Item of {@link IndexedNetworkRuleWithHash} or Error.
     */
    static createIndexedNetworkRuleWithHash(filterId, index, ruleConvertedToAGSyntax) {
        // Create indexed network rule from AG rule. These rules will be used in
        // declarative rules, that's why we ignore cosmetic and host rules.
        let networkRule;
        try {
            // Note: for correct throwing error it is important to use setConfiguration(),
            // because it will set compatibility type and future parsing options
            // for network rules will take it into account.
            networkRule = RuleFactory.createRule(ruleConvertedToAGSyntax, filterId, index, false, // convert only network rules
            true, // ignore cosmetic rules
            true, // ignore host rules
            false);
        }
        catch (e) {
            // eslint-disable-next-line max-len
            throw new Error(`Cannot create IRule from filter "${filterId}" and byte offset "${index}": ${getErrorMessage(e)}`);
        }
        /**
         * The converted rule will be null when there was a comment or
         * an ignored cosmetic/host rule.
         */
        if (networkRule === null) {
            return null;
        }
        if (!(networkRule instanceof NetworkRule)) {
            // eslint-disable-next-line max-len
            throw new Error(`Rule from filter "${filterId}" and byte offset "${index}" is not network rule: ${networkRule}`);
        }
        const patternHash = IndexedNetworkRuleWithHash.createRulePatternHash(networkRule);
        const networkRuleWithNode = new NetworkRuleWithNode(networkRule, ruleConvertedToAGSyntax);
        // If rule is not empty - pack to IndexedNetworkRuleWithHash and add it
        // to the result array.
        const indexedNetworkRuleWithHash = new IndexedNetworkRuleWithHash(networkRuleWithNode, index, patternHash);
        if (!indexedNetworkRuleWithHash) {
            // eslint-disable-next-line max-len
            throw new Error(`Cannot create indexed network rule with hash from filter "${filterId}" and byte offset "${index}"`);
        }
        return indexedNetworkRuleWithHash;
    }
    /**
     * Creates {@link IndexedNetworkRuleWithHash} from rule node.
     *
     * @param filterId Filter's id from which rule was extracted.
     * @param ruleIndex Buffer index of rule in that filter.
     * @param node Rule node.
     *
     * @throws Error when rule cannot be converted to AG syntax or when indexed
     * rule cannot be created from the rule which is already converted to AG
     * syntax.
     *
     * @returns Item of {@link IndexedNetworkRuleWithHash}.
     */
    static createFromNode(filterId, ruleIndex, node) {
        // Converts a raw string rule to AG syntax (apply aliases, etc.)
        let rulesConvertedToAGSyntax;
        try {
            const conversionResult = RuleConverter.convertToAdg(node);
            if (conversionResult.isConverted) {
                rulesConvertedToAGSyntax = conversionResult.result;
            }
            else {
                rulesConvertedToAGSyntax = [node];
            }
        }
        catch (e) {
            // eslint-disable-next-line max-len
            throw new Error(`Unknown error during conversion rule to AG syntax: ${getErrorMessage(e)}`);
        }
        const rules = [];
        const convertedAGRules = rulesConvertedToAGSyntax;
        // Now convert to IRule and then IndexedRule.
        for (let rulesIndex = 0; rulesIndex < convertedAGRules.length; rulesIndex += 1) {
            const ruleConvertedToAGSyntax = convertedAGRules[rulesIndex];
            try {
                const networkIndexedRuleWithHash = IndexedNetworkRuleWithHash.createIndexedNetworkRuleWithHash(filterId, ruleIndex, ruleConvertedToAGSyntax);
                if (networkIndexedRuleWithHash) {
                    rules.push(networkIndexedRuleWithHash);
                }
            }
            catch (e) {
                // eslint-disable-next-line max-len
                throw new Error(`Error during creating indexed rule with hash: ${getErrorMessage(e)}`);
            }
        }
        return rules;
    }
}

/**
 * Describes an error when rule set source is not available.
 */
class UnavailableRuleSetSourceError extends Error {
    ruleSetId;
    /**
     * Describes an error when rule set source is not available.
     *
     * @param message Message of error.
     * @param ruleSetId Rule set id, the source of which is not available.
     * @param cause Basic error, describes why the source is unavailable.
     */
    constructor(message, ruleSetId, cause) {
        super(message, { cause });
        this.name = this.constructor.name;
        this.ruleSetId = ruleSetId;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, UnavailableRuleSetSourceError.prototype);
    }
}

/**
 * Contains a list of records with source rule ID, converted rule ID
 * and filter ID.
 * Can return the source filter and rule for the provided conversion rule ID.
 */
class SourceMap {
    sources = [];
    /**
     * Needs for fast search for source rule.
     */
    ruleIdMap = new Map();
    /**
     * Needs for fast search for source rule.
     */
    declarativeIdMap = new Map();
    /**
     * Creates new SourceMap from provided list of sources.
     *
     * @param sources List of sources.
     */
    constructor(sources) {
        this.sources = sources;
        // For fast search
        this.sources.forEach((item) => {
            const { sourceRuleIndex, filterId, declarativeRuleId } = item;
            // Fill source rules map.
            const existingSourcePairs = this.ruleIdMap.get(declarativeRuleId);
            const value = {
                sourceRuleIndex,
                filterId,
            };
            const newSourceValue = existingSourcePairs
                ? existingSourcePairs.concat(value)
                : [value];
            this.ruleIdMap.set(declarativeRuleId, newSourceValue);
            // Fill
            const key = SourceMap.getKeyFromSource(value);
            const existingDeclarativeIdsPairs = this.declarativeIdMap.get(key);
            const newDeclarativeIdsValue = existingDeclarativeIdsPairs
                ? existingDeclarativeIdsPairs.concat(declarativeRuleId)
                : [declarativeRuleId];
            this.declarativeIdMap.set(key, newDeclarativeIdsValue);
        });
    }
    /**
     * Creates unique key for provided pair of source rule and filter id.
     *
     * @param source Pair of source rule and filter id.
     *
     * @returns Unique key for dictionary.
     */
    static getKeyFromSource(source) {
        return `${source.filterId}_${source.sourceRuleIndex}`;
    }
    /**
     * Returns source filter id and source text rule id
     * for provided declarative rule id.
     *
     * @param ruleId Converted rule id.
     *
     * @returns List of pairs: source filter id and source rule id.
     */
    getByDeclarativeRuleId(ruleId) {
        return this.ruleIdMap.get(ruleId) || [];
    }
    /**
     * Returns ids of converted declarative rules for provided pairs of source
     * filter id and source text rule.
     *
     * @param source Pair of source rule and filter id.
     *
     * @returns List of ids of converted declarative rules.
     */
    getBySourceRuleIndex(source) {
        const key = SourceMap.getKeyFromSource(source);
        return this.declarativeIdMap.get(key) || [];
    }
    /**
     * Deserializes array of sources from string.
     *
     * @param sourceString The original map that was serialized into a string.
     *
     * @returns List of sources.
     */
    static deserializeSources(sourceString) {
        // TODO: Add validation
        const arr = JSON.parse(sourceString);
        return arr.map((item) => ({
            declarativeRuleId: item[0],
            sourceRuleIndex: item[1],
            filterId: item[2],
        }));
    }
    /**
     * Serializes source map to JSON string.
     *
     * @todo (TODO:) Can use protocol VLQ.
     *
     * @returns JSON string.
     */
    serialize() {
        // Remove fields names to reduce size of serialized string
        const plainArray = this.sources.map(({ declarativeRuleId, sourceRuleIndex, filterId, }) => ([declarativeRuleId, sourceRuleIndex, filterId]));
        return JSON.stringify(plainArray);
    }
}

/**
 * @file Utility functions for working with metadata rules.
 *
 * Metadata rules are declarative rules that do not block anything themselves,
 * but contain additional information. This information is used by the extension to process other rules,
 * conversion maps, and source maps.
 */
/**
 * Metadata rule ID. Always the first rule in the rule set.
 */
const METADATA_RULE_ID = 1;
/**
 * Metadata key in the rule object.
 */
const METADATA_KEY = 'metadata';
/**
 * Dummy rule URL that should not match any request.
 */
const DUMMY_RULE_URL = 'dummy.rule.adguard.com';
/**
 * Creates a declarative rule with metadata.
 *
 * @param content - Metadata rule configuration.
 *
 * @returns Declarative rule object with metadata.
 */
const createMetadataRule = (content) => {
    return {
        id: METADATA_RULE_ID,
        action: {
            type: RuleActionType.BLOCK,
        },
        condition: {
            urlFilter: DUMMY_RULE_URL,
            resourceTypes: [ResourceType.XmlHttpRequest],
        },
        [METADATA_KEY]: content,
    };
};

const serializedRuleSetLazyDataValidator = z.strictObject({
    sourceMapRaw: z.string(),
    filterIds: z.number().array(),
});
const serializedRuleSetDataValidator = z.strictObject({
    regexpRulesCount: z.number(),
    unsafeRulesCount: z.number(),
    rulesCount: z.number(),
    ruleSetHashMapRaw: z.string(),
    badFilterRulesRaw: z.string().array(),
    unsafeRules: DeclarativeRuleValidator.array().optional(),
});
/**
 * Keeps converted declarative rules, counters of rules and source map for them.
 */
class RuleSet {
    /**
     * Id of rule set.
     */
    id;
    /**
     * Array of converted declarative rules.
     */
    declarativeRules = [];
    /**
     * Number of converted declarative rules.
     *
     * This is needed for the lazy version of the rule set,
     * when content not loaded.
     */
    rulesCount = 0;
    /**
     * Converted declarative unsafe rules.
     */
    unsafeRulesCount = 0;
    /**
     * Array with unsafe declarative rules, which can be optionally provided
     * when creating a ruleset.
     *
     * This can be used to store unsafe rules inside metadata rule to use
     * "skip review" feature in CWS.
     *
     * It's marked as optional to keep backward compatibility with old rulesets.
     *
     * {@link https://developer.chrome.com/docs/webstore/skip-review/}.
     *
     * @todo TODO: Mark this field as required in the next major version.
     */
    unsafeRules;
    /**
     * Converted declarative regexp rules.
     */
    regexpRulesCount = 0;
    /**
     * Source map for declarative rules.
     */
    sourceMap;
    /**
     * Dictionary which helps to fast find rule by its hash.
     */
    rulesHashMap;
    /**
     * List of network rules with $badfilter option.
     */
    badFilterRules;
    /**
     * Keeps array of source filter lists
     * TODO: ? May it leads to memory leaks,
     * because one FilterList with its content
     * can be in the several RuleSet's at the same time ?
     */
    filterList = new Map();
    /**
     * The content provider of a rule set, is needed for lazy initialization.
     * If request the source rules from rule set, the content provider will be
     * called to load the source map, filter list and declarative rules list.
     */
    ruleSetContentProvider;
    /**
     * Whether the content is loaded or not.
     */
    initialized = false;
    /**
     * Waiter for initialization, will be resolved when the content is loaded.
     */
    initializerPromise;
    /**
     * Constructor of RuleSet.
     *
     * @param id Id of rule set.
     * @param rulesCount Number of rules.
     * @param unsafeRulesCount Number of unsafe rules.
     * @param regexpRulesCount Number of regexp rules.
     * @param ruleSetContentProvider Rule set content provider.
     * @param badFilterRules List of rules with $badfilter modifier.
     * @param rulesHashMap Dictionary with hashes for all source rules.
     * @param unsafeRules List of unsafe DNR rules.
     */
    constructor(id, rulesCount, unsafeRulesCount, regexpRulesCount, ruleSetContentProvider, badFilterRules, rulesHashMap, unsafeRules) {
        this.id = id;
        this.rulesCount = rulesCount;
        this.unsafeRulesCount = unsafeRulesCount;
        this.regexpRulesCount = regexpRulesCount;
        this.ruleSetContentProvider = ruleSetContentProvider;
        this.badFilterRules = badFilterRules;
        this.rulesHashMap = rulesHashMap;
        this.unsafeRules = unsafeRules;
    }
    /** @inheritdoc */
    getUnsafeRules() {
        return Promise.resolve(this.unsafeRules || []);
    }
    /** @inheritdoc */
    getRulesCount() {
        return this.rulesCount || this.declarativeRules.length;
    }
    /** @inheritdoc */
    getUnsafeRulesCount() {
        return this.unsafeRulesCount;
    }
    /** @inheritdoc */
    getRegexpRulesCount() {
        return this.regexpRulesCount;
    }
    /** @inheritdoc */
    getId() {
        return this.id;
    }
    /**
     * Returns a list of pairs of source text rules and their filter identifiers
     * for a given declarative rule identifier.
     *
     * @param declarativeRuleId {@link DeclarativeRule|declarative rule} Id.
     *
     * @throws An error when filter is not found or filter content is unavailable.
     *
     * @returns Promise with list of source rules.
     */
    async findSourceRules(declarativeRuleId) {
        if (!this.sourceMap) {
            return [];
        }
        const sourcePairs = this.sourceMap.getByDeclarativeRuleId(declarativeRuleId);
        const sourceRules = sourcePairs.map(async ({ filterId, sourceRuleIndex, }) => {
            const filter = this.filterList.get(filterId);
            if (!filter) {
                throw new Error(`Not found filter list with id: ${filterId}`);
            }
            const sourceRule = await filter.getRuleByIndex(sourceRuleIndex);
            return {
                sourceRule,
                filterId,
            };
        });
        return Promise.all(sourceRules);
    }
    /**
     * Run inner lazy deserialization from rule set content provider to load
     * data which is not needed on the creation of rule set:
     * the source map, filter list and declarative rules list.
     */
    async loadContent() {
        if (this.initialized) {
            return;
        }
        if (this.initializerPromise) {
            await this.initializerPromise;
            return;
        }
        const initialize = async () => {
            const { loadSourceMap, loadFilterList, loadDeclarativeRules, } = this.ruleSetContentProvider;
            this.sourceMap = await loadSourceMap();
            this.declarativeRules = await loadDeclarativeRules();
            // TODO: Find a better method to load filters (AG-42364)
            const filtersList = await loadFilterList();
            filtersList.forEach((filter) => {
                this.filterList.set(filter.getId(), filter);
            });
            this.initialized = true;
        };
        this.initializerPromise = initialize().then(() => {
            this.initializerPromise = undefined;
        });
        await this.initializerPromise;
    }
    /** @inheritdoc */
    unloadContent() {
        // If content is not initialized, there is nothing to unload
        if (!this.initialized && !this.initializerPromise) {
            return;
        }
        // If initialization is in progress
        if (this.initializerPromise) {
            this.initializerPromise.finally(() => {
                this.unloadContent();
            });
            return;
        }
        // Safely unload all filters in the filter list
        this.filterList.forEach((filter) => filter.unloadContent());
        // Clear loaded resources
        this.sourceMap = undefined;
        this.declarativeRules = [];
        this.filterList.clear();
        // Mark the content as unloaded
        this.initialized = false;
        this.initializerPromise = undefined;
    }
    /** @inheritdoc */
    async getRulesById(declarativeRuleId) {
        try {
            await this.loadContent();
            const originalRules = await this.findSourceRules(declarativeRuleId);
            return originalRules;
        }
        catch (e) {
            const id = this.getId();
            // eslint-disable-next-line max-len
            const msg = `Cannot extract source rule for given declarativeRuleId ${declarativeRuleId} in rule set '${id}', got error: ${getErrorMessage(e)}`;
            throw new UnavailableRuleSetSourceError(msg, id, e);
        }
    }
    /** @inheritdoc */
    getBadFilterRules() {
        return this.badFilterRules;
    }
    /** @inheritdoc */
    getRulesHashMap() {
        return this.rulesHashMap;
    }
    /** @inheritdoc */
    async getDeclarativeRulesIdsBySourceRuleIndex(source) {
        await this.loadContent();
        if (!this.sourceMap) {
            const { filterId, sourceRuleIndex } = source;
            // eslint-disable-next-line max-len
            throw new Error(`Cannot find declarative rules for filter id - ${filterId}, rule index - ${sourceRuleIndex} because source map is undefined in ruleset: ${this.getId()}`);
        }
        return this.sourceMap.getBySourceRuleIndex(source);
    }
    /** @inheritdoc */
    async getDeclarativeRules() {
        await this.loadContent();
        return this.declarativeRules;
    }
    /**
     * For provided source rule and filter id return network rule.
     * This method is needed for checking the applicability of $badfilter after
     * a fast-check of rules by comparing only hashes. Afterward, we should
     * build the 'full' Network rule from provided source, not just the hash,
     * to determine the applicability of $badfilter.
     *
     * @param source Source rule and filter id.
     *
     * @returns List of {@link NetworkRule | network rules}.
     */
    static getNetworkRuleBySourceRule(source) {
        const { sourceRule, filterId } = source;
        let networkIndexedRulesWithHash = [];
        try {
            networkIndexedRulesWithHash = IndexedNetworkRuleWithHash.createFromNode(filterId, 
            // We don't need line index because this indexedNetworkRulesWithHash
            // will be used only for matching $badfilter rules.
            0, RuleParser.parse(sourceRule));
        }
        catch (e) {
            return [];
        }
        const networkRules = networkIndexedRulesWithHash.map(({ rule }) => rule.rule);
        return networkRules;
    }
    /**
     * Deserializes rule set to primitives values with lazy load.
     *
     * @param id Id of rule set.
     * @param rawData An item of {@link SerializedRuleSetData} for instant
     * creating ruleset. It contains counters for regular declarative and regexp
     * declarative rules, a map of hashes for all rules, and a list of rules
     * with the `$badfilter` modifier.
     * @param loadLazyData An item of {@link SerializedRuleSetLazyData} for lazy
     * loading ruleset data to find and display source rules when declarative
     * filtering log is enabled. It includes a map of sources for all rules,
     * a list of declarative rules, and a list of source filter IDs.
     * @param loadDeclarativeRules Loader for ruleset's declarative rules from
     * raw file as a string.
     * @param filterList List of {@link IFilter}.
     *
     * @returns Deserialized rule set.
     *
     * @throws Error {@link UnavailableRuleSetSourceError} if rule set source
     * is not available.
     */
    static async deserialize(id, rawData, loadLazyData, loadDeclarativeRules, filterList) {
        let data;
        try {
            const objectFromString = JSON.parse(rawData);
            data = serializedRuleSetDataValidator.parse(objectFromString);
        }
        catch (e) {
            // eslint-disable-next-line max-len
            const msg = `Cannot parse serialized ruleset's data with id "${id}", got error: ${getErrorMessage(e)}`;
            throw new UnavailableRuleSetSourceError(msg, id, e);
        }
        /**
         * This variable is used as a singleton for all three functions
         * (`loadSourceMap`, `loadFilterList`, `loadDeclarativeRules`) to load
         * data only once.
         */
        let deserializedLazyData;
        const getLazyData = async () => {
            if (deserializedLazyData !== undefined) {
                return deserializedLazyData;
            }
            try {
                const lazyData = await loadLazyData();
                const objectFromString = JSON.parse(lazyData);
                deserializedLazyData = serializedRuleSetLazyDataValidator.parse(objectFromString);
                return deserializedLazyData;
            }
            catch (e) {
                // eslint-disable-next-line max-len
                const msg = `Cannot parse or load data for lazy metadata for rule set with id "${id}": ${getErrorMessage(e)}`;
                throw new UnavailableRuleSetSourceError(msg, id, e);
            }
        };
        const deserialized = {
            id,
            data,
            ruleSetContentProvider: {
                loadSourceMap: async () => {
                    const { sourceMapRaw } = await getLazyData();
                    const sources = SourceMap.deserializeSources(sourceMapRaw);
                    return new SourceMap(sources);
                },
                loadFilterList: async () => {
                    const { filterIds } = await getLazyData();
                    return filterList.filter((filter) => filterIds.includes(filter.getId()));
                },
                loadDeclarativeRules: async () => {
                    const rawFileContent = await loadDeclarativeRules();
                    const objectFromString = JSON.parse(rawFileContent);
                    const declarativeRules = DeclarativeRuleValidator
                        .array()
                        .parse(objectFromString);
                    return declarativeRules;
                },
            },
        };
        return deserialized;
    }
    /**
     * Helper method to get serialized rule set data.
     *
     * @param unsafeRules Optional list of unsafe rules to add to the serialized
     * output.
     *
     * @returns Serialized rule set data.
     */
    getSerializedRuleSetData(unsafeRules) {
        let { rulesCount } = this;
        // If unsaferRules is provided, we should not count them in
        // the rules count, since they are moved to the metadata rule.
        if (unsafeRules) {
            rulesCount -= unsafeRules.length;
        }
        return {
            regexpRulesCount: this.regexpRulesCount,
            unsafeRulesCount: this.unsafeRulesCount,
            rulesCount,
            ruleSetHashMapRaw: this.rulesHashMap.serialize(),
            badFilterRulesRaw: this.badFilterRules.map((r) => RuleGenerator.generate(r.rule.node)),
            unsafeRules,
        };
    }
    /**
     * Helper method to get serialized rule set lazy data.
     *
     * @returns Serialized rule set lazy data.
     */
    getSerializedRuleSetLazyData() {
        return {
            sourceMapRaw: this.sourceMap?.serialize() || EMPTY_STRING,
            filterIds: Array.from(this.filterList.keys()),
        };
    }
    /** @inheritdoc */
    async serialize() {
        try {
            await this.loadContent();
        }
        catch (e) {
            const id = this.getId();
            // eslint-disable-next-line max-len
            const msg = `Cannot serialize rule set '${id}' because of not available source, got error: ${getErrorMessage(e)}`;
            throw new UnavailableRuleSetSourceError(msg, id, e);
        }
        const serialized = {
            id: this.id,
            data: JSON.stringify(this.getSerializedRuleSetData()),
            lazyData: JSON.stringify(this.getSerializedRuleSetLazyData()),
        };
        return serialized;
    }
    /** @inheritdoc */
    async serializeCompact(prettyPrint = true, unsafeRules) {
        try {
            await this.loadContent();
        }
        catch (e) {
            const id = this.getId();
            // eslint-disable-next-line max-len
            const msg = `Cannot serialize ruleset '${id}' because of not available source, got error: ${getErrorMessage(e)}`;
            throw new UnavailableRuleSetSourceError(msg, id, e);
        }
        // TODO: Improve this code once we introduce multiple filters within a single rule set
        // Also, do not forget to change metadata rule's structure to store preprocessed filter lists in an array
        const filter = this.filterList.values().next().value;
        const content = await filter.getContent();
        // To ensure that unsafe rules are provided and their count is correct,
        // we check if the length of the provided unsafe rules array is equal to
        // the `unsafeRulesCount` property of the rule set.
        if (unsafeRules && unsafeRules.length > 0 && unsafeRules.length !== this.unsafeRulesCount) {
            const id = this.getId();
            // eslint-disable-next-line max-len
            const msg = `Unsafe rules count is not equal to the length of provided unsafe rules array in rule set '${id}'`;
            throw new Error(msg);
        }
        const metadataRule = createMetadataRule({
            metadata: this.getSerializedRuleSetData(unsafeRules),
            lazyMetadata: this.getSerializedRuleSetLazyData(),
            conversionMap: content.conversionMap,
            rawFilterList: content.rawFilterList,
        });
        let declarativeRules = await this.getDeclarativeRules();
        declarativeRules.unshift(metadataRule);
        // Exclude unsafe rules from declarative rules if they are provided.
        if (unsafeRules) {
            const unsafeRulesIds = new Set(unsafeRules.map((rule) => rule.id));
            declarativeRules = declarativeRules.filter((rule) => {
                return !unsafeRulesIds.has(rule.id);
            });
        }
        const result = serializeJson(declarativeRules, prettyPrint);
        return result;
    }
}

/**
 * Describes abstract error when declarative rule is invalid.
 */
class InvalidDeclarativeRuleError extends Error {
    networkRule;
    declarativeRule;
    /**
     * Describes a reason of the error.
     */
    reason;
    /**
     * Describes abstract error when declarative rule is invalid.
     *
     * @param message Message of error.
     * @param networkRule {@link NetworkRuleWithNode}.
     * @param declarativeRule {@link DeclarativeRule}.
     */
    constructor(message, networkRule, declarativeRule) {
        super(message);
        this.name = this.constructor.name;
        this.declarativeRule = declarativeRule;
        this.networkRule = networkRule;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, InvalidDeclarativeRuleError.prototype);
    }
}

/**
 * Describes error when converted rule contains empty list of resources types.
 */
class EmptyResourcesError extends InvalidDeclarativeRuleError {
    /**
     * Describes error when converted rule contains empty list of resources types.
     *
     * @param message Message of error.
     * @param networkRule {@link NetworkRuleWithNode}.
     * @param declarativeRule {@link DeclarativeRule}.
     */
    constructor(message, networkRule, declarativeRule) {
        super(message, networkRule, declarativeRule);
        this.name = this.constructor.name;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, EmptyResourcesError.prototype);
    }
}

/**
 * @typedef {import(
 *   '../../grouped-rules-converters/abstract-rule-converter'
 * ).DeclarativeRuleConverter} DeclarativeRuleConverter
 */
/**
 * Describes an error when a source network rule contains some of
 * the unsupported modifiers.
 *
 * @see {@link DeclarativeRuleConverter.checkNetworkRuleConvertible} for more details.
 */
class UnsupportedModifierError extends Error {
    networkRule;
    /**
     * Describes an error when a source network rule contains some of
     * the unsupported modifiers.
     *
     * @param message Message of error.
     * @param networkRule {@link NetworkRule}.
     */
    constructor(message, networkRule) {
        super(message);
        this.name = this.constructor.name;
        this.networkRule = networkRule;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, UnsupportedModifierError.prototype);
    }
}

/**
 * Describes an error when the converted rule contains an unsupported RE2
 * regexp syntax error.
 *
 * @see https://github.com/google/re2/wiki/Syntax
 */
class UnsupportedRegexpError extends InvalidDeclarativeRuleError {
    /**
     * Describes an error when the converted rule contains an unsupported RE2
     * regexp syntax error.
     *
     * @param message Message of error.
     * @param networkRule {@link NetworkRuleWithNode}.
     * @param declarativeRule {@link DeclarativeRule}.
     * @param reason Describes a reason of the error.
     */
    constructor(message, networkRule, declarativeRule, reason) {
        super(message, networkRule, declarativeRule);
        this.name = this.constructor.name;
        this.reason = reason;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, UnsupportedRegexpError.prototype);
    }
}

/**
 * Describes error when maximum number of rules is equal or less than 0.
 */
class EmptyOrNegativeNumberOfRulesError extends Error {
    /**
     * Describes error when maximum number of rules is equal or less than 0.
     *
     * @param message Message of error.
     */
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, EmptyOrNegativeNumberOfRulesError.prototype);
    }
}

/**
 * Describes error when maximum number of rules is less than 0.
 */
class NegativeNumberOfRulesError extends Error {
    /**
     * Describes error when maximum number of rules is less than 0.
     *
     * @param message Message of error.
     */
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, NegativeNumberOfRulesError.prototype);
    }
}

/**
 * Describes error when the resources path does not start with a slash
 * or it ends with a slash.
 */
class ResourcesPathError extends Error {
    /**
     * Describes error when the resources path does not start with a slash
     * or it ends with a slash.
     *
     * @param message Message of error.
     */
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, ResourcesPathError.prototype);
    }
}

/**
 * Class for validating network rules.
 */
class NetworkRuleDeclarativeValidator {
    /**
     * Checks if the $redirect values in the provided network rule
     * are supported for conversion to MV3.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static checkRemoveParamModifierFn(r, name) {
        const removeParam = r.rule.getAdvancedModifier();
        if (!removeParam) {
            return null;
        }
        if (!RemoveParamModifier.isRemoveParamModifier(removeParam)) {
            return null;
        }
        if (!removeParam.getMV3Validity()) {
            return new UnsupportedModifierError('Network rule with $removeparam modifier with negation or regexp is not supported', r.rule);
        }
        return null;
    }
    /**
     * Checks if the provided rule is an allowlist rule.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    static checkAllowRulesFn(r, name) {
        if (r.rule.isAllowlist()) {
            return new UnsupportedModifierError(`Network allowlist rule with ${name} modifier is not supported`, r.rule);
        }
        return null;
    }
    /**
     * Checks if the specified modifier is included in rule explicitly.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    static checkHasModifierExplicitlyFn(r, name) {
        let nameToCheck = name;
        // Remove leading dollar sign, if any
        if (nameToCheck.startsWith(OPTIONS_DELIMITER)) {
            nameToCheck = nameToCheck.slice(OPTIONS_DELIMITER.length);
        }
        if (r.node.modifiers?.children.some((m) => m.name.value === nameToCheck)) {
            return new UnsupportedModifierError(`Network rule with explicitly enabled ${name} modifier is not supported`, r.rule);
        }
        return null;
    }
    /**
     * Checks if the $removeparam values in the provided network rule
     * are supported for conversion to MV3.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static checkRemoveHeaderModifierFn(r, name) {
        const removeHeader = r.rule.getAdvancedModifier();
        if (!removeHeader) {
            return null;
        }
        if (!RemoveHeaderModifier.isRemoveHeaderModifier(removeHeader)) {
            return null;
        }
        if (!removeHeader.isValid) {
            return new UnsupportedModifierError(
            // eslint-disable-next-line max-len
            'Network rule with $removeheader modifier contains some of the unsupported headers', r.rule);
        }
        return null;
    }
    /**
     * Checks if the $method values in the provided network rule
     * are supported for conversion to MV3.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static checkMethodModifierFn(r, name) {
        const permittedMethods = r.rule.getPermittedMethods();
        const restrictedMethods = r.rule.getRestrictedMethods();
        if (permittedMethods?.some((method) => method === HTTPMethod.TRACE)
            || restrictedMethods?.some((method) => method === HTTPMethod.TRACE)) {
            return new UnsupportedModifierError('Network rule with $method modifier containing \'trace\' method is not supported', r.rule);
        }
        return null;
    }
    /**
     * Checks if the $cookie values in the provided network rule
     * are supported for conversion to MV3.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static checkCookieModifierFn = (r, name) => {
        const cookieModifier = r.rule.getAdvancedModifier();
        if (!cookieModifier) {
            return null;
        }
        if (!CookieModifier.isCookieModifier(cookieModifier)) {
            return null;
        }
        if (!cookieModifier.isEmpty()) {
            // eslint-disable-next-line max-len
            const msg = 'The use of additional parameters in $cookie (apart from $cookie itself) is not supported';
            return new UnsupportedModifierError(msg, r.rule);
        }
        return null;
    };
    /**
     * Checks if rule is a "document"-allowlist and contains all these
     * `$elemhide,content,urlblock,jsinject` modifiers at the same time.
     * If it is - we allow partially convert this rule, because `$content`
     * is not supported in the MV3 at all and `$jsinject` and `$urlblock`
     * are not implemented yet, but we can support at least allowlist-rule
     * with `$elemhide` modifier (not in the DNR, but with tsurlfilter engine).
     *
     * TODO: Change the description when `$jsinject` and `$urlblock`
     * are implemented.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static checkDocumentAllowlistFn = (r, name) => {
        if (r.rule.isFilteringDisabled()) {
            return null;
        }
        return new UnsupportedModifierError(`Network rule with "${name}" modifier is not supported`, r.rule);
    };
    /**
     * The $redirect-rule support will be possible to implement after browsers add this feature:
     * https://github.com/w3c/webextensions/issues/493.
     *
     * @param r Network rule.
     * @param name Modifier's name.
     *
     * @returns Error {@link UnsupportedModifierError} or null if rule is supported.
     */
    static checkRedirectModifierFn = (r, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    name) => {
        const isRedirectRule = r.rule.isOptionEnabled(NetworkRuleOption.Redirect)
            && r.rule.getAdvancedModifier().isRedirectingOnlyBlocked;
        if (!isRedirectRule) {
            return null;
        }
        return new UnsupportedModifierError('Network rule with $redirect-rule modifier is not supported', r.rule);
    };
    static optionsValidators = {
        // Supported
        ThirdParty: { name: '$third-party' },
        MatchCase: { name: '$match-case' },
        Important: { name: '$important' },
        To: { name: '$to' },
        Badfilter: { name: '$badfilter' },
        Permissions: { name: '$permissions' },
        // Supported without conversion.
        Elemhide: { name: '$elemhide', skipConversion: true },
        Generichide: { name: '$generichide', skipConversion: true },
        Specifichide: { name: '$specifichide', skipConversion: true },
        // Partially supported.
        Jsinject: { name: '$jsinject', customChecks: [NetworkRuleDeclarativeValidator.checkDocumentAllowlistFn] },
        Urlblock: { name: '$urlblock', customChecks: [NetworkRuleDeclarativeValidator.checkDocumentAllowlistFn] },
        Content: { name: '$content', customChecks: [NetworkRuleDeclarativeValidator.checkDocumentAllowlistFn] },
        // $popup is not supported in MV3, but rule with $all modifier includes $popup, so we should skip it.
        Popup: { name: '$popup', customChecks: [NetworkRuleDeclarativeValidator.checkHasModifierExplicitlyFn] },
        Csp: { name: '$csp', customChecks: [NetworkRuleDeclarativeValidator.checkAllowRulesFn] },
        Redirect: {
            // $redirect and $redirect-rule modifiers are falling under this option
            name: '$redirect',
            customChecks: [
                NetworkRuleDeclarativeValidator.checkAllowRulesFn,
                NetworkRuleDeclarativeValidator.checkRedirectModifierFn,
            ],
        },
        RemoveParam: {
            name: '$removeparam',
            customChecks: [
                NetworkRuleDeclarativeValidator.checkAllowRulesFn,
                NetworkRuleDeclarativeValidator.checkRemoveParamModifierFn,
            ],
        },
        RemoveHeader: {
            name: '$removeheader',
            customChecks: [
                NetworkRuleDeclarativeValidator.checkAllowRulesFn,
                NetworkRuleDeclarativeValidator.checkRemoveHeaderModifierFn,
            ],
        },
        Cookie: {
            name: '$cookie',
            customChecks: [
                NetworkRuleDeclarativeValidator.checkAllowRulesFn,
                NetworkRuleDeclarativeValidator.checkCookieModifierFn,
            ],
        },
        Method: { name: '$method', customChecks: [NetworkRuleDeclarativeValidator.checkMethodModifierFn] },
        // Not supported.
        Header: { name: '$header', notSupported: true },
        // Not supported yet.
        Genericblock: { name: '$genericblock', notSupported: true },
        Stealth: { name: '$stealth', notSupported: true },
        // Will not be supported.
        Replace: { name: '$replace', notSupported: true },
        JsonPrune: { name: '$jsonprune', notSupported: true },
        Hls: { name: '$hls', notSupported: true },
        // DNS modifiers.
        Client: { name: '$client', notSupported: true },
        DnsRewrite: { name: '$dnsrewrite', notSupported: true },
        DnsType: { name: '$dnstype', notSupported: true },
        Ctag: { name: '$ctag', notSupported: true },
        // Desktop modifiers only.
        Network: { name: '$network', notSupported: true },
        Extension: { name: '$extension', notSupported: true },
    };
    /**
     * Checks if a network rule can be converted to a declarative format or not.
     * We skip the following modifiers:
     *
     * All specific exceptions:
     * $genericblock;
     * $jsinject;
     * $urlblock;
     * $content;
     * $extension;
     * $stealth;
     *
     * Following specific exceptions are not require conversion, but they
     * are used in the {@link MatchingResult.getCosmeticOption}:
     * $elemhide
     * $generichide;
     * $specifichide;
     *
     * Other:
     * $header;
     * $popup;
     * $csp;
     * $replace;
     * $cookie - if modifier is not empty and contains any parameters;
     * $redirect - if the rule is a allowlist;
     * $removeparam - if it contains a negation, or regexp,
     * or the rule is a allowlist;
     * $removeheader - if it contains a title from a prohibited list
     * (see {@link RemoveHeaderModifier.FORBIDDEN_HEADERS});
     * $jsonprune;
     * $method - if the modifier contains 'trace' method,
     * $hls;
     * $permissions.
     *
     * @param rule Network rule.
     *
     * @throws Error with type {@link UnsupportedModifierError} if the rule is not
     * convertible.
     *
     * @returns Boolean flag - `false` if the rule does not require conversion
     * and `true` if the rule is convertible.
     */
    static shouldConvertNetworkRule(rule) {
        // Filter NetworkRuleOption.NotSet because this is syntax sugar and
        // not a real valuable option.
        const options = Object.keys(NetworkRuleOption).filter((key) => key !== 'NotSet');
        // Because we don't have public getter of rule's options, we need
        // to iterate over all existing network options and check each of them.
        for (const option of options) {
            const networkOption = NetworkRuleOption[option];
            if (!rule.rule.isOptionEnabled(networkOption)) {
                continue;
            }
            const validator = this.optionsValidators[option];
            if (!validator) {
                throw new Error(`Validator for option "${option}" is not found`);
            }
            const { name, customChecks, skipConversion, notSupported, } = validator;
            if (notSupported) {
                throw new UnsupportedModifierError(`Unsupported option "${name}"`, rule.rule);
            }
            if (skipConversion) {
                if (rule.rule.isSingleOptionEnabled(networkOption)) {
                    return false;
                }
                continue;
            }
            if (customChecks) {
                for (let j = 0; j < customChecks.length; j += 1) {
                    const err = customChecks[j](rule, name);
                    if (err !== null) {
                        throw err;
                    }
                }
            }
        }
        return true;
    }
}

/**
 * Describes error when converted rule contains an empty list of domains, but original contains.
 */
class EmptyDomainsError extends InvalidDeclarativeRuleError {
    /**
     * Describes error when converted rule contains an empty list of domains, but original contains.
     *
     * @param message Message of error.
     * @param networkRule {@link NetworkRuleWithNode}.
     * @param declarativeRule {@link DeclarativeRule}.
     */
    constructor(message, networkRule, declarativeRule) {
        super(message, networkRule, declarativeRule);
        this.name = this.constructor.name;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, EmptyDomainsError.prototype);
    }
}

/**
 * Check if the regex is supported in a browser extension using the built-in chrome.declarativeNetRequest API.
 *
 * @param regexFilter Regex to check.
 * @returns Promise that resolves to true if the regex is supported, and rejects with an error otherwise.
 */
const regexValidatorExtension = async (regexFilter) => {
    return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest) {
            const regexOptions = { regex: regexFilter };
            chrome.declarativeNetRequest.isRegexSupported(regexOptions, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else if (result.isSupported) {
                    resolve(true);
                }
                else {
                    reject(new Error(result.reason));
                }
            });
        }
        else {
            reject(new Error('chrome.declarativeNetRequest is not available'));
        }
    });
};

/**
 * Class to manage regex validation using a customizable validator function.
 * By default, it uses the Chrome validator, but a custom validator can be set.
 */
class Re2Validator {
    /**
     * The default validator function.
     * By default, it uses the builtin browser validator.
     */
    validator = regexValidatorExtension;
    /**
     * Set a custom validator function.
     *
     * @param validator - The custom validator function to use.
     */
    setValidator(validator) {
        this.validator = validator;
    }
    /**
     * Check if the regex is supported using the current validator function.
     *
     * @param regexFilter - The regex pattern to validate.
     * @returns A promise that resolves to true if the regex is supported, false otherwise.
     */
    async isRegexSupported(regexFilter) {
        return this.validator(regexFilter);
    }
}
/**
 * Singleton instance of the Re2Validator class.
 * Provides a single point of access to manage regex validation.
 */
const re2Validator = new Re2Validator();

/* eslint-disable jsdoc/require-description-complete-sentence */
/* eslint-disable jsdoc/no-multi-asterisks */
/**
 * @file Describes how to convert one {@link NetworkRule} into one or many
 * {@link DeclarativeRule|declarative rules}.
 *
 *      Heir classes                                        DeclarativeRuleConverter
 *
 *                            │                                         │
 *    *override layer*        │              *protected layer*          │              *private layer*
 *                            │                                         │
 *                            │                                         │
 * Subclasses should define   │    Converts a set of indexed rules      │
 * the logic in this method.  │    into declarative rules while         │
 *                            │    handling errors.                     │
 *  ┌─────────────────────┐   │   ┌───────────────────────────┐         │
 *  │                     │   │   │                           │         │
 *  │  abstract convert() ├───┼──►│  protected convertRules() │         │
 *  │                     │   │   │                           │         │
 *  └─────────────────────┘   │   └─────────────┬─────────────┘         │
 *                            │                 │                       │
 *                            │                 │                       │
 *                            │   ┌─────────────▼─────────────┐         │
 *                            │   │                           │         │
 *                            │   │  protected convertRule()  ├─────────┼───────────────────────┐
 *                            │   │                           │         │                       │
 *                            │   └───────────────────────────┘         │                       │
 *                            │   Transforms a single Network Rule      │     ┌─────────────────▼────────────────────┐
 *                            │   into one or several                   │     │                                      │
 *                            │   declarative rules.                    │  ┌──┤ static shouldConvertNetworkRule()    │
 *                            │                                         │  │  │                                      │
 *                            │                                         │  │  └──────────────────────────────────────┘
 *                            │                                         │  │  Checks if network rule conversion
 *                            │                                         │  │  is supported and if it is needed at all.
 *                            │                                         │  │
 *                            │                                         │  │  ┌──────────────────────────┐
 *                            │                                         │  └──►                          │
 *                            │                                         │     │   private getAction()    │
 *                            │                                         │  ┌──┤                          │
 *                            │                                         │  │  └──────────────────────────┘
 *                            │                                         │  │  Generates the action section
 *                            │                                         │  │  of a declarative rule.
 *                            │                                         │  │
 *                            │                                         │  │  ┌────────────────────────────────────┐
 *                            │                                         │  └──►                                    │
 *                            │                                         │     │     private getRedirectAction()    │
 *                            │                                         │     │  static getModifyHeadersAction()   │
 *                            │                                         │     │ static getAddingCspHeadersAction() │
 *                            │                                         │  ┌──┤                                    │
 *                            │                                         │  │  └────────────────────────────────────┘
 *                            │                                         │  │  Modifier-specific methods. A distinct
 *                            │                                         │  │  section will be created for each modifier.
 *                            │                                         │  │
 *                            │                                         │  │  ┌─────────────────────────┐
 *                            │                                         │  └──►                         │
 *                            │                                         │     │  static getCondition()  │
 *                            │                                         │  ┌──┤                         │
 *                            │                                         │  │  └─────────────────────────┘
 *                            │                                         │  │  Generates the condition section
 *                            │                                         │  │  of a declarative rule.
 *                            │                                         │  │
 *                            │                                         │  │  ┌────────────────────────┐
 *                            │                                         │  └──►                        │
 *                            │                                         │     │  static getPriority()  │
 *                            │                                         │  ┌──┤                        │
 *                            │                                         │  │  └────────────────────────┘
 *                            │                                         │  │  Generates the priority of
 *                            │                                         │  │  a declarative rule.
 *                            │                                         │  │
 *                            │                                         │  │  ┌───────────────────────────────────────┐
 *                            │                                         │  └──►                                       │
 *                            │                                         │     │static checkDeclarativeRuleApplicable()│
 *                            │                                         │  ┌──┤                                       │
 *                            │                                         │  │  └───────────────────────────────────────┘
 *                            │                                         │  │  After conversion, checks if the generated
 *                            │                                         │  │  declarative rule contains any unsupported
 *                            │                                         │  │  values.
 *                            │                                         │  │
 *                            │                                         │  │  ┌─────────────────────────────────────┐
 *                            │                                         │  └──►                                     │
 *                            │                                         │     │ static catchErrorDuringConversion() │
 *                            │               ┌─────────────────────────┼─────┤                                     │
 *                            │               │                         │     └─────────────────────────────────────┘
 *                            │   ┌───────────▼────────────────────┐    │     Handles errors during conversion.
 *                            │   │                                │    │
 *                            │   │ protected groupConvertedRules()│    │
 *                            │   │                                │    │
 *                            │   └────────────────────────────────┘    │
 *                            │                                         │
 *                            │   Groups converted declarative rules    │
 *                            │   using the provided grouper-functions. │
 *                            │                                         │
 *                            │   This method is optional and is not    │
 *                            │   used by all derived classes.          │
 *                            │                                         │
 */
/* eslint-enable jsdoc/require-description-complete-sentence */
/* eslint-enable jsdoc/no-multi-asterisks */
/**
 * Contains the generic logic for converting a {@link NetworkRule}
 * into a {@link DeclarativeRule}.
 *
 * Descendant classes must override the {@link DeclarativeRuleConverter.convert} method,
 * where some logic must be defined for each rule type.
 *
 * Also descendant classes can use {@link DeclarativeRuleConverter.convertRules},
 * {@link DeclarativeRuleConverter.convertRule}
 * and {@link DeclarativeRuleConverter.groupConvertedRules} methods, which contains
 * the general logic of transformation and grouping of rules.
 */
class DeclarativeRuleConverter {
    /**
     * String path to web accessible resources,
     * relative to the extension root dir.
     * Should start with leading slash '/'.
     */
    webAccessibleResourcesPath;
    /**
     * Creates an instance of DeclarativeRuleConverter.
     *
     * @param webAccessibleResourcesPath Path to web accessible resources.
     */
    constructor(webAccessibleResourcesPath) {
        this.webAccessibleResourcesPath = webAccessibleResourcesPath;
    }
    /**
     * Gets resource type matching request type.
     *
     * @param requestTypes Request type.
     *
     * @returns List of resource types.
     */
    static getResourceTypes(requestTypes) {
        return Object.entries(DECLARATIVE_RESOURCE_TYPES_MAP)
            // Skips the first element
            .filter(([, requestType]) => (requestTypes & requestType) === requestType)
            .map(([resourceTypeKey]) => resourceTypeKey);
    }
    /**
     * Converts list of tsurlfilter {@link HTTPMethod|methods} to declarative
     * supported http {@link RequestMethod|methods} via excluding 'trace' method.
     *
     * @param methods List of {@link HTTPMethod|methods}.
     *
     * @returns List of {@link RequestMethod|methods}.
     */
    static mapHttpMethodToDeclarativeHttpMethod(methods) {
        return methods
            // Filters unsupported `trace` method
            .filter((m) => m !== HTTPMethod.TRACE)
            // Map tsurlfilter http method to supported declarative http method
            .map((m) => DECLARATIVE_REQUEST_METHOD_MAP[m]);
    }
    /**
     * Checks if the string contains only ASCII characters.
     *
     * @param str String to test.
     *
     * @returns True if string contains only ASCII characters.
     */
    static isASCII(str) {
        // eslint-disable-next-line no-control-regex
        return /^[\x00-\x7F]+$/.test(str);
    }
    /**
     * Converts to ASCII characters only if `str` contains non-ASCII characters.
     *
     * @param str String to convert.
     *
     * @returns A transformed string containing only ASCII characters or
     * the original string.
     *
     * @throws Error if conversion into ASCII fails.
     */
    static prepareASCII(str) {
        let res = str;
        try {
            if (!DeclarativeRuleConverter.isASCII(res)) {
                // for cyrillic domains we need to convert them by isASCII()
                res = punycode.toASCII(res);
            }
            // after toASCII() some characters can be still non-ASCII
            // e.g. `abc“@` with non-ASCII `“`
            if (!DeclarativeRuleConverter.isASCII(res)) {
                res = punycode.encode(res);
            }
        }
        catch (e) {
            throw new Error(`Error converting to ASCII: "${str}" due to ${getErrorMessage(e)}`);
        }
        return res;
    }
    /**
     * Removes slashes from the beginning and end of the string.
     * We do that because regexFilter does not support them.
     *
     * @param str String to remove slashes.
     * @returns String without slashes.
     */
    static removeSlashes(str) {
        if (str.startsWith('/') && str.endsWith('/')) {
            return str.substring(1, str.length - 1);
        }
        return str;
    }
    /**
     * Converts a list of strings into strings containing only ASCII characters.
     *
     * @param strings List of strings.
     *
     * @returns List of string containing only ASCII characters.
     */
    static toASCII(strings) {
        return strings.map((s) => {
            return DeclarativeRuleConverter.prepareASCII(s);
        });
    }
    /**
     * Checks if network rule can be converted to {@link RuleActionType.ALLOW_ALL_REQUESTS}.
     *
     * @param rule Network rule.
     *
     * @returns Is rule compatible with {@link RuleActionType.ALLOW_ALL_REQUESTS}.
     */
    static isCompatibleWithAllowAllRequests(rule) {
        const types = DeclarativeRuleConverter.getResourceTypes(rule.getPermittedRequestTypes());
        const allowedRequestTypes = [ResourceType.MainFrame, ResourceType.SubFrame];
        // If found resource type which is incompatible with allowAllRequest field
        if (types.some((type) => !allowedRequestTypes.includes(type))) {
            return false;
        }
        return true;
    }
    /**
     * Rule priority.
     *
     * @see {@link NetworkRule.getPriorityWeight}
     * @see {@link NetworkRule.priorityWeight}
     * @see {@link NetworkRule.calculatePriorityWeight}
     * @see {@link https://adguard.com/kb/en/general/ad-filtering/create-own-filters/#rule-priorities}
     *
     * @param rule Network rule.
     *
     * @returns Priority of the rule or null.
     */
    static getPriority(rule) {
        return rule.getPriorityWeight();
    }
    /**
     * Rule redirect action.
     *
     * @param rule Network rule.
     *
     * @throws Error {@link ResourcesPathError} when a network rule has
     * a $redirect modifier and no path to web-accessible resources
     * is specified.
     *
     * @returns Redirect, which describes where and how the request
     * should be redirected.
     */
    getRedirectAction(rule) {
        if (rule.isOptionEnabled(NetworkRuleOption.Redirect)) {
            const resourcesPath = this.webAccessibleResourcesPath;
            if (!resourcesPath) {
                throw new ResourcesPathError('Empty web accessible resources path');
            }
            const advancedModifier = rule.getAdvancedModifier();
            const redirectTo = advancedModifier;
            const filename = getRedirectFilename(redirectTo.getValue());
            return { extensionPath: `${resourcesPath}/${filename}` };
        }
        if (rule.isOptionEnabled(NetworkRuleOption.RemoveParam)) {
            const advancedModifier = rule.getAdvancedModifier();
            const removeParamModifier = advancedModifier;
            const value = removeParamModifier.getValue();
            if (value === '') {
                return { transform: { query: '' } };
            }
            return {
                transform: {
                    queryTransform: {
                        /**
                         * In case if param is encoded URI we need to decode it first:
                         * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/3014.
                         */
                        removeParams: [decodeURIComponent(value)],
                    },
                },
            };
        }
        return {};
    }
    /**
     * Returns rule modify headers action.
     *
     * @param rule Network rule.
     *
     * @returns Modify headers action, which describes which headers should
     * be changed: added, set or deleted.
     */
    static getModifyHeadersAction(rule) {
        if (!rule.isOptionEnabled(NetworkRuleOption.RemoveHeader)) {
            return null;
        }
        const removeHeaderModifier = rule.getAdvancedModifier();
        const removeRequestHeader = removeHeaderModifier.getApplicableHeaderName(true);
        if (removeRequestHeader) {
            return {
                requestHeaders: [{
                        header: removeRequestHeader,
                        operation: HeaderOperation.Remove,
                    }],
            };
        }
        const removeResponseHeader = removeHeaderModifier.getApplicableHeaderName(false);
        if (removeResponseHeader) {
            return {
                responseHeaders: [{
                        header: removeResponseHeader,
                        operation: HeaderOperation.Remove,
                    }],
            };
        }
        return null;
    }
    /**
     * Returns rule modify headers action with removing Cookie headers from response and request.
     *
     * @param rule Network rule.
     *
     * @returns Add headers action, which describes which headers should be added.
     */
    static getRemovingCookieHeadersAction(rule) {
        if (!rule.isOptionEnabled(NetworkRuleOption.Cookie)) {
            return null;
        }
        return {
            responseHeaders: [{
                    operation: HeaderOperation.Remove,
                    header: 'Set-Cookie',
                }],
            requestHeaders: [{
                    operation: HeaderOperation.Remove,
                    header: 'Cookie',
                }],
        };
    }
    /**
     * Returns rule modify headers action with adding CSP headers to response.
     *
     * @param rule Network rule.
     *
     * @returns Add headers action, which describes what headers should be added.
     */
    static getAddingCspHeadersAction(rule) {
        if (!rule.isOptionEnabled(NetworkRuleOption.Csp)) {
            return null;
        }
        const cspHeaderValue = rule.getAdvancedModifierValue();
        if (cspHeaderValue) {
            return {
                operation: HeaderOperation.Append,
                header: CSP_HEADER_NAME,
                value: cspHeaderValue,
            };
        }
        return null;
    }
    /**
     * Returns rule modify headers action with adding Permissions headers to response.
     *
     * @param rule Network rule.
     *
     * @returns Add headers action, which describes what headers should be added.
     */
    static getAddingPermissionsHeadersAction(rule) {
        if (!rule.isOptionEnabled(NetworkRuleOption.Permissions)) {
            return null;
        }
        const permissionsHeaderValue = rule.getAdvancedModifierValue();
        if (permissionsHeaderValue) {
            return {
                operation: HeaderOperation.Append,
                header: PERMISSIONS_POLICY_HEADER_NAME,
                value: permissionsHeaderValue,
            };
        }
        return null;
    }
    /**
     * Rule action.
     *
     * @param rule Network rule.
     *
     * @throws Error {@link ResourcesPathError} when specified an empty
     * path to the web accessible resources.
     *
     * @returns The action of a rule that describes what should be done
     * with the request.
     */
    getAction(rule) {
        if (rule.isAllowlist()) {
            if (rule.isFilteringDisabled() && DeclarativeRuleConverter.isCompatibleWithAllowAllRequests(rule)) {
                return { type: RuleActionType.ALLOW_ALL_REQUESTS };
            }
            return { type: RuleActionType.ALLOW };
        }
        if (rule.isOptionEnabled(NetworkRuleOption.Redirect)
            || rule.isOptionEnabled(NetworkRuleOption.RemoveParam)) {
            return {
                type: RuleActionType.REDIRECT,
                redirect: this.getRedirectAction(rule),
            };
        }
        if (rule.isOptionEnabled(NetworkRuleOption.RemoveHeader)) {
            const modifyHeadersAction = DeclarativeRuleConverter.getModifyHeadersAction(rule);
            if (modifyHeadersAction?.requestHeaders) {
                return {
                    type: RuleActionType.MODIFY_HEADERS,
                    requestHeaders: modifyHeadersAction.requestHeaders,
                };
            }
            if (modifyHeadersAction?.responseHeaders) {
                return {
                    type: RuleActionType.MODIFY_HEADERS,
                    responseHeaders: modifyHeadersAction.responseHeaders,
                };
            }
        }
        if (rule.isOptionEnabled(NetworkRuleOption.Csp)) {
            const headersAction = DeclarativeRuleConverter.getAddingCspHeadersAction(rule);
            if (headersAction) {
                return {
                    type: RuleActionType.MODIFY_HEADERS,
                    responseHeaders: [headersAction],
                };
            }
        }
        if (rule.isOptionEnabled(NetworkRuleOption.Permissions)) {
            const headersAction = DeclarativeRuleConverter.getAddingPermissionsHeadersAction(rule);
            if (headersAction) {
                return {
                    type: RuleActionType.MODIFY_HEADERS,
                    responseHeaders: [headersAction],
                };
            }
        }
        if (rule.isOptionEnabled(NetworkRuleOption.Cookie)) {
            const removeCookieHeaders = DeclarativeRuleConverter.getRemovingCookieHeadersAction(rule);
            if (removeCookieHeaders) {
                const { responseHeaders, requestHeaders } = removeCookieHeaders;
                return {
                    type: RuleActionType.MODIFY_HEADERS,
                    responseHeaders,
                    requestHeaders,
                };
            }
        }
        return { type: RuleActionType.BLOCK };
    }
    /**
     * Rule condition.
     *
     * @param rule Network rule.
     *
     * @returns A rule condition that describes to which request the declarative
     * rule should be applied.
     */
    static getCondition(rule) {
        const condition = {};
        const pattern = rule.getPattern();
        if (pattern) {
            // set regexFilter
            if (rule.isRegexRule()) {
                const regexFilter = DeclarativeRuleConverter.removeSlashes(pattern);
                condition.regexFilter = DeclarativeRuleConverter.prepareASCII(regexFilter);
            }
            else {
                // A pattern beginning with ||* is not allowed. Use * instead.
                const patternWithoutVerticals = pattern.startsWith('||*')
                    ? pattern.substring(2)
                    : pattern;
                condition.urlFilter = DeclarativeRuleConverter.prepareASCII(patternWithoutVerticals);
            }
        }
        // set domainType
        if (rule.isOptionEnabled(NetworkRuleOption.ThirdParty)) {
            condition.domainType = DomainType.ThirdParty;
        }
        else if (rule.isOptionDisabled(NetworkRuleOption.ThirdParty)) {
            condition.domainType = DomainType.FirstParty;
        }
        // set initiatorDomains
        const permittedDomains = rule.getPermittedDomains()?.filter((d) => {
            // Wildcard and regex domains are not supported by declarative converter
            return !d.includes(SimpleRegex.MASK_ANY_CHARACTER) && !SimpleRegex.isRegexPattern(d);
        });
        if (permittedDomains && permittedDomains.length > 0) {
            condition.initiatorDomains = this.toASCII(permittedDomains);
        }
        // set excludedInitiatorDomains
        const excludedDomains = rule.getRestrictedDomains();
        if (excludedDomains && excludedDomains.length > 0) {
            condition.excludedInitiatorDomains = this.toASCII(excludedDomains);
        }
        const permittedToDomains = rule.getPermittedToDomains();
        if (permittedToDomains && permittedToDomains.length > 0) {
            condition.requestDomains = this.toASCII(permittedToDomains);
        }
        // Can be specified $to or $denyallow, but not together.
        const denyAllowDomains = rule.getDenyAllowDomains();
        const restrictedToDomains = rule.getRestrictedToDomains();
        if (denyAllowDomains && denyAllowDomains.length !== 0) {
            condition.excludedRequestDomains = this.toASCII(denyAllowDomains);
        }
        else if (restrictedToDomains && restrictedToDomains.length !== 0) {
            condition.excludedRequestDomains = this.toASCII(restrictedToDomains);
        }
        // set excludedResourceTypes
        const restrictedRequestTypes = rule.getRestrictedRequestTypes();
        const hasExcludedResourceTypes = restrictedRequestTypes !== 0;
        if (hasExcludedResourceTypes) {
            condition.excludedResourceTypes = this.getResourceTypes(restrictedRequestTypes);
            /**
             * By default, we do not block the requests that
             * are loaded in the browser tab ("main_frame").
             */
            if (!condition.excludedResourceTypes.includes(ResourceType.MainFrame)) {
                condition.excludedResourceTypes.push(ResourceType.MainFrame);
            }
        }
        // set resourceTypes
        const permittedRequestTypes = rule.getPermittedRequestTypes();
        if (!hasExcludedResourceTypes && permittedRequestTypes !== 0) {
            condition.resourceTypes = this.getResourceTypes(permittedRequestTypes);
        }
        const permittedMethods = rule.getPermittedMethods();
        if (permittedMethods && permittedMethods.length !== 0) {
            condition.requestMethods = this.mapHttpMethodToDeclarativeHttpMethod(permittedMethods);
        }
        const restrictedMethods = rule.getRestrictedMethods();
        if (restrictedMethods && restrictedMethods.length !== 0) {
            condition.excludedRequestMethods = this.mapHttpMethodToDeclarativeHttpMethod(restrictedMethods);
        }
        // By default, this option is false, so there is no need to specify it everywhere.
        // We do it only if it is true.
        if (rule.isOptionEnabled(NetworkRuleOption.MatchCase)) {
            condition.isUrlFilterCaseSensitive = rule.isOptionEnabled(NetworkRuleOption.MatchCase);
        }
        /**
         * Adds the main_frame resource type to the resourceTypes if the popup modifier is enabled.
         * Popup rules apply only to document requests, so adding main_frame ensures the rules are correctly applied.
         */
        if (rule.isOptionEnabled(NetworkRuleOption.Popup)) {
            condition.resourceTypes = condition.resourceTypes || [];
            if (!condition.resourceTypes.includes(ResourceType.MainFrame)) {
                condition.resourceTypes.push(ResourceType.MainFrame);
            }
        }
        const emptyResourceTypes = !condition.resourceTypes && !condition.excludedResourceTypes;
        if (emptyResourceTypes) {
            /**
             * Here we need to set 'main_frame' to apply to document requests
             * as well (because by default it applies to all requests except
             * document).
             * And if we specify 'main_frame', then we also need to specify all
             * other types, so that it works not only for document requests, but
             * also for all other types of requests.
             */
            const shouldMatchAllResourcesTypes = rule.isOptionEnabled(NetworkRuleOption.RemoveHeader)
                || rule.isOptionEnabled(NetworkRuleOption.Csp)
                || rule.isOptionEnabled(NetworkRuleOption.Cookie)
                || rule.isOptionEnabled(NetworkRuleOption.To)
                || rule.isOptionEnabled(NetworkRuleOption.Method);
            /**
             * $permissions and $removeparam modifiers must be applied only
             * to `document` content-type ('main_frame' and 'sub_frame')
             * if they don't have resource types.
             */
            const shouldMatchOnlyDocument = rule.isOptionEnabled(NetworkRuleOption.RemoveParam)
                || rule.isOptionEnabled(NetworkRuleOption.Permissions);
            if (shouldMatchAllResourcesTypes) {
                condition.resourceTypes = [
                    ResourceType.MainFrame,
                    ResourceType.SubFrame,
                    ResourceType.Stylesheet,
                    ResourceType.Script,
                    ResourceType.Image,
                    ResourceType.Font,
                    ResourceType.Object,
                    ResourceType.XmlHttpRequest,
                    ResourceType.Ping,
                    ResourceType.Media,
                    ResourceType.WebSocket,
                    ResourceType.Other,
                ];
            }
            else if (shouldMatchOnlyDocument) {
                condition.resourceTypes = [ResourceType.MainFrame, ResourceType.SubFrame];
            }
        }
        return condition;
    }
    /**
     * Converts the network rule into an array of declarative rules.
     *
     * Method to use only in class heirs.
     *
     * @protected
     *
     * @param id Rule identifier.
     * @param rule Network rule.
     *
     * @throws An {@link UnsupportedModifierError} if the network rule
     * contains an unsupported modifier
     * OR an {@link EmptyResourcesError} if there is empty resources in the rule
     * OR an {@link UnsupportedRegexpError} if regexp is not supported in
     * the RE2 syntax.
     * OR a {@link ResourcesPathError} when specified an empty
     * path to the web accessible resources.
     *
     * @returns A list of declarative rules.
     */
    async convertRule(id, rule) {
        // If the rule is not convertible - method will throw an error.
        const shouldConvert = NetworkRuleDeclarativeValidator.shouldConvertNetworkRule(rule);
        // The rule does not require conversion.
        if (!shouldConvert) {
            return [];
        }
        const declarativeRule = {
            id,
            action: this.getAction(rule.rule),
            condition: DeclarativeRuleConverter.getCondition(rule.rule),
        };
        const priority = DeclarativeRuleConverter.getPriority(rule.rule);
        if (priority) {
            declarativeRule.priority = priority;
        }
        const conversionErr = await DeclarativeRuleConverter.checkDeclarativeRuleApplicable(rule, declarativeRule);
        if (conversionErr) {
            throw conversionErr;
        }
        return [declarativeRule];
    }
    /**
     * Verifies whether the converted declarative rule passes the regular expression (regexp) validation.
     *
     * Additionally, it checks whether the rule contains resource types.
     *
     * Note: some complex regexps are not allowed,
     * e.g. back references, possessive quantifiers, negative lookaheads.
     *
     * @see {@link https://github.com/google/re2/wiki/Syntax}.
     *
     * @param networkRule The original network rule.
     * @param declarativeRule The converted declarative rule.
     *
     * @returns Different errors:
     * - {@link EmptyResourcesError} if the rule has empty resources,
     * - {@link UnsupportedRegexpError} if the regexp is not supported
     * by RE2 syntax (@see {@link https://github.com/google/re2/wiki/Syntax}),
     * - {@link EmptyDomainsError} if the declarative rule has empty domains
     * while the original rule has non-empty domains.
     */
    static async checkDeclarativeRuleApplicable(networkRule, declarativeRule) {
        const { regexFilter, resourceTypes } = declarativeRule.condition;
        if (resourceTypes?.length === 0) {
            return new EmptyResourcesError('Conversion resourceTypes is empty', networkRule, declarativeRule);
        }
        const permittedDomains = networkRule.rule.getPermittedDomains();
        if (permittedDomains && permittedDomains.length > 0) {
            const { initiatorDomains } = declarativeRule.condition;
            if (!initiatorDomains || initiatorDomains.length === 0) {
                const ruleText = RuleGenerator.generate(networkRule.node);
                const msg = `Conversion initiatorDomains is empty, but original rule's domains not: "${ruleText}"`;
                return new EmptyDomainsError(msg, networkRule, declarativeRule);
            }
        }
        // More complex regex than allowed as part of the "regexFilter" key.
        if (regexFilter) {
            try {
                await re2Validator.isRegexSupported(regexFilter);
            }
            catch (e) {
                const ruleText = RuleGenerator.generate(networkRule.node);
                const msg = `Regex is unsupported: "${ruleText}"`;
                return new UnsupportedRegexpError(msg, networkRule, declarativeRule, getErrorMessage(e));
            }
        }
        return null;
    }
    /**
     * Checks the captured conversion error, if it is one of the expected
     * conversion errors - returns it, otherwise adds information about
     * the original rule, packages it into a new error and returns it.
     *
     * @param rule An error was caught while converting this rule.
     * @param index Index of {@link IndexedNetworkRuleWithHash}.
     * @param id Identifier of the desired declarative rule.
     * @param e Captured error.
     *
     * @returns Initial error or new packaged error.
     */
    static catchErrorDuringConversion(rule, index, id, e) {
        if (e instanceof EmptyResourcesError
            || e instanceof UnsupportedModifierError
            || e instanceof UnsupportedRegexpError
            || e instanceof EmptyDomainsError) {
            return e;
        }
        const msg = `Non-categorized error during a conversion rule (index - ${index}, id - ${id})`;
        return e instanceof Error
            ? new Error(msg, { cause: e })
            : new Error(msg);
    }
    /**
     * Converts the provided set of indexed rules into declarative rules,
     * collecting source rule identifiers for declarative rules
     * and catching conversion errors.
     *
     * @param filterId An identifier for the filter.
     * @param rules Indexed rules.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     * Since we use hash of the rule text to generate ID, we need to ensure that
     * the ID is unique for the whole ruleset (especially when we convert
     * several filters into one ruleset).
     *
     * @returns Transformed declarative rules with their sources
     * and caught conversion errors.
     */
    async convertRules(filterId, rules, usedIds) {
        const res = {
            declarativeRules: [],
            errors: [],
            sourceMapValues: [],
        };
        await Promise.all(rules.map(async (r) => {
            const { rule, index } = r;
            const id = DeclarativeRuleConverter.generateUniqueId(r, usedIds);
            let converted = [];
            try {
                converted = await this.convertRule(id, rule);
            }
            catch (e) {
                const err = DeclarativeRuleConverter.catchErrorDuringConversion(rule.rule, index, id, e);
                res.errors.push(err);
                return;
            }
            // For each converted declarative rule save it's source.
            converted.forEach((dRule) => {
                res.sourceMapValues.push({
                    declarativeRuleId: dRule.id,
                    sourceRuleIndex: index,
                    filterId,
                });
                res.declarativeRules.push(dRule);
            });
        }));
        return res;
    }
    /**
     * This function groups similar rules among those already converted into
     * declarative rules. If a similar rule is found, it combines the two
     * declarative rules into one.
     *
     * @param converted An instance of {@link ConvertedRules} that includes
     * converted declarative rules, recorded errors, and a hash mapping
     * declarative rule IDs to corresponding source test rule IDs.
     * @param createRuleTemplate A function that stores the template of
     * a declarative rule. This template is used to compare different
     * declarative rules.
     * @param combineRulePair A function that attempts to find a similar
     * declarative rule by comparing rule templates. If a match is found,
     * it merges the two declarative rules into one and returns combined rule.
     *
     * @returns Object with grouped similar declarative rules.
     */
    // eslint-disable-next-line class-methods-use-this
    groupConvertedRules(converted, createRuleTemplate, combineRulePair) {
        const rulesTemplates = new Map();
        const saveRuleTemplate = (rule) => {
            const template = createRuleTemplate(rule);
            rulesTemplates.set(template, rule);
        };
        const result = {
            declarativeRules: [],
            sourceMapValues: [],
            errors: converted.errors,
        };
        const { sourceMapValues, declarativeRules } = converted;
        declarativeRules.forEach((dRule) => {
            // Trying to find a declarative rule for siblings.
            const template = createRuleTemplate(dRule);
            const siblingDeclarativeRule = rulesTemplates.get(template);
            // Finds the source rule identifier.
            const source = sourceMapValues.find((s) => s.declarativeRuleId === dRule.id);
            if (source === undefined) {
                result.errors.push(new Error(`Cannot find source for converted rule "${dRule}"`));
                return;
            }
            // If a similar rule is found, the function combines the two
            // declarative rules into one and returns the resulting combined rule.
            if (siblingDeclarativeRule) {
                const combinedRule = combineRulePair(siblingDeclarativeRule, dRule);
                // Updates template.
                saveRuleTemplate(combinedRule);
                // Updates the declarative rule identified for the merged rule.
                result.sourceMapValues.push({
                    ...source,
                    declarativeRuleId: combinedRule.id,
                });
            }
            else {
                // If not found - saves the template part of the declarative
                // rule to compare it with next values.
                saveRuleTemplate(dRule);
                // Keeps the source unchanged because the current rule
                // has not been merged.
                result.sourceMapValues.push(source);
            }
        });
        result.declarativeRules = Array.from(rulesTemplates.values());
        return result;
    }
    /**
     * Creates unique ID for rule via adding salt to the hash of the rule if
     * found duplicate ID.
     *
     * @param r Indexed network rule with hash.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     *
     * @returns Unique ID for the rule.
     */
    static generateUniqueId(r, usedIds) {
        let id = r.getRuleTextHash();
        // While the ID is already used, we add salt to the hash of the rule.
        let salt = 0;
        while (usedIds.has(id)) {
            salt += 1;
            id = r.getRuleTextHash(salt);
        }
        usedIds.add(id);
        return id;
    }
}

/**
 * @typedef {import('../rules-grouper').RulesGroup} RulesGroup
 */
/**
 * Describes how to convert all rules that are not grouped
 * for separate conversion.
 *
 * @see {@link RulesGroup}
 */
class RegularRulesConverter extends DeclarativeRuleConverter {
    /**
     * Converts ungrouped, basic indexed rules into declarative rules.
     *
     * @param filterId Filter id.
     * @param rules List of indexed network rules with hash.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     *
     * @returns Converted rules.
     */
    convert(filterId, rules, usedIds) {
        return this.convertRules(filterId, rules, usedIds);
    }
}

/**
 * Describes how to convert $removeparam rules.
 */
class RemoveParamRulesConverter extends DeclarativeRuleConverter {
    /**
     * Converts indexed rules grouped by $removeparam into declarative rules:
     * for each rule looks for similar rules and groups them into a new rule.
     *
     * @param filterId Filter id.
     * @param rules List of indexed network rules with hash.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     *
     * @returns Converted rules.
     */
    async convert(filterId, rules, usedIds) {
        const createRuleTemplate = (rule) => {
            // Deep copy without relation to source rule
            // Note: Partial type is used because we need to delete some fields,
            // but we cannot mark them as optional in the parent type.
            const template = JSON.parse(JSON.stringify(rule));
            delete template.id;
            delete template.action?.redirect?.transform?.queryTransform?.removeParams;
            return JSON.stringify(template);
        };
        const combineRulePair = (sourceRule, ruleToMerge) => {
            const resultRule = JSON.parse(JSON.stringify(sourceRule));
            const params = ruleToMerge.action.redirect?.transform?.queryTransform?.removeParams || [];
            resultRule.action.redirect?.transform?.queryTransform?.removeParams?.push(...params);
            return resultRule;
        };
        const converted = await this.convertRules(filterId, rules, usedIds);
        const result = this.groupConvertedRules(converted, createRuleTemplate, combineRulePair);
        return result;
    }
}

/**
 * Describes how to convert $removeheader rules.
 *
 * TODO: Add checks for rules containing the $removeheader and
 * incompatible modifiers: '$domain', '$third-party', '$important', '$app',
 * '$match-case', '$script', '$stylesheet, etc.
 *
 */
class RemoveHeaderRulesConverter extends DeclarativeRuleConverter {
    /**
     * Converts indexed rules grouped by $removeheader into declarative rules:
     * for each rule looks for similar rules and groups them into a new rule.
     *
     * @param filterId Filter id.
     * @param rules List of indexed network rules with hash.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     *
     * @returns Converted rules.
     */
    async convert(filterId, rules, usedIds) {
        const createRuleTemplate = (rule) => {
            // Deep copy without relation to source rule
            const template = JSON.parse(JSON.stringify(rule));
            delete template.id;
            delete template.action.requestHeaders;
            delete template.action.responseHeaders;
            return JSON.stringify(template);
        };
        const combineRulePair = (sourceRule, ruleToMerge) => {
            const resultRule = JSON.parse(JSON.stringify(sourceRule));
            const { responseHeaders, requestHeaders } = ruleToMerge.action;
            if (responseHeaders) {
                if (resultRule.action.responseHeaders) {
                    resultRule.action.responseHeaders.push(...responseHeaders);
                }
                else {
                    resultRule.action.responseHeaders = responseHeaders;
                }
            }
            if (requestHeaders) {
                if (resultRule.action.requestHeaders) {
                    resultRule.action.requestHeaders.push(...requestHeaders);
                }
                else {
                    resultRule.action.requestHeaders = requestHeaders;
                }
            }
            return resultRule;
        };
        const converted = await this.convertRules(filterId, rules, usedIds);
        const result = this.groupConvertedRules(converted, createRuleTemplate, combineRulePair);
        return result;
    }
}

/**
 * Describes how to convert $csp rules.
 */
class CspRulesConverter extends DeclarativeRuleConverter {
    /**
     * Converts indexed rules grouped by $csp into declarative rules:
     * for each rule looks for similar rules and groups them into a new rule.
     *
     * @param filterId Filter id.
     * @param rules List of indexed rules.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     *
     * @returns Converted rules.
     */
    async convert(filterId, rules, usedIds) {
        const createRuleTemplate = (rule) => {
            // Deep copy without relation to source rule
            const template = JSON.parse(JSON.stringify(rule));
            delete template.id;
            // Converted $csp rules contain only one response headers action.
            delete template.action.responseHeaders[0].value;
            return JSON.stringify(template);
        };
        const combineRulePair = (sourceRule, ruleToMerge) => {
            const resultRule = JSON.parse(JSON.stringify(sourceRule));
            // If the headers are empty in the rule to merge, do not take any action.
            if (!ruleToMerge.action.responseHeaders || ruleToMerge.action.responseHeaders.length === 0) {
                return resultRule;
            }
            // Try to find CSP header in the rule to merge - if not found, do not take any action.
            const cspHeaderToMerge = ruleToMerge.action.responseHeaders
                .find((h) => h.header === CSP_HEADER_NAME);
            if (!cspHeaderToMerge) {
                return resultRule;
            }
            // Combine the CSP header from the rule to merge with a copy of the source rule.
            if (resultRule.action.responseHeaders && resultRule.action.responseHeaders.length > 0) {
                const idx = resultRule.action.responseHeaders
                    .findIndex((h) => h.header === CSP_HEADER_NAME);
                if (idx === -1) {
                    return resultRule;
                }
                const cspHeaderValue = resultRule.action.responseHeaders[idx].value;
                if (cspHeaderValue) {
                    resultRule.action.responseHeaders[idx].value = `${cspHeaderValue}; ${cspHeaderToMerge.value}`;
                }
                else {
                    resultRule.action.responseHeaders[idx].value = cspHeaderToMerge.value;
                }
            }
            else {
                resultRule.action.responseHeaders = [cspHeaderToMerge];
            }
            return resultRule;
        };
        const converted = await this.convertRules(filterId, rules, usedIds);
        const result = this.groupConvertedRules(converted, createRuleTemplate, combineRulePair);
        return result;
    }
}

/**
 * Describes an error when the maximum number of rules is reached and
 * some rules are skipped from scanning.
 */
class MaxScannedRulesError extends Error {
    /**
     * Line index of the filter from which the rules are skipped.
     */
    lineIndex;
    /**
     * Describes an error when the maximum number of rules is reached and some
     * rules are skipped from scanning.
     *
     * @param message Message of error.
     * @param lineIndex Line index of the filter from which the rules
     * are skipped.
     */
    constructor(message, lineIndex) {
        super(message);
        this.name = this.constructor.name;
        this.lineIndex = lineIndex;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, MaxScannedRulesError.prototype);
    }
}

/**
 * @typedef {import('../../source-map').Source} Source
 */
/**
 * Describes an error when the maximum number of regexp rules is reached.
 */
class TooManyRegexpRulesError extends Error {
    /**
     * List of excluded source (important!) {@link Source} rules ids.
     */
    excludedRulesIds;
    /**
     * Number of maximum rules.
     */
    numberOfMaximumRules;
    /**
     * Number of excluded declarative rules.
     */
    numberOfExcludedDeclarativeRules;
    /**
     * Describes an error when the maximum number of regexp rules is reached.
     *
     * @param message Message of error.
     * @param excludedRulesIds List of excluded source (important!) {@link Source} rules ids.
     * @param numberOfMaximumRules Number of maximum rules.
     * @param numberOfExcludedDeclarativeRules Number of excluded declarative rules.
     */
    constructor(message, excludedRulesIds, numberOfMaximumRules, numberOfExcludedDeclarativeRules) {
        super(message);
        this.name = this.constructor.name;
        this.excludedRulesIds = excludedRulesIds;
        this.numberOfMaximumRules = numberOfMaximumRules;
        this.numberOfExcludedDeclarativeRules = numberOfExcludedDeclarativeRules;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, TooManyRegexpRulesError.prototype);
    }
}

/**
 * @typedef {import('../../source-map').Source} Source
 */
/**
 * Describes an error when the maximum number of unsafe rules is reached.
 */
class TooManyUnsafeRulesError extends Error {
    /**
     * List of excluded source (important!) {@link Source} rules ids.
     */
    excludedRulesIds;
    /**
     * Number of maximum rules.
     */
    numberOfMaximumRules;
    /**
     * Number of excluded declarative rules.
     */
    numberOfExcludedDeclarativeRules;
    /**
     * Describes an error when the maximum number of unsafe rules is reached.
     *
     * @param message Message of error.
     * @param excludedRulesIds List of excluded source (important!) {@link Source} rules ids.
     * @param numberOfMaximumRules Number of maximum rules.
     * @param numberOfExcludedDeclarativeRules Number of excluded declarative rules.
     */
    constructor(message, excludedRulesIds, numberOfMaximumRules, numberOfExcludedDeclarativeRules) {
        super(message);
        this.name = this.constructor.name;
        this.excludedRulesIds = excludedRulesIds;
        this.numberOfMaximumRules = numberOfMaximumRules;
        this.numberOfExcludedDeclarativeRules = numberOfExcludedDeclarativeRules;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, TooManyUnsafeRulesError.prototype);
    }
}

/**
 * @typedef {import('../../source-map').Source} Source
 */
/**
 * Describes an error when the maximum number of rules is reached.
 */
class TooManyRulesError extends Error {
    /**
     * List of excluded source (important!) {@link Source} rules ids.
     */
    excludedRulesIds;
    /**
     * Number of maximum rules.
     */
    numberOfMaximumRules;
    /**
     * Number of excluded declarative rules.
     */
    numberOfExcludedDeclarativeRules;
    /**
     * Describes an error when the maximum number of rules is reached.
     *
     * @param message Message of error.
     * @param excludedRulesIds List of excluded source (important!) {@link Source} rules ids.
     * @param numberOfMaximumRules Number of maximum rules.
     * @param numberOfExcludedDeclarativeRules Number of excluded declarative rules.
     */
    constructor(message, excludedRulesIds, numberOfMaximumRules, numberOfExcludedDeclarativeRules) {
        super(message);
        this.name = this.constructor.name;
        this.excludedRulesIds = excludedRulesIds;
        this.numberOfMaximumRules = numberOfMaximumRules;
        this.numberOfExcludedDeclarativeRules = numberOfExcludedDeclarativeRules;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, TooManyRulesError.prototype);
    }
}

/**
 * Just a dummy for $badfilter-rules, because they don't need to be converted.
 */
class BadFilterRulesConverter extends DeclarativeRuleConverter {
    /**
     * Skips converting bad rules.
     *
     * @param filterId Filter id.
     * @param rules List of indexed rules.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     *
     * @returns Empty converted rules.
     */
    // eslint-disable-next-line class-methods-use-this
    convert(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filterId, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rules, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    usedIds) {
        return Promise.resolve({
            sourceMapValues: [],
            declarativeRules: [],
            errors: [],
        });
    }
}

var RulesGroup;
(function (RulesGroup) {
    RulesGroup[RulesGroup["Regular"] = 0] = "Regular";
    RulesGroup[RulesGroup["RemoveParam"] = 1] = "RemoveParam";
    RulesGroup[RulesGroup["RemoveHeader"] = 2] = "RemoveHeader";
    RulesGroup[RulesGroup["Csp"] = 3] = "Csp";
    RulesGroup[RulesGroup["BadFilter"] = 4] = "BadFilter";
})(RulesGroup || (RulesGroup = {}));
/**
 * Contains logic on how to divide the rules into certain groups.
 *
 * @see {@link RulesGroup}
 */
class DeclarativeRulesGrouper {
    /**
     * Returns group of the indexed rule.
     *
     * @param indexedNetworkRuleWithHash Indexed network rule with hash.
     *
     * @returns Group of the indexed rule.
     */
    static getRuleGroup(indexedNetworkRuleWithHash) {
        const { rule } = indexedNetworkRuleWithHash;
        if (rule.rule.isOptionEnabled(NetworkRuleOption.RemoveParam)) {
            return RulesGroup.RemoveParam;
        }
        if (rule.rule.isOptionEnabled(NetworkRuleOption.RemoveHeader)) {
            return RulesGroup.RemoveHeader;
        }
        if (rule.rule.isOptionEnabled(NetworkRuleOption.Csp)) {
            return RulesGroup.Csp;
        }
        if (rule.rule.isOptionEnabled(NetworkRuleOption.Badfilter)) {
            return RulesGroup.BadFilter;
        }
        return RulesGroup.Regular;
    }
    /**
     * Splits the list of indexed rules into an index with groups.
     *
     * @param rules List of indexed rules.
     *
     * @returns Index with grouped, indexed rules.
     */
    static splitRulesByGroups(rules) {
        const rulesToProcess = {
            [RulesGroup.RemoveParam]: [],
            [RulesGroup.RemoveHeader]: [],
            [RulesGroup.BadFilter]: [],
            [RulesGroup.Regular]: [],
            [RulesGroup.Csp]: [],
        };
        // Categorizing rule groups
        rules.forEach((indexedNetworkRuleWithHash) => {
            const group = DeclarativeRulesGrouper.getRuleGroup(indexedNetworkRuleWithHash);
            rulesToProcess[group].push(indexedNetworkRuleWithHash);
        });
        return rulesToProcess;
    }
}

/* eslint-disable jsdoc/require-description-complete-sentence  */
/**
 * @file Describes the conversion process from {@link IndexedNetworkRuleWithHash}
 * to declarative rules {@link DeclarativeRule} via applying $badfilter-rules
 * {@link DeclarativeRulesConverter#applyBadFilter} and checks for specified
 * limitations {@link DeclarativeRulesConverter#checkLimitations}.
 *
 *                                                                           Conversion
 *
 *
 *
 *
 *       Two entry points        │                FilterConverter             │             RulesConverter
 *                               │                                            │
 *                               │       Perform the conversion at the        │      Perform the conversion at the
 *                               │       filter level.                        │      rules level.
 *                               │                                            │
 *  Converting static rules      │       Validate passed number of rules      │
 *  during extension assembly.   │       and path to web accessible resources.│
 * ┌─────────────────────────┐   │      ┌────────────────────────────────┐    │
 * │                         ├─┬─┼─────►│                                │    │
 * │  convertStaticRuleSet() │ │ │      │      checkConverterOptions()   │    │
 * │                         │ │ │  ┌───┤                                │    │
 * └─────────────────────────┘ │ │  │   └────────────────────────────────┘    │
 *                             │ │  │                                         │
 *  On-the-fly conversion      │ │  │    Filter only network rules and create │
 *  for dynamic rules.         │ │  │    indexed rule with hash.              │
 * ┌─────────────────────────┐ │ │  │    In this method, when converting      │
 * │                         │ │ │  │    dynamic rules, the rules canceled by │
 * │ convertDynamicRuleSets()├─┘ │  │    $badfilter rules from static filters │
 * │                         │   │  │    are filtered out - such rules are    │
 * └─────────────────────────┘   │  │    discarded during filter scanning.    │
 *                               │  │   ┌────────────────────────────────┐    │
 *                               │  └──►│                                │    │
 *                               │      │ NetworkRulesScanner.scanRules()│    │
 *                               │  ┌───┤                                │    │
 *                               │  │   └────────────────────────────────┘    │  Filter rules affected by $badfilter
 *                               │  │                                         │  within one filter, then group the rules
 *                               │  │                                         │  based on modifiers, requiring specific
 *                               │  │    Convert our network rule to DNR.     │  conversion processes such as
 *                               │  │   ┌────────────────────────────────┐    │  post-processing for similar rules.
 *                               │  └──►│                                │    │   ┌────────────────────────────────┐
 *                               │      │           convert()            ├────┼───┤                                │
 *                               │      │                                │    │   │        applyBadFilter()        │
 *                               │      └────────────────────────────────┘    │ ┌─┤                                │
 *                               │                                            │ │ └────────────────────────────────┘
 *                               │                                            │ │
 *                               │                                            │ │ Each group of rules within a single
 *                               │                                            │ │ filter has its converter that performs
 *                               │                                            │ │ the conversion, then combines the
 *                               │                                            │ │ results and returns them.
 *                               │                                            │ │
 *                               │                                            │ │ For details, please go to the
 *                               │                                            │ │ abstract-rule-converter.ts schema.
 *                               │                                            │ │ ┌────────────────────────────────┐
 *                               │                                            │ └►│                                │
 *                               │                                            │   │          convertRules()        │
 *                               │                                            │ ┌─┤                                │
 *                               │                                            │ │ └────────────────────────────────┘
 *                               │                                            │ │
 *                               │                                            │ │ The declarative rules are checked to
 *                               │                                            │ │ ensure they meet the specified
 *                               │                                            │ │ constraints, and if necessary,
 *                               │                                            │ │ some rules are removed.
 *                               │                                            │ │ ┌────────────────────────────────┐
 *                               │                                            │ └►│                                │
 *                               │                                            │   │         checkLimitations()     │
 *                               │   ┌────────────────────────────────────────┼───┤                                │
 *                               │   │                                        │   └────────────────────────────────┘
 *                               │   │   Wrap conversion result into RuleSet. │
 *                               │   │  ┌────────────────────────────────┐    │
 *                               │   └─►│                                │    │
 *                               │      │    collectConvertedResult()    │    │
 *                               │  ┌───┤                                │    │
 *                               │  │   └────────────────────────────────┘    │
 *                               │  │                                         │
 *                               │  │    This method is only called during the│
 *                               │  │    conversion of dynamic rules.         │
 *                               │  │    Applies rules with $badfilter        │
 *                               │  │    modifier from dynamic rulesets to    │
 *                               │  │    all rules from static rulesets and   │
 *                               │  │    returns list of ids of declarative   │
 *                               │  │    rules to disable them.               │
 *                               │  │   ┌──────────────────────────────────┐  │
 *                               │  └──►│                                  │  │
 *                               │      │ collectDeclarativeRulesToCancel()│  │
 *                               │      │                                  │  │
 *                               │      └──────────────────────────────────┘  │
 *                               │                                            │
 */
/* eslint-enable jsdoc/require-description-complete-sentence */
/**
 * Describes how to convert {@link IndexedNetworkRuleWithHash|indexed network rules}
 * into list of {@link DeclarativeRule|declarative rules}.
 */
class DeclarativeRulesConverter {
    /**
     * The declarative identifier of a rule must be a natural number.
     *
     * 1 is reserved for the metadata rule.
     */
    static MIN_DECLARATIVE_RULE_ID = 2;
    /**
     * The declarative identifier of a rule must be less than signed 32-bit
     * integer. The maximum value of a signed 32-bit integer is 2^31 - 1.
     * @see {@link https://groups.google.com/a/chromium.org/g/chromium-extensions/c/yVb56u5Vf0s?}
     */
    static MAX_DECLARATIVE_RULE_ID = 2 ** 31 - 1;
    /**
     * Describes for which group of rules which converter should be used.
     */
    static converters = {
        [RulesGroup.Regular]: RegularRulesConverter,
        [RulesGroup.Csp]: CspRulesConverter,
        [RulesGroup.RemoveParam]: RemoveParamRulesConverter,
        [RulesGroup.RemoveHeader]: RemoveHeaderRulesConverter,
        [RulesGroup.BadFilter]: BadFilterRulesConverter,
    };
    /**
     * Converts list of filters ids with indexed rules to declarative rules:
     * applies $badfilter rules, then for each group of rules (inside one
     * filter) runs specified converter.
     *
     * TODO: The $removeparam, $removeheader, $csp converters can also combine
     * rules across multiple filters.
     *
     * @see {@link DeclarativeRulesConverter.converters}.
     *
     * @param filtersWithRules List of filters ids with indexed rules.
     * @param options Options for conversion.
     *
     * @returns A list of declarative rules, a regexp rule counter,
     * and a list of sourcemap values that contain the relationship between the
     * transformed declarative rule and the source rule.
     */
    static async convert(filtersWithRules, options) {
        const filters = this.applyBadFilter(filtersWithRules);
        let converted = {
            sourceMapValues: [],
            declarativeRules: [],
            errors: [],
        };
        // Set to store unique IDs of declarative rules, it will be modified
        // during the conversion process after each converted rule.
        //
        // Note: since we apply post-converting processing via grouping similar
        // rules for some modifiers, we may have some "released" IDs, but we
        // suppose that 2^31-1 is enough for all rules even with such not used
        // IDs, so to keep the code simple we don't delete them from the set
        // after conversion.
        const uniqueIds = new Set();
        for (const [filterId, groupedRules] of filters) {
            const { sourceMapValues, declarativeRules, errors,
            // eslint-disable-next-line no-await-in-loop
             } = await this.convertRules(filterId, groupedRules, uniqueIds, options);
            converted.sourceMapValues = converted.sourceMapValues.concat(sourceMapValues);
            converted.declarativeRules = converted.declarativeRules.concat(declarativeRules);
            converted.errors = converted.errors.concat(errors);
        }
        converted = this.checkLimitations(converted, options?.maxNumberOfRules, options?.maxNumberOfUnsafeRules, options?.maxNumberOfRegexpRules);
        if (!this.checkRulesHaveUniqueIds(converted.declarativeRules)) {
            throw new Error('Declarative rules have non-unique identifiers.');
        }
        if (!this.checkRulesHaveCorrectIds(converted.declarativeRules)) {
            throw new Error('Declarative rules have incorrect identifiers.');
        }
        return converted;
    }
    /**
     * Converts filter's indexed rules into declarative rules.
     *
     * @param filterId Filed id.
     * @param groupsRules Grouped rules.
     * @param usedIds Set with already used IDs to exclude duplications in IDs.
     * @param options Options for conversion.
     *
     * @returns A list of declarative rules, a regexp rule counter,
     * and a list of sourcemap values that contain the relationship between the
     * transformed declarative rule and the source rule.
     */
    static async convertRules(filterId, groupsRules, usedIds, options) {
        const converted = {
            sourceMapValues: [],
            declarativeRules: [],
            errors: [],
        };
        // Map because RulesGroup values are numbers
        const groups = Object.keys(groupsRules).map(Number);
        await Promise.all(groups.map(async (key) => {
            const converter = new DeclarativeRulesConverter.converters[key](options?.resourcesPath);
            const { sourceMapValues, declarativeRules, errors, } = await converter.convert(filterId, groupsRules[key], usedIds);
            converted.sourceMapValues = converted.sourceMapValues.concat(sourceMapValues);
            converted.declarativeRules = converted.declarativeRules.concat(declarativeRules);
            converted.errors = converted.errors.concat(errors);
        }));
        return converted;
    }
    /**
     * Checks that IDs of declarative rules fit into the range of 1 to 2^31-1.
     *
     * This check is needed because we have post-converting grouping rules,
     * where some code could easily change any part of an already converted DNR
     * rule, and we would receive a critical error.
     * That's why we added post-processing checks.
     *
     * @see {@link https://groups.google.com/a/chromium.org/g/chromium-extensions/c/yVb56u5Vf0s?}
     *
     * @param rules List of declarative rules.
     *
     * @returns True if all rules identifiers which fit in allowed range,
     * otherwise false.
     */
    static checkRulesHaveCorrectIds(rules) {
        return rules.every(({ id }) => {
            return id >= this.MIN_DECLARATIVE_RULE_ID && id <= this.MAX_DECLARATIVE_RULE_ID;
        });
    }
    /**
     * Checks that declarative rules have unique identifiers.
     *
     * This check is needed because we have post-converting grouping rules,
     * where some code could easily change any part of an already converted DNR
     * rule, and we would receive a critical error.
     * That's why we added post-processing checks.
     *
     * @param rules List of declarative rules.
     *
     * @returns True if all rules have unique identifiers, otherwise false.
     */
    static checkRulesHaveUniqueIds(rules) {
        const ids = rules.map(({ id }) => id);
        const uniqueIds = new Set(ids);
        return uniqueIds.size === rules.length;
    }
    /**
     * Checks whether the declarative rule is regex.
     *
     * @see {@link https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#property-RuleCondition-regexFilter}
     *
     * @param rule Declarative rule to check.
     *
     * @returns True if the rule is regex, otherwise false.
     */
    static isRegexRule(rule) {
        return rule.condition.regexFilter !== undefined;
    }
    /**
     * Removes sources and errors associated with a truncated rule.
     *
     * @param ruleId The ID of the truncated rule.
     * @param sourcesIndex The index of sources.
     * @param errorsIndex The index of errors.
     * @param excludedRulesIds The list of excluded rule IDs.
     */
    static removeTruncatedRuleSourcesAndErrors(ruleId, sourcesIndex, errorsIndex, excludedRulesIds) {
        // Removing a source for a truncated rule
        const sources = sourcesIndex.get(ruleId) || [];
        const sourcesRulesIds = sources.map(({ sourceRuleIndex }) => sourceRuleIndex);
        sourcesIndex.set(ruleId, []);
        // Removing an error for a truncated rule
        errorsIndex.set(ruleId, []);
        // Note: be sure, that sourceRulesIds are not too much to overflow stack.
        excludedRulesIds.push(...sourcesRulesIds);
    }
    /**
     * Check that declarative rules matches the specified constraints and
     * cuts rules if needed as from list also from source map.
     *
     * @param converted Converted rules, errors, sourcemap and counters.
     * @param maxNumberOfRules Maximum number of converted rules.
     * @param maxNumberOfUnsafeRules Maximum number of converted unsafe rules.
     * @param maxNumberOfRegexpRules Maximum number of converted regexp rules.
     *
     * @returns Transformed converted rules with modified (if abbreviated)
     * counters, declarative rules list, source map and errors.
     */
    static checkLimitations(converted, maxNumberOfRules, maxNumberOfUnsafeRules, maxNumberOfRegexpRules) {
        const limitations = [];
        // We apply restrictions only to transformed rules, so we need to filter
        // rule conversion errors if we remove the transformed rule associated
        // with those errors
        let { declarativeRules, sourceMapValues, errors, } = converted;
        const convertedRulesErrors = [];
        const otherErrors = [];
        for (let i = 0; i < errors.length; i += 1) {
            const e = errors[i];
            // Checks only errors of converted declarative rules
            if (e instanceof InvalidDeclarativeRuleError) {
                convertedRulesErrors.push(e);
            }
            else {
                otherErrors.push(e);
            }
        }
        // TODO: Lazy creation of index
        // Create index of errors for fast search and filtering
        const convertedRulesErrorsIndex = new Map();
        convertedRulesErrors.forEach((e) => {
            // Checks only errors of converted declarative rules
            const errorsList = convertedRulesErrorsIndex.get(e.declarativeRule.id);
            const newValue = errorsList
                ? errorsList.concat(e)
                : [e];
            convertedRulesErrorsIndex.set(e.declarativeRule.id, newValue);
        });
        // TODO: Lazy creation of index
        // Create index of sources for fast search and filtering
        const sourcesIndex = new Map();
        sourceMapValues.forEach((source) => {
            const sources = sourcesIndex.get(source.declarativeRuleId);
            const newValue = sources
                ? sources.concat(source)
                : [source];
            sourcesIndex.set(source.declarativeRuleId, newValue);
        });
        // Checks and, if necessary, trims the maximum number of rules
        if (maxNumberOfRules && declarativeRules.length > 0) {
            const filteredRules = [];
            const excludedRulesIds = [];
            let unsafeRulesCounter = 0;
            for (let i = 0; i < declarativeRules.length; i += 1) {
                const rule = declarativeRules[i];
                if (maxNumberOfUnsafeRules && !isSafeRule(rule)) {
                    unsafeRulesCounter += 1;
                    if (unsafeRulesCounter > maxNumberOfUnsafeRules) {
                        this.removeTruncatedRuleSourcesAndErrors(rule.id, sourcesIndex, convertedRulesErrorsIndex, excludedRulesIds);
                        continue;
                    }
                }
                if (i < maxNumberOfRules) {
                    filteredRules.push(rule);
                    continue;
                }
                this.removeTruncatedRuleSourcesAndErrors(rule.id, sourcesIndex, convertedRulesErrorsIndex, excludedRulesIds);
            }
            if (maxNumberOfUnsafeRules
                && unsafeRulesCounter > maxNumberOfUnsafeRules) {
                const msg = 'After conversion, too many unsafe rules remain: '
                    + `${unsafeRulesCounter} exceeds `
                    + `the limit provided - ${maxNumberOfUnsafeRules}`;
                const err = new TooManyUnsafeRulesError(msg, excludedRulesIds, maxNumberOfUnsafeRules, unsafeRulesCounter - maxNumberOfUnsafeRules);
                limitations.push(err);
            }
            if (declarativeRules.length > maxNumberOfRules) {
                const msg = 'After conversion, too many declarative rules remain: '
                    + `${declarativeRules.length} exceeds `
                    + `the limit provided - ${maxNumberOfRules}`;
                const err = new TooManyRulesError(msg, excludedRulesIds, maxNumberOfRules, declarativeRules.length - maxNumberOfRules);
                limitations.push(err);
            }
            declarativeRules = filteredRules;
        }
        // Checks and, if necessary, trims the maximum number of regexp rules
        if (maxNumberOfRegexpRules) {
            const filteredRules = [];
            const excludedRulesIds = [];
            let regexpRulesCounter = 0;
            for (let i = 0; i < declarativeRules.length; i += 1) {
                const rule = declarativeRules[i];
                if (this.isRegexRule(rule)) {
                    regexpRulesCounter += 1;
                    if (regexpRulesCounter > maxNumberOfRegexpRules) {
                        this.removeTruncatedRuleSourcesAndErrors(rule.id, sourcesIndex, convertedRulesErrorsIndex, excludedRulesIds);
                        continue;
                    }
                }
                filteredRules.push(rule);
            }
            if (regexpRulesCounter > maxNumberOfRegexpRules) {
                const msg = 'After conversion, too many regexp rules remain: '
                    + `${regexpRulesCounter} exceeds `
                    + `the limit provided - ${maxNumberOfRegexpRules}`;
                const err = new TooManyRegexpRulesError(msg, excludedRulesIds, maxNumberOfRegexpRules, regexpRulesCounter - maxNumberOfRegexpRules);
                limitations.push(err);
            }
            declarativeRules = filteredRules;
        }
        // Make array from index
        sourceMapValues = Array.from(sourcesIndex.values())
            .filter((arr) => arr.length > 0)
            .flat();
        // Make array from index
        errors = Array.from(convertedRulesErrorsIndex.values())
            .filter((arr) => arr.length > 0)
            .flat();
        return {
            sourceMapValues,
            declarativeRules,
            errors: errors.concat(otherErrors),
            limitations,
        };
    }
    /**
     * Filters rules that have been affected by $badfilter rules and
     * groups them by modifiers.
     *
     * @param filtersWithRules List with filters ids and indexed rules.
     *
     * @returns List with filters ids and grouped indexed rules.
     */
    static applyBadFilter(filtersWithRules) {
        let allBadFilterRules = [];
        // Group rules
        const filterIdsWithGroupedRules = filtersWithRules
            .map(({ id, rules }) => {
            const rulesToProcess = DeclarativeRulesGrouper.splitRulesByGroups(rules);
            allBadFilterRules = allBadFilterRules.concat(rulesToProcess[RulesGroup.BadFilter]);
            const tuple = [id, rulesToProcess];
            return tuple;
        });
        // Define filter function
        const filterByBadFilterFn = (ruleToTest) => {
            const networkRuleToTest = ruleToTest.rule;
            for (const { rule } of allBadFilterRules) {
                if (rule.rule.negatesBadfilter(networkRuleToTest.rule)) {
                    return false;
                }
            }
            return true;
        };
        // For each group of filters' rules apply filter function
        return filterIdsWithGroupedRules.map(([filterId, groupedRules]) => {
            const filtered = groupedRules;
            // Map because RulesGroup values are numbers
            const groups = Object.keys(filtered).map(Number);
            groups.forEach((key) => {
                filtered[key] = filtered[key].filter(filterByBadFilterFn);
            });
            // Clean up bad filters rules
            filtered[RulesGroup.BadFilter] = [];
            return [filterId, filtered];
        });
    }
}

/**
 * Contains a dictionary where the key is the hash of the rule and the value is
 * a list of sources for the rule. Storing this dictionary is necessary for fast
 * rule matching, which can be negated by $badfilter.
 */
class RulesHashMap {
    map = new Map();
    /**
     * Creates new {@link RulesHashMap}.
     *
     * @param listOfRulesWithHash List of rules hashes and rules sources:
     * filter id with rule index.
     */
    constructor(listOfRulesWithHash) {
        listOfRulesWithHash.forEach(({ hash, source }) => {
            const existingValue = this.map.get(hash);
            if (existingValue) {
                existingValue.push(source);
            }
            else {
                this.map.set(hash, [source]);
            }
        });
    }
    /** @inheritdoc */
    findRules(hash) {
        return this.map.get(hash) || [];
    }
    /**
     * Deserializes dictionary from raw string.
     *
     * @param rawString The original dictionary that was serialized into a string.
     *
     * @returns Deserialized dictionary.
     */
    static deserializeSources(rawString) {
        const plainArray = JSON.parse(rawString);
        const allPairs = plainArray
            .map(([hash, sources]) => {
            return sources.map(([filterId, sourceRuleIndex]) => {
                return {
                    hash,
                    source: {
                        filterId,
                        sourceRuleIndex,
                    },
                };
            });
        })
            .flat();
        return allPairs;
    }
    /** @inheritdoc */
    serialize() {
        const arr = Array.from(this.map);
        const serializedValues = arr
            .map(([hash, source]) => {
            const sources = source.map((s) => {
                return [s.filterId, s.sourceRuleIndex];
            });
            return [hash, sources];
        });
        return JSON.stringify(serializedValues);
    }
}

/**
 * BufferReader is a class responsible for reading content from serialized rules.
 */
class BufferReader {
    /**
     * Input byte buffer.
     */
    buffer;
    /**
     * Current position of the reader.
     */
    currentIndex = 0;
    /**
     * Constructor of a BufferReader.
     *
     * @param buffer Uint8Array that contains a UTF-8 encoded string.
     */
    constructor(buffer) {
        this.buffer = buffer;
        this.currentIndex = this.buffer.currentOffset;
    }
    /**
     * Reads the next line in the buffer.
     *
     * @returns Text or null on end.
     */
    readNext() {
        // If the next byte is 0, it means that there's nothing to read.
        if (this.buffer.peekUint8() === 0) {
            return null;
        }
        let ruleNode;
        RuleDeserializer.deserialize(this.buffer, ruleNode = {});
        this.currentIndex = this.buffer.currentOffset;
        if (ruleNode.category) {
            return ruleNode;
        }
        return null;
    }
    /**
     * Returns the current position of this reader or -1 if there's nothing to
     * read.
     *
     * @returns - The current position or -1 if there's nothing to read.
     */
    getCurrentPos() {
        return this.currentIndex;
    }
    /** @inheritdoc */
    getDataLength() {
        return this.buffer.capacity;
    }
}

/**
 * Source map.
 *
 * @note Since serialized rule nodes are not store original rule text, we need this source map between the
 * serialized filter list and the raw filter list.
 */
recordType(
/**
 * Rule start index in the converted list's byte buffer.
 */
stringType(), 
/**
 * Rule start index in the raw converted list.
 */
numberType());

/**
 * Helper function to get the rule source text from the source string by its line start index.
 *
 * @param lineStartIndex Rule start index.
 * @param source Raw filter list source.
 *
 * @returns Rule string or null if the rule couldn't be found.
 */
const getRuleSourceText = (lineStartIndex, source) => {
    // note: checking for LF is enough, because we transform source before storing it, and it's always LF
    let [lineEndIndex] = findNextLineBreakIndex(source, lineStartIndex);
    // If the line end index is not found, we assume that the rule is the last line in the source.
    if (lineEndIndex === -1) {
        lineEndIndex = source.length;
    }
    // If the rule start index is equal to or greater than the rule end index, we return null,
    // and the rule is considered not found.
    if (lineStartIndex >= lineEndIndex) {
        return null;
    }
    const ruleSourceText = source.slice(lineStartIndex, lineEndIndex);
    // WARNING!
    // Potential memory leak mitigation for substring operation due to V8 optimizations:
    // When extracting a substring with rule.slice(), there's a concern in some JS environments
    // that the resulting substring might retain a hidden reference to the entire original 'rule' string.
    // This could prevent the garbage collector (GC) from freeing the memory allocated for filter rules.
    // This hidden reference occurs because the substring might not create a new string but rather
    // a view into the original, keeping it in memory longer than necessary.
    // And we receive a memory leak here because we store parsed tags from first N lines of the filter rules
    // which have references to the original large string with filter rules.
    // To ensure that the original large string can be garbage collected, and only the necessary
    // substring is retained, we explicitly force a copy of the substring via split and join,
    // thereby breaking the direct reference to the original string and allowing the GC to free the memory
    // for filter rules when they are no longer in use.
    return ruleSourceText.split('').join('');
};
/**
 * Helper function to get the rule source index (line start index in the source) from the source map by the rule index.
 *
 * @param ruleIdx Rule index.
 * @param sourceMap Source map.
 *
 * @returns Rule source index or RULE_INDEX_NONE (-1).
 *
 * @note Similar to `Array.prototype.indexOf`, we return -1 if the rule index is not found.
 */
const getRuleSourceIndex = (ruleIdx, sourceMap) => {
    return sourceMap[ruleIdx] ?? RULE_INDEX_NONE;
};

/**
 * FilterScanner returns indexed, only network rules from IFilter's content.
 */
class FilterScanner {
    filter;
    filterId;
    /**
     * Constructor of FilterScanner.
     *
     * @param filter From which filter the rules should be scanned.
     * @param filterId Id of filter.
     */
    constructor(filter, filterId) {
        this.filter = filter;
        this.filterId = filterId;
    }
    /**
     * Creates new filter scanner.
     *
     * @param filter From which filter the rules should be scanned.
     *
     * @returns New FilterScanner.
     */
    static async createNew(filter) {
        const content = await filter.getContent();
        return new FilterScanner(content, filter.getId());
    }
    /**
     * Gets the entire contents of the filter, extracts only the network rules
     * (ignore cosmetic and host rules) and tries to convert each line into an
     * indexed rule with hash.
     *
     * @param filterFn If this function is specified, it will be applied to each
     * rule after it has been parsed and transformed. This function is needed
     * for example to apply $badfilter: to exclude negated rules from the array
     * of rules that will be returned.
     * @param maxNumberOfScannedNetworkRules Maximum number of network rules to
     * scan, all other rules will be ignored and an error {@link MaxScannedRulesError}
     * will be added to the list of result errors.
     *
     * @returns List of indexed rules with hash. If filterFn was specified then
     * out values will be filtered with this function.
     */
    getIndexedRules(filterFn, maxNumberOfScannedNetworkRules) {
        const { filterList } = this.filter;
        const result = {
            errors: [],
            rules: [],
        };
        const buffer = new InputByteBuffer(filterList);
        const reader = new BufferReader(buffer);
        let ruleBufferIndex = reader.getCurrentPos();
        let ruleNode = reader.readNext();
        let curNumberOfScannedNetworkRules = 0;
        while (ruleNode) {
            let indexedNetworkRulesWithHash = [];
            try {
                indexedNetworkRulesWithHash = IndexedNetworkRuleWithHash.createFromNode(this.filterId, ruleBufferIndex, ruleNode);
            }
            catch (e) {
                if (e instanceof Error) {
                    result.errors.push(e);
                }
                else {
                    const lineIndex = getRuleSourceIndex(ruleBufferIndex, this.filter.sourceMap);
                    const rawRule = getRuleSourceText(lineIndex, this.filter.rawFilterList);
                    const originalRawRule = this.filter.conversionMap[lineIndex];
                    // eslint-disable-next-line max-len
                    let errorMessage = `Unknown error during creating indexed rule with hash from raw string: filter id - ${this.filterId}, line index - ${lineIndex}, line - ${rawRule}`;
                    if (originalRawRule) {
                        errorMessage += `, original line - ${originalRawRule}`;
                    }
                    const err = new Error(errorMessage);
                    result.errors.push(err);
                }
                continue;
            }
            finally {
                ruleBufferIndex = reader.getCurrentPos();
                ruleNode = reader.readNext();
            }
            const filteredRules = filterFn
                ? indexedNetworkRulesWithHash.filter(filterFn)
                : indexedNetworkRulesWithHash;
            result.rules.push(...filteredRules);
            curNumberOfScannedNetworkRules += filteredRules.length;
            if (maxNumberOfScannedNetworkRules !== undefined
                && curNumberOfScannedNetworkRules >= maxNumberOfScannedNetworkRules) {
                const lastScannedRule = indexedNetworkRulesWithHash[indexedNetworkRulesWithHash.length - 1];
                const lineIndex = getRuleSourceIndex(lastScannedRule.index, this.filter.sourceMap);
                // This error needed for future improvements, for example
                // to show in the UI which rules were skipped.
                const err = new MaxScannedRulesError(`Maximum number of scanned network rules reached at line index ${lineIndex}.`, lineIndex);
                result.errors.push(err);
                break;
            }
        }
        return result;
    }
}

/**
 * Scanner for network rules from list of filters.
 */
class NetworkRulesScanner {
    /**
     * Asynchronous scans the list of filters for network rules.
     *
     * @param filterList List of {@link IFilter}.
     * @param filterFn If this function is specified, it will be applied to each
     * rule after it has been parsed and transformed. This function is needed
     * for example to apply $badfilter: to exclude negated rules from the array
     * of rules that will be returned.
     * @param maxNumberOfScannedNetworkRules Maximum number of network rules to
     * scan, all other rules will be ignored. It will be applied to each filter
     * separately, not for cumulative scope of rules from all filters, because
     * it looks simpler and more predictable solution to prevent too long scan.
     *
     * @returns List of filters includes the scanned filters and any errors that
     * may occur during the scan.
     */
    static async scanRules(filterList, filterFn, maxNumberOfScannedNetworkRules) {
        const res = {
            errors: [],
            filters: [],
        };
        const promises = filterList.map(async (filter) => {
            const scanner = await FilterScanner.createNew(filter);
            const { errors, rules } = scanner.getIndexedRules(filterFn, maxNumberOfScannedNetworkRules);
            res.errors = res.errors.concat(errors);
            const badFilterRules = rules.filter(({ rule }) => {
                return rule.rule.isOptionEnabled(NetworkRuleOption.Badfilter);
            });
            return {
                id: filter.getId(),
                rules,
                badFilterRules,
            };
        });
        const tasks = await Promise.allSettled(promises);
        tasks.forEach((task, index) => {
            if (task.status === 'rejected') {
                const filterId = filterList[index].getId();
                res.errors.push(new Error(`Cannot scan rules from filter ${filterId}: ${task.reason}`));
                return;
            }
            res.filters.push(task.value);
        });
        return res;
    }
}

/**
 * @typedef {import('./errors/unavailable-sources-errors').UnavailableFilterSourceError} UnavailableFilterSourceError
 */
/**
 * @typedef {import('./declarative-rule').DeclarativeRule} DeclarativeRule
 */
/* eslint-disable jsdoc/require-description-complete-sentence  */
/**
 * @file Describes the conversion from a filter list {@link IFilter}
 * to rule sets {@link IRuleSet} with declarative rules {@link DeclarativeRule}.
 *
 *                                                                           Conversion
 *
 *
 *
 *
 *       Two entry points        │                FilterConverter             │             RulesConverter
 *                               │                                            │
 *                               │       Perform the conversion at the        │      Perform the conversion at the
 *                               │       filter level.                        │      rules level.
 *                               │                                            │
 *  Converting static rules      │       Validate passed number of rules      │
 *  during extension assembly.   │       and path to web accessible resources.│
 * ┌─────────────────────────┐   │      ┌────────────────────────────────┐    │
 * │                         ├─┬─┼─────►│                                │    │
 * │  convertStaticRuleSet() │ │ │      │      checkConverterOptions()   │    │
 * │                         │ │ │  ┌───┤                                │    │
 * └─────────────────────────┘ │ │  │   └────────────────────────────────┘    │
 *                             │ │  │                                         │
 *  On-the-fly conversion      │ │  │    Filter only network rules and create │
 *  for dynamic rules.         │ │  │    indexed rule with hash.              │
 * ┌─────────────────────────┐ │ │  │    In this method, when converting      │
 * │                         │ │ │  │    dynamic rules, the rules canceled by │
 * │ convertDynamicRuleSets()├─┘ │  │    $badfilter rules from static filters │
 * │                         │   │  │    are filtered out - such rules are    │
 * └─────────────────────────┘   │  │    discarded during filter scanning.    │
 *                               │  │   ┌────────────────────────────────┐    │
 *                               │  └──►│                                │    │
 *                               │      │ NetworkRulesScanner.scanRules()│    │
 *                               │  ┌───┤                                │    │
 *                               │  │   └────────────────────────────────┘    │  Filter rules affected by $badfilter
 *                               │  │                                         │  within one filter, then group the rules
 *                               │  │                                         │  based on modifiers, requiring specific
 *                               │  │    Convert our network rule to DNR.     │  conversion processes such as
 *                               │  │   ┌────────────────────────────────┐    │  post-processing for similar rules.
 *                               │  └──►│                                │    │   ┌────────────────────────────────┐
 *                               │      │           convert()            ├────┼───┤                                │
 *                               │      │                                │    │   │        applyBadFilter()        │
 *                               │      └────────────────────────────────┘    │ ┌─┤                                │
 *                               │                                            │ │ └────────────────────────────────┘
 *                               │                                            │ │
 *                               │                                            │ │ Each group of rules within a single
 *                               │                                            │ │ filter has its converter that performs
 *                               │                                            │ │ the conversion, then combines the
 *                               │                                            │ │ results and returns them.
 *                               │                                            │ │
 *                               │                                            │ │ For details, please go to the
 *                               │                                            │ │ abstract-rule-converter.ts schema.
 *                               │                                            │ │ ┌────────────────────────────────┐
 *                               │                                            │ └►│                                │
 *                               │                                            │   │          convertRules()        │
 *                               │                                            │ ┌─┤                                │
 *                               │                                            │ │ └────────────────────────────────┘
 *                               │                                            │ │
 *                               │                                            │ │ The declarative rules are checked to
 *                               │                                            │ │ ensure they meet the specified
 *                               │                                            │ │ constraints, and if necessary,
 *                               │                                            │ │ some rules are removed.
 *                               │                                            │ │ ┌────────────────────────────────┐
 *                               │                                            │ └►│                                │
 *                               │                                            │   │         checkLimitations()     │
 *                               │   ┌────────────────────────────────────────┼───┤                                │
 *                               │   │                                        │   └────────────────────────────────┘
 *                               │   │   Wrap conversion result into RuleSet. │
 *                               │   │  ┌────────────────────────────────┐    │
 *                               │   └─►│                                │    │
 *                               │      │    collectConvertedResult()    │    │
 *                               │  ┌───┤                                │    │
 *                               │  │   └────────────────────────────────┘    │
 *                               │  │                                         │
 *                               │  │    This method is only called during the│
 *                               │  │    conversion of dynamic rules.         │
 *                               │  │    Applies rules with $badfilter        │
 *                               │  │    modifier from dynamic rulesets to    │
 *                               │  │    all rules from static rulesets and   │
 *                               │  │    returns list of ids of declarative   │
 *                               │  │    rules to disable them.               │
 *                               │  │   ┌──────────────────────────────────┐  │
 *                               │  └──►│                                  │  │
 *                               │      │ collectDeclarativeRulesToCancel()│  │
 *                               │      │                                  │  │
 *                               │      └──────────────────────────────────┘  │
 *                               │                                            │
 */
/* eslint-enable jsdoc/require-description-complete-sentence */
/**
 * Converts a list of IFilters to a single rule set or to a list of rule sets.
 */
class DeclarativeFilterConverter {
    /**
     * Same as chrome.declarativeNetRequest.DYNAMIC_RULESET_ID.
     */
    static COMBINED_RULESET_ID = '_dynamic';
    /**
     * Number of scanned rules can be limited via converter options. In this
     * case we increase the limit by 10% to scan more rules in case of some
     * network rules will be combined into one declarative rule. It is safe,
     * because we have double check for maxNumberOfRules on the converted DNR
     * rules.
     */
    static SCANNED_NETWORK_RULES_MULTIPLICATOR = 1.1;
    /**
     * Checks that provided converter options are correct.
     *
     * @param options Contains path to web accessible resources,
     * maximum number of converter rules and regexp rules. @see
     * {@link DeclarativeConverterOptions} for details.
     *
     * @throws An {@link ResourcesPathError} if the resources path does not
     * start with a slash or it ends with a slash
     * OR an {@link EmptyOrNegativeNumberOfRulesError} if maximum number of
     * rules is equal or less than 0.
     * OR an {@link NegativeNumberOfRulesError} if maximum number of
     * regexp rules is less than 0.
     */
    static checkConverterOptions(options) {
        const { resourcesPath, maxNumberOfRules, maxNumberOfUnsafeRules, maxNumberOfRegexpRules, } = options;
        if (resourcesPath !== undefined) {
            const firstChar = 0;
            const lastChar = resourcesPath.length > 0
                ? resourcesPath.length - 1
                : 0;
            if (resourcesPath[firstChar] !== '/') {
                const msg = 'Path to web accessible resources should '
                    + `be started with leading slash: ${resourcesPath}`;
                throw new ResourcesPathError(msg);
            }
            if (resourcesPath[lastChar] === '/') {
                const msg = 'Path to web accessible resources should '
                    + `not be ended with slash: ${resourcesPath}`;
                throw new ResourcesPathError(msg);
            }
        }
        if (maxNumberOfRules !== undefined && maxNumberOfRules <= 0) {
            const msg = 'Maximum number of rules cannot be equal or less than 0';
            throw new EmptyOrNegativeNumberOfRulesError(msg);
        }
        if (maxNumberOfUnsafeRules && maxNumberOfUnsafeRules < 0) {
            const msg = 'Maximum number of unsafe rules cannot be less than 0';
            throw new NegativeNumberOfRulesError(msg);
        }
        if (maxNumberOfRegexpRules && maxNumberOfRegexpRules < 0) {
            const msg = 'Maximum number of regexp rules cannot be less than 0';
            throw new NegativeNumberOfRulesError(msg);
        }
    }
    /** @inheritdoc */
    // eslint-disable-next-line class-methods-use-this
    async convertStaticRuleSet(filter, options) {
        if (options) {
            DeclarativeFilterConverter.checkConverterOptions(options);
        }
        if (options?.maxNumberOfUnsafeRules !== undefined) {
            throw new Error('Static rulesets do not require the maximum number of unsafe rules');
        }
        const { errors, filters } = await NetworkRulesScanner.scanRules([filter]);
        const [scannedStaticFilter] = filters;
        const { id, badFilterRules } = scannedStaticFilter;
        const convertedRules = await DeclarativeRulesConverter.convert(filters, options);
        const conversionResult = DeclarativeFilterConverter.collectConvertedResult(`ruleset_${id}`, [filter], filters, convertedRules, badFilterRules);
        return {
            ruleSet: conversionResult.ruleSet,
            errors: errors.concat(conversionResult.errors),
            limitations: conversionResult.limitations,
        };
    }
    /** @inheritdoc */
    // eslint-disable-next-line class-methods-use-this
    async convertDynamicRuleSets(filterList, staticRuleSets, options) {
        if (options) {
            DeclarativeFilterConverter.checkConverterOptions(options);
        }
        const allStaticBadFilterRules = DeclarativeFilterConverter.createBadFilterRulesHashMap(staticRuleSets);
        const skipNegatedRulesFn = (r) => {
            const fastMatchedBadFilterRules = allStaticBadFilterRules.get(r.hash);
            if (!fastMatchedBadFilterRules) {
                return true;
            }
            for (let i = 0; i < fastMatchedBadFilterRules.length; i += 1) {
                const rule = fastMatchedBadFilterRules[i];
                const badFilterRule = rule.rule;
                const ruleToCheck = r.rule;
                if (badFilterRule.rule.negatesBadfilter(ruleToCheck.rule)) {
                    return false;
                }
            }
            return true;
        };
        // Note: if we drop some rules because of applying $badfilter - we
        // cannot show info about it to user.
        const scanned = await NetworkRulesScanner.scanRules(filterList, skipNegatedRulesFn, 
        // We increase the limit by 10% to scan more rules in case of some
        // network rules will be combined into one declarative rule. It is
        // safe, because we have double check for maxNumberOfRules on the
        // converted DNR rules.
        options?.maxNumberOfRules
            ? Math.ceil(options.maxNumberOfRules * DeclarativeFilterConverter.SCANNED_NETWORK_RULES_MULTIPLICATOR)
            : undefined);
        const convertedRules = await DeclarativeRulesConverter.convert(scanned.filters, options);
        const dynamicBadFilterRules = scanned.filters
            .map(({ badFilterRules }) => badFilterRules)
            .flat();
        const conversionResult = DeclarativeFilterConverter.collectConvertedResult(DeclarativeFilterConverter.COMBINED_RULESET_ID, filterList, scanned.filters, convertedRules, dynamicBadFilterRules);
        const { declarativeRulesToCancel, errors } = await DeclarativeFilterConverter.collectDeclarativeRulesToCancel(staticRuleSets, dynamicBadFilterRules);
        conversionResult.errors = conversionResult.errors
            .concat(scanned.errors)
            .concat(errors);
        conversionResult.declarativeRulesToCancel = declarativeRulesToCancel;
        return conversionResult;
    }
    /**
     * Collects {@link ConversionResult} from provided list of raw filters,
     * scanned filters, converted rules and bad filter rules.
     * Creates new {@link RuleSet} and wrap all data for {@link RuleSetContentProvider}.
     *
     * @param ruleSetId Rule set id.
     * @param filterList List of raw filters.
     * @param scannedFilters Already scanned filters.
     * @param convertedRules Converted rules.
     * @param badFilterRules List of rules with $badfilter modifier.
     *
     * @returns Item of {@link ConversionResult}.
     */
    static collectConvertedResult(ruleSetId, filterList, scannedFilters, convertedRules, badFilterRules) {
        const { sourceMapValues, declarativeRules, errors, limitations = [], } = convertedRules;
        const ruleSetContent = {
            loadSourceMap: async () => new SourceMap(sourceMapValues),
            loadFilterList: async () => filterList,
            loadDeclarativeRules: async () => declarativeRules,
        };
        const listOfRulesWithHash = scannedFilters
            .map(({ id, rules }) => {
            return rules.map((r) => ({
                hash: r.hash,
                source: {
                    sourceRuleIndex: r.index,
                    filterId: id,
                },
            }));
        })
            .flat();
        const rulesHashMap = new RulesHashMap(listOfRulesWithHash);
        const unsafeRulesCount = declarativeRules.filter((r) => !isSafeRule(r)).length;
        const regexRulesCount = declarativeRules.filter((r) => DeclarativeRulesConverter.isRegexRule(r)).length;
        const ruleSet = new RuleSet(ruleSetId, declarativeRules.length, unsafeRulesCount, regexRulesCount, ruleSetContent, badFilterRules, rulesHashMap);
        return {
            ruleSet,
            errors,
            limitations,
        };
    }
    /**
     * Creates dictionary where key is hash of indexed rule and value is array
     * of rules with this hash.
     *
     * @param ruleSets A list of IRuleSets for each of which a list of
     * $badfilter rules.
     *
     * @returns Dictionary with all $badfilter rules which are extracted from
     * rulesets.
     */
    static createBadFilterRulesHashMap(ruleSets) {
        const allStaticBadFilterRules = new Map();
        ruleSets.forEach((ruleSet) => {
            ruleSet.getBadFilterRules().forEach((r) => {
                const existingValue = allStaticBadFilterRules.get(r.hash);
                if (existingValue) {
                    existingValue.push(r);
                }
                else {
                    allStaticBadFilterRules.set(r.hash, [r]);
                }
            });
        });
        return allStaticBadFilterRules;
    }
    /**
     * Checks if some rules (fastMatchedRulesByHash) from the staticRuleSet,
     * which have been fast matched by hash, can be negated with the provided
     * badFilterRule via the `$badfilter` option.
     *
     * @param badFilterRule Network rule with hash {@link IndexedNetworkRuleWithHash}
     * and `$badfilter` option.
     * @param staticRuleSet Static rule set which contains fast matched rules.
     * @param fastMatchedRulesByHash Rules that have been fast matched by hash
     * for potential negation.
     *
     * @returns List of declarative rule IDs that have been canceled by
     * the provided badFilterRule.
     */
    static async checkFastMatchedRulesCanBeCancelled(badFilterRule, staticRuleSet, fastMatchedRulesByHash) {
        const fastMatchedDeclarativeRulesIds = [];
        try {
            const promises = fastMatchedRulesByHash.map(async (source) => {
                return staticRuleSet.getDeclarativeRulesIdsBySourceRuleIndex(source);
            });
            const ids = await Promise.all(promises);
            fastMatchedDeclarativeRulesIds.push(...ids.flat());
        }
        catch (e) {
            // eslint-disable-next-line max-len
            throw new Error(`Not found declarative rule id for some source from list: ${JSON.stringify(fastMatchedDeclarativeRulesIds)}: ${getErrorMessage(e)}`);
        }
        const disableRuleIds = [];
        for (let k = 0; k < fastMatchedDeclarativeRulesIds.length; k += 1) {
            const id = fastMatchedDeclarativeRulesIds[k];
            let matchedSourceRules = [];
            try {
                // eslint-disable-next-line no-await-in-loop
                matchedSourceRules = await staticRuleSet.getRulesById(id);
            }
            catch (e) {
                throw new Error(`Not found sources for declarative rule with id "${id}": ${getErrorMessage(e)}`);
            }
            let indexedNetworkRulesWithHash = [];
            try {
                // eslint-disable-next-line no-await-in-loop
                const arrayWithRules = await Promise.all(matchedSourceRules.map((source) => {
                    return RuleSet.getNetworkRuleBySourceRule(source);
                }));
                indexedNetworkRulesWithHash = arrayWithRules.flat();
            }
            catch (e) {
                // eslint-disable-next-line max-len
                throw new Error(`Not found network rules from matched sources "${JSON.stringify(matchedSourceRules)}": ${getErrorMessage(e)}`);
            }
            // NOTE: Here we use .some but not .every to simplify first
            // version of applying $badfilter rules.
            const someRulesMatched = indexedNetworkRulesWithHash
                .flat()
                .some((rule) => badFilterRule.rule.rule.negatesBadfilter(rule));
            if (someRulesMatched) {
                disableRuleIds.push(id);
            }
        }
        return disableRuleIds;
    }
    /**
     * Applies rules with $badfilter modifier from dynamic rulesets to all rules
     * from static rulesets and returns list of ids of declarative rules to
     * disable them.
     *
     * @param staticRuleSets List of converted static rulesets.
     * @param dynamicBadFilterRules List of rules with $badfilter.
     *
     * @returns List of ids of declarative rules to disable them.
     */
    static async collectDeclarativeRulesToCancel(staticRuleSets, dynamicBadFilterRules) {
        const declarativeRulesToCancel = [];
        const errors = [];
        // Check every static ruleset.
        for (let i = 0; i < staticRuleSets.length; i += 1) {
            const staticRuleSet = staticRuleSets[i];
            const disableRuleIds = [];
            // Check every rule with $badfilter from dynamic filters
            // (custom filter and user rules).
            for (let j = 0; j < dynamicBadFilterRules.length; j += 1) {
                const badFilterRule = dynamicBadFilterRules[j];
                const hashMap = staticRuleSet.getRulesHashMap();
                const fastMatchedRulesByHash = hashMap.findRules(badFilterRule.hash);
                if (fastMatchedRulesByHash.length === 0) {
                    continue;
                }
                try {
                    // eslint-disable-next-line no-await-in-loop
                    const ids = await DeclarativeFilterConverter.checkFastMatchedRulesCanBeCancelled(badFilterRule, staticRuleSet, fastMatchedRulesByHash);
                    disableRuleIds.push(...ids);
                }
                catch (e) {
                    errors.push(new Error(`Cannot apply badfilter: ${getErrorMessage(e)}`));
                }
            }
            if (disableRuleIds.length > 0) {
                declarativeRulesToCancel.push({
                    rulesetId: staticRuleSet.getId(),
                    disableRuleIds,
                });
            }
        }
        return {
            errors,
            declarativeRulesToCancel,
        };
    }
}

/**
 * Describes an error when filter source is not available.
 */
class UnavailableFilterSourceError extends Error {
    filterId;
    /**
     * Describes an error when filter source is not available.
     *
     * @param message Message of error.
     * @param filterId Filter id, the source of which is not available.
     * @param cause Basic error, describes why the source is unavailable.
     */
    constructor(message, filterId, cause) {
        super(message, { cause });
        this.name = this.constructor.name;
        this.filterId = filterId;
        // For proper work of the "instanceof" operator
        Object.setPrototypeOf(this, UnavailableFilterSourceError.prototype);
    }
}

/**
 * Saves the original rules and can return all original rules or just one,
 * with lazy content loading.
 */
class Filter {
    /**
     * ID of filter.
     */
    id;
    /**
     * Content of filter (lazy loading).
     */
    content = null;
    /**
     * Promise for content loading.
     */
    contentLoadingPromise = null;
    /**
     * Provider of filter content.
     */
    source;
    /**
     * Filter trusted flag.
     */
    trusted;
    /**
     * Creates new FilterList.
     *
     * @param id Number id of filter.
     * @param source Provider of filter content.
     * @param trusted Filter trusted flag.
     */
    constructor(id, source, trusted) {
        this.id = id;
        this.source = source;
        this.trusted = trusted;
    }
    /** @inheritdoc */
    getId() {
        return this.id;
    }
    /** @inheritdoc */
    async getContent() {
        // If content is already loaded, return it
        if (this.content) {
            return this.content;
        }
        // If content is currently loading, return the existing promise
        if (this.contentLoadingPromise) {
            return this.contentLoadingPromise;
        }
        // Assign the promise immediately to avoid race conditions
        this.contentLoadingPromise = (async () => {
            try {
                const content = await this.source.getContent();
                if (!content || content.rawFilterList.length === 0 || content.filterList.length === 0) {
                    throw new Error('Loaded empty content');
                }
                // Assign content and clear the loading promise
                this.content = content;
                this.contentLoadingPromise = null;
                return content;
            }
            catch (e) {
                // Reset the loading promise so future calls can retry
                this.contentLoadingPromise = null;
                throw new UnavailableFilterSourceError('Filter content is unavailable', this.id, e);
            }
        })();
        return this.contentLoadingPromise;
    }
    /** @inheritdoc */
    async getRuleByIndex(index) {
        const content = await this.getContent();
        const lineIndex = getRuleSourceIndex(index, content.sourceMap);
        const sourceRule = getRuleSourceText(lineIndex, content.rawFilterList) ?? EMPTY_STRING;
        return sourceRule;
    }
    /** @inheritdoc */
    isTrusted() {
        return this.trusted;
    }
    /** @inheritdoc */
    unloadContent() {
        // If content is not loaded and not loading, there is nothing to unload
        if (!this.content && !this.contentLoadingPromise) {
            return;
        }
        // If loading is in progress
        if (this.contentLoadingPromise) {
            this.contentLoadingPromise.finally(() => {
                this.unloadContent();
            });
            return;
        }
        // Unload content
        this.content = null;
        this.contentLoadingPromise = null;
    }
}
/**
 * Checksum map validator.
 */
const checksumMapValidator = recordType(stringType());
/**
 * Metadata validator.
 */
const metadataValidator = objectType({
    /**
     * Checksums for all rulesets.
     */
    checksums: checksumMapValidator,
    /**
     * Additional properties.
     * This field stores any extra information not covered by the other fields.
     * The content of this field is not validated, but it must be JSON serializable.
     * Validation should be performed by users.
     */
    additionalProperties: recordType(unknownType()),
});
/**
 * Metadata rule validator.
 *
 * @note We use `passthrough` method to allow additional fields in the object.
 */
objectType({
    metadata: metadataValidator,
}).passthrough();

export { DECLARATIVE_REQUEST_METHOD_MAP, DECLARATIVE_RESOURCE_TYPES_MAP, DeclarativeFilterConverter, DeclarativeRuleValidator, DomainType, EmptyOrNegativeNumberOfRulesError, EmptyResourcesError, Filter, HeaderOperation, IndexedNetworkRuleWithHash, InvalidDeclarativeRuleError, MaxScannedRulesError, NegativeNumberOfRulesError, RequestMethod, ResourceType, ResourcesPathError, RuleActionType, RuleSet, RulesHashMap, SourceMap, TooManyRegexpRulesError, TooManyRulesError, TooManyUnsafeRulesError, UnavailableFilterSourceError, UnavailableRuleSetSourceError, UnsupportedModifierError, UnsupportedRegexpError };
