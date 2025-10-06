import { __require as requireSchema } from '../schema.js';
import { __require as requireDefault_safe } from './default_safe.js';
import { __require as require_undefined } from '../type/js/undefined.js';
import { __require as requireRegexp } from '../type/js/regexp.js';
import { __require as require_function } from '../type/js/function.js';

var default_full;
var hasRequiredDefault_full;

function requireDefault_full () {
	if (hasRequiredDefault_full) return default_full;
	hasRequiredDefault_full = 1;


	var Schema = requireSchema();


	default_full = Schema.DEFAULT = new Schema({
	  include: [
	    requireDefault_safe()
	  ],
	  explicit: [
	    require_undefined(),
	    requireRegexp(),
	    require_function()
	  ]
	});
	return default_full;
}

export { requireDefault_full as __require };
