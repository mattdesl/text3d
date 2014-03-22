define(['Class', 'ui/BaseSyncCanvas', 'Global', 
        'utils/DOMUtil',
        'framework/Network', 'framework/auth/Facebook',
        'framework/assets/Preloader', 'framework/assets/manifests/mobileManifest',
        'ui/SlideUp'
        ], function(Class, BaseSyncCanvas, Global, DOMUtil, Network, Facebook, Preloader, mobileManifest, SlideUp) {

    var ConnectToDesktopScreen = new Class({
        
        Extends: BaseSyncCanvas,

        init: function(template, data){
            this.parent(template, data);

            // this.background = $(this.templateFactory.render('Background'));
            // this.background.prependTo($(this.container));
            // this.container.css("z-index", 1000);
                
            this.addSignal( Network.onConnect, this.onNetworkConnect.bind(this) );
            this.addSignal( Network.onOtherDeviceJoined, this.onOtherDeviceJoined.bind(this) );
            this.addSignal( Network.onOtherDeviceHasNotJoined, this.onOtherDeviceHasNotJoined.bind(this) );
            this.addSignal( Network.onOtherDeviceDisconnected, this.onOtherDeviceDisconnected.bind(this) );
            this.addSignal( Network.onOtherDeviceSyncComplete, this.onOtherDeviceSyncComplete.bind(this) );

            this.waitingForOtherDevice = false;
            this.finishedSyncing = false;
            this.finishedLoading = false;

            this.handleSync = this.onFinishSync.bind(this);

            DOMUtil.setupSprites(this.container);
                
            this.container.hide();

            this.initialized();
        },

        setupUI: function() {
            this.parent();
            this.avatar.disconnected();
        },


        animateIn: function() {
            this.start();



            //The animate in doesn't actually show any text, until 
            //we determine what to do based on network state.
            $(".mobile-background", this.container).show();
            this.content.hide();

            this.container.hide();

            Network.connect();
        },

        slideIn: function() {
            this.container.show();
            // TweenLite.fromTo(this.container, 1.0, {
            //     x: -this.width,
            // }, {
            //     x: 0,
            //     ease: Expo.easeOut,
            //     onComplete: this.animatedIn.bind(this)
            // });
            
            SlideUp.animateCombined( [
                $(".mobile-header > div", this.container),
                $(".reconnect-body > div", this.container),

                //wrap multiple items in the same slide-up like so:
                [ $('.reconnect-waiting, .mobile-connect-icon', this.container) ]
            ], {
                onComplete: this.animatedIn.bind(this),
                blockIncrement: 0.1
            });

            if (this.avatar) {
                TweenLite.to(this.avatar, 1.0, {
                    alpha: 1.0,
                    ease: Expo.easeOut,
                });
            }
        },

        onSyncFinish: function() {
            Global.framework.go('flickScreen');
        },



        onOtherDeviceSyncComplete: function() {
            console.log("Sync complete");
            if (this.finishedLoading) {
                Network.thisDeviceSyncComplete();

                this.animateSync(0.0, this.onSyncFinish.bind(this));
            }
        },

        onLoadComplete: function() {
            console.log("Finished loading");
            
            //we've finished loading. check if we've also finished
            //syncing and the animation is done, too
            this.finishedLoading = true;

            //If the other device is already synced, we handle sync now
            if (Network.otherDeviceSyncCompleted) {
                Network.thisDeviceSyncComplete();

                //animate the sync, then switch sections
                this.animateSync(0.0, this.onSyncFinish.bind(this));
            }
        },

        startLoad: function() {
            var preloader = new Preloader(mobileManifest);
            preloader.onComplete.addOnce( this.onLoadComplete.bind(this) );
            preloader.start();
        },

        onNetworkConnect: function() {
            console.log("Network started")
            if (!Network.hasJoinedPaired && Facebook.user.data.id){
                Network.joinPaired( Facebook.user.data.id, true );
            }
        },

        onOtherDeviceJoined: function() {
            console.log("Device paired");

            //If we aren't waiting for the other device, just slide the 
            //sync animation in from the left
            if (!this.waitingForOtherDevice) {
                this.slideIn();
            }

            var fromCenter = !this.waitingForOtherDevice;

            //Animate in the spinny loader
            this.animateSyncStart(.5, this.startLoad.bind(this), fromCenter);

            $(".mobile-background", this.container).show();
        },

        onOtherDeviceHasNotJoined: function() {
            this.waitingForOtherDevice = true;

            //Show the content message that says "Just one more step"
            this.content.show();
            this.slideIn();
        },

        onOtherDeviceDisconnected: function() {

        },     
    });

    return ConnectToDesktopScreen;
});