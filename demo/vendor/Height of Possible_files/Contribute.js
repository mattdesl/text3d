define(['Class', 'framework/controllers/BaseController', 'framework/auth/Facebook', 'framework/Network'], function(Class, BaseController, Facebook, Network){

	// MOBILE

	var Contribute = new Class({
		
		Extends: BaseController,

		init: function(template, data){

			this.parent(template, data);

			Network.onConnect.add( this.onNetworkConnect.bind(this) );
			Network.onOtherDeviceJoined.add( this.onOtherDeviceJoined.bind(this) );
			Network.connect();

			this.setState('waiting');

			Network.canvasID = 'a';
			this.container.find('#shoot').on('click', function(){
				Network.shoot({angle:234});
			}.bind(this));

			this.initialized();

		},

		onNetworkConnect: function(){

			if (!Network.hasJoinedPaired){
				Network.joinPaired( Facebook.userData.id, true );
			}

		},

		onOtherDeviceJoined: function(){
			this.setState('connected');
		},

		setState: function(state){
			switch (state){
				case 'connected':
					this.container.find('.card h1').html('YOU ARE CONNECTED');
					break;
				case 'waiting':
					this.container.find('.card h1').html('PLEASE VISIT THE SITE ON YOUR DESKTOP');
					break;
			}
		}

	});

	return Contribute;

});