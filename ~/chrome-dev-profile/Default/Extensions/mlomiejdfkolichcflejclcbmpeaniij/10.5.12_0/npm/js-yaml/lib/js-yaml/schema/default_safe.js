import { __require as requireSchema } from '../schema.js';
import { __require as requireCore } from './core.js';
import { __require as requireTimestamp } from '../type/timestamp.js';
import { __require as requireMerge } from '../type/merge.js';
import { __require as requireBinary } from '../type/binary.js';
import { __require as requireOmap } from '../type/omap.js';
import { __require as requirePairs } from '../type/pairs.js';
import { __require as requireSet } from '../type/set.js';

var default_safe;
var hasRequiredDefault_safe;

function requireDefault_safe () {
	if (hasRequiredDefault_safe) return default_safe;
	hasRequiredDefault_safe = 1;


	var Schema = requireSchema();


	default_safe = new Schema({
	  include: [
	    requireCore()
	  ],
	  implicit: [
	    requireTimestamp(),
	    requireMerge()
	  ],
	  explicit: [
	    requireBinary(),
	    requireOmap(),
	    requirePairs(),
	    requireSet()
	  ]
	});
	return default_safe;
}

export { requireDefault_safe as __require };
