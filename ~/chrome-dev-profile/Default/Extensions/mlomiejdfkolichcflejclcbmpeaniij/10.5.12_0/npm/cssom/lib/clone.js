import { __exports as clone } from '../../../virtual/clone.js';
import { __require as requireCSSStyleSheet } from './CSSStyleSheet.js';
import { __require as requireCSSRule } from './CSSRule.js';
import { __require as requireCSSStyleRule } from './CSSStyleRule.js';
import { __require as requireCSSGroupingRule } from './CSSGroupingRule.js';
import { __require as requireCSSConditionRule } from './CSSConditionRule.js';
import { __require as requireCSSMediaRule } from './CSSMediaRule.js';
import { __require as requireCSSSupportsRule } from './CSSSupportsRule.js';
import { __require as requireCSSStyleDeclaration } from './CSSStyleDeclaration.js';
import { __require as requireCSSKeyframeRule } from './CSSKeyframeRule.js';
import { __require as requireCSSKeyframesRule } from './CSSKeyframesRule.js';

var hasRequiredClone;

function requireClone () {
	if (hasRequiredClone) return clone;
	hasRequiredClone = 1;
	//.CommonJS
	var CSSOM = {
		CSSStyleSheet: requireCSSStyleSheet().CSSStyleSheet,
		CSSRule: requireCSSRule().CSSRule,
		CSSStyleRule: requireCSSStyleRule().CSSStyleRule,
		CSSGroupingRule: requireCSSGroupingRule().CSSGroupingRule,
		CSSConditionRule: requireCSSConditionRule().CSSConditionRule,
		CSSMediaRule: requireCSSMediaRule().CSSMediaRule,
		CSSSupportsRule: requireCSSSupportsRule().CSSSupportsRule,
		CSSStyleDeclaration: requireCSSStyleDeclaration().CSSStyleDeclaration,
		CSSKeyframeRule: requireCSSKeyframeRule().CSSKeyframeRule,
		CSSKeyframesRule: requireCSSKeyframesRule().CSSKeyframesRule
	};
	///CommonJS


	/**
	 * Produces a deep copy of stylesheet — the instance variables of stylesheet are copied recursively.
	 * @param {CSSStyleSheet|CSSOM.CSSStyleSheet} stylesheet
	 * @nosideeffects
	 * @return {CSSOM.CSSStyleSheet}
	 */
	CSSOM.clone = function clone(stylesheet) {

		var cloned = new CSSOM.CSSStyleSheet();

		var rules = stylesheet.cssRules;
		if (!rules) {
			return cloned;
		}

		for (var i = 0, rulesLength = rules.length; i < rulesLength; i++) {
			var rule = rules[i];
			var ruleClone = cloned.cssRules[i] = new rule.constructor();

			var style = rule.style;
			if (style) {
				var styleClone = ruleClone.style = new CSSOM.CSSStyleDeclaration();
				for (var j = 0, styleLength = style.length; j < styleLength; j++) {
					var name = styleClone[j] = style[j];
					styleClone[name] = style[name];
					styleClone._importants[name] = style.getPropertyPriority(name);
				}
				styleClone.length = style.length;
			}

			if (rule.hasOwnProperty('keyText')) {
				ruleClone.keyText = rule.keyText;
			}

			if (rule.hasOwnProperty('selectorText')) {
				ruleClone.selectorText = rule.selectorText;
			}

			if (rule.hasOwnProperty('mediaText')) {
				ruleClone.mediaText = rule.mediaText;
			}

			if (rule.hasOwnProperty('conditionText')) {
				ruleClone.conditionText = rule.conditionText;
			}

			if (rule.hasOwnProperty('cssRules')) {
				ruleClone.cssRules = clone(rule).cssRules;
			}
		}

		return cloned;

	};

	//.CommonJS
	clone.clone = CSSOM.clone;
	///CommonJS
	return clone;
}

export { requireClone as __require };
