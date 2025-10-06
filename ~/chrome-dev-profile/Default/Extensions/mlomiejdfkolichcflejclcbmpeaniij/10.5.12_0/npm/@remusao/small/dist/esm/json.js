import { PREFIX } from './types.js';

const CONTENT_TYPE = 'application/json';
const resource = {
    name: `${PREFIX}.json`,
    contentType: CONTENT_TYPE,
    aliases: [CONTENT_TYPE, '.json', 'json'],
    body: '0',
};

export { CONTENT_TYPE, resource as default };
