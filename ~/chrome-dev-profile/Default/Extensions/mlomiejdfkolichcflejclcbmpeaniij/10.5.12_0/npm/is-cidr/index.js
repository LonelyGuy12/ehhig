import { __module as isCidr } from '../../virtual/index3.js';
import { __require as requireCidrRegex } from './npm/cidr-regex/index.js';

var hasRequiredIsCidr;

function requireIsCidr () {
	if (hasRequiredIsCidr) return isCidr.exports;
	hasRequiredIsCidr = 1;
	const {v4, v6} = requireCidrRegex();

	const re4 = v4({exact: true});
	const re6 = v6({exact: true});

	isCidr.exports = str => re4.test(str) ? 4 : (re6.test(str) ? 6 : 0);
	isCidr.exports.v4 = str => re4.test(str);
	isCidr.exports.v6 = str => re6.test(str);
	return isCidr.exports;
}

export { requireIsCidr as __require };
