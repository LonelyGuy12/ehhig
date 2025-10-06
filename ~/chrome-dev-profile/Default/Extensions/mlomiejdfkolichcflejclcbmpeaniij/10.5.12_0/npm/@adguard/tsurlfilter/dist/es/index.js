import { getPublicSuffix } from '../../../../tldts/dist/es6/index.js';
import { Logger } from '../../../logger/dist/es/index.js';
import { d as findNextLineBreakIndex, L as LF, E as EMPTY_STRING, S as SimpleRegex, h as hasSpaces, b as stringArraysEquals, c as stringArraysHaveIntersection, W as WILDCARD, i as isString, u as unescapeChar, a as SEPARATOR, s as splitByDelimiterWithEscapeCharacter } from './simple-regex-Dw3J24Ss.js';
export { l as findNextUnescapedIndex, n as isAlpha, o as isAlphaNumeric, m as isNumber, r as replaceAll } from './simple-regex-Dw3J24Ss.js';
import { isRedirectResourceCompatibleWithAdg, isValidScriptletName } from '../../../scriptlets/dist/validators/index.js';
import { tokenizeExtended, TokenType, decodeIdent } from '../../../css-tokenizer/dist/csstokenizer.js';
import { record as recordType, string as stringType, number as numberType, array as arrayType, custom, object as objectType, ZodError } from '../../npm/zod/lib/index.js';
import { fromZodError } from '../../../../zod-validation-error/v3/index.js';
import { OPTIONS_DELIMITER, MASK_ALLOWLIST, NOT_MARK, NETWORK_RULE_OPTIONS } from './network-rule-options.js';
import { RequestType } from './request-type.js';
import isCidr from '../../../../../virtual/index.js';
import isIp from '../../../../../virtual/index2.js';
import { contains } from '../../../../cidr-tools/index.js';
import { OutputByteBuffer } from '../../../agtree/dist/utils/output-byte-buffer.js';
import { RuleParser } from '../../../agtree/dist/parser/rule-parser.js';
import { defaultParserOptions } from '../../../agtree/dist/parser/options.js';
import { RuleCategory, CosmeticRuleType, NetworkRuleType } from '../../../agtree/dist/nodes/index.js';
import { RuleConverter } from '../../../agtree/dist/converter/rule.js';
import { RuleGenerator } from '../../../agtree/dist/generator/rule-generator.js';
import { RuleSerializer } from '../../../agtree/dist/serializer/rule-serializer.js';
import { InputByteBuffer } from '../../../agtree/dist/utils/input-byte-buffer.js';
import { RuleDeserializer } from '../../../agtree/dist/deserializer/rule-deserializer.js';
import { DomainListParser } from '../../../agtree/dist/parser/misc/domain-list-parser.js';
import { PIPE_MODIFIER_SEPARATOR, COMMA_DOMAIN_LIST_SEPARATOR, ADG_SCRIPTLET_MASK } from '../../../agtree/dist/utils/constants.js';
import { DomainUtils } from '../../../agtree/dist/utils/domain.js';
import { QuoteUtils, QuoteType } from '../../../agtree/dist/utils/quotes.js';
import { CosmeticRuleSeparatorUtils } from '../../../agtree/dist/utils/cosmetic-rule-separator.js';
import { CosmeticRuleBodyGenerator } from '../../../agtree/dist/generator/cosmetic/cosmetic-rule-body-generator.js';
import { scriptlets } from '../../../scriptlets/dist/scriptlets/index.js';
import { AdblockSyntax } from '../../../agtree/dist/utils/adblockers.js';

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
 * CosmeticOption is the enumeration of various content script options.
 * Depending on the set of enabled flags the content script will contain different set of settings.
 */
