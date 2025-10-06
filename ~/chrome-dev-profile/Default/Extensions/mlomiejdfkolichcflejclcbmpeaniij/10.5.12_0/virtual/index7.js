import { getDefaultExportFromCjs } from './_commonjsHelpers.js';
import { __require as requireBoolbase } from '../npm/boolbase/index.js';

var boolbaseExports = requireBoolbase();
const boolbase = /*@__PURE__*/getDefaultExportFromCjs(boolbaseExports);

export { boolbase as default };
