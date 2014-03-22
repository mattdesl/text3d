define(['framework/config/Dev'], function(Dev){

	var s = {};

	s.shareImageWidth = 800;
	s.shareImageHeight = 600;

	s.isEvent = false;
	s.hasSeenWelcome = false;
	s.hasSeenTutorial = false;
	
	// Network
	s.scriptAddressIO = 'socket.io/socket.io.js';
	s.scriptAddressMessages = 'messages.js';

	s.envConfig = {

		'development': {
			socketServerAddress: 'http://192.168.1.108:443/', //dev
		},
		'test': {
			socketServerAddress: 'http://hopstaging.jam3.net:443/',
		},
		'production': {
			socketServerAddress: 'http://hoplive.jam3.net:443/'
		}

	};

	// Use the global ENV variable to get the proper settings
	s.config = s.envConfig[ENV];

	s.config.fbAppID = FB_APP_ID;

	// Modify fbAppID based on Dev
	if (ENV == 'development'){

		if (Dev.fbAppID) s.config.fbAppID = Dev.fbAppID;
		if (Dev.socketServerAddress) s.config.socketServerAddress = Dev.socketServerAddress;

		console.log("DEV ", s.config.fbAppID, s.config.socketServerAddress);
	}

	return s;

});