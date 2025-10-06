import { getDefaultExportFromCjs } from './_commonjsHelpers.js';
import { __require as requirePlotlyBasic } from '../npm/plotly.js-basic-dist/plotly-basic.js';

var plotlyBasicExports = requirePlotlyBasic();
const Plotly = /*@__PURE__*/getDefaultExportFromCjs(plotlyBasicExports);

export { Plotly as default };
