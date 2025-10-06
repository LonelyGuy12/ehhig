/*!
 * isobject <https://github.com/jonschlinkert/isobject>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

var isobject;
var hasRequiredIsobject;

function requireIsobject () {
	if (hasRequiredIsobject) return isobject;
	hasRequiredIsobject = 1;

	isobject = function isObject(val) {
	  return val != null && typeof val === 'object' && Array.isArray(val) === false;
	};
	return isobject;
}

export { requireIsobject as __require };