var CosmeticOption;
(function (CosmeticOption) {
    /**
     * If generic elemhide and CSS rules are enabled.
     * Could be disabled by a $generichide rule and $elemhide rule.
     */
    CosmeticOption[CosmeticOption["CosmeticOptionGenericCSS"] = 2] = "CosmeticOptionGenericCSS";
    /**
     * If specific elemhide and CSS rules are enabled.
     * Could be disabled by a $specifichide rule and $elemhide rule.
     */
    CosmeticOption[CosmeticOption["CosmeticOptionSpecificCSS"] = 4] = "CosmeticOptionSpecificCSS";
    /**
     * If JS rules and scriptlets are enabled.
     * Could be disabled by a $jsinject rule.
     */
    CosmeticOption[CosmeticOption["CosmeticOptionJS"] = 8] = "CosmeticOptionJS";
    /**
     * If HTML filtering rules are enabled.
     * Could be disabled by a $content rule.
     */
    CosmeticOption[CosmeticOption["CosmeticOptionHtml"] = 16] = "CosmeticOptionHtml";
    /**
     * TODO: Add support for these flags.
     *
     * They are useful when content script is injected into an iframe.
     * In this case we can check what flags were applied to the top-level frame.
     */
    CosmeticOption[CosmeticOption["CosmeticOptionSourceGenericCSS"] = 32] = "CosmeticOptionSourceGenericCSS";
    CosmeticOption[CosmeticOption["CosmeticOptionSourceCSS"] = 64] = "CosmeticOptionSourceCSS";
    CosmeticOption[CosmeticOption["CosmeticOptionSourceJS"] = 128] = "CosmeticOptionSourceJS";
    /**
     * Everything is enabled.
     */
    CosmeticOption[CosmeticOption["CosmeticOptionAll"] = 30] = "CosmeticOptionAll";
    /**
     * Everything is disabled.
     */
    CosmeticOption[CosmeticOption["CosmeticOptionNone"] = 0] = "CosmeticOptionNone";
})(CosmeticOption || (CosmeticOption = {}));

/**
 * Scanner types enum.
 */
var ScannerType;
(function (ScannerType) {
    /**
     * Scanning for network rules.
     */
    ScannerType[ScannerType["NetworkRules"] = 0] = "NetworkRules";
    /**
     * Scanning for cosmetic rules.
     */
    ScannerType[ScannerType["CosmeticRules"] = 2] = "CosmeticRules";
    /**
     * Scanning for host rules.
     */
    ScannerType[ScannerType["HostRules"] = 4] = "HostRules";
    /**
     * All types of rules.
     */
    ScannerType[ScannerType["All"] = 6] = "All";
})(ScannerType || (ScannerType = {}));

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
 * Source map.
 *
 * @note Since serialized rule nodes are not store original rule text, we need this source map between the
 * serialized filter list and the raw filter list.
 */
const filterListSourceMapValidator = recordType(
/**
 * Rule start index in the converted list's byte buffer.
 */
stringType(), 
/**
 * Rule start index in the raw converted list.
 */
numberType());
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
 * List identifier max value.
 * We use "number" type for storage indexes, so we have some limits for list
 * identifiers.
 * We use line number for rule index, so if we save 11 ranks for rules, then we
 * have 6 ranks left for list ids. Check RuleStorageScanner class for more info.
 */
const LIST_ID_MAX_VALUE = 10 ** 6;

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
 * Rule scanner provides the functionality for reading rules from a filter list.
 */
