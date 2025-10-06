import { PREFIX } from './types.js';

const CONTENT_TYPE = 'image/svg+xml';
const resource = {
    name: `${PREFIX}.svg`,
    contentType: CONTENT_TYPE,
    aliases: [CONTENT_TYPE, '.svg', 'svg'],
    body: 'https://raw.githubusercontent.com/mathiasbynens/small/master/svg.svg',
};

export { CONTENT_TYPE, resource as default };
