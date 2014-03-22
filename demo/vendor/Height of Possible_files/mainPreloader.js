require.config({
	baseUrl: '/js',

	paths: {
		'libjs': 'vendor/libjs',
		'PIXI': 'vendor/pixi.js/bin/pixi.dev',
		'text': 'vendor/require/text',
		'detector': 'vendor/Detector',
		'stats': 'vendor/stats.min',
		'three': 'vendor/three.r64',
		'KeyboardState': 'vendor/THREEx.KeyboardState',
		'RendererStats': 'vendor/THREEx.RendererStats',
		'baseClass': 'vendor/jsOOP/baseClass',
		'Class': 'vendor/jsOOP/Class',
		'Signal': 'vendor/js-signals/signals.min',
		'TweenLite': 'vendor/greensock-js/src/minified/TweenLite.min',
        'Ease': 'vendor/greensock-js/src/minified/easing/EasePack.min',
        'CSSPlugin': 'vendor/greensock-js/src/minified/plugins/CSSPlugin.min',
		'jquery': 'vendor/jquery-1.10.2',
		'jquery-nestedAccordian': 'vendor/jquery.nestedAccordion',
		'jquery-form': 'vendor/jquery.form',
		'Tween': 'vendor/jquery-1.10.2',
		'GUI': 'vendor/dat.gui',
		'_': 'vendor/underscore',
		'screenfull': 'vendor/screenfull.min',
		'preloadjs': 'vendor/preloadjs.min',
		'handlebars': 'vendor/handlebars.runtime-v1.3.0'
	},

	shim: {
		'detector': {
			exports: 'Detector'
		},
		'stats': {
			exports: 'Stats'
		},
		'three': {
			exports: 'THREE'
		},
        'TweenLite': {
            deps: ['Ease', 'CSSPlugin'],
            exports: 'TweenLite'
        },
		'_': { 
			exports: '_'
		},
		'preloadjs': {
			exports: 'createjs'
		},
		'screenfull': {
			exports: 'screenfull'
		},
		'handlebars': {
			exports: 'Handlebars'
		},
		'PIXI': {
			exports: 'PIXI'
		},
		'jquery-form': {
			deps: ['jquery']
		},
		'jquery-nestedAccordian': {
			deps: ['jquery']
		}
	}
});

// THIS require is only used for development, production/staging versions use compiled js
require([], function () {

	var modules = [];
	if (window.CONSOLE){
		modules = ['consoleFramework'];
	} else if (window.DEVICE.isMobile){
		// MOBILE
		modules = ['mobileFramework'];
	} else {
		// DESKTOP
		modules = ['desktopFramework'];
	}

	require(modules);

});