// TODO: Change string filter list to byte buffer.
class RuleScanner {
    /**
     * Filter list ID.
     */
    listId;
    /**
     * True if we should ignore cosmetic rules.
     */
    ignoreCosmetic;
    /**
     * True if we should ignore javascript cosmetic rules.
     */
    ignoreJS;
    /**
     * True if we should ignore unsafe rules, like $removeheader.
     */
    ignoreUnsafe;
    /**
     * True if we should ignore network rules.
     */
    ignoreNetwork;
    /**
     * True if we should ignore host filtering rules.
     */
    ignoreHost;
    /**
     * Underlying reader object.
     */
    reader;
    /**
     * Current rule.
     */
    currentRule = null;
    /**
     * Index of the beginning of the current rule (basically, a line number).
     */
    currentRuleIndex = 0;
    /**
     * Constructor of a RuleScanner object.
     *
     * @param reader Source of the filtering rules.
     * @param listId Filter list ID.
     * @param configuration Scanner configuration object.
     */
    constructor(reader, listId, configuration) {
        this.reader = reader;
        this.listId = listId;
        this.ignoreCosmetic = !!configuration.ignoreCosmetic
            || ((configuration.scannerType & ScannerType.CosmeticRules) !== ScannerType.CosmeticRules);
        this.ignoreNetwork = (configuration.scannerType & ScannerType.NetworkRules) !== ScannerType.NetworkRules;
        this.ignoreHost = (configuration.scannerType & ScannerType.HostRules) !== ScannerType.HostRules;
        this.ignoreJS = !!configuration.ignoreJS;
        this.ignoreUnsafe = !!configuration.ignoreUnsafe;
    }
    /**
     * Scan advances the RuleScanner to the next rule, which will then be
     * available through the getRule() method.
     *
     * @returns - False when the scan stops, either by reaching the end of the
     * input or an error. If there's a rule available, returns true.
     */
    scan() {
        let lineIndex = this.reader.getCurrentPos();
        let line = this.readNext();
        while (line) {
            if (!this.isIgnored(line)) {
                const rule = RuleFactory.createRule(line, this.listId, lineIndex, this.ignoreNetwork, this.ignoreCosmetic, this.ignoreHost);
                this.currentRule = rule;
                this.currentRuleIndex = lineIndex;
                return true;
            }
            lineIndex = this.reader.getCurrentPos();
            line = this.readNext();
        }
        return false;
    }
    /**
     * @returns - The most recent rule generated by a call to scan(), and the
     * index of this rule's text.
     */
    getRule() {
        if (this.currentRule) {
            return new IndexedRule(this.currentRule, this.currentRuleIndex);
        }
        return null;
    }
    /**
     * Get filter list id.
     *
     * @returns List id.
     */
    getListId() {
        return this.listId;
    }
    /**
     * Get the length of the data read by the scanner.
     *
     * @returns Data length.
     */
    getDataLength() {
        return this.reader.getDataLength();
    }
    /**
     * Reads the next line and returns it.
     *
     * @returns - Next line string or null.
     */
    readNext() {
        return this.reader.readNext();
    }
    /**
     * Checks if the rule should be ignored by this scanner.
     *
     * @param rule Rule to check.
     *
     * @returns - True if the rule should be ignored.
     */
    isIgnored(rule) {
        if (!this.ignoreCosmetic && !this.ignoreJS && !this.ignoreUnsafe) {
            return false;
        }
        if (rule.category === RuleCategory.Cosmetic) {
            if (this.ignoreCosmetic) {
                return true;
            }
            // Ignore JS type rules.
            // TODO: in the future we may allow CSS rules and Scriptlets (except
            // for "trusted" scriptlets).
            if (this.ignoreJS
                && (rule.type === CosmeticRuleType.JsInjectionRule
                    || rule.type === CosmeticRuleType.ScriptletInjectionRule)) {
                return true;
            }
        }
        if (this.ignoreUnsafe) {
            if (rule.category === RuleCategory.Network && rule.type === NetworkRuleType.NetworkRule) {
                if (rule.modifiers?.children?.some((modifier) => NetworkRule.ADVANCED_OPTIONS.has(modifier.name.value))) {
                    return true;
                }
            }
        }
        return false;
    }
}

/**
 * BufferRuleList represents a string-based rule list. It keeps the original
 * rule list as a byte array with UTF-8 encoded characters. This approach
 * allows saving on the memory used by tsurlfilter compared to StringRuleList.
 */
