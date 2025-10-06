import z from '../../../npm/zod/lib/index.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Resource type schema.
 */
/**
 * Resource type.
 *
 * @see {@link https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType}
 */
const ResourceType = {
    MainFrame: 'main_frame',
    SubFrame: 'sub_frame',
    Stylesheet: 'stylesheet',
    Script: 'script',
    Image: 'image',
    Font: 'font',
    Object: 'object',
    XmlHttpRequest: 'xmlhttprequest',
    Ping: 'ping',
    Media: 'media',
    WebSocket: 'websocket',
    Other: 'other',
};
/**
 * Resource type schema.
 */
z.nativeEnum(ResourceType);

export { ResourceType };
