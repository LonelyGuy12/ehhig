import { __vitePreload } from '../../../../../../virtual/preload-helper.js';
import { DeclarativeFilterConverter, Filter } from '../../../../../@adguard/tsurlfilter/dist/es/declarative-converter.js';
import { FilterListPreprocessor } from '../../../../../@adguard/tsurlfilter/dist/es/index.js';
import { normalizeFilter, normalizeRule } from './helpers.js';

/**
 * Maximum memory in bytes for the regex.
 * This value is lower than 2MB as required by chrome, but it was determined empirically.
 */
const MAX_MEMORY_BYTES = 1990;
if (typeof globalThis.chrome === 'undefined') {
    globalThis.chrome = {};
}
if (typeof globalThis.chrome.runtime === 'undefined') {
    globalThis.chrome.runtime = {
        lastError: null,
    };
}
if (typeof globalThis.chrome.declarativeNetRequest === 'undefined') {
    globalThis.chrome.declarativeNetRequest = {
        isRegexSupported: async (regexOptions, callback) => {
            try {
                let RE2Class;
                if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                    // Node.js: dynamic import
                    const mod = await __vitePreload(() => import('@adguard/re2-wasm'),true              ?[]:void 0);
                    RE2Class = mod.RE2;
                }
                else {
                    RE2Class = globalThis.RE2;
                }
                new RE2Class(regexOptions.regex, `u${regexOptions.flags}`, MAX_MEMORY_BYTES);
                callback({ isSupported: true });
            }
            catch (e) {
                console.error(e);
                callback({ isSupported: false });
            }
        },
    };
}
const converter = new DeclarativeFilterConverter();
const createFilter = (rules, filterId = 0) => {
    return new Filter(filterId, {
        getContent: async () => Promise.resolve(FilterListPreprocessor.preprocess(rules.join('\n'))),
    }, true);
};
async function convert(rules, { resourcesPath = '/prefix' } = {}) {
    if (rules.length === 0) {
        return {
            rules: [],
            errors: [],
            limitations: [],
        };
    }
    const filter = createFilter(rules.map((rule) => normalizeFilter(rule) ?? ''));
    const conversionResult = await converter.convertStaticRuleSet(filter, { resourcesPath });
    const declarativeRules = await conversionResult.ruleSet.getDeclarativeRules();
    const normalizeRules = [];
    const errors = conversionResult.errors.map(e => e.toString());
    for (const [index, rule] of declarativeRules.entries()) {
        try {
            normalizeRules.push(normalizeRule(rule, { resourcesPath, id: index + 1 }));
        }
        catch (e) {
            errors.push(`Could not normalize rule: ${JSON.stringify(rule)} - ${e instanceof Error ? e.message : e}`);
        }
    }
    return {
        rules: normalizeRules,
        errors,
        limitations: conversionResult.limitations,
    };
}

export { convert as default };