class BufferRuleList {
    /**
     * Rule list ID.
     */
    id;
    /**
     * String with filtering rules (one per line) encoded as a
     * UTF-8 array.
     */
    rulesBuffer;
    /**
     * Whether to ignore cosmetic rules or not.
     */
    ignoreCosmetic;
    /**
     * Whether to ignore javascript cosmetic rules or not.
     */
    ignoreJS;
    /**
     * Whether to ignore unsafe (e.g. $removeheader) rules or not.
     */
    ignoreUnsafe;
    /**
     * Source map for the filter list.
     */
    sourceMap;
    /**
     * Text decoder that is used to read strings from the internal buffer of
     * UTF-8 encoded characters.
     */
    static decoder = new TextDecoder('utf-8');
    /**
     * Constructor of BufferRuleList.
     *
     * @param listId List identifier.
     * @param inputRules String with filtering rules (one per line).
     * @param ignoreCosmetic (Optional) True to ignore cosmetic rules.
     * @param ignoreJS (Optional) True to ignore JS rules.
     * @param ignoreUnsafe (Optional) True to ignore unsafe rules.
     * @param sourceMap (Optional) Source map for the filter list.
     */
    constructor(listId, inputRules, ignoreCosmetic, ignoreJS, ignoreUnsafe, sourceMap) {
        if (listId >= LIST_ID_MAX_VALUE) {
            throw new Error(`Invalid list identifier, it must be less than ${LIST_ID_MAX_VALUE}`);
        }
        this.id = listId;
        this.rulesBuffer = new InputByteBuffer(inputRules);
        this.ignoreCosmetic = !!ignoreCosmetic;
        this.ignoreJS = !!ignoreJS;
        this.ignoreUnsafe = !!ignoreUnsafe;
        this.sourceMap = sourceMap ?? {};
    }
    /**
     * Close does nothing as here's nothing to close in the BufferRuleList.
     */
    // eslint-disable-next-line class-methods-use-this
    close() {
        // Empty
    }
    /**
     * @returns The rule list identifier.
     */
    getId() {
        return this.id;
    }
    /**
     * Creates a new rules scanner that reads the list contents.
     *
     * @param scannerType The type of scanner to create.
     *
     * @returns Scanner object.
     */
    newScanner(scannerType) {
        const reader = new BufferReader(this.rulesBuffer.createCopyWithOffset(0));
        return new RuleScanner(reader, this.id, {
            scannerType,
            ignoreCosmetic: this.ignoreCosmetic,
            ignoreJS: this.ignoreJS,
            ignoreUnsafe: this.ignoreUnsafe,
        });
    }
    /**
     * Retrieves a rule node by its index.
     *
     * If there's no rule by that index or the rule is invalid, it will return
     * null.
     *
     * @param ruleIdx Rule index.
     *
     * @returns Rule node or `null`.
     */
    retrieveRuleNode(ruleIdx) {
        try {
            const ruleNode = {};
            const copy = this.rulesBuffer.createCopyWithOffset(ruleIdx);
            RuleDeserializer.deserialize(copy, ruleNode);
            return ruleNode;
        }
        catch (e) {
            // fall through
        }
        return null;
    }
    /**
     * @inheritdoc
     */
    retrieveRuleSourceIndex(ruleIdx) {
        return getRuleSourceIndex(ruleIdx, this.sourceMap);
    }
}

// TODO: Consider moving this file to the `@adguard/agtree` package
/**
 * AGTree parser options for the preprocessor.
 */
const PREPROCESSOR_AGTREE_OPTIONS = {
    ...defaultParserOptions,
    includeRaws: false,
    isLocIncluded: false,
    ignoreComments: false,
    // TODO: Add support for host rules + in the converter
    parseHostRules: false,
};
/**
 * Utility class for pre-processing filter lists before they are used by the AdGuard filtering engine.
 *
 * Concept:
 *
 * Right after a filter list is downloaded, we iterate over its rules and do the following:
 *   1. Parse rule text to AST (Abstract Syntax Tree) (if possible).
 *   2. Convert rule node to AdGuard format (if possible / needed).
 *
 * During this conversion, we also produce two maps:
 *    - Source map:     For performance reasons, we don't store the original rule text in the AST.
 *                      We store AST in a binary serialized format.
 *                      This source map is used to map the rule start index from the serialized filter list to
 *                      its start index in the raw filter list (converted filter list). This is needed to show
 *                      the exact applied rule in the filtering log. This rule text maybe a converted rule,
 *                      but in this case, we can get its original rule text from the conversion map
 *                      (for filtering engine, only the converted filter list is needed).
 *    - Conversion map: Maps the converted rule text to its original rule text. This is needed to show the
 *                      original rule text in the filtering log if a converted rule is applied.
 */
