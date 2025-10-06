import { __require as requireSchema } from '../schema.js';
import { __require as requireFailsafe } from './failsafe.js';
import { __require as require_null } from '../type/null.js';
import { __require as requireBool } from '../type/bool.js';
import { __require as requireInt } from '../type/int.js';
import { __require as requireFloat } from '../type/float.js';

var json;
var hasRequiredJson;

function requireJson () {
	if (hasRequiredJson) return json;
	hasRequiredJson = 1;


	var Schema = requireSchema();


	json = new Schema({
	  include: [
	    requireFailsafe()
	  ],
	  implicit: [
	    require_null(),
	    requireBool(),
	    requireInt(),
	    requireFloat()
	  ]
	});
	return json;
}

export { requireJson as __require };
