define([
	'Class',
	'Signal'
],function(
	Class,
	signals
){

	var Utils = {};
	Utils.debug = false;
	Utils.activate = function(object, valueKey) {
		//validate object
		if(valueKey in object && !(("_"+valueKey) in object)) {
			//set up a signal and a getter/setter pair
			//signal
			object[valueKey+"ChangedSignal"] = new signals.Signal();
			object[valueKey+"AccessedSignal"] = new signals.Signal();
			//getter/setter
			object["_"+valueKey] = object[valueKey]; 
			Object.defineProperty(object, valueKey,{
				set: function(val){
					this["_"+valueKey] = val;
					this[valueKey+"ChangedSignal"].dispatch(val);
				},
				get:  function(){
					this[valueKey+"AccessedSignal"].dispatch();
					return this["_"+valueKey];
				}
			});
		}
	};
	Utils.castStringAsNumber = function(str) {
		if(str !== "" && !isNaN(str)) return parseFloat(str);
		else return 0;
	}
	return Utils;
});