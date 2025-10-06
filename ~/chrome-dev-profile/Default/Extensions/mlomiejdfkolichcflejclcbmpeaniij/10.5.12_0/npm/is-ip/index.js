import { __require as requireIpRegex } from './npm/ip-regex/index.js';

var isIp_1;
var hasRequiredIsIp;

function requireIsIp () {
	if (hasRequiredIsIp) return isIp_1;
	hasRequiredIsIp = 1;
	const ipRegex = requireIpRegex();

	const isIp = string => ipRegex({exact: true}).test(string);
	isIp.v4 = string => ipRegex.v4({exact: true}).test(string);
	isIp.v6 = string => ipRegex.v6({exact: true}).test(string);
	isIp.version = string => isIp(string) ? (isIp.v4(string) ? 4 : 6) : undefined;

	isIp_1 = isIp;
	return isIp_1;
}

export { requireIsIp as __require };
