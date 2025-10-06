import { parseImpl, getEmptyResult } from '../../npm/tldts-core/dist/es6/src/factory.js';
import '../../npm/tldts-core/dist/es6/src/options.js';
import suffixLookup from './src/packed-hashes.js';

function parse(url, options = {}) {
    return parseImpl(url, 5 /* FLAG.ALL */, suffixLookup, options, getEmptyResult());
}

export { parse };
