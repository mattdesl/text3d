define([], function(){

	var Util = function(){
		var u = {
			PRODUCTION: 'production',
			DEV: 'dev',
			env: 'production',
			support: {
				isHandheld: false,
				isIPhone: false,
				isRetina: false,
				prefix: null
			}
		};
		// Handheld
		if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
			u.support.isHandheld = true;
			
			u.support.isIPhone = /iPhone/.test(navigator.userAgent);
			u.support.isAndroid = /Android/.test(navigator.userAgent);
			u.support.isWebOS = /webOS/.test(navigator.userAgent);
			u.support.isIPad = /iPad/.test(navigator.userAgent);
			u.support.isIPod = /iPod/.test(navigator.userAgent);
			u.support.isBlackberry = /BlackBerry/.test(navigator.userAgent);
		}
		// Pixel ratio
		if (window.devicePixelRatio > 1){
			u.support.isRetina = true;
		}

		var styles = window.getComputedStyle(document.documentElement, '');
		var pre = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1];
		var dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
		u.support.prefix = {
			dom: dom,
			lowercase: pre,
			css: '-' + pre + '-',
			js: pre[0].toUpperCase() + pre.substr(1)
		};

		// String
		u.truncate = function(str, length, elipse){
			var ret =  str.substring(0, length);
			if (str.length > length && elipse !== false){
				ret = ret + '&#8230;';
			}
			return ret;
		};

		// Defers a function until the next frame
		u.defer = function(func){
			var args = Array.prototype.slice.call(arguments, 1);
			return setTimeout( function(){
				func.apply(null, args);
			}, 0 );
		};

		// Image utils
		// Replaces .png/.jpg with @2x.png/@2x.jpg if on Retina device 
		u.getImageURL = function(src){
			if (Util.support.isRetina && src && src.length){
				return src.replace(/(\.\w+$)/, '@2x$1');
			}
			return src;
		};

		// String format: first parameter is the string, then the varargs...
		//     format("{1} foo {0}", "test", "two") => "two foo test"
		u.format = function(  ) {
			var args = arguments;
			if (args.length==0)
				return ""
			else if (args.length==1)
				return args[0];
			return args[0].replace(/{(\d+)}/g, function(match, number) {
				return typeof args[(+number)+1] !== 'undefined' ? args[(+number)+1] : match;
			});
		};

		// Shuffles an array (Fisher-Yates)
		u.shuffle = function(array) {
		    var counter = array.length, temp, index;

		    // While there are elements in the array
		    while (counter--) {
		        // Pick a random index
		        index = (Math.random() * counter) | 0;

		        // And swap the last element with it
		        temp = array[counter];
		        array[counter] = array[index];
		        array[index] = temp;
		    }

		    return array;
		}

		return u;
	}();

	return Util;

});