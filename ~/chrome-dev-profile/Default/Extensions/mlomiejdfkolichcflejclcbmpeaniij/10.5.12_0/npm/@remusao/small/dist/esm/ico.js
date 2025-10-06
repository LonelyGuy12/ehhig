import { PREFIX } from './types.js';

const CONTENT_TYPE = 'image/vnd.microsoft.icon';
const resource = {
    name: `${PREFIX}.ico`,
    contentType: `${CONTENT_TYPE};base64`,
    aliases: [CONTENT_TYPE, '.ico', 'ico'],
    body: 'AAABAAEAAQEAAAEAGAAwAAAAFgAAACgAAAABAAAAAgAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAA==',
};

export { CONTENT_TYPE, resource as default };
