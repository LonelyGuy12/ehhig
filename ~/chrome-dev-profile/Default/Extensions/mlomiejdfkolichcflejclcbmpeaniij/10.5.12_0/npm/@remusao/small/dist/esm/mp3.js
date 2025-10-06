import { PREFIX } from './types.js';

const CONTENT_TYPE = 'audio/mpeg';
const resource = {
    name: `${PREFIX}.mp3`,
    contentType: `${CONTENT_TYPE};base64`,
    aliases: [CONTENT_TYPE, '.mp3', 'mp3', 'noop-0.1s.mp3', 'noopmp3-0.1s'],
    body: '/+MYxAAAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

export { CONTENT_TYPE, resource as default };
