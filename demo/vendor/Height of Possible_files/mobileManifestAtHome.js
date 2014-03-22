define(['libjs/utils/Util'], function(Util) {

	//This is the "initial" manifest, does not preload particle animations
	var manifest = [
		{
			url: Util.getImageURL('img/tps/mobile0.json')
		},
		{
			url: Util.getImageURL('img/tps/common0.json')
		},
		{
			url: 'img/mobile-bg.png'
		},
		{
			url: 'img/temp_profile.jpg'
		},

		//Warning icons...
		{
			url: 'img/mobile-warning-icon.png'
		},

		//Rotate screen stuff
		{
			url: 'img/mobile-rotate-icon2.png'
		},
		{
			url: 'img/mobile-rotate-icon1.png'
		},
		{
			url: 'img/rotate-screen.png'
		},
	];

	return manifest;

});