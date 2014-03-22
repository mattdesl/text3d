define(['Class', 
		'PIXI',
		'TweenLite',
		'ui/CircleImage',
		'framework/controllers/BaseController', 
		'framework/auth/Facebook', 
		'flick/ui/BaseSprite',
		'flick/GrowingRings',
		'Global'], function(Class, 
			PIXI,
			TweenLite,
			CircleImage,
			BaseController, 
			Facebook,
			BaseSprite, 
			GrowingRings,
			Global){

	var RINGS_Z = -200;
	var BELOW = -100;
	var ABOVE = 100;

	/**
	 * We can use border-radius to get the same effect in CSS, but we don't have
	 * control over the way the line animates or changes color. And, also, the border-radius
	 * trick leads to some bugs in iOS 6 Safari. So a canvas might be better. 
	 *
	 * NOTE: Since we use FB image for this, we will want to use a separate canvas than the rest of our app,
	 * otherwise we will taint it and be unable to apply any per-pixel manipulations (which are required by some
	 * aspects of PIXI, like tinting).
	 */
	var SyncAvatar = new Class({

		Extends: PIXI.DisplayObjectContainer,

		radius: {
			set: function(val) {
				this._radius = val;
				this.connectionIcon.position.set(0, val);
				this.syncIcon1.position.set(val, val);
				this.syncIcon2.position.set(val, val);
				this.growingRings.position.set(val, val);
				this.width = this.height = (this._radius*2)*this.scale.x;
			},
			get: function() {
				return this._radius;
			}
		},

		scaleAll: {
			set: function(val){
				this.scale = new PIXI.Point(val,val);
				this.width = this.height = (this._radius*2)*val;
			},
			get: function(){
				return this.scale.x;
			}
		},

		STATE_WAITING: function(){ return 'waiting'; },
		STATE_CONNECTED: function(){ return 'connected'; },
		STATE_ANIMATING: function(){ return 'animating'; },

		initialize: function(imageSrc, radius, onImageLoad) {
			PIXI.DisplayObjectContainer.call(this);

			this.state = this.STATE_WAITING();

			this.visible = false;

			this._radius = radius||60;
			this.originalWidth = this.originalHeight = this._radius*2;

			this.syncContainer = new PIXI.DisplayObjectContainer();
			this.addChild(this.syncContainer);

			this.growingRings = new GrowingRings(200, 4);
			this.addChild(this.growingRings);
			this.growingRings.alpha = 0.5;
			this.growingRings.stroke = 'white';
			
			this.syncIcon1 = new BaseSprite('mobile-sync1.png');
			this.syncContainer.addChild(this.syncIcon1);
			this.syncIcon1.visible = false;
			this.syncIcon1.anchor.set(0.5, 0.5);

			this.syncIcon2 = new BaseSprite('mobile-sync2.png');
			this.syncIcon2.anchor.set(0.5, 0.5);
			this.syncContainer.addChild(this.syncIcon2);
			this.syncIcon2.visible = false;

			this.circleImage = new CircleImage(imageSrc);
			this.circleImage.syncProgress = 0;
			this.addChild(this.circleImage);

			this.connectionIcon = new BaseSprite('mobile-connecting-icon.png');
			this.connectionIcon.anchor.set(0.5, 0.5);
			this.connectionLooping = false;

			this.syncContainer.zIndex = BELOW;
			this.circleImage.zIndex = 0;
			this.connectionIcon.zIndex = 10;

			this.iconScale = this.connectionIcon.scale.x;

			this.addChild(this.connectionIcon);

			this.radius = this._radius;

			this.compareZSortBound = this.compareZSort.bind(this);
			this.updateZSort();

			this.startConnecting();
		},

		setImage: function(src) {
			this.circleImage.image.src = src;
		},

		compareZSort: function(a, b) {
            return (a.zIndex||0) - (b.zIndex||0);
        },

        updateZSort: function() {
            this.children.sort(this.compareZSortBound);
        },

		startConnecting: function() {
			this.connectionLooping = true;
			this._animateConnectionLoop();
		},

		stopConnecting: function() {
			this.connectionLooping = false;
		},

		_animateConnectionLoop: function() {
			if (!this.connectionLooping)
				return;

			TweenLite.fromTo(this.connectionIcon, 2.0, {
				rotation: 0,
			}, {
				rotation: Math.PI*2,
				ease: Linear.easeNone,
				onComplete: this._animateConnectionLoop.bind(this)
			});
		},

		connected: function(showRings) {
            showRings = (showRings !== false);
			this.visible = true;
			//kill previous tweens
			TweenLite.killTweensOf([
				this.circleImage, this.connectionIcon.scale,
				this.syncIcon1.scale, this.syncIcon2.scale,
				this.syncContainer.position, this.syncIcon1
			]);

			this.circleImage.syncProgress = 1.0;
			this.stopConnecting();
			this.growingRings.stop();
			this.growingRings.kill();

            if (showRings){
			    this.growingRings.start(6);
            }

            this.connectionIcon.scale.set(0, 0);
			this.syncIcon1.visible = false;
			this.syncIcon2.visible = true;

			this.syncContainer.zIndex = ABOVE;
			this.updateZSort();

			this.syncContainer.position.x = -this.radius;
		},

		disconnected: function() {
			this.visible = true;
			//kill previous tweens
			TweenLite.killTweensOf([
				this.circleImage, this.connectionIcon.scale,
				this.syncIcon1.scale, this.syncIcon2.scale,
				this.syncContainer.position, this.syncIcon1
			]);

			this.circleImage.syncProgress = 0.0;
			this.startConnecting();
			this.growingRings.stop();
			this.growingRings.kill();

			this.connectionIcon.scale.set(this.iconScale, this.iconScale);
			this.syncIcon1.visible = false;
			this.syncIcon2.visible = false;

			this.syncContainer.zIndex = BELOW;
			this.updateZSort();

			this.state = this.STATE_WAITING();
		},

		stopGrowingRings: function(){
			this.growingRings.stop();
			this.growingRings.kill();
		},

		animateSync: function(delay) {
			this.visible = true;
			this.state = this.STATE_ANIMATING();

			this.syncContainer.zIndex = BELOW;
			this.updateZSort();

			delay = delay||0;
			this.circleImage.animateSync(delay);

			var connectionOutDelay = delay + 0.1;
			var syncIconInDelay = delay + 0.5;

			TweenLite.fromTo(this.connectionIcon.scale, 1.0, {
				x: this.iconScale,
				y: this.iconScale
			}, {
				delay: connectionOutDelay,
				x: 0,
				y: 0,
				ease: Expo.easeOut,
				onComplete: this.stopConnecting.bind(this)
			});

			this.syncIcon1.visible = true;
			this.syncIcon2.visible = false;
			TweenLite.fromTo(this.syncIcon1, 1.0, {
				alpha: 0.0,
			}, {
				alpha: 1.0,
				overwrite: 1,
				delay: syncIconInDelay
			});
			
			TweenLite.fromTo(this.syncContainer.position, 1.0, {
				x: 0
			}, {
				overwrite: 1,
				delay: syncIconInDelay,
				x: -this.radius - 30,
				y: 0,
				ease: Expo.easeInOut,
				onStart: this.growingRings.start.bind(this.growingRings, 6)
			});

			var swapDelay = syncIconInDelay + 0.9, 
				swapTime = 0.75;
			var moveBackDelay = 0.1;

			//Animate out the old sync icon
			TweenLite.fromTo(this.syncIcon2.scale, swapTime, {
				x: 0, y: 0
			}, {
				overwrite: 1,
				delay: swapDelay,
				x: this.iconScale,
				y: this.iconScale,
				ease: Expo.easeOut,
				onStart: this.toggleVisibility.bind(this, this.syncIcon2, true)
			});
			//Animate in the new sync icon
			TweenLite.fromTo(this.syncIcon1.scale, swapTime, {
				x: this.iconScale,
				y: this.iconScale,
			}, {
				overwrite: 1,
				x: 0, y: 0,
				delay: swapDelay,
				ease: Expo.easeOut,
				onStart: this.toggleVisibility.bind(this, this.syncIcon2, true)
			});

			// Now we need to swap the Z index and animate the sync container back
			
			TweenLite.to(this.syncContainer.position, 1.0, {
				delay: swapDelay + moveBackDelay,
				x: -this.radius,
				ease: Expo.easeInOut,
				onStart: this.setZIndex.bind(this, this.syncContainer, ABOVE),
				onComplete: function(){
					this.state = this.STATE_CONNECTED();
				}.bind(this)
			});
		},



		//util functions for tweening


		setZIndex: function(container, zIndex) {
			container.zIndex = zIndex;
			this.updateZSort();
		},

		toggleVisibility: function(container, visible) {
			container.visible = visible;
		},

	});


	return SyncAvatar;
});