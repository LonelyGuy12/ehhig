import { SpecificPlatform } from '../platforms.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/* eslint-disable no-bitwise */
/**
 * @file Provides platform mapping and helper functions.
 */
/**
 * Map of specific platforms string names to their corresponding enum values.
 */
const SPECIFIC_PLATFORM_MAP = new Map([
    ['adg_os_windows', SpecificPlatform.AdgOsWindows],
    ['adg_os_mac', SpecificPlatform.AdgOsMac],
    ['adg_os_android', SpecificPlatform.AdgOsAndroid],
    ['adg_ext_chrome', SpecificPlatform.AdgExtChrome],
    ['adg_ext_opera', SpecificPlatform.AdgExtOpera],
    ['adg_ext_edge', SpecificPlatform.AdgExtEdge],
    ['adg_ext_firefox', SpecificPlatform.AdgExtFirefox],
    ['adg_cb_android', SpecificPlatform.AdgCbAndroid],
    ['adg_cb_ios', SpecificPlatform.AdgCbIos],
    ['adg_cb_safari', SpecificPlatform.AdgCbSafari],
    ['ubo_ext_chrome', SpecificPlatform.UboExtChrome],
    ['ubo_ext_opera', SpecificPlatform.UboExtOpera],
    ['ubo_ext_edge', SpecificPlatform.UboExtEdge],
    ['ubo_ext_firefox', SpecificPlatform.UboExtFirefox],
    ['abp_ext_chrome', SpecificPlatform.AbpExtChrome],
    ['abp_ext_opera', SpecificPlatform.AbpExtOpera],
    ['abp_ext_edge', SpecificPlatform.AbpExtEdge],
    ['abp_ext_firefox', SpecificPlatform.AbpExtFirefox],
]);
/**
 * Map of specific platforms enum values to their corresponding string names.
 *
 * @note Reverse of {@link SPECIFIC_PLATFORM_MAP}.
 */
new Map([...SPECIFIC_PLATFORM_MAP].map(([key, value]) => [value, key]));
/**
 * Check if the platform is a generic platform.
 *
 * @param platform Platform to check.
 *
 * @returns True if the platform is a generic platform, false otherwise.
 */
const isGenericPlatform = (platform) => {
    // if more than one bit is set, it's a generic platform
    return !!(platform & (platform - 1));
};

export { SPECIFIC_PLATFORM_MAP, isGenericPlatform };
