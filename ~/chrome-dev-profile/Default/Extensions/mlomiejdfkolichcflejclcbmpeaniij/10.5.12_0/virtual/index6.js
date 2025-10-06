import { getDefaultExportFromCjs } from './_commonjsHelpers.js';
import { __require as requireCloneDeep } from '../npm/clone-deep/index.js';

var cloneDeepExports = requireCloneDeep();
const cloneDeep = /*@__PURE__*/getDefaultExportFromCjs(cloneDeepExports);

export { cloneDeep as default };
