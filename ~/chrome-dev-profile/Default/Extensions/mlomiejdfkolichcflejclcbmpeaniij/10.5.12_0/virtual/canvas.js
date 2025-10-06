import { getDefaultExportFromCjs } from './_commonjsHelpers.js';
import { __require as requireCanvas } from '../npm/linkedom/commonjs/canvas.js';

var canvasExports = requireCanvas();
const Canvas = /*@__PURE__*/getDefaultExportFromCjs(canvasExports);

export { Canvas as default };
