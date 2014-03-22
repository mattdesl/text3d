define([], function() {

	/** Utility function for Hermite interpolation. */
	return function(v0, v1, t) {
	    // Scale, bias and saturate x to 0..1 range
	    t = Math.max(0.0, Math.min(1.0, (t - v0)/(v1 - v0) ));
	    // Evaluate polynomial
	    return t*t*(3 - 2*t);
	};

});