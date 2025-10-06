import { PREFIX } from './types.js';

const CONTENT_TYPE = 'image/png';
const resource = {
    name: `${PREFIX}.png`,
    contentType: `${CONTENT_TYPE};base64`,
    aliases: [CONTENT_TYPE, '.png', 'png'],
    body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
};

export { CONTENT_TYPE, resource as default };
