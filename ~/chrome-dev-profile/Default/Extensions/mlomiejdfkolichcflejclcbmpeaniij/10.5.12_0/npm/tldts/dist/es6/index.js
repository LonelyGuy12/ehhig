import { resetResult, parseImpl, getEmptyResult } from '../../../tldts-core/dist/es6/src/factory.js';
import '../../../tldts-core/dist/es6/src/options.js';
import suffixLookup from './src/suffix-trie.js';

// For all methods but 'parse', it does not make sense to allocate an object
// every single time to only return the value of a specific attribute. To avoid
// this un-necessary allocation, we use a global object which is re-used.
const RESULT = getEmptyResult();
function parse(url, options = {}) {
    return parseImpl(url, 5 /* FLAG.ALL */, suffixLookup, options, getEmptyResult());
}
function getHostname(url, options = {}) {
    /*@__INLINE__*/ resetResult(RESULT);
    return parseImpl(url, 0 /* FLAG.HOSTNAME */, suffixLookup, options, RESULT).hostname;
}
function getPublicSuffix(url, options = {}) {
    /*@__INLINE__*/ resetResult(RESULT);
    return parseImpl(url, 2 /* FLAG.PUBLIC_SUFFIX */, suffixLookup, options, RESULT)
        .publicSuffix;
}
function getDomain(url, options = {}) {
    /*@__INLINE__*/ resetResult(RESULT);
    return parseImpl(url, 3 /* FLAG.DOMAIN */, suffixLookup, options, RESULT).domain;
}

export { getDomain, getHostname, getPublicSuffix, parse };
