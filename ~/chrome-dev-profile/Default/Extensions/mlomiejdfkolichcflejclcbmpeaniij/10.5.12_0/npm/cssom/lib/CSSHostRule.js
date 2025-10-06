import { __exports as CSSHostRule } from '../../../virtual/CSSHostRule.js';
import { __require as requireCSSRule } from './CSSRule.js';

var hasRequiredCSSHostRule;

function requireCSSHostRule () {
	if (hasRequiredCSSHostRule) return CSSHostRule;
	hasRequiredCSSHostRule = 1;
	//.CommonJS
	var CSSOM = {
		CSSRule: requireCSSRule().CSSRule
	};
	///CommonJS


	/**
	 * @constructor
	 * @see http://www.w3.org/TR/shadow-dom/#host-at-rule
	 */
	CSSOM.CSSHostRule = function CSSHostRule() {
		CSSOM.CSSRule.call(this);
		this.cssRules = [];
	};

	CSSOM.CSSHostRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSHostRule.prototype.constructor = CSSOM.CSSHostRule;
	CSSOM.CSSHostRule.prototype.type = 1001;
	//FIXME
	//CSSOM.CSSHostRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
	//CSSOM.CSSHostRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

	Object.defineProperty(CSSOM.CSSHostRule.prototype, "cssText", {
		get: function() {
			var cssTexts = [];
			for (var i=0, length=this.cssRules.length; i < length; i++) {
				cssTexts.push(this.cssRules[i].cssText);
			}
			return "@host {" + cssTexts.join("") + "}";
		}
	});


	//.CommonJS
	CSSHostRule.CSSHostRule = CSSOM.CSSHostRule;
	///CommonJS
	return CSSHostRule;
}

export { requireCSSHostRule as __require };
