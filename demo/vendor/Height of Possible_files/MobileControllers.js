define([
		'framework/controllers/mobile/Home',
		'framework/controllers/mobile/Preloader',
		'framework/controllers/mobile/FlickScreen',
		'framework/controllers/mobile/Contribute', 
        'framework/controllers/mobile/EmptyController', 
        'framework/controllers/mobile/MobileMenu', 
        'framework/controllers/mobile/ConnectToDesktopScreen',
        'framework/controllers/mobile/KeepContributingScreen',
        'framework/controllers/mobile/AboutMenu'
        // 'FacebookErrorScreen', //When facebook was not successful
        // 'LostConnectionScreen' //"Awaiting on Desktop Answer"
         ], function(){
		var controllers = [
		'Home',
		'Preloader',
		'FlickScreen',
		'Contribute', 
        'EmptyController', 
        'MobileMenu',
        'ConnectToDesktopScreen',
        'KeepContributingScreen',
        'AboutMenu'
         ];

	var exports = {};

	for (var i = 0, len = controllers.length; i < len; i += 1) {
		exports[controllers[i]] = arguments[i];
	}

	return exports;
});