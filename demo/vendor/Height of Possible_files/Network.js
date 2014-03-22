define( [ 'Class', 'libjs/signals/Signal', 'framework/config/Settings', 'Global', 'libjs/cookie/cookie', 'framework/auth/Facebook' ], function( Class, Signal, Settings, Global, Cookie, Facebook ) {

	var MESSAGES = null;

	var Network = new Class({

		initialize: function() {

			//this.cookie = new Cookie();

			// FLAGS
			this.isPaired = false;
			this.hasJoinedPaired = false;
	
			this.otherDeviceSyncCompleted = false;
            this.thisDeviceHasSynced = false;

			this.tutorialInProgress = false;

			this.isConnecting = false;
			this.isConnected = false;
			// end FLAGS
			
			// VARS
			this.pairedRoomID = null;
			this.pairedUserID = null;
			
			// end VARS

			// SIGNALS
			this.onConnect = new Signal(); //<- this Signal will emit when everything is initialized and connected
			this.onDisconnect = new Signal();
			this.onOtherDeviceJoined = new Signal();
			this.onOtherDeviceHasNotJoined = new Signal();
			this.onOtherDeviceDisconnected = new Signal();

			this.onJoinPaired = new Signal();
			this.onJoinRoom = new Signal();
			this.onJoinCanvasRoom = new Signal();

			this.onTutorialCompleted = new Signal();
			this.onTutorialStarted = new Signal();
			this.onOtherDeviceLeftContribute = new Signal();
			this.onOtherDeviceEnteredContribute = new Signal();
			this.onGoToContribute = new Signal();

			this.onOtherDeviceSyncComplete = new Signal();
			this.onSignOut = new Signal();
			this.onShare = new Signal();

			this.onShot = new Signal();

		},

		connect: function(){
			if (this.isConnecting) return;
			if (this.isConnected){
				this.onConnect.dispatch();
				return;
			}
			this.isConnecting = true;
			require( [ Settings.config.socketServerAddress + Settings.scriptAddressIO, Settings.config.socketServerAddress + Settings.scriptAddressMessages ], function( io, messages ) {

				this.socket = io.connect( Settings.config.socketServerAddress );

				MESSAGES = messages;
				this.messages = MESSAGES;

				this.setupMessages();

			}.bind( this ));
		},

		setupMessages: function() {

			// Bind all handlers
			var binds = ['_onConnect',
						'_onJoinPaired',
						'_onJoinRoom',
						'_onJoinCanvasRoom',
						'_onOtherDeviceJoinedPaired',
						'_onOtherDeviceHasNotJoinedPaired',
						'_onPairedDeviceDisconnected',
						'_onShot',
						'_onShotSaveError',
						'_onDisconnect',
						'_onTutorialCompleted',
						'_onTutorialStarted',
						'_onOtherDeviceLeftContribute',
						'_onOtherDeviceEnteredContribute',
						'_onGoToContribute',
						'_onOtherDeviceSyncComplete',
						'_onShare',
						'_onSignOut'
						];
			for (var i = 0, len = binds.length; i < len; i += 1) {
				if (!this[binds[i]]){
					console.warn(binds[i]+' is not a function in Network', i);
					continue;
				}
				this[binds[i]] = this[binds[i]].bind(this);
			}

			this.socket.on( MESSAGES.CONNECT, this._onConnect );
			this.socket.on( MESSAGES.JOIN_PAIRED_ROOM, this._onJoinPaired );
			this.socket.on( MESSAGES.JOIN_ROOM, this._onJoinRoom );
			this.socket.on( MESSAGES.JOIN_CANVAS_ROOM, this._onJoinCanvasRoom );
			this.socket.on( MESSAGES.OTHER_DEVICE_JOINED_PAIRED_ROOM, this._onOtherDeviceJoinedPaired );
			this.socket.on( MESSAGES.OTHER_DEVICE_HAS_NOT_JOINED_PAIRED_ROOM, this._onOtherDeviceHasNotJoinedPaired );
			this.socket.on( MESSAGES.PAIRED_DEVICE_DISCONNECTED, this._onPairedDeviceDisconnected );
			this.socket.on( MESSAGES.SHOT, this._onShot );
			this.socket.on( MESSAGES.SHOT_SAVE_ERROR, this._onShotSaveError );
			this.socket.on( MESSAGES.TUTORIAL_COMPLETED, this._onTutorialCompleted );
			this.socket.on( MESSAGES.TUTORIAL_STARTED, this._onTutorialStarted );
			this.socket.on( MESSAGES.OTHER_DEVICE_LEFT_CONTRIBUTE, this._onOtherDeviceLeftContribute );
			this.socket.on( MESSAGES.OTHER_DEVICE_ENTERED_CONTRIBUTE, this._onOtherDeviceEnteredContribute );
			this.socket.on( MESSAGES.GO_TO_CONTRIBUTE, this._onGoToContribute);
			this.socket.on( MESSAGES.OTHER_DEVICE_SYNC_COMPLETE, this._onOtherDeviceSyncComplete);
			this.socket.on( MESSAGES.SHARE, this._onShare);
			this.socket.on( MESSAGES.SIGN_OUT, this._onSignOut);

			this.socket.on( 'disconnect', this._onDisconnect );

		},

		joinPaired: function( pairedRoomID, isShooter, token ) {

			// Need to be able to join again on reconnect
			// if (this.hasJoinedPaired) {
			// 	console.warn('Trying to pair when isPaired is true');
			// 	return;
			// }

			if (!pairedRoomID){
				console.warn('pairedRoomID must be provided for Network.joinPaired');
				return;
			}

			this.pairedRoomID = pairedRoomID;
			this.socket.emit( MESSAGES.JOIN_PAIRED_ROOM, pairedRoomID, isShooter, token );

			console.log('emit: join paired');

		},

		joinCanvas: function(){
			this.socket.emit( MESSAGES.JOIN_CANVAS_ROOM );
		},
		
		leaveCanvas: function(){
			this.socket.emit( MESSAGES.LEAVE_CANVAS_ROOM );
		},

		joinRoom: function(room){
			this.socket.emit( MESSAGES.JOIN_ROOM, room );
		},

		shoot: function(shotData){
			if (!Facebook.user.localID && !Facebook.user.data.id){
				console.error("Can't shoot, missing user id");
				return;
			}
			console.log('shooting');
			if (Facebook.user.localID){
				this.socket.emit( MESSAGES.SHOOT, shotData, Facebook.user.localID, null );
			} else if (Facebook.user.data.id) {
				this.socket.emit( MESSAGES.SHOOT, shotData, null, Facebook.user.data.id );
			}	
		},

		shootBlank: function(shotData){
			console.log('shotting blank');
			this.socket.emit( MESSAGES.SHOOT, shotData );
		},

		tutorialStarted: function(){
			if (this.pairedRoomID){
				this.socket.emit( MESSAGES.TUTORIAL_STARTED, this.pairedRoomID );
			} else {
				console.warn('tutorialStarted Missing pairedRoomID');
			}
		},

		tutorialCompleted: function(){
			if (this.pairedRoomID){
				this.socket.emit( MESSAGES.TUTORIAL_COMPLETED, this.pairedRoomID );
			} else {
				console.warn('tutorialCompleted Missing pairedRoomID');
			}
		},

		otherDeviceLeftContribute: function(){
			if (this.pairedRoomID){
				this.socket.emit( MESSAGES.OTHER_DEVICE_LEFT_CONTRIBUTE, this.pairedRoomID );
			} else {
				console.warn('otherDeviceLeftContribute Missing pairedRoomID');
			}
		},

		otherDeviceEnteredContribute: function(){
			if (this.pairedRoomID){
				this.socket.emit( MESSAGES.OTHER_DEVICE_ENTERED_CONTRIBUTE, this.pairedRoomID );
			} else {
				console.warn('otherDeviceEnteredContribute Missing pairedRoomID');
			}
		},

		thisDeviceSyncComplete: function(){
			if (this.pairedRoomID){
                this.thisDeviceHasSynced = true;
				this.socket.emit( MESSAGES.OTHER_DEVICE_SYNC_COMPLETE, this.pairedRoomID );
			} else {
				console.warn('thisDeviceSyncComplete Missing pairedRoomID');
			}
		},

		goToContribute: function(){
			if (this.pairedRoomID){
				this.socket.emit( MESSAGES.GO_TO_CONTRIBUTE, this.pairedRoomID );
			} else {
				console.warn('goToContribute Missing pairedRoomID');
			}
		},

		signOut: function(){
			if (this.pairedRoomID){
				this.socket.emit( MESSAGES.SIGN_OUT, this.pairedRoomID );
			} else {
				console.warn('signOut Missing pairedRoomID');
			}
		},

		share: function(){
			if (this.pairedRoomID){
				this.socket.emit( MESSAGES.SHARE, this.pairedRoomID );
			} else {
				console.warn('share Missing pairedRoomID');
			}
		},

		// Handlers
		_onConnect: function(){
			console.log('CONNECTED TO NETWORK');
			this.isConnected = true;
			this.isConnecting = false;
			this.onConnect.dispatch();
		},

		_onJoinPaired: function(){
			this.hasJoinedPaired = true;
			console.log('JOINED PAIRED ROOM');
			this.onJoinPaired.dispatch();
		},

		_onJoinCanvasRoom: function(canvas){
			console.log('JOINED CANVAS ROOM', canvas);
			this.onJoinCanvasRoom.dispatch(canvas);
		},

		_onJoinRoom: function(room){
			console.log('JOINED ROOM', room);
			this.onJoinRoom.dispatch(room);
		},

		_onOtherDeviceJoinedPaired: function(userID){
			this.pairedUserID = userID;
			this.isPaired = true;
			console.log('Other device joined: ', userID);
            // If this device has already been synchronized
            // Then dispatch a sync complete message
            // THis is in case the other device disconnects and then reconnects
            if (this.thisDeviceHasSynced){
                this.thisDeviceSyncComplete();
            }
			this.onOtherDeviceJoined.dispatch( userID );
		},

		_onOtherDeviceHasNotJoinedPaired: function(){
			this.onOtherDeviceHasNotJoined.dispatch();
		},

		_onShotSaveError: function(err){
			console.log('SHOT SAVE ERROR:', err);
		},

		_onShot: function(data){
			console.log('shot:', data);
			this.onShot.dispatch(data);
		},

		_onPairedDeviceDisconnected: function(userID){
			// Cleanup flags
			this.pairedUserID = null;
			this.isPaired = false;
			this.otherDeviceSyncCompleted = false;
			this.tutorialInProgress = false;

			console.log('OTHER DEVICE DISCONNECTED');
			this.onOtherDeviceDisconnected.dispatch( userID );
		},

		_onDisconnect: function(){
			console.warn( 'SOCKET DISCONNECTED' );

			// Cleanup FLAGS
			this.isConnected = false;
			this.isPaired = false;
			this.hasJoinedPaired = false;
			this.otherDeviceSyncCompleted = false;
			this.tutorialInProgress = false;
            this.thisDeviceHasSynced = false;
			this.isConnecting = false;
			this.isConnected = false;

			this.resetData();
			this.onDisconnect.dispatch();
		},
		
		resetData: function(){
			this.pairedRoomID = null;
			this.pairedUserID = null;
		},

		_onTutorialCompleted: function(){
			console.log('onTutorialCompleted');
			this.tutorialInProgress = false;
			this.onTutorialCompleted.dispatch();
		},

		_onTutorialStarted: function(){
			console.log('onTutorialStarted');
			this.tutorialInProgress = true;
			this.onTutorialStarted.dispatch();
		},

		_onOtherDeviceLeftContribute: function(){
			console.log('onOtherDeviceLeftContribute');
			this.onOtherDeviceLeftContribute.dispatch();
		},

		_onOtherDeviceEnteredContribute: function(){
			console.log('onOtherDeviceEnteredContribute');
			this.onOtherDeviceEnteredContribute.dispatch();
		},

		_onGoToContribute: function(){
			console.log('onGoToContribute');
			Global.framework.go('contribute');
			this.onGoToContribute.dispatch();
		},

		_onOtherDeviceSyncComplete: function(){
			console.log('onOtherDeviceSyncComplete');
			this.otherDeviceSyncCompleted = true;
			this.onOtherDeviceSyncComplete.dispatch();
		},

		_onShare: function(){
			console.log('onShare');
			this.onShare.dispatch();
		},

		_onSignOut: function(){
			console.log('onSignOut');
			this.onSignOut.dispatch();
		}

	});

	return new Network();
	
});