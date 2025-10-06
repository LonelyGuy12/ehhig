import { getDefaultExportFromCjs } from './_commonjsHelpers.js';
import { __require as requireIsIp } from '../npm/is-ip/index.js';

var isIpExports = requireIsIp();
const isIp = /*@__PURE__*/getDefaultExportFromCjs(isIpExports);

export { isIp as default };
