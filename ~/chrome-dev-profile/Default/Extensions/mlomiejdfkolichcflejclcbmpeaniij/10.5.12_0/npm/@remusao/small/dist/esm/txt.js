import { PREFIX } from './types.js';

const CONTENT_TYPE = 'text/plain';
const resource = {
    name: `${PREFIX}.txt`,
    contentType: CONTENT_TYPE,
    aliases: [CONTENT_TYPE, '.txt', 'txt', 'text', 'nooptext', 'noop.txt'],
    body: '',
};

export { CONTENT_TYPE, resource as default };
