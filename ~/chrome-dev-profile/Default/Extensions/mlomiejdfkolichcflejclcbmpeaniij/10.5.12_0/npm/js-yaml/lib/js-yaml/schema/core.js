import { __require as requireSchema } from '../schema.js';
import { __require as requireJson } from './json.js';

var core;
var hasRequiredCore;

function requireCore () {
	if (hasRequiredCore) return core;
	hasRequiredCore = 1;


	var Schema = requireSchema();


	core = new Schema({
	  include: [
	    requireJson()
	  ]
	});
	return core;
}

export { requireCore as __require };
