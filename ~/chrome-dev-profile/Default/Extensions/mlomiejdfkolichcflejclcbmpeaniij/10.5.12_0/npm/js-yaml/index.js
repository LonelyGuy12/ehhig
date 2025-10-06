import { __require as requireJsYaml$1 } from './lib/js-yaml.js';

var jsYaml;
var hasRequiredJsYaml;

function requireJsYaml () {
	if (hasRequiredJsYaml) return jsYaml;
	hasRequiredJsYaml = 1;


	var yaml = requireJsYaml$1();


	jsYaml = yaml;
	return jsYaml;
}

export { requireJsYaml as __require };
