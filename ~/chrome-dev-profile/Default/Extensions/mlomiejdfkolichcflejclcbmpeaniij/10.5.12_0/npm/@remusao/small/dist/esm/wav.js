import { PREFIX } from './types.js';

const CONTENT_TYPE = 'audio/wav';
const resource = {
    name: `${PREFIX}.wav`,
    contentType: `${CONTENT_TYPE};base64`,
    aliases: [CONTENT_TYPE, '.wav', 'wav'],
    body: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
};

export { CONTENT_TYPE, resource as default };
