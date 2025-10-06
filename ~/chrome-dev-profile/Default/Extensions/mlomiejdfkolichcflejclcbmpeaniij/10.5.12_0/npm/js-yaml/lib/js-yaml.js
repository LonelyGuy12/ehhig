import { __exports as jsYaml } from '../../../virtual/js-yaml.js';
import { __require as requireLoader } from './js-yaml/loader.js';
import { __require as requireDumper } from './js-yaml/dumper.js';
import { __require as requireType } from './js-yaml/type.js';
import { __require as requireSchema } from './js-yaml/schema.js';
import { __require as requireFailsafe } from './js-yaml/schema/failsafe.js';
import { __require as requireJson } from './js-yaml/schema/json.js';
import { __require as requireCore } from './js-yaml/schema/core.js';
import { __require as requireDefault_safe } from './js-yaml/schema/default_safe.js';
import { __require as requireDefault_full } from './js-yaml/schema/default_full.js';
import { __require as requireException } from './js-yaml/exception.js';

var hasRequiredJsYaml;

function requireJsYaml () {
	if (hasRequiredJsYaml) return jsYaml;
	hasRequiredJsYaml = 1;


	var loader = requireLoader();
	var dumper = requireDumper();


	function deprecated(name) {
	  return function () {
	    throw new Error('Function ' + name + ' is deprecated and cannot be used.');
	  };
	}


	jsYaml.Type                = requireType();
	jsYaml.Schema              = requireSchema();
	jsYaml.FAILSAFE_SCHEMA     = requireFailsafe();
	jsYaml.JSON_SCHEMA         = requireJson();
	jsYaml.CORE_SCHEMA         = requireCore();
	jsYaml.DEFAULT_SAFE_SCHEMA = requireDefault_safe();
	jsYaml.DEFAULT_FULL_SCHEMA = requireDefault_full();
	jsYaml.load                = loader.load;
	jsYaml.loadAll             = loader.loadAll;
	jsYaml.safeLoad            = loader.safeLoad;
	jsYaml.safeLoadAll         = loader.safeLoadAll;
	jsYaml.dump                = dumper.dump;
	jsYaml.safeDump            = dumper.safeDump;
	jsYaml.YAMLException       = requireException();

	// Deprecated schema names from JS-YAML 2.0.x
	jsYaml.MINIMAL_SCHEMA = requireFailsafe();
	jsYaml.SAFE_SCHEMA    = requireDefault_safe();
	jsYaml.DEFAULT_SCHEMA = requireDefault_full();

	// Deprecated functions from JS-YAML 1.x.x
	jsYaml.scan           = deprecated('scan');
	jsYaml.parse          = deprecated('parse');
	jsYaml.compose        = deprecated('compose');
	jsYaml.addConstructor = deprecated('addConstructor');
	return jsYaml;
}

export { requireJsYaml as __require };
