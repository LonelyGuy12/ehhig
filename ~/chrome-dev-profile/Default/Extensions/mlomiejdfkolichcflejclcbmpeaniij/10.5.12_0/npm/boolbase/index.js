var boolbase;
var hasRequiredBoolbase;

function requireBoolbase () {
	if (hasRequiredBoolbase) return boolbase;
	hasRequiredBoolbase = 1;
	boolbase = {
		trueFunc: function trueFunc(){
			return true;
		},
		falseFunc: function falseFunc(){
			return false;
		}
	};
	return boolbase;
}

export { requireBoolbase as __require };
