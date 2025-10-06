import { __require as requireType } from '../type.js';

var merge;
var hasRequiredMerge;

function requireMerge () {
	if (hasRequiredMerge) return merge;
	hasRequiredMerge = 1;

	var Type = requireType();

	function resolveYamlMerge(data) {
	  return data === '<<' || data === null;
	}

	merge = new Type('tag:yaml.org,2002:merge', {
	  kind: 'scalar',
	  resolve: resolveYamlMerge
	});
	return merge;
}

export { requireMerge as __require };
