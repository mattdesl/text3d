define([], function() {

	/** Utility function for linear interpolation. */
	return function(v0, v1, t) {
	    return v0*(1-t)+v1*t;
	};

});