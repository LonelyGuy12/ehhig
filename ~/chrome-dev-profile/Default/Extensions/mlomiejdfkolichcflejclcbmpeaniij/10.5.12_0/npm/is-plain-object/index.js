import { __require as requireIsobject } from '../isobject/index.js';

/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

var isPlainObject;
var hasRequiredIsPlainObject;

function requireIsPlainObject () {
	if (hasRequiredIsPlainObject) return isPlainObject;
	hasRequiredIsPlainObject = 1;

	var isObject = requireIsobject();

	function isObjectObject(o) {
	  return isObject(o) === true
	    && Object.prototype.toString.call(o) === '[object Object]';
	}

	isPlainObject = function isPlainObject(o) {
	  var ctor,prot;

	  if (isObjectObject(o) === false) return false;

	  // If has modified constructor
	  ctor = o.constructor;
	  if (typeof ctor !== 'function') return false;

	  // If has modified prototype
	  prot = ctor.prototype;
	  if (isObjectObject(prot) === false) return false;

	  // If constructor does not have an Object-specific method
	  if (prot.hasOwnProperty('isPrototypeOf') === false) {
	    return false;
	  }

	  // Most likely a plain Object
	  return true;
	};
	return isPlainObject;
}

export { requireIsPlainObject as __require };
