import { PREFIX } from './types.js';

const CONTENT_TYPE = 'image/gif';
const resource = {
    name: `${PREFIX}.gif`,
    contentType: `${CONTENT_TYPE};base64`,
    aliases: [CONTENT_TYPE, '.gif', 'gif'],
    body: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
};

export { CONTENT_TYPE, resource as default };
