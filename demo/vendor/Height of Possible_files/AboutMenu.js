define(['Class', 
	'framework/controllers/BaseController', 
	'framework/auth/Facebook',
	'PIXI',
	 'Global',
	 'utils/DOMUtil'], function(Class, BaseController, Facebook, PIXI, Global, DOMUtil){

	var AboutMenu = new Class({
		
		Extends: BaseController,

		init: function(template, data){
			
			this.parent(template, data);
			

			//setup any dom sprites
			DOMUtil.setupSprites(this.container);

			this.backButton = $('.mobile-about-back', this.container);
			this.link = $('.mobile-about-link', this.container);
			DOMUtil.attachTouchFade(this.backButton);
			DOMUtil.attachTouchFade(this.link);

			this.backButton.on('touchstart', function() {
				Global.framework.go('menu');
			});

			this.container.hide();
			this.initialized();
		},

		animateOut: function() {
			TweenLite.to(this.container, .5, {
				x: this.width,
				ease: Expo.easeOut,
				onComplete: this.animatedOut.bind(this)
			});
		},

		animateIn: function() {
			this.container.show();
			TweenLite.fromTo(this.container, 1.0, {
				x: this.width,
			}, {
				x: 0,
				ease: Expo.easeOut,
				onComplete: this.animatedIn.bind(this)
			});
		},

	});

	return AboutMenu;
});