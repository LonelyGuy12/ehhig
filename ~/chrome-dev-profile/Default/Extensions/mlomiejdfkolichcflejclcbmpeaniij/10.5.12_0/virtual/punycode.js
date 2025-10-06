import { getDefaultExportFromCjs } from './_commonjsHelpers.js';
import { __require as requirePunycode } from '../npm/punycode/punycode.js';

var punycodeExports = requirePunycode();
const punycode = /*@__PURE__*/getDefaultExportFromCjs(punycodeExports);

export { punycode as default };
