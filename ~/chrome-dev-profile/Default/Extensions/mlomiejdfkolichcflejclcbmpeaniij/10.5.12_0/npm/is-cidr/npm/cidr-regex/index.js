import { __module as cidrRegex } from '../../../../virtual/index5.js';
import { __require as requireIpRegex } from '../ip-regex/index.js';

var hasRequiredCidrRegex;

function requireCidrRegex () {
	if (hasRequiredCidrRegex) return cidrRegex.exports;
	hasRequiredCidrRegex = 1;

	const ipRegex = requireIpRegex();

	const defaultOpts = {exact: false};

	const v4str = `${ipRegex.v4().source}\\/(3[0-2]|[12]?[0-9])`;
	const v6str = `${ipRegex.v6().source}\\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])`;

	// can not precompile the non-exact regexes because global flag makes the regex object stateful
	// which would require the user to reset .lastIndex on subsequent calls
	const v4exact = new RegExp(`^${v4str}$`);
	const v6exact = new RegExp(`^${v6str}$`);
	const v46exact = new RegExp(`(?:^${v4str}$)|(?:^${v6str}$)`);

	cidrRegex.exports = ({exact} = defaultOpts) => exact ? v46exact : new RegExp(`(?:${v4str})|(?:${v6str})`, "g");
	cidrRegex.exports.v4 = ({exact} = defaultOpts) => exact ? v4exact : new RegExp(v4str, "g");
	cidrRegex.exports.v6 = ({exact} = defaultOpts) => exact ? v6exact : new RegExp(v6str, "g");
	return cidrRegex.exports;
}

export { requireCidrRegex as __require };
