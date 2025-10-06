import { __exports as CSSMediaRule } from '../../../virtual/CSSMediaRule.js';
import { __require as requireCSSRule } from './CSSRule.js';
import { __require as requireCSSGroupingRule } from './CSSGroupingRule.js';
import { __require as requireCSSConditionRule } from './CSSConditionRule.js';
import { __require as requireMediaList } from './MediaList.js';

var hasRequiredCSSMediaRule;

function requireCSSMediaRule () {
	if (hasRequiredCSSMediaRule) return CSSMediaRule;
	hasRequiredCSSMediaRule = 1;
	//.CommonJS
	var CSSOM = {
		CSSRule: requireCSSRule().CSSRule,
		CSSGroupingRule: requireCSSGroupingRule().CSSGroupingRule,
		CSSConditionRule: requireCSSConditionRule().CSSConditionRule,
		MediaList: requireMediaList().MediaList
	};
	///CommonJS


	/**
	 * @constructor
	 * @see http://dev.w3.org/csswg/cssom/#cssmediarule
	 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSMediaRule
	 */
	CSSOM.CSSMediaRule = function CSSMediaRule() {
		CSSOM.CSSConditionRule.call(this);
		this.media = new CSSOM.MediaList();
	};

	CSSOM.CSSMediaRule.prototype = new CSSOM.CSSConditionRule();
	CSSOM.CSSMediaRule.prototype.constructor = CSSOM.CSSMediaRule;
	CSSOM.CSSMediaRule.prototype.type = 4;

	// https://opensource.apple.com/source/WebCore/WebCore-7611.1.21.161.3/css/CSSMediaRule.cpp
	Object.defineProperties(CSSOM.CSSMediaRule.prototype, {
	  "conditionText": {
	    get: function() {
	      return this.media.mediaText;
	    },
	    set: function(value) {
	      this.media.mediaText = value;
	    },
	    configurable: true,
	    enumerable: true
	  },
	  "cssText": {
	    get: function() {
	      var cssTexts = [];
	      for (var i=0, length=this.cssRules.length; i < length; i++) {
	        cssTexts.push(this.cssRules[i].cssText);
	      }
	      return "@media " + this.media.mediaText + " {" + cssTexts.join("") + "}";
	    },
	    configurable: true,
	    enumerable: true
	  }
	});


	//.CommonJS
	CSSMediaRule.CSSMediaRule = CSSOM.CSSMediaRule;
	///CommonJS
	return CSSMediaRule;
}

export { requireCSSMediaRule as __require };