class FilterListPreprocessor {
    /**
     * Processes the raw filter list and converts it to the AdGuard format.
     *
     * @param filterList Raw filter list to convert.
     * @param parseHosts If true, the preprocessor will parse host rules.
     *
     * @returns A {@link PreprocessedFilterList} object which contains the converted filter list,
     * the mapping between the original and converted rules, and the source map.
     */
    static preprocess(filterList, parseHosts = false) {
        const filterListLength = filterList.length;
        const sourceMap = {};
        const conversionMap = {};
        const rawFilterList = [];
        const convertedFilterList = new OutputByteBuffer();
        const firstLineBreakData = findNextLineBreakIndex(filterList);
        let inputOffset = 0;
        let outputOffset = 0;
        let previousLineBreak = firstLineBreakData[1] > 0
            ? filterList.slice(firstLineBreakData[0], firstLineBreakData[0] + firstLineBreakData[1])
            : LF;
        while (inputOffset < filterListLength) {
            const [lineBreakIndex, lineBreakLength] = findNextLineBreakIndex(filterList, inputOffset);
            const ruleText = filterList.slice(inputOffset, lineBreakIndex);
            const lineBreak = filterList.slice(lineBreakIndex, lineBreakIndex + lineBreakLength);
            // parse and convert can throw an error, so we need to catch them
            try {
                const ruleNode = RuleParser.parse(ruleText, {
                    ...PREPROCESSOR_AGTREE_OPTIONS,
                    parseHostRules: parseHosts,
                });
                if (ruleNode.category === RuleCategory.Empty || ruleNode.category === RuleCategory.Comment) {
                    // Add empty lines and comments as is to the converted filter list,
                    // but not to the output byte buffer / source map.
                    rawFilterList.push(ruleText);
                    rawFilterList.push(lineBreak);
                    outputOffset += ruleText.length + lineBreakLength;
                    inputOffset = lineBreakIndex + lineBreakLength;
                    previousLineBreak = lineBreak;
                    continue;
                }
                const conversionResult = RuleConverter.convertToAdg(ruleNode);
                if (conversionResult.isConverted) {
                    // Maybe the rule is the last line without a line break in the input filter list
                    // but we need to convert it to multiple rules.
                    // In this case, we should use the last used line break before the conversion.
                    const convertedRulesLineBreak = lineBreakLength > 0 ? lineBreak : previousLineBreak;
                    const numberOfConvertedRules = conversionResult.result.length;
                    // Note: 1 rule can be converted to multiple rules
                    for (let i = 0; i < conversionResult.result.length; i += 1) {
                        const convertedRuleNode = conversionResult.result[i];
                        // In this case we should generate the rule text from the AST, because its converted,
                        // i.e. it's not the same as the original rule text.
                        const convertedRuleText = RuleGenerator.generate(convertedRuleNode);
                        rawFilterList.push(convertedRuleText);
                        rawFilterList.push(i === numberOfConvertedRules - 1 ? lineBreak : convertedRulesLineBreak);
                        const bufferOffset = convertedFilterList.currentOffset;
                        // Store the converted rules and the mapping between the original and converted rules
                        conversionMap[outputOffset] = ruleText;
                        sourceMap[bufferOffset] = outputOffset;
                        RuleSerializer.serialize(convertedRuleNode, convertedFilterList);
                        outputOffset += convertedRuleText.length + (i === numberOfConvertedRules - 1
                            ? lineBreakLength
                            : convertedRulesLineBreak.length);
                    }
                }
                else {
                    // If the rule is not converted, we should store the original rule text in the raw filter list.
                    rawFilterList.push(ruleText);
                    rawFilterList.push(lineBreak);
                    const bufferOffset = convertedFilterList.currentOffset;
                    // Store the converted rules and the mapping between the original and converted rules
                    sourceMap[bufferOffset] = outputOffset;
                    RuleSerializer.serialize(ruleNode, convertedFilterList);
                    outputOffset += ruleText.length + lineBreakLength;
                }
            }
            catch (error) {
                // Log issues to info channel to make them visible for
                // filter maintainers. See AG-37460.
                logger.info(`[tsurl.FilterListPreprocessor.preprocess]: failed to process rule: '${ruleText}' due to:`, error);
                // Add invalid rules as is to the converted filter list,
                // but not to the output byte buffer / source map.
                rawFilterList.push(ruleText);
                rawFilterList.push(lineBreak);
                outputOffset += ruleText.length + lineBreakLength;
            }
            // Move to the next line
            inputOffset = lineBreakIndex + lineBreakLength;
            previousLineBreak = lineBreak;
        }
        return {
            filterList: convertedFilterList.getChunks(),
            rawFilterList: rawFilterList.join(EMPTY_STRING),
            conversionMap,
            sourceMap,
        };
    }
    /**
     * A "lightweight" version of the preprocess method. This method is necessary because, in the rulesets,
     * we store the converted raw list and the conversion map, but not the entire preprocessed filter list.
     * This method helps us regenerate the serialized filter list and the source map fields with less overhead
     * compared to the full preprocess method.
     *
     * @param preprocessedFilterList Preprocessed filter list,
     * which contains the raw filter list and the conversion map.
     * @param parseHosts If true, the preprocessor will parse host rules.
     *
     * @returns Preprocessed filter list with the "filterList" and "sourceMap" fields.
     */
    static preprocessLightweight(preprocessedFilterList, parseHosts = false) {
        const { rawFilterList, conversionMap } = preprocessedFilterList;
        const { length } = rawFilterList;
        const sourceMap = {};
        const filterList = new OutputByteBuffer();
        let inputOffset = 0;
        let outputOffset = 0;
        while (inputOffset < length) {
            const [lineBreakIndex, lineBreakLength] = findNextLineBreakIndex(rawFilterList, inputOffset);
            const ruleText = rawFilterList.slice(inputOffset, lineBreakIndex);
            try {
                const ruleNode = RuleParser.parse(ruleText, {
                    ...PREPROCESSOR_AGTREE_OPTIONS,
                    parseHostRules: parseHosts,
                });
                // Ignore empty lines and comments from the binary filter list
                if (ruleNode.category !== RuleCategory.Empty && ruleNode.category !== RuleCategory.Comment) {
                    const bufferOffset = filterList.currentOffset;
                    sourceMap[bufferOffset] = outputOffset;
                    RuleSerializer.serialize(ruleNode, filterList);
                }
            }
            catch (error) {
                // Log issues to info channel to make them visible for
                // filter maintainers. See AG-37460.
                logger.info(`[tsurl.FilterListPreprocessor.preprocessLightweight]: failed to process rule: '${ruleText}' due to:`, error);
            }
            outputOffset += ruleText.length + lineBreakLength;
            // Move to the next line
            inputOffset = lineBreakIndex + lineBreakLength;
        }
        return {
            // TODO: consider returning an empty array if the filter list is empty
            filterList: filterList.getChunks(),
            rawFilterList,
            conversionMap,
            sourceMap,
        };
    }
    /**
     * Gets the original filter list text from the preprocessed filter list.
     *
     * @param preprocessedFilterList Preprocessed filter list.
     *
     * @returns Original filter list text.
     */
    static getOriginalFilterListText(preprocessedFilterList) {
        const { rawFilterList, conversionMap } = preprocessedFilterList;
        const { length } = rawFilterList;
        const result = [];
        let offset = 0;
        let prevLineStart = -1;
        let lineBreakIndex = -1;
        let lineBreakLength = 0;
        while (offset < length) {
            [lineBreakIndex, lineBreakLength] = findNextLineBreakIndex(rawFilterList, offset);
            const lineBreak = rawFilterList.slice(lineBreakIndex, lineBreakIndex + lineBreakLength);
            const originalRule = conversionMap[offset];
            // One rule can be converted to multiple rules - in this case we should put the original rule text only once
            // If there is such a case, these rules follow one after the other
            if (!(originalRule && originalRule === conversionMap[prevLineStart])) {
                result.push(originalRule ?? rawFilterList.slice(offset, lineBreakIndex));
                result.push(lineBreak);
            }
            prevLineStart = offset;
            offset = lineBreakIndex + lineBreakLength;
        }
        // Add an empty rule if final new line is present
        if (lineBreakLength > 0) {
            result.push(EMPTY_STRING);
        }
        return result.join(EMPTY_STRING);
    }
    /**
     * Gets the original rules from the preprocessed filter list.
     *
     * @param preprocessedFilterList Preprocessed filter list.
     *
     * @returns Array of original rules.
     */
    static getOriginalRules(preprocessedFilterList) {
        const { rawFilterList, conversionMap } = preprocessedFilterList;
        const { length } = rawFilterList;
        const result = [];
        let offset = 0;
        let prevLineStart = -1;
        let lineBreakIndex = -1;
        let lineBreakLength = 0;
        while (offset < length) {
            [lineBreakIndex, lineBreakLength] = findNextLineBreakIndex(rawFilterList, offset);
            const originalRule = conversionMap[offset];
            // One rule can be converted to multiple rules - in this case we should put the original rule text only once
            // If there is such a case, these rules follow one after the other
            if (!(originalRule && originalRule === conversionMap[prevLineStart])) {
                result.push(originalRule ?? rawFilterList.slice(offset, lineBreakIndex));
            }
            prevLineStart = offset;
            offset = lineBreakIndex + lineBreakLength;
        }
        // Add an empty rule if final new line is present
        if (lineBreakLength > 0) {
            result.push(EMPTY_STRING);
        }
        return result;
    }
    /**
     * Creates an empty preprocessed filter list.
     *
     * @returns An empty preprocessed filter list.
     *
     * @note It gives the same result as the {@link preprocess} method with an empty filter list:
     * ```ts
     * FilterListPreprocessor.preprocess('');
     * ```
     */
    static createEmptyPreprocessedFilterList() {
        // Note: need to use OutputByteBuffer, because it writes the schema version to the buffer
        const buffer = new OutputByteBuffer();
        return {
            // TODO: consider returning an empty array
            filterList: buffer.getChunks(),
            rawFilterList: '',
            conversionMap: {},
            sourceMap: {},
        };
    }
}

