import { __exports as CSSDocumentRule } from '../../../virtual/CSSDocumentRule.js';
import { __require as requireCSSRule } from './CSSRule.js';
import { __require as requireMatcherList } from './MatcherList.js';

var hasRequiredCSSDocumentRule;

function requireCSSDocumentRule () {
	if (hasRequiredCSSDocumentRule) return CSSDocumentRule;
	hasRequiredCSSDocumentRule = 1;
	//.CommonJS
	var CSSOM = {
	    CSSRule: requireCSSRule().CSSRule,
	    MatcherList: requireMatcherList().MatcherList
	};
	///CommonJS


	/**
	 * @constructor
	 * @see https://developer.mozilla.org/en/CSS/@-moz-document
	 */
	CSSOM.CSSDocumentRule = function CSSDocumentRule() {
	    CSSOM.CSSRule.call(this);
	    this.matcher = new CSSOM.MatcherList();
	    this.cssRules = [];
	};

	CSSOM.CSSDocumentRule.prototype = new CSSOM.CSSRule();
	CSSOM.CSSDocumentRule.prototype.constructor = CSSOM.CSSDocumentRule;
	CSSOM.CSSDocumentRule.prototype.type = 10;
	//FIXME
	//CSSOM.CSSDocumentRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
	//CSSOM.CSSDocumentRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

	Object.defineProperty(CSSOM.CSSDocumentRule.prototype, "cssText", {
	  get: function() {
	    var cssTexts = [];
	    for (var i=0, length=this.cssRules.length; i < length; i++) {
	        cssTexts.push(this.cssRules[i].cssText);
	    }
	    return "@-moz-document " + this.matcher.matcherText + " {" + cssTexts.join("") + "}";
	  }
	});


	//.CommonJS
	CSSDocumentRule.CSSDocumentRule = CSSOM.CSSDocumentRule;
	///CommonJS
	return CSSDocumentRule;
}

export { requireCSSDocumentRule as __require };
