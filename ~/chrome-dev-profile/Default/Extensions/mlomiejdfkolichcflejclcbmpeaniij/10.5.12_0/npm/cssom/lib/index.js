import { __exports as lib } from '../../../virtual/index9.js';
import { __require as requireCSSStyleDeclaration } from './CSSStyleDeclaration.js';
import { __require as requireCSSRule } from './CSSRule.js';
import { __require as requireCSSGroupingRule } from './CSSGroupingRule.js';
import { __require as requireCSSConditionRule } from './CSSConditionRule.js';
import { __require as requireCSSStyleRule } from './CSSStyleRule.js';
import { __require as requireMediaList } from './MediaList.js';
import { __require as requireCSSMediaRule } from './CSSMediaRule.js';
import { __require as requireCSSSupportsRule } from './CSSSupportsRule.js';
import { __require as requireCSSImportRule } from './CSSImportRule.js';
import { __require as requireCSSFontFaceRule } from './CSSFontFaceRule.js';
import { __require as requireCSSHostRule } from './CSSHostRule.js';
import { __require as requireStyleSheet } from './StyleSheet.js';
import { __require as requireCSSStyleSheet } from './CSSStyleSheet.js';
import { __require as requireCSSKeyframesRule } from './CSSKeyframesRule.js';
import { __require as requireCSSKeyframeRule } from './CSSKeyframeRule.js';
import { __require as requireMatcherList } from './MatcherList.js';
import { __require as requireCSSDocumentRule } from './CSSDocumentRule.js';
import { __require as requireCSSValue } from './CSSValue.js';
import { __require as requireCSSValueExpression } from './CSSValueExpression.js';
import { __require as requireParse } from './parse.js';
import { __require as requireClone } from './clone.js';

var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;

	lib.CSSStyleDeclaration = requireCSSStyleDeclaration().CSSStyleDeclaration;
	lib.CSSRule = requireCSSRule().CSSRule;
	lib.CSSGroupingRule = requireCSSGroupingRule().CSSGroupingRule;
	lib.CSSConditionRule = requireCSSConditionRule().CSSConditionRule;
	lib.CSSStyleRule = requireCSSStyleRule().CSSStyleRule;
	lib.MediaList = requireMediaList().MediaList;
	lib.CSSMediaRule = requireCSSMediaRule().CSSMediaRule;
	lib.CSSSupportsRule = requireCSSSupportsRule().CSSSupportsRule;
	lib.CSSImportRule = requireCSSImportRule().CSSImportRule;
	lib.CSSFontFaceRule = requireCSSFontFaceRule().CSSFontFaceRule;
	lib.CSSHostRule = requireCSSHostRule().CSSHostRule;
	lib.StyleSheet = requireStyleSheet().StyleSheet;
	lib.CSSStyleSheet = requireCSSStyleSheet().CSSStyleSheet;
	lib.CSSKeyframesRule = requireCSSKeyframesRule().CSSKeyframesRule;
	lib.CSSKeyframeRule = requireCSSKeyframeRule().CSSKeyframeRule;
	lib.MatcherList = requireMatcherList().MatcherList;
	lib.CSSDocumentRule = requireCSSDocumentRule().CSSDocumentRule;
	lib.CSSValue = requireCSSValue().CSSValue;
	lib.CSSValueExpression = requireCSSValueExpression().CSSValueExpression;
	lib.parse = requireParse().parse;
	lib.clone = requireClone().clone;
	return lib;
}

export { requireLib as __require };