/**
 * Validator for filter list conversion map.
 *
 * @note This is only needed to show the original rule text in the filtering log if a converted rule is applied.
 */
const filterListConversionMapValidator = recordType(
/**
 * Converted rule line start offset.
 */
stringType(), 
/**
 * Original rule text.
 */
stringType());
/**
 * Validator for filter list chunks.
 */
const filterListChunksValidator = arrayType(custom((val) => val instanceof Uint8Array));
/**
 * Validator for preprocessed filter list.
 */
objectType({
    /**
     * Raw processed filter list.
     */
    rawFilterList: stringType(),
    /**
     * Processed filter list, but in a serialized form.
     */
    filterList: filterListChunksValidator,
    /**
     * Map of converted rules to original rules.
     */
    conversionMap: filterListConversionMapValidator,
    /**
     * Source map.
     */
    sourceMap: filterListSourceMapValidator,
});

export { BufferRuleList, CompatibilityTypes, CookieModifier, CosmeticOption, CosmeticRule, FilterListPreprocessor, HTTPMethod, HostRule, IndexedRule, LIST_ID_MAX_VALUE, NETWORK_RULE_OPTIONS, NetworkRule, NetworkRuleGroupOptions, NetworkRuleOption, OPTIONS_DELIMITER, PREPROCESSOR_AGTREE_OPTIONS, RULE_INDEX_NONE, RemoveHeaderModifier, RemoveParamModifier, ReplaceModifier, RequestType, RuleFactory, SimpleRegex, StealthOptionName, cleanUrlParamByRegExp, config, countEnabledBits, filterListChunksValidator, filterListConversionMapValidator, filterListSourceMapValidator, findNextLineBreakIndex, getBitCount, getRelativeUrl, getRuleSourceIndex, hasSpaces, isCompatibleWith, isString, logger, splitByDelimiterWithEscapeCharacter, stringArraysEquals, stringArraysHaveIntersection, unescapeChar };
