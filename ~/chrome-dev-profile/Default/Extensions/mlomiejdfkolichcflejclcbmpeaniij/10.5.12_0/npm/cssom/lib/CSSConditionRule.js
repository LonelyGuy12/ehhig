import { __exports as CSSConditionRule } from '../../../virtual/CSSConditionRule.js';
import { __require as requireCSSRule } from './CSSRule.js';
import { __require as requireCSSGroupingRule } from './CSSGroupingRule.js';

var hasRequiredCSSConditionRule;

function requireCSSConditionRule () {
	if (hasRequiredCSSConditionRule) return CSSConditionRule;
	hasRequiredCSSConditionRule = 1;
	//.CommonJS
	var CSSOM = {
	  CSSRule: requireCSSRule().CSSRule,
	  CSSGroupingRule: requireCSSGroupingRule().CSSGroupingRule
	};
	///CommonJS


	/**
	 * @constructor
	 * @see https://www.w3.org/TR/css-conditional-3/#the-cssconditionrule-interface
	 */
	CSSOM.CSSConditionRule = function CSSConditionRule() {
	  CSSOM.CSSGroupingRule.call(this);
	  this.cssRules = [];
	};

	CSSOM.CSSConditionRule.prototype = new CSSOM.CSSGroupingRule();
	CSSOM.CSSConditionRule.prototype.constructor = CSSOM.CSSConditionRule;
	CSSOM.CSSConditionRule.prototype.conditionText = '';
	CSSOM.CSSConditionRule.prototype.cssText = '';

	//.CommonJS
	CSSConditionRule.CSSConditionRule = CSSOM.CSSConditionRule;
	///CommonJS
	return CSSConditionRule;
}

export { requireCSSConditionRule as __require };
