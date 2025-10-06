import { __require as requireSchema } from '../schema.js';
import { __require as requireStr } from '../type/str.js';
import { __require as requireSeq } from '../type/seq.js';
import { __require as requireMap } from '../type/map.js';

var failsafe;
var hasRequiredFailsafe;

function requireFailsafe () {
	if (hasRequiredFailsafe) return failsafe;
	hasRequiredFailsafe = 1;


	var Schema = requireSchema();


	failsafe = new Schema({
	  explicit: [
	    requireStr(),
	    requireSeq(),
	    requireMap()
	  ]
	});
	return failsafe;
}

export { requireFailsafe as __require };
