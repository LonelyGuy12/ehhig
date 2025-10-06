import { PREFIX } from './types.js';

const CONTENT_TYPE = 'text/html';
const resource = {
    name: `${PREFIX}.html`,
    contentType: CONTENT_TYPE,
    aliases: [
        CONTENT_TYPE,
        '.html',
        'html',
        '.htm',
        'htm',
        'noopframe',
        'noop.html',
    ],
    body: '<!DOCTYPE html>',
};

export { CONTENT_TYPE, resource as default };
