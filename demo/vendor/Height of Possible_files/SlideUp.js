define(['Class', 
		'PIXI',
		'TweenLite',
		'jquery',
		'Global'], function(Class, 
			PIXI,
			TweenLite,
			$,
			Global) {


	function asDefault(option, defaultValue, typeStr) {
		return typeof option === (typeStr||"number") ? option : defaultValue;
	}


	var SlideUp = new Class({


	});


	//Accepts an array of items, where each one is a jQuery selector
	//that may contain multiple items. extracts each 
	SlideUp.animateCombined = function(items, options) {
		var array = Array.isArray(items) ? items : [ items ];

		options.delay = options.delay||0;

		//The delay increment for a "block" of items
		options.blockIncrement = options.blockIncrement || 0;

		var onComplete = options.onComplete;

		if (options.reverse) {
			for (var i=array.length-1; i>=0; i--) {
				options.onComplete = i===0 ? onComplete : undefined;
				options.delay += SlideUp.animate( array[i], options ) + options.blockIncrement;
			}
		} else {
			for (var i=0; i<array.length; i++) {
				options.onComplete = i===array.length-1 ? onComplete : undefined;
				options.delay += SlideUp.animate( array[i], options ) + options.blockIncrement;	
			}
		}
	};

	//Accepts a jQuery selector of one or more items, or an array of jQuery selectors.
	SlideUp.animate = function(items, options) {
		if (!items)
			throw "Must specify an item or a list of items to tween";

		options = options || {};

		//distance to slide on Y axis
		options.distance = asDefault(options.distance, 30); 

		//onComplete handler
		//.. doesn't matter if it's null/undefined
			
		//easing for the effect
		options.ease = options.ease||Expo.easeOut;

		//total duration for each slide
		options.duration = asDefault(options.duration, 1.0);

		//the amount to increment each line
		options.delayIncrement = asDefault(options.delayIncrement, 0.1);

		//whether to apply animations in reverse, e.g. for fade-out, default false
		//if REVERSE is TRUE, then we just use TweenLite.to(...) and ignore start pos
		options.reverse = asDefault(options.reverse, false, "boolean");

		//overall delay for the effect
		options.delay = options.delay||0;

		var array = $.makeArray(items);

		var startDelay = options.delay;
		var delay = 0;

		//Forward
		if (!options.reverse) {
			for (var i=0; i<array.length; i++) {
				var item = array[i];

				TweenLite.fromTo(item, options.duration, {
					y: options.distance,
					opacity: 0.0,
				}, {
					delay: startDelay + delay,
					opacity: 1.0,
					ease: options.ease,
					y: 0,
					onComplete: (i === array.length-1) ? options.onComplete : undefined
				});

				delay += options.delayIncrement;
			}
		} else {
			for (var i=array.length-1; i>=0; i--) {
				var item = array[i];

				TweenLite.to(item, options.duration, {
					delay: startDelay + delay,
					opacity: 0.0,
					ease: options.ease,
					y: options.distance,
					onComplete: (i === 0) ? options.onComplete : undefined
				});

				delay += options.delayIncrement;
			}
		}

		return delay;
	};
	
	return SlideUp;
});
