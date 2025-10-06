import { __require as requireShallowClone } from '../shallow-clone/index.js';
import { __require as requireKindOf } from '../kind-of/index.js';
import { __require as requireIsPlainObject } from '../is-plain-object/index.js';

var cloneDeep_1;
var hasRequiredCloneDeep;

function requireCloneDeep () {
	if (hasRequiredCloneDeep) return cloneDeep_1;
	hasRequiredCloneDeep = 1;

	/**
	 * Module dependenices
	 */

	const clone = requireShallowClone();
	const typeOf = requireKindOf();
	const isPlainObject = requireIsPlainObject();

	function cloneDeep(val, instanceClone) {
	  switch (typeOf(val)) {
	    case 'object':
	      return cloneObjectDeep(val, instanceClone);
	    case 'array':
	      return cloneArrayDeep(val, instanceClone);
	    default: {
	      return clone(val);
	    }
	  }
	}

	function cloneObjectDeep(val, instanceClone) {
	  if (typeof instanceClone === 'function') {
	    return instanceClone(val);
	  }
	  if (instanceClone || isPlainObject(val)) {
	    const res = new val.constructor();
	    for (let key in val) {
	      res[key] = cloneDeep(val[key], instanceClone);
	    }
	    return res;
	  }
	  return val;
	}

	function cloneArrayDeep(val, instanceClone) {
	  const res = new val.constructor(val.length);
	  for (let i = 0; i < val.length; i++) {
	    res[i] = cloneDeep(val[i], instanceClone);
	  }
	  return res;
	}

	/**
	 * Expose `cloneDeep`
	 */

	cloneDeep_1 = cloneDeep;
	return cloneDeep_1;
}

export { requireCloneDeep as __require };
