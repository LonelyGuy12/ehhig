/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
const OperatorValue = {
    Not: '!',
    And: '&&',
    Or: '||',
};
/**
 * Represents the different comment markers that can be used in an adblock rule.
 *
 * @example
 * - If the rule is `! This is just a comment`, then the marker will be `!`.
 * - If the rule is `# This is just a comment`, then the marker will be `#`.
 */
const CommentMarker = {
    /**
     * Regular comment marker. It is supported by all ad blockers.
     */
    Regular: '!',
    /**
     * Hashmark comment marker. It is supported by uBlock Origin and AdGuard,
     * and also used in hosts files.
     */
    Hashmark: '#',
};
/**
 * Represents the main categories that an adblock rule can belong to.
 * Of course, these include additional subcategories.
 */
const RuleCategory = {
    /**
     * Empty "rules" that are only containing whitespaces. These rules are handled just for convenience.
     */
    Empty: 'Empty',
    /**
     * Syntactically invalid rules (tolerant mode only).
     */
    Invalid: 'Invalid',
    /**
     * Comment rules, such as comment rules, metadata rules, preprocessor rules, etc.
     */
    Comment: 'Comment',
    /**
     * Cosmetic rules, such as element hiding rules, CSS rules, scriptlet rules, HTML rules, and JS rules.
     */
    Cosmetic: 'Cosmetic',
    /**
     * Network rules, such as basic network rules, header remover network rules, redirect network rules,
     * response header filtering rules, etc.
     */
    Network: 'Network',
};
/**
 * Represents similar types of modifiers values
 * which may be separated by a comma `,` (only for DomainList) or a pipe `|`.
 */
const ListNodeType = {
    DomainList: 'DomainList'};
/**
 * Represents child items for {@link ListNodeType}.
 */
const ListItemNodeType = {
    Unknown: 'Unknown',
    App: 'App',
    Domain: 'Domain',
    Method: 'Method',
    StealthOption: 'StealthOption',
};
/**
 * Represents possible comment types.
 */
const CommentRuleType = {
    AgentCommentRule: 'AgentCommentRule',
    CommentRule: 'CommentRule',
    ConfigCommentRule: 'ConfigCommentRule',
    HintCommentRule: 'HintCommentRule',
    MetadataCommentRule: 'MetadataCommentRule',
    PreProcessorCommentRule: 'PreProcessorCommentRule',
};
/**
 * Represents possible cosmetic rule types.
 */
const CosmeticRuleType = {
    ElementHidingRule: 'ElementHidingRule',
    CssInjectionRule: 'CssInjectionRule',
    ScriptletInjectionRule: 'ScriptletInjectionRule',
    HtmlFilteringRule: 'HtmlFilteringRule',
    JsInjectionRule: 'JsInjectionRule',
};
/**
 * Represents possible cosmetic rule separators.
 */
const CosmeticRuleSeparator = {
    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ElementHiding: '##',
    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ElementHidingException: '#@#',
    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ExtendedElementHiding: '#?#',
    /**
     * @see {@link https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide_basic}
     */
    ExtendedElementHidingException: '#@?#',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgCssInjection: '#$#',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgCssInjectionException: '#@$#',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgExtendedCssInjection: '#$?#',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#cosmetic-css-rules}
     */
    AdgExtendedCssInjectionException: '#@$?#',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#scriptlets}
     */
    AdgJsInjection: '#%#',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#scriptlets}
     */
    AdgJsInjectionException: '#@%#',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#html-filtering-rules}
     */
    AdgHtmlFiltering: '$$',
    /**
     * @see {@link https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#html-filtering-rules}
     */
    AdgHtmlFilteringException: '$@$',
};
/**
 * Represents the different types of network rules.
 */
const NetworkRuleType = {
    NetworkRule: 'NetworkRule',
    HostRule: 'HostRule',
};

export { CommentMarker, CommentRuleType, CosmeticRuleSeparator, CosmeticRuleType, ListItemNodeType, ListNodeType, NetworkRuleType, OperatorValue, RuleCategory };
