import { parse } from '../../../../tldts/dist/es6/index.js';
import { WILDCARD, DOT } from './constants.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Utility functions for domain and hostname validation.
 */
/**
 * Marker for a wildcard top-level domain — `.*`.
 *
 * @example
 * `example.*` — matches with any TLD, e.g. `example.org`, `example.com`, etc.
 */
const WILDCARD_TLD = DOT + WILDCARD;
/**
 * Marker for a wildcard subdomain — `*.`.
 *
 * @example
 * `*.example.org` — matches with any subdomain, e.g. `foo.example.org` or `bar.example.org`
 */
const WILDCARD_SUBDOMAIN = WILDCARD + DOT;
/**
 * Utility functions for domain and hostname validation.
 */
class DomainUtils {
    /**
     * Check if the input is a valid domain or hostname.
     *
     * @param domain Domain to check
     * @returns `true` if the domain is valid, `false` otherwise
     */
    static isValidDomainOrHostname(domain) {
        let domainToCheck = domain;
        // Wildcard-only domain, typically a generic rule
        if (domainToCheck === WILDCARD) {
            return true;
        }
        // https://adguard.com/kb/general/ad-filtering/create-own-filters/#wildcard-for-tld
        if (domainToCheck.endsWith(WILDCARD_TLD)) {
            // Remove the wildcard TLD
            domainToCheck = domainToCheck.substring(0, domainToCheck.length - WILDCARD_TLD.length);
        }
        if (domainToCheck.startsWith(WILDCARD_SUBDOMAIN)) {
            // Remove the wildcard subdomain
            domainToCheck = domainToCheck.substring(WILDCARD_SUBDOMAIN.length);
        }
        // Parse the domain with tldts
        const tldtsResult = parse(domainToCheck);
        // Check if the domain is valid
        return domainToCheck === tldtsResult.domain || domainToCheck === tldtsResult.hostname;
    }
}

export { DomainUtils, WILDCARD_SUBDOMAIN, WILDCARD_TLD };
