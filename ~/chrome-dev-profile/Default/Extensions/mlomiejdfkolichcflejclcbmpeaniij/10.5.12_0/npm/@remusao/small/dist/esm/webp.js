import { PREFIX } from './types.js';

const CONTENT_TYPE = 'image/webp';
const resource = {
    name: `${PREFIX}.webp`,
    contentType: `${CONTENT_TYPE};base64`,
    aliases: [CONTENT_TYPE, '.webp', 'webp'],
    body: 'UklGRhIAAABXRUJQVlA4TAYAAAAvQWxvAGs=',
};

export { CONTENT_TYPE, resource as default };
