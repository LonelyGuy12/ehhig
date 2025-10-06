import { __require as requireType } from '../../type.js';

var _undefined;
var hasRequired_undefined;

function require_undefined () {
	if (hasRequired_undefined) return _undefined;
	hasRequired_undefined = 1;

	var Type = requireType();

	function resolveJavascriptUndefined() {
	  return true;
	}

	function constructJavascriptUndefined() {
	  /*eslint-disable no-undefined*/
	  return undefined;
	}

	function representJavascriptUndefined() {
	  return '';
	}

	function isUndefined(object) {
	  return typeof object === 'undefined';
	}

	_undefined = new Type('tag:yaml.org,2002:js/undefined', {
	  kind: 'scalar',
	  resolve: resolveJavascriptUndefined,
	  construct: constructJavascriptUndefined,
	  predicate: isUndefined,
	  represent: representJavascriptUndefined
	});
	return _undefined;
}

export { require_undefined as __require };
