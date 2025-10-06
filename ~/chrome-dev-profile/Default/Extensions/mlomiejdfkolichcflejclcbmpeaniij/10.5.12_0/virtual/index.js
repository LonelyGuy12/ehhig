import { getDefaultExportFromCjs } from './_commonjsHelpers.js';
import { __require as requireIsCidr } from '../npm/is-cidr/index.js';

var isCidrExports = requireIsCidr();
const isCidr = /*@__PURE__*/getDefaultExportFromCjs(isCidrExports);

export { isCidr as default };
