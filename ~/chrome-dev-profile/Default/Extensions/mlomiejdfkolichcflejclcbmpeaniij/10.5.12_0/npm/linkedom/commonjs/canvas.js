import { __module as canvas } from '../../../virtual/canvas2.js';
import require$$0 from '../../../virtual/___vite-optional-peer-dep_canvas_linkedom_true.js';
import { __require as requireCanvasShim } from './canvas-shim.js';

/* c8 ignore start */

var hasRequiredCanvas;

function requireCanvas () {
	if (hasRequiredCanvas) return canvas.exports;
	hasRequiredCanvas = 1;
	try {
	  canvas.exports = require$$0;
	} catch (fallback) {
	  canvas.exports = requireCanvasShim();
	}
	/* c8 ignore stop */
	return canvas.exports;
}

export { requireCanvas as __require };
