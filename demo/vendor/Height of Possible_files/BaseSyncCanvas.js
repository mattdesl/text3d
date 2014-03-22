define(['Class', 
		'flick/BaseCanvasController', 
		'PIXI', 
        'TweenLite',
		'framework/auth/Facebook', 
		'ui/SyncAvatar',
        'framework/Network',
        'ui/CanvasPreloader',
		'Global'], function(Class, 
				BaseCanvasController, 
				PIXI, 
                TweenLite,
				Facebook, 
				SyncAvatar,
                Network,
                CanvasPreloader,
				Global){

	//Whenever you lost connection w/ desktop, or when you first connect, this shows
	//the "Please visit HOP.com" message and sync animation.
    var DOWN_SCALE = 0.85;

	var BaseSyncCanvas = new Class({
		
		Extends: BaseCanvasController,

		init: function(template, data){
			this.parent(template, data);

            this.avatarYOffset = 130;
            this.avatarScale = 1;

            this.handleInit();

            this.initialized();
        },

        handleInit: function() {
            this._onFinishSync = this.onFinishSync.bind(this);

            this.animateOutEnabled = false;

			this.container.css("background", "transparent");
			this.canvas.css({
				position: "absolute",
				top: 0,
				left: 0
			});

            this.animateOutBound = this.animateOut.bind(this);

            var webGLCanvas = document.getElementById('threejsCanvas');

            this.renderer = new PIXI.CanvasRenderer(this.width, this.height, this.canvas[0], true, 30, 12);
            //this.renderer = new PIXI.WebGLRenderer(this.width, this.height, webGLCanvas, true, false);
            this.renderer.clearBeforeRender = false;
            this.stage = new PIXI.Stage();

            this.mainContainer = new PIXI.DisplayObjectContainer();
            this.stage.addChild(this.mainContainer);

            this.ready = false;

            // this.connected = false;
            // this.addSignal( Network.onOtherDeviceJoined, this.onOtherDeviceJoined.bind(this) );

            this.content = $('.mobile-container', this.container);
            this.syncSuccess = $('.reconnect-success', this.container);
            this.syncSuccess.hide();

            this.setupUI();
            
            this.resize(this.width, this.height);
		},

        onFinishSync: function() {

        },
        
        showDisconnect: function() {
            // TweenLite.killDelayedCallsTo(this.animateOutBound);

            TweenLite.killTweensOf([
                this,
                this.avatar.position,
                this.avatar.scale,
                this.content
            ]);
            console.log(this.avatarYOffset, this.avatarScale);
            this.avatar.scale.set(this.avatarScale,this.avatarScale);
            this.avatar.position.set(this.width/2-(this.avatar.width*this.avatarScale)/2,
                            this.height/2-(this.avatar.height*this.avatarScale)/2 + this.avatarYOffset);
            
            this.content.css('opacity', 1);
            this.syncSuccess.hide();

            this.avatar.disconnected();

            this.container.show();
            this.animateIn();
        },

        // onOtherDeviceJoined: function() {
        //     //if we've already created our assets, run the animation
        //     if (this.ready) {
        //         this.animateSync();
        //     }

        //     this.connected = true;
        // },

		setupUI: function() {
            this.ready = true;

            var profileURL = Facebook.profilePhotoURL(150, 150);
			var src = profileURL ? profileURL : "img/temp_profile.jpg";
			this.avatar = new SyncAvatar(src);

			this.mainContainer.addChild(this.avatar);

            this.resize(this.width, this.height);

            // if (this.connected)
            //     this.animateSync();
		},

        disconnected: function(delay) {
            delay = delay||0;

            TweenLite.to(this.avatar.position, 1.0, {
                x: this.width/2-this.avatar.width/2,
                y: this.height/2-this.avatar.height/2 + this.avatarYOffset
            });

            TweenLite.to(this.avatar.scale, 1.0, {
                x: this.avatarScale,
                y: this.avatarScale,
                delay: delay,
                ease: Expo.easeOut
            });

            TweenLite.to(this.syncSuccess, 1.0, {
                opacity: 0.0,
                delay: delay,
                ease: Expo.easeOut,
                onComplete: this.hideContainer.bind(this, this.syncSuccess)
            });

            delay += 0.1;
            TweenLite.to(this.content, 1.0, {
                alpha: 1,
                ease: Expo.easeOut,
                delay: delay
            });
        },

        animateFullSync: function(delay, onComplete, fromCenter) {
            delay = delay||0;
            this.animateSyncStart(delay, null, fromCenter);
            this.animateSync(delay+0.2, onComplete);
        },

        animateSyncStart: function(delay, onComplete, fromCenter) {
            delay = delay||0;
            TweenLite.to(this.content, 1.0, {
                alpha: 0,
                ease: Expo.easeOut,
                delay: delay
            });

            delay += 0.2;

            var downScale = DOWN_SCALE, avatarScale = this.avatarScale;

            TweenLite.fromTo(this.avatar.position, 1.0, {
                x: this.width/2-(this.avatar.width*avatarScale)/2,
                y: this.height/2-(this.avatar.height*avatarScale)/2 + (fromCenter ? 0 : this.avatarYOffset)
            }, {
                x: this.width/2-(this.avatar.width*downScale)/2,
                y: this.height/2-(this.avatar.height*downScale)/2,
                delay: delay,
                ease: Expo.easeOut
            });

            TweenLite.to(this.avatar.scale, 1.0, {
                x: downScale,
                y: downScale,
                delay: delay,
                ease: Expo.easeOut,
                onComplete: onComplete
            });
        },

        //Animate in the sync
        animateSync: function(delay, onComplete) {
            delay = delay||0;
            this.syncSuccess.css({
                top: this.height/2 + (this.avatar.height*DOWN_SCALE)
            });

            this.syncSuccess.show();
            TweenLite.fromTo(this.syncSuccess, 1.0, {
                opacity: 0.0
            }, {
                opacity: 1.0,
                delay: delay + 0.7,
                ease: Expo.easeOut
            });

            this.avatar.animateSync(delay);

            if (onComplete) {
                TweenLite.to(this, 1.0, {
                    delay: delay + 2.5,
                    onComplete: onComplete,
                    overwrite: 1
                });
            }

            // if (triggerAnimateOut)
            //     TweenLite.delayedCall(delay+3.5, this.animateOutBound);
        },


        animatedOut: function() {
            this.stop();
            this.parent();
        },

        
        animateIn: function() {
            this.start();
            $(".mobile-background", this.container).show();

            if (this.avatar) {
                var src = Facebook.user.data.id ? Facebook.profilePhotoURL(150, 150) : "img/temp_profile.jpg";
                this.avatar.setImage(src);
            }
            
            this.container.show();
            TweenLite.fromTo(this.container, 1.0, {
                x: -this.width,
            }, {
                x: 0,
                ease: Expo.easeOut,
                onComplete: this.animatedIn.bind(this)
            });

            if (this.avatar) {
                TweenLite.to(this.avatar, 1.0, {
                    alpha: 1.0,
                    ease: Expo.easeOut,
                });
            }
        },

        hideContainer: function(container, callback) {
            container.hide();
            if (callback)
                callback();
        },
        
        // animateOut: function() {
        //     // if (this.animateOutEnabled) {
        //     TweenLite.to(this.avatar, 0.5, {
        //         alpha: 0.0,
        //         ease: Expo.easeOut,
        //         onComplete: this.animatedOut.bind(this)
        //     });
        //     // } else
        //     //     this.animatedOut();
        // },

        resize: function(width, height) {
            this.parent(width, height);


            
            if (this.renderer) {
                this.renderer.width = this.canvas[0].width;
                this.renderer.height = this.canvas[0].height;

                this.mainContainer.scale.x = this.ratio;
                this.mainContainer.scale.y = this.ratio;

                var avatarScale = this.avatarScale;

                if (this.ready) {
                    this.avatarY = this.height/2-(this.avatar.height*avatarScale)/2;
                    this.avatar.position.set(this.width/2-(this.avatar.width*avatarScale)/2, this.avatarY + this.avatarYOffset);
                }
            }
        },

        draw: function(context, dt) {
            this.renderer.render(this.stage);

        }
	});

	return BaseSyncCanvas;
});