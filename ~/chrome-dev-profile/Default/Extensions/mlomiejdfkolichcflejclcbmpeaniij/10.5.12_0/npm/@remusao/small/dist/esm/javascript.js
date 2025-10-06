import { PREFIX } from './types.js';

const CONTENT_TYPE = 'application/javascript';
const resource = {
    name: `${PREFIX}.js`,
    contentType: CONTENT_TYPE,
    aliases: [
        CONTENT_TYPE,
        '.js',
        'js',
        'javascript',
        '.jsx',
        'jsx',
        'typescript',
        '.ts',
        'ts',
        'noop.js',
        'noopjs',
    ],
    body: '',
};

export { CONTENT_TYPE, resource as default };
