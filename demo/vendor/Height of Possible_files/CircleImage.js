define(['Class', 
		'PIXI',
		'TweenLite',
		'framework/controllers/BaseController', 
		'framework/auth/Facebook', 
		'flick/ui/BaseSprite',
		'Global'], function(Class, 
			PIXI,
			TweenLite,
			BaseController, 
			Facebook,
			BaseSprite, 
			Global){

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
		
		syncProgress: {
			set: function(val) {
				this._syncProgress = val;
			},

			get: function() {
				return this._syncProgress;
			}
		},

		radius: {
			set: function(val) {
				this._radius = val;
			},

			get: function() {
				return this._radius;
			}
		},

		initialize: function(imageSrc, radius, onImageLoad) {
			PIXI.DisplayObjectContainer.call(this);

			this.loaded = false;
			
			this._radius = radius || 60;

			this._syncProgress = 1;

			this.width = this.radius*2;
			this.height = this.radius*2;

			this.borderColor = '#6aca2b';
			this.borderAltColor = '#ef8c22';

			this.image = new Image();
			this.image.onload = this.onImageLoaded.bind(this, onImageLoad);
			this.image.src = imageSrc;

			//update the radius property, which moves connection icon
			this.radius = this._radius;
		},

		onImageLoaded: function(callback) {
			this.loaded = true;
			if (callback)
				callback();
		},

		animateSync: function(delay) {
			TweenLite.fromTo(this, 1.0, {
				syncProgress: 0.0
			}, {
				syncProgress: 1.0,
				delay: delay,
				ease: Quad.easeOut
			});
		},

		_renderCanvas: function(session) {
			if (this.worldAlpha === 0 || !this.visible || !this.loaded)
				return;


			var context = session.context;
			context.globalAlpha = this.worldAlpha;

            var transform = this.worldTransform;
            context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);

            context.save();

            // context.storkeStyle = 'white';
            context.beginPath();
            context.arc(this.radius, this.radius, this.radius, 0, Math.PI*2);
            context.clip();

           	context.drawImage(this.image, 0, 0, this.radius*2, this.radius*2);

            context.restore();

            var progress = this._syncProgress;

            var start = -Math.PI/2,
            	end = progress * Math.PI*2 - Math.PI/2;


            context.beginPath();
            context.arc(this.radius, this.radius, this.radius, start, end);
            context.lineWidth = 5;
            context.strokeStyle = this.borderColor;
            context.stroke();

	        if (progress < 0.9999) {
        		context.beginPath();
        		if (progress < 0.0001) {
        			start = 0;
        			end = Math.PI*2;
        		}

	            context.arc(this.radius, this.radius, this.radius, start, end, true);
	            context.lineWidth = 5;
	            context.strokeStyle = this.borderAltColor;
	            context.stroke();
            }

            PIXI.DisplayObjectContainer.prototype._renderCanvas.call(this, session);
		},
	});


	return SyncAvatar;
});