import { __exports as CSSSupportsRule } from '../../../virtual/CSSSupportsRule.js';
import { __require as requireCSSRule } from './CSSRule.js';
import { __require as requireCSSGroupingRule } from './CSSGroupingRule.js';
import { __require as requireCSSConditionRule } from './CSSConditionRule.js';

var hasRequiredCSSSupportsRule;

function requireCSSSupportsRule () {
	if (hasRequiredCSSSupportsRule) return CSSSupportsRule;
	hasRequiredCSSSupportsRule = 1;
	//.CommonJS
	var CSSOM = {
	  CSSRule: requireCSSRule().CSSRule,
	  CSSGroupingRule: requireCSSGroupingRule().CSSGroupingRule,
	  CSSConditionRule: requireCSSConditionRule().CSSConditionRule
	};
	///CommonJS


	/**
	 * @constructor
	 * @see https://drafts.csswg.org/css-conditional-3/#the-csssupportsrule-interface
	 */
	CSSOM.CSSSupportsRule = function CSSSupportsRule() {
	  CSSOM.CSSConditionRule.call(this);
	};

	CSSOM.CSSSupportsRule.prototype = new CSSOM.CSSConditionRule();
	CSSOM.CSSSupportsRule.prototype.constructor = CSSOM.CSSSupportsRule;
	CSSOM.CSSSupportsRule.prototype.type = 12;

	Object.defineProperty(CSSOM.CSSSupportsRule.prototype, "cssText", {
	  get: function() {
	    var cssTexts = [];

	    for (var i = 0, length = this.cssRules.length; i < length; i++) {
	      cssTexts.push(this.cssRules[i].cssText);
	    }

	    return "@supports " + this.conditionText + " {" + cssTexts.join("") + "}";
	  }
	});

	//.CommonJS
	CSSSupportsRule.CSSSupportsRule = CSSOM.CSSSupportsRule;
	///CommonJS
	return CSSSupportsRule;
}

export { requireCSSSupportsRule as __require };
